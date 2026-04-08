/**
 * Structural event handlers — RoleRegistry only (circle registry removed).
 */
import { ponder } from "ponder:registry";

import { refreshOrgData } from "./utils";

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
