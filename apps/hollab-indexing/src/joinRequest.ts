import { ponder } from "ponder:registry";
import * as schema from "ponder:schema";

ponder.on("JoinRequest:JoinRequested", async ({ event, context }) => {
    const { requestId, requester, orgId, message } = event.args;
    await context.db.insert(schema.joinRequest).values({
        id: `${event.log.address}-${requestId}`,
        requestId,
        contractAddress: event.log.address,
        requester,
        orgId,
        message,
        status: 0, // Pending
        submittedAt: event.block.timestamp,
        resolvedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("JoinRequest:JoinApproved", async ({ event, context }) => {
    const { requestId } = event.args;
    await context.db
        .update(schema.joinRequest, { id: `${event.log.address}-${requestId}` })
        .set({ status: 1, resolvedAt: event.block.timestamp });
});

ponder.on("JoinRequest:JoinRejected", async ({ event, context }) => {
    const { requestId } = event.args;
    await context.db
        .update(schema.joinRequest, { id: `${event.log.address}-${requestId}` })
        .set({ status: 2, resolvedAt: event.block.timestamp });
});
