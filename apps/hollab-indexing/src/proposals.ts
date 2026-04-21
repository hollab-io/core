/**
 * Proposal lifecycle handlers — MeetingFactory commitments-only audit trail.
 *
 * The on-chain MeetingFactory only records:
 *   - who proposed what change, when
 *   - who objected, when, and what their concern hash was
 *   - who adopted/discarded/resolved, when
 *
 * IDM rounds (clarifying questions, reactions, integration discussion) live
 * in the meeting room and never touch chain. See
 * specs/05-governance-process.md "On-chain Commitments Surface".
 *
 * All five handlers persist directly from event args — no contract reads —
 * because ProposalCreated carries `bytes changeData` unindexed in the event
 * payload, so the indexer is the source of truth for the full proposal row
 * and stays cheap.
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

const pid = (contract: string, id: bigint) => `${contract.toLowerCase()}-${id}`;

ponder.on("MeetingFactory:ProposalCreated", async ({ event, context }) => {
    const {
        _proposalId,
        _orgId,
        _circleId,
        _proposer,
        _proposerRoleId,
        _tensionHash,
        _changeType,
        _changeData,
    } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.proposal).values({
        id: pid(contract, _proposalId),
        proposalId: _proposalId,
        processAddress: contract,
        orgId: _orgId,
        circleId: _circleId,
        proposer: _proposer,
        proposerRoleId: _proposerRoleId,
        tensionHash: _tensionHash,
        changeType: _changeType,
        changeData: _changeData,
        status: 0, // Draft
        changeResultId: null,
        submittedAt: event.block.timestamp,
        resolvedAt: null,
        resolvedBy: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("MeetingFactory:ProposalAdopted", async ({ event, context }) => {
    const { _proposalId, _resultId, _adoptedBy } = event.args;
    const id = pid(event.log.address, _proposalId);

    await context.db.update(schema.proposal, { id }).set({
        status: 3, // Adopted
        changeResultId: _resultId,
        resolvedAt: event.block.timestamp,
        resolvedBy: _adoptedBy,
    });
});

ponder.on("MeetingFactory:ProposalDiscarded", async ({ event, context }) => {
    const { _proposalId, _discardedBy } = event.args;
    const id = pid(event.log.address, _proposalId);

    await context.db.update(schema.proposal, { id }).set({
        status: 5, // Discarded
        resolvedAt: event.block.timestamp,
        resolvedBy: _discardedBy,
    });
});

ponder.on("MeetingFactory:ObjectionRaised", async ({ event, context }) => {
    const { _objectionId, _proposalId, _objector, _objectorRoleId, _concernHash } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.objection).values({
        id: pid(contract, _objectionId),
        objectionId: _objectionId,
        processAddress: contract,
        proposalId: _proposalId,
        objector: _objector,
        objectorRoleId: _objectorRoleId,
        concernHash: _concernHash,
        status: 0, // Raised
        raisedAt: event.block.timestamp,
        resolvedAt: null,
        resolvedBy: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("MeetingFactory:ObjectionResolved", async ({ event, context }) => {
    const { _objectionId, _resolvedBy } = event.args;
    const id = pid(event.log.address, _objectionId);

    await context.db.update(schema.objection, { id }).set({
        status: 4, // Resolved
        resolvedAt: event.block.timestamp,
        resolvedBy: _resolvedBy,
    });
});
