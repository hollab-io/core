/**
 * Meeting event handlers — TacticalMeeting + GovernanceMeeting.
 *
 * Both meeting types follow the same lifecycle: convened → (outputs/links recorded) → completed.
 * The contract address is used as a disambiguator in compound IDs so multiple per-org clones
 * never collide. OrgId is resolved from meetingContractIndex (populated by meetingFactory.ts).
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

import { TacticalMeetingAbi } from "../abis/TacticalMeetingAbi"; // used for getOutput read

const mid = (contract: string, id: bigint) => `${contract}-${id}`;
const lid = (contract: string, meetingId: bigint, proposalId: bigint) =>
    `${contract}-${meetingId}-${proposalId}`;
const oid = (contract: string, id: bigint) => `${contract}-${id}`;
const cid = (contract: string, id: bigint) => `${contract}-${id}`;
const meid = (contract: string, id: bigint) => `${contract}-${id}`;

// Resolves orgId from meetingContractIndex — populated when MeetingComponentsDeployed fires.
// No on-chain calls needed.
async function resolveOrgId(
    context: Parameters<Parameters<typeof ponder.on>[1]>[0]["context"],
    contractAddress: `0x${string}`,
): Promise<bigint> {
    const entry = await context.db.find(schema.meetingContractIndex, { contractAddress });
    return entry?.orgId ?? 0n;
}

// ─── TacticalMeeting ──────────────────────────────────────────────────────────

ponder.on("TacticalMeeting:MeetingConvened", async ({ event, context }) => {
    const { _meetingId, _circleId, _convenedBy } = event.args;
    const contract = event.log.address;

    const orgId = await resolveOrgId(context, contract);

    await context.db.insert(schema.tacticalMeeting).values({
        id: mid(contract, _meetingId),
        meetingId: _meetingId,
        contractAddress: contract,
        circleId: _circleId,
        orgId,
        convenedBy: _convenedBy,
        createdAt: event.block.timestamp,
        completedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("TacticalMeeting:MeetingCompleted", async ({ event, context }) => {
    const { _meetingId } = event.args;
    await context.db
        .update(schema.tacticalMeeting, { id: mid(event.log.address, _meetingId) })
        .set({ completedAt: event.block.timestamp });
});

ponder.on("TacticalMeeting:OutputRecorded", async ({ event, context }) => {
    const { _meetingId, _outputId, _outputType, _assignedTo } = event.args;
    const contract = event.log.address;

    // Read full output to get description (not included in the event)
    const full = await context.client.readContract({
        abi: TacticalMeetingAbi,
        address: contract,
        functionName: "getOutput",
        args: [_outputId],
    });

    await context.db.insert(schema.meetingOutput).values({
        id: oid(contract, _outputId),
        outputId: _outputId,
        contractAddress: contract,
        meetingId: _meetingId,
        outputType: _outputType,
        description: full.description,
        assignedTo: _assignedTo,
        roleId: full.roleId,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("TacticalMeeting:ChecklistItemAdded", async ({ event, context }) => {
    const { _roleId, _checklistItemId, _label } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.checklistItem).values({
        id: cid(contract, _checklistItemId),
        itemId: _checklistItemId,
        contractAddress: contract,
        roleId: _roleId,
        label: _label,
        isActive: true,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("TacticalMeeting:ChecklistItemRemoved", async ({ event, context }) => {
    const { _checklistItemId } = event.args;
    await context.db
        .update(schema.checklistItem, { id: cid(event.log.address, _checklistItemId) })
        .set({ isActive: false });
});

ponder.on("TacticalMeeting:MetricAdded", async ({ event, context }) => {
    const { _roleId, _metricId, _label } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.metric).values({
        id: meid(contract, _metricId),
        metricId: _metricId,
        contractAddress: contract,
        roleId: _roleId,
        label: _label,
        isActive: true,
        createdAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});

ponder.on("TacticalMeeting:MetricRemoved", async ({ event, context }) => {
    const { _metricId } = event.args;
    await context.db
        .update(schema.metric, { id: meid(event.log.address, _metricId) })
        .set({ isActive: false });
});

// ─── GovernanceMeeting ────────────────────────────────────────────────────────

ponder.on("GovernanceMeeting:MeetingConvened", async ({ event, context }) => {
    const { _meetingId, _circleId, _convenedBy } = event.args;
    const contract = event.log.address;

    const orgId = await resolveOrgId(context, contract);

    await context.db.insert(schema.governanceMeeting).values({
        id: mid(contract, _meetingId),
        meetingId: _meetingId,
        contractAddress: contract,
        circleId: _circleId,
        orgId,
        convenedBy: _convenedBy,
        createdAt: event.block.timestamp,
        completedAt: null,
        txHash: event.transaction.hash,
    });
});

ponder.on("GovernanceMeeting:MeetingCompleted", async ({ event, context }) => {
    const { _meetingId } = event.args;
    await context.db
        .update(schema.governanceMeeting, { id: mid(event.log.address, _meetingId) })
        .set({ completedAt: event.block.timestamp });
});

ponder.on("GovernanceMeeting:ProposalLinked", async ({ event, context }) => {
    const { _meetingId, _proposalId } = event.args;
    const contract = event.log.address;

    await context.db.insert(schema.governanceMeetingLink).values({
        id: lid(contract, _meetingId, _proposalId),
        contractAddress: contract,
        meetingId: _meetingId,
        proposalId: _proposalId,
        linkedAt: event.block.timestamp,
        txHash: event.transaction.hash,
    });
});
