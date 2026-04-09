import type { Context } from "ponder:registry";
import schema from "ponder:schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function isZeroAddress(a: `0x${string}`): boolean {
    return a.toLowerCase() === ZERO_ADDRESS;
}

// ─── Core refresh ─────────────────────────────────────────────────────────────

/**
 * Called by every RoleRegistry event handler.
 * Looks up the org via registryIndex, then refreshes the org snapshot.
 */
export async function refreshOrgData(
    context: Context,
    registryAddress: `0x${string}`,
    timestamp: bigint,
) {
    const index = await context.db.find(schema.registryIndex, { registryAddress });
    if (!index) return;

    await upsertOrgSnapshot(context, index.factoryAddress, index.orgId, timestamp);
}

/**
 * Upserts an org snapshot using direct contract reads (no DataProvider).
 * Called from OrganizationCreated and role-change events.
 */
export async function upsertOrgSnapshot(
    context: Context,
    factoryAddress: `0x${string}`,
    orgId: bigint,
    timestamp: bigint,
) {
    const orgFactoryAbi = [
        {
            type: "function",
            name: "getOrganization",
            stateMutability: "view",
            inputs: [{ name: "_orgId", type: "uint256" }],
            outputs: [
                {
                    name: "_org",
                    type: "tuple",
                    components: [
                        { name: "id", type: "uint256" },
                        { name: "name", type: "string" },
                        { name: "subname", type: "string" },
                        { name: "creator", type: "address" },
                        { name: "roleRegistry", type: "address" },
                        { name: "circleRegistry", type: "address" },
                        { name: "governanceProcess", type: "address" },
                        { name: "meetingFactory", type: "address" },
                        { name: "accessManager", type: "address" },
                        { name: "anchorCircleId", type: "uint256" },
                        { name: "createdAt", type: "uint256" },
                        { name: "token", type: "address" },
                    ],
                },
            ],
        },
    ] as const;

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
        abi: orgFactoryAbi,
        address: factoryAddress,
        functionName: "getOrganization",
        args: [orgId],
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
            circleRegistry: org.circleRegistry,
            roleRegistry: org.roleRegistry,
            governanceProcess: org.governanceProcess,
            anchorCircleId: 0n,
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
            tokenTotalSupply,
            updatedAt: timestamp,
        }));
}
