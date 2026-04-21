import { ponder } from "ponder:registry";
import * as schema from "ponder:schema";

// Join requests and approvals live on OrganizationInstance post-refactor.
// Each join request's id is keyed on (instance, requester) since the instance
// does not expose a stable requestId across resolve events (requestId is only
// present on JoinRequested; JoinApproved/JoinRejected emit the requester).

ponder.on("OrganizationInstance:JoinRequested", async ({ event, context }) => {
    const { requestId, requester, message } = event.args;
    const instance = event.log.address;

    const index = await context.db.find(schema.registryIndex, { registryAddress: instance });
    if (!index) return;

    await context.db.insert(schema.joinRequest).values({
        id: `${instance.toLowerCase()}-${requester.toLowerCase()}`,
        requestId,
        contractAddress: instance,
        requester,
        orgId: index.orgId,
        message,
        status: 0, // Pending
        submittedAt: event.block.timestamp,
        resolvedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("OrganizationInstance:JoinApproved", async ({ event, context }) => {
    const { requester } = event.args;
    const instance = event.log.address;
    await context.db
        .update(schema.joinRequest, {
            id: `${instance.toLowerCase()}-${requester.toLowerCase()}`,
        })
        .set({ status: 1, resolvedAt: event.block.timestamp });
});

ponder.on("OrganizationInstance:JoinRejected", async ({ event, context }) => {
    const { requester } = event.args;
    const instance = event.log.address;
    await context.db
        .update(schema.joinRequest, {
            id: `${instance.toLowerCase()}-${requester.toLowerCase()}`,
        })
        .set({ status: 2, resolvedAt: event.block.timestamp });
});
