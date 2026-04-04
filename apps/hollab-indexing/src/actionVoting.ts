/**
 * ActionVoting event handlers.
 *
 * Indexes lightweight circle-level votes on tactical meeting outputs.
 * Vote tallies (forVotes / againstVotes / abstainVotes) are kept current on
 * every VoteCast so the client can read final counts without on-chain calls.
 * OrgId is resolved from meetingContractIndex (no on-chain calls needed).
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { ActionVotingAbi } from "../abis/ActionVotingAbi";

const vid = (contract: string, voteId: bigint) => `${contract}-${voteId}`;
const castId = (contract: string, voteId: bigint, voter: string) =>
    `${contract}-${voteId}-${voter.toLowerCase()}`;

// 0=Against 1=For 2=Abstain
const VoteSupport = { Against: 0, For: 1, Abstain: 2 } as const;

ponder.on("ActionVoting:VoteCreated", async ({ event, context }) => {
    const { _voteId, _circleId, _outputId, _proposer, _deadline } = event.args;
    const contract = event.log.address;

    const entry = await context.db.find(schema.meetingContractIndex, { contractAddress: contract });
    const orgId = entry?.orgId ?? 0n;

    // Read full vote to get reason (not included in the event)
    const full = await context.client.readContract({
        abi: ActionVotingAbi,
        address: contract,
        functionName: "getVote",
        args: [_voteId],
    });

    await context.db.insert(schema.actionVote).values({
        id: vid(contract, _voteId),
        voteId: _voteId,
        contractAddress: contract,
        orgId,
        circleId: _circleId,
        outputId: _outputId,
        proposer: _proposer,
        reason: full.reason,
        snapshotBlock: full.snapshotBlock,
        deadline: _deadline,
        forVotes: 0n,
        againstVotes: 0n,
        abstainVotes: 0n,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("ActionVoting:VoteCast", async ({ event, context }) => {
    const { _voteId, _voter, _support, _weight } = event.args;
    const contract = event.log.address;

    // Insert individual ballot
    await context.db
        .insert(schema.actionVoteCast)
        .values({
            id: castId(contract, _voteId, _voter),
            contractAddress: contract,
            voteId: _voteId,
            voter: _voter,
            support: _support,
            weight: _weight,
            castAt: event.block.timestamp,
            txHash: event.transaction.hash,
        })
        .onConflictDoNothing();

    // Update running tallies on the parent vote record
    const voteRow = await context.db.find(schema.actionVote, { id: vid(contract, _voteId) });
    if (!voteRow) return;

    const delta =
        _support === VoteSupport.For
            ? { forVotes: voteRow.forVotes + _weight }
            : _support === VoteSupport.Against
              ? { againstVotes: voteRow.againstVotes + _weight }
              : { abstainVotes: voteRow.abstainVotes + _weight };

    await context.db.update(schema.actionVote, { id: vid(contract, _voteId) }).set(delta);
});
