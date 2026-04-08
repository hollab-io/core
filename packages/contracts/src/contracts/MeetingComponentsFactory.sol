// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';

/**
 * @title MeetingComponentsFactory
 * @notice Deploys per-org MeetingFactory and ActionVoting clones in a single transaction.
 *
 * @dev Each deploy() call:
 *      1. Clones both implementation contracts via ERC-1167.
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

  /// @notice MeetingFactory implementation used for cloning
  address public immutable meetingFactoryImplementation;

  /// @notice ActionVoting implementation used for cloning
  address public immutable actionVotingImplementation;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @param _meetingFactoryImpl     Deployed MeetingFactory implementation
  /// @param _actionVotingImpl       Deployed ActionVoting implementation
  constructor(address _meetingFactoryImpl, address _actionVotingImpl) {
    if (_meetingFactoryImpl == address(0) || _actionVotingImpl == address(0)) {
      revert MeetingComponentsFactory_ZeroAddress();
    }
    meetingFactoryImplementation = _meetingFactoryImpl;
    actionVotingImplementation = _actionVotingImpl;
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IMeetingComponentsFactory
  function deploy(
    uint256 _orgId,
    address _orgFactory,
    address _govToken
  ) external returns (Deployment memory deployment) {
    // ── 1. Clone ────────────────────────────────────────────────────────────────
    MeetingFactory meetingFactory = MeetingFactory(Clones.clone(meetingFactoryImplementation));
    ActionVoting actionVoting = ActionVoting(Clones.clone(actionVotingImplementation));

    // ── 2. Initialize ────────────────────────────────────────────────────────────
    meetingFactory.initialize(_orgFactory, address(0), address(0));
    actionVoting.initialize(_orgFactory, address(meetingFactory), _govToken);

    // ── 3. Emit for indexer auto-discovery ───────────────────────────────────────
    deployment = Deployment({
      meetingFactory: address(meetingFactory),
      actionVoting: address(actionVoting)
    });

    emit MeetingComponentsDeployed(_orgId, address(meetingFactory), address(actionVoting));
  }
}
