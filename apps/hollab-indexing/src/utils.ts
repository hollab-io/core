import type { Context } from "ponder:registry";
import schema from "ponder:schema";

import { OrganizationInstanceAbi } from "../abis/OrganizationInstanceAbi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function isZeroAddress(a: `0x${string}`): boolean {
    return a.toLowerCase() === ZERO_ADDRESS;
}

// ─── Core refresh ─────────────────────────────────────────────────────────────

/**
 * Called by RoleRegistry / CircleRegistry event handlers that hold a per-org
 * clone address. Looks up the org via registryIndex, then refreshes the
 * org snapshot by calling `summary()` on the OrganizationInstance.
 */
export async function refreshOrgData(
    context: Context,
    registryAddress: `0x${string}`,
    timestamp: bigint,
) {
    const index = await context.db.find(schema.registryIndex, { registryAddress });
    if (!index) return;

    // `factoryAddress` on the registry_index row now holds the OrganizationInstance address.
    await upsertOrgSnapshot(context, index.factoryAddress, timestamp);
}

/**
 * Upserts an org snapshot by reading `summary()` directly off the
 * OrganizationInstance clone. The instance is the authoritative source for
 * org metadata + component wiring after the factory-to-instance refactor.
 */
export async function upsertOrgSnapshot(
    context: Context,
    instanceAddress: `0x${string}`,
    timestamp: bigint,
) {
    const tokenMetaAbi = [
        {
            type: "function",
            name: "name",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "string" }],
        },
        {
            type: "function",
            name: "symbol",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "string" }],
        },
        {
            type: "function",
            name: "totalSupply",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
        },
    ] as const;

    const org = await context.client.readContract({
        abi: OrganizationInstanceAbi,
        address: instanceAddress,
        functionName: "summary",
    });

    let tokenName = "";
    let tokenSymbol = "";
    let tokenTotalSupply = 0n;

    if (!isZeroAddress(org.token)) {
        try {
            [tokenName, tokenSymbol, tokenTotalSupply] = await Promise.all([
                context.client.readContract({
                    abi: tokenMetaAbi,
                    address: org.token,
                    functionName: "name",
                }),
                context.client.readContract({
                    abi: tokenMetaAbi,
                    address: org.token,
                    functionName: "symbol",
                }),
                context.client.readContract({
                    abi: tokenMetaAbi,
                    address: org.token,
                    functionName: "totalSupply",
                }),
            ]);
        } catch {
            /* token might not be deployed yet */
        }
    }

    await context.db
        .insert(schema.organization)
        .values({
            id: org.id,
            subname: org.subname,
            name: org.name,
            creator: org.creator,
            token: org.token,
            instanceAddress,
            circleRegistry: org.circleRegistry,
            roleRegistry: org.roleRegistry,
            governanceProcess: org.governanceProcess,
            anchorCircleId: org.anchorCircleId,
            tokenName,
            tokenSymbol,
            tokenTotalSupply,
            circleCount: 0n,
            roleCount: 0n,
            memberCount: 0n,
            purpose: "",
            createdAt: org.createdAt,
            updatedAt: timestamp,
        })
        .onConflictDoUpdate((existing) => ({
            ...existing,
            instanceAddress,
            governanceProcess: org.governanceProcess,
            tokenTotalSupply,
            updatedAt: timestamp,
        }));
}
