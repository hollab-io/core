import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { upsertOrgSnapshot } from "./utils";

// ─── OrganizationFactory: creation ────────────────────────────────────────────
// Emits OrganizationCreated(orgId, subname, creator, instance, roleRegistry).
// We fan out registry_index entries so RoleRegistry handlers can resolve orgId.

ponder.on("OrganizationFactory:OrganizationCreated", async ({ event, context }) => {
    const { _orgId, _instance, _roleRegistry } = event.args;

    // registry_index maps any per-org clone address back to { orgId, instanceAddress }.
    // The `factoryAddress` column now stores the OrganizationInstance address so
    // refreshOrgData can call summary() directly off it.
    for (const addr of [_instance, _roleRegistry] as const) {
        await context.db
            .insert(schema.registryIndex)
            .values({ registryAddress: addr, orgId: _orgId, factoryAddress: _instance })
            .onConflictDoNothing();
    }

    // Full snapshot from the instance — the authoritative address for all org metadata.
    await upsertOrgSnapshot(context, _instance, event.block.timestamp);
});

// ─── OrganizationInstance: admin + member + agent events ──────────────────────

ponder.on("OrganizationInstance:AdminAdded", async ({ event, context }) => {
    // Admin tracking isn't materialized as a separate table; AdminAdded is a
    // snapshot trigger so downstream consumers (e.g. UI) see fresh state.
    const instance = event.log.address;
    await upsertOrgSnapshot(context, instance, event.block.timestamp);
});

ponder.on("OrganizationInstance:AdminRemoved", async ({ event, context }) => {
    const instance = event.log.address;
    await upsertOrgSnapshot(context, instance, event.block.timestamp);
});

ponder.on("OrganizationInstance:MemberAdded", async ({ event, context }) => {
    const instance = event.log.address;
    const { account } = event.args;

    const index = await context.db.find(schema.registryIndex, { registryAddress: instance });
    if (!index) return;

    const id = `${instance.toLowerCase()}-${account.toLowerCase()}`;
    const existing = await context.db.find(schema.orgMember, { id });
    if (existing) return;

    await context.db.insert(schema.orgMember).values({
        id,
        registryAddress: instance,
        orgId: index.orgId,
        memberAddress: account,
        addedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });

    const org = await context.db.find(schema.organization, { id: index.orgId });
    if (org) {
        await context.db
            .update(schema.organization, { id: index.orgId })
            .set({ memberCount: org.memberCount + 1n, updatedAt: event.block.timestamp });
    }
});

ponder.on("OrganizationInstance:MemberRemoved", async ({ event, context }) => {
    const instance = event.log.address;
    const { account } = event.args;

    const index = await context.db.find(schema.registryIndex, { registryAddress: instance });
    if (!index) return;

    const id = `${instance.toLowerCase()}-${account.toLowerCase()}`;
    await context.db.delete(schema.orgMember, { id });

    const org = await context.db.find(schema.organization, { id: index.orgId });
    if (org && org.memberCount > 0n) {
        await context.db
            .update(schema.organization, { id: index.orgId })
            .set({ memberCount: org.memberCount - 1n, updatedAt: event.block.timestamp });
    }
});

ponder.on("OrganizationInstance:AgentIdentityLinked", async ({ event, context }) => {
    // Touch the org snapshot so UIs re-read. No dedicated agent-link table yet.
    const instance = event.log.address;
    await upsertOrgSnapshot(context, instance, event.block.timestamp);
});

ponder.on("OrganizationInstance:MeetingFactorySet", async ({ event, context }) => {
    // When an org deploys its MeetingComponentsFactory set, the instance stores
    // the chosen MeetingFactory address and emits this. Snapshot again so the
    // UI sees fresh wiring.
    const instance = event.log.address;
    await upsertOrgSnapshot(context, instance, event.block.timestamp);
});
