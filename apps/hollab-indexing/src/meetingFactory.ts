/**
 * MeetingComponentsFactory handler.
 *
 * On every MeetingComponentsDeployed event:
 *  - Records the component set (orgId + MeetingFactory + ActionVoting) in meetingComponentSet.
 *  - Writes lookup rows to meetingContractIndex for orgId resolution by contract address.
 */
import { ponder } from "ponder:registry";
import schema from "ponder:schema";

ponder.on("MeetingComponentsFactory:MeetingComponentsDeployed", async ({ event, context }) => {
    const { _orgId, _meetingFactory, _actionVoting, _roleDataRegistry } = event.args;
    const txHash = event.transaction.hash;
    const setId = `${_orgId}-${txHash}`;

    await context.db.insert(schema.meetingComponentSet).values({
        id: setId,
        orgId: _orgId,
        meetingFactory: _meetingFactory,
        actionVoting: _actionVoting,
        roleDataRegistry: _roleDataRegistry,
        deployedAt: event.block.timestamp,
        txHash,
    });

    await context.db.insert(schema.meetingContractIndex).values([
        { contractAddress: _meetingFactory, orgId: _orgId, setId },
        { contractAddress: _actionVoting, orgId: _orgId, setId },
        { contractAddress: _roleDataRegistry, orgId: _orgId, setId },
    ]);
});
