import { ponder } from "ponder:registry";
import * as schema from "ponder:schema";

ponder.on("TensionBoard:TensionSubmitted", async ({ event, context }) => {
    const { tensionId, author, orgId, circleId, target, title, description } = event.args;
    await context.db.insert(schema.tension).values({
        id: `${event.log.address}-${tensionId}`,
        tensionId,
        contractAddress: event.log.address,
        author,
        orgId,
        circleId,
        target,
        title,
        description,
        status: 0, // Open
        champion: null,
        submittedAt: event.block.timestamp,
        resolvedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("TensionBoard:TensionChampioned", async ({ event, context }) => {
    const { tensionId, champion } = event.args;
    await context.db
        .update(schema.tension, { id: `${event.log.address}-${tensionId}` })
        .set({ status: 1, champion });
});

ponder.on("TensionBoard:TensionDismissed", async ({ event, context }) => {
    const { tensionId } = event.args;
    await context.db
        .update(schema.tension, { id: `${event.log.address}-${tensionId}` })
        .set({ status: 2, resolvedAt: event.block.timestamp });
});

ponder.on("TensionBoard:TensionProcessed", async ({ event, context }) => {
    const { tensionId } = event.args;
    await context.db
        .update(schema.tension, { id: `${event.log.address}-${tensionId}` })
        .set({ status: 3, resolvedAt: event.block.timestamp });
});
