// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

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

  constructor(
    address _meetingFactoryImpl,
    address _actionVotingImpl
  ) {
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
    string calldata _subname,
    address _orgFactory
  ) external returns (Deployment memory deployment) {
    // ── 0. Resolve org addresses ────────────────────────────────────────────────
    // Looking up by subname (instead of a predicted orgId) makes this safe to batch
    // with createOrganization via EIP-5792: the subname is known at call-encoding
    // time, so there is no race against other orgs being created between the
    // client-side prediction and the batch landing on-chain.
    IOrganizationFactory _factory = IOrganizationFactory(_orgFactory);
    HolacracyTypes.Organization memory _org = _factory.getOrganizationBySubname(_subname);
    if (_org.id == 0) revert MeetingComponentsFactory_OrgNotFound(_subname);
    uint256 _orgId = _org.id;
    address _roleRegistry = _org.roleRegistry;
    address _govToken = _org.token;

    // ── 0b. Authorize caller ───────────────────────────────────────────────────
    if (!_factory.isOrgAdmin(_orgId, msg.sender)) revert MeetingComponentsFactory_Unauthorized();

    // ── 1. Clone ────────────────────────────────────────────────────────────────
    MeetingFactory meetingFactory = MeetingFactory(Clones.clone(meetingFactoryImplementation));
    ActionVoting actionVoting = ActionVoting(Clones.clone(actionVotingImplementation));

    // ── 2. Initialize ────────────────────────────────────────────────────────────
    meetingFactory.initialize(_orgId, _orgFactory, _roleRegistry);
    actionVoting.initialize(_orgId, _orgFactory, address(meetingFactory), _govToken);

    // ── 3. Wire governance process ───────────────────────────────────────────────
    // MeetingFactory becomes the only address that can modify roles on this
    // org's RoleRegistry — enforcing Holacracy's governance-only structure changes.
    // Routes through OrgFactory which is the only address the RoleRegistry trusts.
    if (_roleRegistry != address(0)) {
      _factory.setRoleRegistryGovernanceProcess(_orgId, address(meetingFactory));
    }

    // ── 4. Emit for indexer auto-discovery ───────────────────────────────────────
    deployment = Deployment({meetingFactory: address(meetingFactory), actionVoting: address(actionVoting)});

    emit MeetingComponentsDeployed(_orgId, address(meetingFactory), address(actionVoting));
  }
}
