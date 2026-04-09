// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';

/**
 * @title MeetingComponentsFactory
 * @notice Deploys per-org MeetingFactory and ActionVoting clones in a single transaction.
 *
 * @dev Each deploy() call:
 *      1. Clones both implementation contracts via ERC-1167.
 *      2. Initializes them with the org's existing contracts.
 *      3. Wires MeetingFactory as the governance process on RoleRegistry.
 *      4. Emits MeetingComponentsDeployed so off-chain indexers can auto-discover clones.
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
    address _roleRegistry,
    address _govToken
  ) external returns (Deployment memory deployment) {
    // ── 1. Clone ────────────────────────────────────────────────────────────────
    MeetingFactory meetingFactory = MeetingFactory(Clones.clone(meetingFactoryImplementation));
    ActionVoting actionVoting = ActionVoting(Clones.clone(actionVotingImplementation));

    // ── 2. Initialize ────────────────────────────────────────────────────────────
    meetingFactory.initialize(_orgFactory, _roleRegistry);
    actionVoting.initialize(_orgFactory, address(meetingFactory), _govToken);

    // ── 3. Wire governance process ───────────────────────────────────────────────
    // MeetingFactory becomes the only address that can modify roles on this
    // org's RoleRegistry — enforcing Holacracy's governance-only structure changes.
    if (_roleRegistry != address(0)) {
      RoleRegistry(_roleRegistry).setGovernanceProcess(address(meetingFactory));
    }

    // ── 4. Emit for indexer auto-discovery ───────────────────────────────────────
    deployment = Deployment({
      meetingFactory: address(meetingFactory),
      actionVoting: address(actionVoting)
    });

    emit MeetingComponentsDeployed(_orgId, address(meetingFactory), address(actionVoting));
  }
}
