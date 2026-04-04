/**
 * MeetingComponentsFactory handler.
 *
 * On every MeetingComponentsDeployed event:
 *  - Records the full component set (orgId + three contract addresses) in meetingComponentSet.
 *  - Writes three rows to meetingContractIndex so any meeting handler can resolve
 *    orgId from just the contract address, without on-chain calls.
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

ponder.on("MeetingComponentsFactory:MeetingComponentsDeployed", async ({ event, context }) => {
    const { _orgId, _tacticalMeeting, _governanceMeeting, _actionVoting } = event.args;
    const txHash = event.transaction.hash;
    const setId = `${_orgId}-${txHash}`;

    await context.db.insert(schema.meetingComponentSet).values({
        id: setId,
        orgId: _orgId,
        tacticalMeeting: _tacticalMeeting,
        governanceMeeting: _governanceMeeting,
        actionVoting: _actionVoting,
        deployedAt: event.block.timestamp,
        txHash,
    });

    // Three lookup rows — one per contract address — for O(1) orgId resolution.
    await context.db.insert(schema.meetingContractIndex).values([
        { contractAddress: _tacticalMeeting, orgId: _orgId, setId },
        { contractAddress: _governanceMeeting, orgId: _orgId, setId },
        { contractAddress: _actionVoting, orgId: _orgId, setId },
    ]);
});
