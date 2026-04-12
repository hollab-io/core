// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IMeetingFactory} from 'interfaces/IMeetingFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title MeetingFactory
 * @notice Unified meeting contract with event-only lifecycle and governance execution.
 *
 *         In Holacracy, structural changes (creating/amending/removing roles) can ONLY
 *         happen through the governance process. This contract is authorized as the
 *         governance process on the RoleRegistry, so all structural changes must flow
 *         through it — enforcing that governance is the exclusive authority over structure.
 *
 *         Any org member can call executeGovernance to enact an adopted proposal.
 *         The on-chain contract does not track IDM process state (that lives in the
 *         frontend/off-chain); it trusts that only adopted proposals are submitted.
 */
contract MeetingFactory is IMeetingFactory {
  IOrganizationFactory public orgFactory;
  IRoleRegistry public roleRegistry;

  uint256 internal _meetingCounter;
  uint256 internal _itemCounter;
  bool internal _initialized;

  modifier initializer() {
    if (_initialized) revert MeetingFactory_AlreadyInitialized();
    _initialized = true;
    _;
  }

  constructor() {
    _initialized = true;
  }

  function initialize(
    address _orgFactory,
    address _roleRegistry
  ) external initializer {
    orgFactory = IOrganizationFactory(_orgFactory);
    roleRegistry = IRoleRegistry(_roleRegistry);
  }

  /*///////////////////////////////////////////////////////////////
                        MEETING LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  function startMeeting(
    uint256 _orgId,
    MeetingKind _kind
  ) external returns (uint256 _meetingId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    _meetingId = ++_meetingCounter;
    emit MeetingStarted(_meetingId, _orgId, _kind, msg.sender, block.timestamp);
  }

  function endMeeting(
    uint256 _meetingId,
    uint256 _orgId,
    MeetingKind _kind
  ) external {
    if (!orgFactory.isOrgAdmin(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(_orgId, msg.sender);
    }
    emit MeetingEnded(_meetingId, _orgId, _kind, msg.sender, block.timestamp);
  }

  function recordOutput(
    uint256 _meetingId,
    uint256 _orgId,
    HolacracyTypes.OutputType _outputType,
    string calldata _description,
    address _assignedTo,
    uint256 _roleId
  ) external returns (uint256 _itemId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }
    if (bytes(_description).length == 0) revert MeetingFactory_EmptyString();

    _itemId = ++_itemCounter;
    emit MeetingOutputRecorded(_meetingId, _itemId, _orgId, _outputType, _assignedTo, _roleId, _description);
  }

  function linkProposal(
    uint256 _meetingId,
    uint256 _orgId,
    uint256 _proposalId
  ) external returns (uint256 _itemId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    _itemId = ++_itemCounter;
    emit MeetingProposalLinked(_meetingId, _itemId, _orgId, _proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                    GOVERNANCE EXECUTION
  //////////////////////////////////////////////////////////////*/

  /// @notice Execute an adopted governance proposal — creates, amends, or removes a role.
  ///         In Holacracy, only the governance process can change structure. This function
  ///         is the on-chain embodiment of that rule: it forwards the change to RoleRegistry.
  /// @param _orgId The organization ID (for membership check)
  /// @param _changeType The type of structural change
  /// @param _data ABI-encoded parameters for the change (see below)
  /// @return _resultId The ID of the created/affected entity (roleId for role changes)
  ///
  /// Encoding for each change type:
  ///   CreateRole:         abi.encode(circleId, name, purpose, domains[], accountabilities[])
  ///   AmendRole:          abi.encode(roleId, name, purpose, domains[], accountabilities[])
  ///   RemoveRole:         abi.encode(roleId)
  ///   Election:           abi.encode(roleId, lead)
  ///   CreateRoleWithRefs: abi.encode(circleId, name, purpose, domains[], accountabilities[], fieldNames[], refs[])
  ///   AmendRoleWithRefs:  abi.encode(roleId, name, purpose, domains[], accountabilities[], fieldNames[], refs[])
  function executeGovernance(
    uint256 _orgId,
    HolacracyTypes.ChangeType _changeType,
    bytes calldata _data
  ) external returns (uint256 _resultId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    if (_changeType == HolacracyTypes.ChangeType.CreateRole) {
      (
        uint256 circleId,
        string memory name,
        string memory purpose,
        string[] memory domains,
        string[] memory accountabilities
      ) = abi.decode(_data, (uint256, string, string, string[], string[]));
      _resultId = roleRegistry.createRole(circleId, name, purpose, domains, accountabilities);
    } else if (_changeType == HolacracyTypes.ChangeType.AmendRole) {
      (
        uint256 roleId,
        string memory name,
        string memory purpose,
        string[] memory domains,
        string[] memory accountabilities
      ) = abi.decode(_data, (uint256, string, string, string[], string[]));
      roleRegistry.updateRole(roleId, name, purpose, domains, accountabilities);
      _resultId = roleId;
    } else if (_changeType == HolacracyTypes.ChangeType.RemoveRole) {
      uint256 roleId = abi.decode(_data, (uint256));
      roleRegistry.removeRole(roleId);
      _resultId = roleId;
    } else if (_changeType == HolacracyTypes.ChangeType.Election) {
      // Election: assign a role lead
      (uint256 roleId, address lead) = abi.decode(_data, (uint256, address));
      roleRegistry.assignRoleLead(roleId, lead);
      _resultId = roleId;
    } else if (_changeType == HolacracyTypes.ChangeType.CreateRoleWithRefs) {
      (
        uint256 circleId,
        string memory name,
        string memory purpose,
        string[] memory domains,
        string[] memory accountabilities,
        bytes32[] memory fieldNames,
        HolacracyTypes.ContentRef[] memory refs
      ) = abi.decode(_data, (uint256, string, string, string[], string[], bytes32[], HolacracyTypes.ContentRef[]));
      _resultId = roleRegistry.createRoleWithRefs(circleId, name, purpose, domains, accountabilities, fieldNames, refs);
    } else if (_changeType == HolacracyTypes.ChangeType.AmendRoleWithRefs) {
      (
        uint256 roleId,
        string memory name,
        string memory purpose,
        string[] memory domains,
        string[] memory accountabilities,
        bytes32[] memory fieldNames,
        HolacracyTypes.ContentRef[] memory refs
      ) = abi.decode(_data, (uint256, string, string, string[], string[], bytes32[], HolacracyTypes.ContentRef[]));
      roleRegistry.updateRoleWithRefs(roleId, name, purpose, domains, accountabilities, fieldNames, refs);
      _resultId = roleId;
    } else {
      revert MeetingFactory_UnsupportedChangeType();
    }

    emit GovernanceExecuted(_orgId, _changeType, _resultId, msg.sender);
  }
}
