/**
 * RoleDataRegistry handlers — checklist items and metrics per role.
 *
 * Soft-delete model: Removed events flip `isActive` to false rather than
 * deleting the row, so consumers can read historical items / metrics.
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

ponder.on("RoleDataRegistry:ChecklistItemAdded", async ({ event, context }) => {
    const { _itemId, _roleId, _label } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_itemId}`;
    await context.db.insert(schema.checklistItem).values({
        id,
        itemId: _itemId,
        contractAddress: event.log.address,
        roleId: _roleId,
        label: _label,
        isActive: true,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("RoleDataRegistry:ChecklistItemRemoved", async ({ event, context }) => {
    const { _itemId } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_itemId}`;
    const existing = await context.db.find(schema.checklistItem, { id });
    if (existing) {
        await context.db.update(schema.checklistItem, { id }).set({ isActive: false });
    }
});

ponder.on("RoleDataRegistry:MetricAdded", async ({ event, context }) => {
    const { _metricId, _roleId, _label } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_metricId}`;
    await context.db.insert(schema.metric).values({
        id,
        metricId: _metricId,
        contractAddress: event.log.address,
        roleId: _roleId,
        label: _label,
        isActive: true,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("RoleDataRegistry:MetricRemoved", async ({ event, context }) => {
    const { _metricId } = event.args;
    const id = `${event.log.address.toLowerCase()}-${_metricId}`;
    const existing = await context.db.find(schema.metric, { id });
    if (existing) {
        await context.db.update(schema.metric, { id }).set({ isActive: false });
    }
});
