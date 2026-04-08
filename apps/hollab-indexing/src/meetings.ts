/**
 * MeetingFactory event handlers.
 *
 * The unified MeetingFactory emits MeetingStarted / MeetingEnded / MeetingOutputRecorded /
 * MeetingProposalLinked. All data is in the events — no on-chain reads needed.
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

const mid = (contract: string, id: bigint) => `${contract}-${id}`;
const oid = (contract: string, id: bigint) => `${contract}-${id}`;

// MeetingKind: 0 = Tactical, 1 = Governance

ponder.on("MeetingFactory:MeetingStarted", async ({ event, context }) => {
    const { _meetingId, _orgId, _kind, _startedBy } = event.args;
    const contract = event.log.address;

    if (_kind === 0) {
        await context.db.insert(schema.tacticalMeeting).values({
            id: mid(contract, _meetingId),
            meetingId: _meetingId,
            contractAddress: contract,
            circleId: 0n,
            orgId: _orgId,
            convenedBy: _startedBy,
            createdAt: event.block.timestamp,
            completedAt: null,
            txHash: event.transaction.hash,
        });
    } else {
        await context.db.insert(schema.governanceMeeting).values({
            id: mid(contract, _meetingId),
            meetingId: _meetingId,
            contractAddress: contract,
            circleId: 0n,
            orgId: _orgId,
            convenedBy: _startedBy,
            createdAt: event.block.timestamp,
            completedAt: null,
            txHash: event.transaction.hash,
        });
    }
});

ponder.on("MeetingFactory:MeetingEnded", async ({ event, context }) => {
    const { _meetingId, _kind } = event.args;
    const contract = event.log.address;
    const id = mid(contract, _meetingId);

    if (_kind === 0) {
        await context.db
            .update(schema.tacticalMeeting, { id })
            .set({ completedAt: event.block.timestamp });
    } else {
        await context.db
            .update(schema.governanceMeeting, { id })
            .set({ completedAt: event.block.timestamp });
    }
});

ponder.on("MeetingFactory:MeetingOutputRecorded", async ({ event, context }) => {
    const { _meetingId, _itemId, _outputType, _assignedTo, _roleId, _description } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.meetingOutput).values({
        id: oid(contract, _itemId),
        outputId: _itemId,
        contractAddress: contract,
        meetingId: _meetingId,
        outputType: _outputType,
        description: _description,
        assignedTo: _assignedTo,
        roleId: _roleId,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("MeetingFactory:MeetingProposalLinked", async ({ event, context }) => {
    const { _meetingId, _itemId, _proposalId } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.governanceMeetingLink).values({
        id: `${contract}-${_meetingId}-${_proposalId}`,
        contractAddress: contract,
        meetingId: _meetingId,
        proposalId: _proposalId,
        linkedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});
