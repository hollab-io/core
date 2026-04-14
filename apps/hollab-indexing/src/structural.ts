/**
 * Structural event handlers — RoleRegistry only (no circle registry in this
 * contract set).
 *
 * Persists role rows to `schema.role` by re-reading the full Role struct +
 * leads from the clone on every RoleCreated / RoleUpdated / RoleLead* event.
 * Without this, the role table stays empty and everything downstream — the
 * public view, the manifest endpoint, and `indexing-client.listRolesByOrg` —
 * reports zero roles even when the contract state has them.
 */
import { roleRegistryAbi } from "@hollab-io/contracts/actions";
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { refreshOrgData } from "./utils";

type Ctx = Parameters<Parameters<typeof ponder.on<"RoleRegistry:RoleCreated">>[1]>[0]["context"];

async function upsertRole(
    context: Ctx,
    registryAddress: `0x${string}`,
    roleId: bigint,
    timestamp: bigint,
) {
    const index = await context.db.find(schema.registryIndex, { registryAddress });
    if (!index) return;

    const [roleStruct, leads] = await Promise.all([
        context.client.readContract({
            abi: roleRegistryAbi,
            address: registryAddress,
            functionName: "getRole",
            args: [roleId],
        }),
        context.client.readContract({
            abi: roleRegistryAbi,
            address: registryAddress,
            functionName: "getRoleLeads",
            args: [roleId],
        }),
    ]);

    if (!roleStruct.exists) return;

    const id = `${registryAddress.toLowerCase()}-${roleId}`;
    const values = {
        id,
        roleId,
        orgId: index.orgId,
        registryAddress,
        circleId: roleStruct.circleId,
        name: roleStruct.name,
        purpose: roleStruct.purpose,
        domains: [...roleStruct.domains] as string[],
        accountabilities: [...roleStruct.accountabilities] as string[],
        leads: [...leads] as readonly `0x${string}`[],
        isExpandedToCircle: false,
        expandedCircleId: 0n,
        updatedAt: timestamp,
    };

    const existing = await context.db.find(schema.role, { id });
    if (existing) {
        await context.db.update(schema.role, { id }).set(values);
    } else {
        await context.db.insert(schema.role).values(values);
        const org = await context.db.find(schema.organization, { id: index.orgId });
        if (org) {
            await context.db
                .update(schema.organization, { id: index.orgId })
                .set({ roleCount: org.roleCount + 1n, updatedAt: timestamp });
        }
    }
}

async function updateRoleLeads(
    context: Ctx,
    registryAddress: `0x${string}`,
    roleId: bigint,
    timestamp: bigint,
) {
    const id = `${registryAddress.toLowerCase()}-${roleId}`;
    const existing = await context.db.find(schema.role, { id });
    if (!existing) {
        // Role row hasn't been created yet (indexer replay ordering); fall back
        // to a full upsert which re-reads everything.
        await upsertRole(context, registryAddress, roleId, timestamp);
        return;
    }

    const leads = await context.client.readContract({
        abi: roleRegistryAbi,
        address: registryAddress,
        functionName: "getRoleLeads",
        args: [roleId],
    });

    await context.db.update(schema.role, { id }).set({
        leads: [...leads] as readonly `0x${string}`[],
        updatedAt: timestamp,
    });
}

ponder.on("RoleRegistry:RoleCreated", async ({ event, context }) => {
    const { _roleId } = event.args;
    await upsertRole(context, event.log.address, _roleId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleUpdated", async ({ event, context }) => {
    const { _roleId } = event.args;
    await upsertRole(context, event.log.address, _roleId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleRemoved", async ({ event, context }) => {
    const { _roleId } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_roleId}`;
    const existing = await context.db.find(schema.role, { id });
    if (existing) {
        await context.db.delete(schema.role, { id });
        const index = await context.db.find(schema.registryIndex, {
            registryAddress: event.log.address,
        });
        if (index) {
            const org = await context.db.find(schema.organization, { id: index.orgId });
            if (org && org.roleCount > 0n) {
                await context.db
                    .update(schema.organization, { id: index.orgId })
                    .set({ roleCount: org.roleCount - 1n, updatedAt: event.block.timestamp });
            }
        }
    }
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleLeadAssigned", async ({ event, context }) => {
    const { _roleId } = event.args;
    await updateRoleLeads(context, event.log.address, _roleId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleLeadUnassigned", async ({ event, context }) => {
    const { _roleId } = event.args;
    await updateRoleLeads(context, event.log.address, _roleId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});
