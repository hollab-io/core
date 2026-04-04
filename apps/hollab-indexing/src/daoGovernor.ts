import { ponder } from "ponder:registry";
import schema from "ponder:schema";

const proposalId = (governor: string, id: bigint) => `${governor}-${id}`;
const voteId = (governor: string, pId: bigint, voter: string) =>
    `${governor}-${pId}-${voter.toLowerCase()}`;

// OZ Governor state values
const ProposalState = {
    Pending: 0,
    Active: 1,
    Canceled: 2,
    Defeated: 3,
    Succeeded: 4,
    Queued: 5,
    Expired: 6,
    Executed: 7,
} as const;

ponder.on("HolGovernor:ProposalCreated", async ({ event, context }) => {
    const { proposalId: pId, proposer, voteStart, voteEnd, description } = event.args;
    const governor = event.log.address;

    await context.db.insert(schema.daoProposal).values({
        id: proposalId(governor, pId),
        proposalId: pId,
        governorAddress: governor,
        proposer,
        description,
        voteStart,
        voteEnd,
        status: ProposalState.Pending,
        etaSeconds: null,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("HolGovernor:VoteCast", async ({ event, context }) => {
    const { voter, proposalId: pId, support, weight, reason } = event.args;
    const governor = event.log.address;

    await context.db
        .insert(schema.vote)
        .values({
            id: voteId(governor, pId, voter),
            proposalId: pId,
            governorAddress: governor,
            voter,
            support,
            weight,
            reason,
            castAt: event.block.timestamp,
            txHash: event.transaction.hash,
        })
        .onConflictDoNothing();
});

ponder.on("HolGovernor:ProposalQueued", async ({ event, context }) => {
    const { proposalId: pId, etaSeconds } = event.args;
    const governor = event.log.address;

    await context.db
        .update(schema.daoProposal, { id: proposalId(governor, pId) })
        .set({ status: ProposalState.Queued, etaSeconds });
});

ponder.on("HolGovernor:ProposalExecuted", async ({ event, context }) => {
    const { proposalId: pId } = event.args;
    const governor = event.log.address;

    await context.db
        .update(schema.daoProposal, { id: proposalId(governor, pId) })
        .set({ status: ProposalState.Executed });
});

ponder.on("HolGovernor:ProposalCanceled", async ({ event, context }) => {
    const { proposalId: pId } = event.args;
    const governor = event.log.address;

    await context.db
        .update(schema.daoProposal, { id: proposalId(governor, pId) })
        .set({ status: ProposalState.Canceled });
});
