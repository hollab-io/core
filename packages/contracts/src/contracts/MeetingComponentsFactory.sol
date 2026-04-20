// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {RoleDataRegistry} from 'contracts/RoleDataRegistry.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';

/**
 * @title MeetingComponentsFactory
 * @notice Deploys per-org MeetingFactory and ActionVoting clones in a single transaction.
 *
 * @dev Each deploy() call:
 *      1. Resolves the OrganizationInstance via factory.getOrganizationBySubname(subname)
 *      2. Asserts the caller is an admin on the instance (not on the factory)
 *      3. Clones both implementation contracts via ERC-1167
 *      4. Initializes them with the org's existing contracts
 *      5. Calls instance.setMeetingFactory(clone) and instance.setRoleRegistryGovernanceProcess(clone)
 *         — the instance is the sole authority over its RoleRegistry after createOrganization
 *      6. Emits MeetingComponentsDeployed for indexer auto-discovery
 */
contract MeetingComponentsFactory is IMeetingComponentsFactory {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice MeetingFactory implementation used for cloning
  address public immutable meetingFactoryImplementation;

  /// @notice ActionVoting implementation used for cloning
  address public immutable actionVotingImplementation;

  /// @notice RoleDataRegistry implementation used for cloning
  address public immutable roleDataRegistryImplementation;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  constructor(
    address _meetingFactoryImpl,
    address _actionVotingImpl,
    address _roleDataRegistryImpl
  ) {
    if (_meetingFactoryImpl == address(0) || _actionVotingImpl == address(0) || _roleDataRegistryImpl == address(0)) {
      revert MeetingComponentsFactory_ZeroAddress();
    }
    meetingFactoryImplementation = _meetingFactoryImpl;
    actionVotingImplementation = _actionVotingImpl;
    roleDataRegistryImplementation = _roleDataRegistryImpl;
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IMeetingComponentsFactory
  function deploy(
    string calldata _subname,
    address _orgFactory
  ) external returns (Deployment memory deployment) {
    // ── 0. Resolve org instance ─────────────────────────────────────────────
    address _instance = IOrganizationFactory(_orgFactory).getOrganizationBySubname(_subname);
    if (_instance == address(0)) revert MeetingComponentsFactory_OrgNotFound(_subname);
    IOrganizationInstance _org = IOrganizationInstance(_instance);

    uint256 _orgId = _org.id();
    address _roleRegistry = _org.roleRegistry();
    address _govToken = _org.token();

    // ── 0b. Authorize caller (admin of the instance) ────────────────────────
    if (!_org.isAdmin(msg.sender)) revert MeetingComponentsFactory_Unauthorized();

    // ── 1. Clone ────────────────────────────────────────────────────────────
    MeetingFactory meetingFactory = MeetingFactory(Clones.clone(meetingFactoryImplementation));
    ActionVoting actionVoting = ActionVoting(Clones.clone(actionVotingImplementation));
    RoleDataRegistry roleDataRegistry = RoleDataRegistry(Clones.clone(roleDataRegistryImplementation));

    // ── 2. Initialize ───────────────────────────────────────────────────────
    meetingFactory.initialize(_orgId, _instance, _roleRegistry);
    actionVoting.initialize(_orgId, _instance, address(meetingFactory), _govToken);
    roleDataRegistry.initialize(_orgId, _instance, _roleRegistry);

    // ── 3. Wire onto the instance (instance is the authority, not the factory) ──
    _org.setMeetingFactory(address(meetingFactory));
    if (_roleRegistry != address(0)) {
      _org.setRoleRegistryGovernanceProcess(address(meetingFactory));
    }

    // ── 4. Emit for indexer auto-discovery ──────────────────────────────────
    deployment = Deployment({
      meetingFactory: address(meetingFactory),
      actionVoting: address(actionVoting),
      roleDataRegistry: address(roleDataRegistry)
    });

    emit MeetingComponentsDeployed(_orgId, address(meetingFactory), address(actionVoting), address(roleDataRegistry));
  }
}
