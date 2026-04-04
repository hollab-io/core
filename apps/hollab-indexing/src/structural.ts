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
