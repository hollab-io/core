import type { Context } from "ponder:registry";
import schema from "ponder:schema";

import { HolacracyDataProviderAbi } from "../abis/HolacracyDataProviderAbi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

const dataProvider = () =>
    (process.env.HOLACRACY_DATA_PROVIDER_ADDRESS ??
        "0x0000000000000000000000000000000000000007") as `0x${string}`;

// ─── Core refresh ─────────────────────────────────────────────────────────────

/**
 * Called by every CircleRegistry / RoleRegistry event handler.
 * Looks up the org via registryIndex, then calls the DataProvider for a fresh
 * snapshot and upserts organisation, circles, roles, and policies.
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
 * Upserts a full org snapshot from the DataProvider.
 * Called directly from OrganizationCreated (where we already know factoryAddress + orgId).
 */
export async function upsertOrgSnapshot(
    context: Context,
    factoryAddress: `0x${string}`,
    orgId: bigint,
    timestamp: bigint,
) {
    const [overview, circles, roles, policies] = await context.client.readContract({
        abi: HolacracyDataProviderAbi,
        address: dataProvider(),
        functionName: "getOrganizationFullData",
        args: [factoryAddress, orgId],
    });

    // ── Organisation ────────────────────────────────────────────────────────────
    await context.db
        .insert(schema.organization)
        .values({
            id: overview.id,
            subname: overview.subname,
            name: overview.name,
            creator: overview.creator,
            governor: overview.governor,
            token: overview.token,
            timelock: overview.timelock,
            circleRegistry: overview.circleRegistry,
            roleRegistry: overview.roleRegistry,
            governanceProcess: overview.governanceProcess,
            anchorCircleId: overview.id, // DataProvider doesn't expose anchorCircleId directly; read below
            tokenName: overview.tokenName,
            tokenSymbol: overview.tokenSymbol,
            tokenTotalSupply: overview.tokenTotalSupply,
            governorName: overview.governorName,
            votingDelay: overview.votingDelay,
            votingPeriod: overview.votingPeriod,
            proposalThreshold: overview.proposalThreshold,
            quorumNumerator: overview.quorumNumerator,
            circleCount: overview.circleCount,
            roleCount: overview.roleCount,
            createdAt: overview.createdAt,
            updatedAt: timestamp,
        })
        .onConflictDoUpdate((existing) => ({
            ...existing,
            tokenTotalSupply: overview.tokenTotalSupply,
            circleCount: overview.circleCount,
            roleCount: overview.roleCount,
            updatedAt: timestamp,
        }));

    // ── Circles ─────────────────────────────────────────────────────────────────
    for (const c of circles) {
        const id = `${overview.circleRegistry}-${c.id}`;
        await context.db
            .insert(schema.circle)
            .values({
                id,
                circleId: c.id,
                orgId: overview.id,
                registryAddress: overview.circleRegistry,
                name: c.name,
                purpose: c.purpose,
                isAnchor: c.isAnchor,
                parentCircleId: c.parentCircleId,
                roleId: c.roleId,
                facilitator: c.facilitator === ZERO_ADDRESS ? ZERO_ADDRESS : c.facilitator,
                secretary: c.secretary === ZERO_ADDRESS ? ZERO_ADDRESS : c.secretary,
                circleRep: c.circleRep === ZERO_ADDRESS ? ZERO_ADDRESS : c.circleRep,
                circleLeads: c.circleLeads,
                roleIds: c.roleIds.map(String),
                subCircleIds: c.subCircleIds.map(String),
                policyIds: c.policyIds.map(String),
                updatedAt: timestamp,
            })
            .onConflictDoUpdate({
                name: c.name,
                purpose: c.purpose,
                facilitator: c.facilitator,
                secretary: c.secretary,
                circleRep: c.circleRep,
                circleLeads: c.circleLeads,
                roleIds: c.roleIds.map(String),
                subCircleIds: c.subCircleIds.map(String),
                policyIds: c.policyIds.map(String),
                updatedAt: timestamp,
            });
    }

    // ── Roles ───────────────────────────────────────────────────────────────────
    for (const r of roles) {
        const id = `${overview.roleRegistry}-${r.id}`;
        await context.db
            .insert(schema.role)
            .values({
                id,
                roleId: r.id,
                orgId: overview.id,
                registryAddress: overview.roleRegistry,
                circleId: r.circleId,
                name: r.name,
                purpose: r.purpose,
                domains: r.domains,
                accountabilities: r.accountabilities,
                leads: r.leads,
                isExpandedToCircle: r.isExpandedToCircle,
                expandedCircleId: r.expandedCircleId,
                updatedAt: timestamp,
            })
            .onConflictDoUpdate({
                name: r.name,
                purpose: r.purpose,
                domains: r.domains,
                accountabilities: r.accountabilities,
                leads: r.leads,
                isExpandedToCircle: r.isExpandedToCircle,
                expandedCircleId: r.expandedCircleId,
                updatedAt: timestamp,
            });
    }

    // ── Policies ────────────────────────────────────────────────────────────────
    for (const p of policies) {
        const id = `${overview.circleRegistry}-${p.id}`;
        await context.db
            .insert(schema.policy)
            .values({
                id,
                policyId: p.id,
                orgId: overview.id,
                registryAddress: overview.circleRegistry,
                circleId: p.circleId,
                name: p.name,
                body: p.body,
                updatedAt: timestamp,
            })
            .onConflictDoUpdate({
                name: p.name,
                body: p.body,
                circleId: p.circleId,
                updatedAt: timestamp,
            });
    }
}
