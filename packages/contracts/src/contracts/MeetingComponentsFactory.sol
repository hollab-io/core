// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {TacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {GovernanceMeeting} from 'contracts/GovernanceMeeting.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/**
 * @title MeetingComponentsFactory
 * @notice Deploys per-org TacticalMeeting, GovernanceMeeting, and ActionVoting clones
 *         in a single transaction.
 *
 * @dev Each deploy() call:
 *      1. Clones all three implementation contracts via ERC-1167.
 *      2. Initializes them with the org's existing contracts.
 *      3. Emits MeetingComponentsDeployed so off-chain indexers (e.g. Ponder) can
 *         auto-discover the per-org clone addresses without manual configuration.
 *
 * Deployments are tracked solely via events — no on-chain registry is maintained.
 */
contract MeetingComponentsFactory is IMeetingComponentsFactory {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice TacticalMeeting implementation used for cloning
  address public immutable tacticalMeetingImplementation;

  /// @notice GovernanceMeeting implementation used for cloning
  address public immutable governanceMeetingImplementation;

  /// @notice ActionVoting implementation used for cloning
  address public immutable actionVotingImplementation;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @param _tacticalMeetingImpl    Deployed TacticalMeeting implementation
  /// @param _governanceMeetingImpl  Deployed GovernanceMeeting implementation
  /// @param _actionVotingImpl       Deployed ActionVoting implementation
  constructor(address _tacticalMeetingImpl, address _governanceMeetingImpl, address _actionVotingImpl) {
    if (_tacticalMeetingImpl == address(0) || _governanceMeetingImpl == address(0) || _actionVotingImpl == address(0)) {
      revert MeetingComponentsFactory_ZeroAddress();
    }
    tacticalMeetingImplementation = _tacticalMeetingImpl;
    governanceMeetingImplementation = _governanceMeetingImpl;
    actionVotingImplementation = _actionVotingImpl;
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IMeetingComponentsFactory
  function deploy(
    uint256 _orgId,
    address _circleRegistry,
    address _roleRegistry,
    address _governanceProcess,
    address _govToken
  ) external returns (Deployment memory deployment) {
    // ── 1. Clone ────────────────────────────────────────────────────────────────
    TacticalMeeting tacticalMeeting = TacticalMeeting(Clones.clone(tacticalMeetingImplementation));
    GovernanceMeeting governanceMeeting = GovernanceMeeting(Clones.clone(governanceMeetingImplementation));
    ActionVoting actionVoting = ActionVoting(Clones.clone(actionVotingImplementation));

    // ── 2. Initialize ────────────────────────────────────────────────────────────
    tacticalMeeting.initialize(CircleRegistry(_circleRegistry), RoleRegistry(_roleRegistry));
    governanceMeeting.initialize(CircleRegistry(_circleRegistry), GovernanceProcess(_governanceProcess));
    actionVoting.initialize(_circleRegistry, address(tacticalMeeting), _govToken);

    // ── 3. Emit for indexer auto-discovery ───────────────────────────────────────
    deployment = Deployment({
      tacticalMeeting: address(tacticalMeeting),
      governanceMeeting: address(governanceMeeting),
      actionVoting: address(actionVoting)
    });

    emit MeetingComponentsDeployed(_orgId, address(tacticalMeeting), address(governanceMeeting), address(actionVoting));
  }
}
