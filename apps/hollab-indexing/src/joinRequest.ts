import { ponder } from "ponder:registry";
import * as schema from "ponder:schema";

ponder.on("OrganizationFactory:JoinRequested", async ({ event, context }) => {
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

ponder.on("OrganizationFactory:JoinApproved", async ({ event, context }) => {
    const { requestId } = event.args;
    await context.db
        .update(schema.joinRequest, { id: `${event.log.address}-${requestId}` })
        .set({ status: 1, resolvedAt: event.block.timestamp });
});

ponder.on("OrganizationFactory:JoinRejected", async ({ event, context }) => {
    const { requestId } = event.args;
    await context.db
        .update(schema.joinRequest, { id: `${event.log.address}-${requestId}` })
        .set({ status: 2, resolvedAt: event.block.timestamp });
});

ponder.on("OrganizationFactory:OrgMemberAdded", async ({ event, context }) => {
    const { orgId, account } = event.args;
    const factory = event.log.address;
    const id = `${factory.toLowerCase()}-${orgId}-${account.toLowerCase()}`;

    const existing = await context.db.find(schema.orgMember, { id });
    if (existing) return;

    await context.db.insert(schema.orgMember).values({
        id,
        registryAddress: factory,
        orgId,
        memberAddress: account,
        addedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });

    const org = await context.db.find(schema.organization, { id: orgId });
    if (org) {
        await context.db
            .update(schema.organization, { id: orgId })
            .set({ memberCount: org.memberCount + 1n, updatedAt: event.block.timestamp });
    }
});

ponder.on("OrganizationFactory:OrgMemberRemoved", async ({ event, context }) => {
    const { orgId, account } = event.args;
    const factory = event.log.address;
    const id = `${factory.toLowerCase()}-${orgId}-${account.toLowerCase()}`;

    await context.db.delete(schema.orgMember, { id });

    const org = await context.db.find(schema.organization, { id: orgId });
    if (org && org.memberCount > 0n) {
        await context.db
            .update(schema.organization, { id: orgId })
            .set({ memberCount: org.memberCount - 1n, updatedAt: event.block.timestamp });
    }
});
