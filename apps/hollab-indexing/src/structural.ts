/**
 * Structural event handlers — CircleRegistry + RoleRegistry.
 *
 * Every event here represents a change to the org's structure (circles, roles,
 * leads, elected roles, policies). Rather than reconstructing state from event
 * args, each handler fetches a fresh snapshot from HolacracyDataProvider and
 * upserts it. This keeps the DB in sync with on-chain canonical state without
 * maintaining a local state machine.
 */
import { ponder } from "ponder:registry";
import * as schema from "ponder:schema";

import { refreshOrgData } from "./utils";

// ─── CircleRegistry ───────────────────────────────────────────────────────────

ponder.on("CircleRegistry:AnchorCircleCreated", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:SubCircleCreated", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:CircleUpdated", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:CircleLeadAdded", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:CircleLeadRemoved", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:ElectedRoleSet", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:PolicyAdded", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:PolicyRemoved", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:CircleRoleCreated", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("CircleRegistry:OrgMemberAdded", async ({ event, context }) => {
    // registryIndex may not exist yet when this fires in the same tx as OrganizationCreated
    // (OrgMemberAdded has a lower log index). upsertOrgSnapshot (triggered by OrganizationCreated)
    // is the authoritative sync — this handler only handles incremental post-creation adds.
    const index = await context.db.find(schema.registryIndex, {
        registryAddress: event.log.address,
    });
    if (!index) return;

    const id = `${event.log.address}-${event.args._member}`;
    const existing = await context.db.find(schema.orgMember, { id });
    if (existing) return; // already inserted by upsertOrgSnapshot

    await context.db.insert(schema.orgMember).values({
        id,
        registryAddress: event.log.address,
        orgId: index.orgId,
        memberAddress: event.args._member,
        addedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });

    const org = await context.db.find(schema.organization, { id: index.orgId });
    if (org) {
        await context.db
            .update(schema.organization, { id: index.orgId })
            .set({ memberCount: org.memberCount + 1n });
    }
});

ponder.on("CircleRegistry:OrgMemberRemoved", async ({ event, context }) => {
    const id = `${event.log.address}-${event.args._member}`;
    const member = await context.db.find(schema.orgMember, { id });
    if (!member) return;

    await context.db.delete(schema.orgMember, { id });

    const org = await context.db.find(schema.organization, { id: member.orgId });
    if (org && org.memberCount > 0n) {
        await context.db
            .update(schema.organization, { id: member.orgId })
            .set({ memberCount: org.memberCount - 1n });
    }
});

// ─── RoleRegistry ─────────────────────────────────────────────────────────────

ponder.on("RoleRegistry:RoleCreated", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleUpdated", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleRemoved", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleLeadAssigned", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});

ponder.on("RoleRegistry:RoleLeadUnassigned", async ({ event, context }) => {
    await refreshOrgData(context, event.log.address, event.block.timestamp);
});
