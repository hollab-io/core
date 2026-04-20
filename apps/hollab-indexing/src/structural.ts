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

ponder.on("RoleRegistry:RoleMoved", async ({ event, context }) => {
    const { _roleId } = event.args;
    await upsertRole(context, event.log.address, _roleId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

async function upsertPolicy(
    context: Ctx,
    registryAddress: `0x${string}`,
    policyId: bigint,
    timestamp: bigint,
) {
    const index = await context.db.find(schema.registryIndex, { registryAddress });
    if (!index) return;

    const policyStruct = await context.client.readContract({
        abi: roleRegistryAbi,
        address: registryAddress,
        functionName: "getPolicy",
        args: [policyId],
    });

    if (!policyStruct.exists) return;

    const id = `${registryAddress.toLowerCase()}-${policyId}`;
    const values = {
        id,
        policyId,
        orgId: index.orgId,
        registryAddress,
        circleId: policyStruct.circleId,
        name: policyStruct.name,
        body: policyStruct.body,
        updatedAt: timestamp,
    };

    const existing = await context.db.find(schema.policy, { id });
    if (existing) {
        await context.db.update(schema.policy, { id }).set(values);
    } else {
        await context.db.insert(schema.policy).values(values);
    }
}

ponder.on("RoleRegistry:PolicyCreated", async ({ event, context }) => {
    const { _policyId } = event.args;
    await upsertPolicy(context, event.log.address, _policyId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:PolicyUpdated", async ({ event, context }) => {
    const { _policyId } = event.args;
    await upsertPolicy(context, event.log.address, _policyId, event.block.timestamp);
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:PolicyRemoved", async ({ event, context }) => {
    const { _policyId } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_policyId}`;
    const existing = await context.db.find(schema.policy, { id });
    if (existing) {
        await context.db.delete(schema.policy, { id });
    }
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:ContentRefSet", async ({ event, context }) => {
    const { _entityType, _entityId, _fieldName, _contentHash, _visibility } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_entityType}-${_entityId}-${_fieldName}`;
    const values = {
        id,
        registryAddress: event.log.address,
        entityType: _entityType,
        entityId: _entityId,
        fieldName: _fieldName,
        contentHash: _contentHash,
        visibility: _visibility,
        updatedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    };
    const existing = await context.db.find(schema.contentRef, { id });
    if (existing) {
        await context.db.update(schema.contentRef, { id }).set(values);
    } else {
        await context.db.insert(schema.contentRef).values(values);
    }
});
