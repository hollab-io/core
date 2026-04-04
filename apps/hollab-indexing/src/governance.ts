import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { GovernanceProcessAbi } from "../abis/GovernanceProcessAbi";

const pid = (process: string, id: bigint) => `${process}-${id}`;
const oid = (process: string, id: bigint) => `${process}-${id}`;

const Status = {
    Draft: 0,
    Active: 1,
    Integrating: 2,
    Adopted: 3,
    Withdrawn: 4,
    Discarded: 5,
    Escalated: 6,
} as const;

const ObjStatus = {
    Raised: 0,
    Testing: 1,
    Valid: 2,
    Invalid: 3,
    Resolved: 4,
    Abandoned: 5,
} as const;

// ─── Proposals ────────────────────────────────────────────────────────────────

ponder.on("GovernanceProcess:ProposalSubmitted", async ({ event, context }) => {
    const { _proposalId, _circleId, _proposer } = event.args;
    const process = event.log.address;

    // Read full proposal struct to get tension + proposerRoleId
    const full = await context.client.readContract({
        abi: GovernanceProcessAbi,
        address: process,
        functionName: "getProposal",
        args: [_proposalId],
    });

    await context.db.insert(schema.proposal).values({
        id: pid(process, _proposalId),
        proposalId: _proposalId,
        processAddress: process,
        circleId: _circleId,
        proposer: _proposer,
        proposerRoleId: full.proposerRoleId,
        tension: full.tension ?? "",
        status: Status.Draft,
        daoProposalId: null,
        submittedAt: event.block.timestamp,
        resolvedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("GovernanceProcess:ProposalActivated", async ({ event, context }) => {
    const { _proposalId } = event.args;
    await context.db
        .update(schema.proposal, { id: pid(event.log.address, _proposalId) })
        .set({ status: Status.Active });
});

ponder.on("GovernanceProcess:ProposalAdopted", async ({ event, context }) => {
    const { _proposalId } = event.args;
    await context.db
        .update(schema.proposal, { id: pid(event.log.address, _proposalId) })
        .set({ status: Status.Adopted, resolvedAt: event.block.timestamp });
});

ponder.on("GovernanceProcess:ProposalWithdrawn", async ({ event, context }) => {
    const { _proposalId } = event.args;
    await context.db
        .update(schema.proposal, { id: pid(event.log.address, _proposalId) })
        .set({ status: Status.Withdrawn, resolvedAt: event.block.timestamp });
});

ponder.on("GovernanceProcess:ProposalDiscarded", async ({ event, context }) => {
    const { _proposalId } = event.args;
    await context.db
        .update(schema.proposal, { id: pid(event.log.address, _proposalId) })
        .set({ status: Status.Discarded, resolvedAt: event.block.timestamp });
});

ponder.on("GovernanceProcess:ProposalEscalated", async ({ event, context }) => {
    const { _proposalId, _daoProposalId } = event.args;
    await context.db
        .update(schema.proposal, { id: pid(event.log.address, _proposalId) })
        .set({ status: Status.Escalated, daoProposalId: _daoProposalId });
});

// ─── Objections ───────────────────────────────────────────────────────────────

ponder.on("GovernanceProcess:ObjectionRaised", async ({ event, context }) => {
    const { _objectionId, _proposalId, _objector } = event.args;
    const process = event.log.address;

    await context.db
        .update(schema.proposal, { id: pid(process, _proposalId) })
        .set({ status: Status.Integrating });

    await context.db.insert(schema.objection).values({
        id: oid(process, _objectionId),
        objectionId: _objectionId,
        processAddress: process,
        proposalId: _proposalId,
        objector: _objector,
        status: ObjStatus.Raised,
        raisedAt: event.block.timestamp,
        resolvedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("GovernanceProcess:ObjectionResolved", async ({ event, context }) => {
    const { _objectionId } = event.args;
    await context.db
        .update(schema.objection, { id: oid(event.log.address, _objectionId) })
        .set({ status: ObjStatus.Resolved, resolvedAt: event.block.timestamp });
});

ponder.on("GovernanceProcess:ObjectionInvalidated", async ({ event, context }) => {
    const { _objectionId } = event.args;
    await context.db
        .update(schema.objection, { id: oid(event.log.address, _objectionId) })
        .set({ status: ObjStatus.Invalid, resolvedAt: event.block.timestamp });
});
