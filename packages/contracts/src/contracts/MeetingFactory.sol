// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IMeetingFactory} from 'interfaces/IMeetingFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title MeetingFactory
 * @notice Unified meeting contract with event-driven lifecycle and a
 *         commitments-only proposal/objection audit trail.
 *
 *         In Holacracy, structural changes (creating/amending/removing roles) can ONLY
 *         happen through the governance process. This contract is authorized as the
 *         governance process on the RoleRegistry, so all structural changes must flow
 *         through createProposal + adoptProposal — enforcing that governance is the
 *         exclusive authority over structure.
 *
 *         The on-chain contract does not model IDM rounds (clarifying questions,
 *         reactions, integration). Those live in the meeting room. What the contract
 *         commits to is: who proposed what, who objected, who adopted or discarded,
 *         when each step happened. See specs/05-governance-process.md
 *         "On-chain Commitments Surface".
 */
contract MeetingFactory is IMeetingFactory {
  IOrganizationFactory public orgFactory;
  IRoleRegistry public roleRegistry;

  uint256 internal _meetingCounter;
  uint256 internal _itemCounter;
  bool internal _initialized;

  // ── Proposal lifecycle storage ────────────────────────────────────────────
  // Append-only; safe in clones because each clone gets a fresh storage layout
  // at deploy time. See specs/05-governance-process.md "On-chain Commitments
  // Surface" for the full design rationale.
  uint256 internal _proposalCounter;
  uint256 internal _objectionCounter;
  mapping(uint256 => ProposalRecord) internal _proposals;
  mapping(uint256 => ObjectionRecord) internal _objections;

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

  /// @notice Internal change applicator invoked by adoptProposal to apply a
  ///         stored proposal's change payload to the RoleRegistry.
  ///
  /// Encoding for each change type:
  ///   CreateRole:         abi.encode(circleId, name, purpose, domains[], accountabilities[])
  ///   AmendRole:          abi.encode(roleId, name, purpose, domains[], accountabilities[])
  ///   RemoveRole:         abi.encode(roleId)
  ///   Election:           abi.encode(roleId, lead)
  ///   CreateRoleWithRefs: abi.encode(circleId, name, purpose, domains[], accountabilities[], fieldNames[], refs[])
  ///   AmendRoleWithRefs:  abi.encode(roleId, name, purpose, domains[], accountabilities[], fieldNames[], refs[])
  ///   ExpandRoleToCircle: abi.encode(roleId)
  function _applyChange(
    HolacracyTypes.ChangeType _changeType,
    bytes memory _data
  ) internal returns (uint256 _resultId) {
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
    } else if (_changeType == HolacracyTypes.ChangeType.ExpandRoleToCircle) {
      uint256 roleId = abi.decode(_data, (uint256));
      roleRegistry.expandToCircle(roleId);
      _resultId = roleId;
    } else {
      revert MeetingFactory_UnsupportedChangeType();
    }
  }

  /*///////////////////////////////////////////////////////////////
                      PROPOSAL LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IMeetingFactory
  function createProposal(
    uint256 _orgId,
    uint256 _circleId,
    uint256 _proposerRoleId,
    bytes32 _tensionHash,
    HolacracyTypes.ChangeType _changeType,
    bytes calldata _changeData
  ) external returns (uint256 _proposalId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    _proposalId = ++_proposalCounter;
    ProposalRecord storage p = _proposals[_proposalId];
    p.id = _proposalId;
    p.orgId = _orgId;
    p.circleId = _circleId;
    p.proposer = msg.sender;
    p.proposerRoleId = _proposerRoleId;
    p.tensionHash = _tensionHash;
    p.changeType = _changeType;
    p.changeData = _changeData;
    p.status = HolacracyTypes.ProposalStatus.Draft;
    p.submittedAt = uint64(block.timestamp);
    // resolvedAt stays 0 until adopt/discard

    emit ProposalCreated(
      _proposalId, _orgId, _circleId, msg.sender, _proposerRoleId, _tensionHash, uint8(_changeType), _changeData
    );
  }

  /// @inheritdoc IMeetingFactory
  function adoptProposal(
    uint256 _proposalId
  ) external returns (uint256 _resultId) {
    ProposalRecord storage p = _proposals[_proposalId];
    if (p.id == 0) revert MeetingFactory_ProposalNotFound(_proposalId);
    if (p.status != HolacracyTypes.ProposalStatus.Draft) {
      revert MeetingFactory_InvalidProposalStatus(_proposalId, p.status);
    }
    if (!orgFactory.isOrgAdmin(p.orgId, msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(p.orgId, msg.sender);
    }

    _resultId = _applyChange(p.changeType, p.changeData);
    p.status = HolacracyTypes.ProposalStatus.Adopted;
    p.resolvedAt = uint64(block.timestamp);

    emit ProposalAdopted(_proposalId, p.orgId, _resultId, msg.sender);
  }

  /// @inheritdoc IMeetingFactory
  function discardProposal(
    uint256 _proposalId
  ) external {
    ProposalRecord storage p = _proposals[_proposalId];
    if (p.id == 0) revert MeetingFactory_ProposalNotFound(_proposalId);
    if (p.status != HolacracyTypes.ProposalStatus.Draft) {
      revert MeetingFactory_InvalidProposalStatus(_proposalId, p.status);
    }
    if (!orgFactory.isOrgAdmin(p.orgId, msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(p.orgId, msg.sender);
    }

    p.status = HolacracyTypes.ProposalStatus.Discarded;
    p.resolvedAt = uint64(block.timestamp);

    emit ProposalDiscarded(_proposalId, p.orgId, msg.sender);
  }

  /// @inheritdoc IMeetingFactory
  function raiseObjection(
    uint256 _proposalId,
    bytes32 _concernHash
  ) external returns (uint256 _objectionId) {
    ProposalRecord storage p = _proposals[_proposalId];
    if (p.id == 0) revert MeetingFactory_ProposalNotFound(_proposalId);
    if (p.status != HolacracyTypes.ProposalStatus.Draft) {
      revert MeetingFactory_InvalidProposalStatus(_proposalId, p.status);
    }
    if (!orgFactory.isOrgMember(p.orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(p.orgId, msg.sender);
    }

    _objectionId = ++_objectionCounter;
    ObjectionRecord storage o = _objections[_objectionId];
    o.id = _objectionId;
    o.proposalId = _proposalId;
    o.objector = msg.sender;
    o.concernHash = _concernHash;
    o.status = HolacracyTypes.ObjectionStatus.Raised;
    o.raisedAt = uint64(block.timestamp);

    emit ObjectionRaised(_objectionId, _proposalId, msg.sender, _concernHash);
  }

  /// @inheritdoc IMeetingFactory
  function resolveObjection(
    uint256 _objectionId
  ) external {
    ObjectionRecord storage o = _objections[_objectionId];
    if (o.id == 0) revert MeetingFactory_ObjectionNotFound(_objectionId);
    if (o.status != HolacracyTypes.ObjectionStatus.Raised) {
      revert MeetingFactory_InvalidObjectionStatus(_objectionId, o.status);
    }

    ProposalRecord storage p = _proposals[o.proposalId];
    bool isObjector = msg.sender == o.objector;
    bool isAdmin = orgFactory.isOrgAdmin(p.orgId, msg.sender);
    if (!isObjector && !isAdmin) {
      revert MeetingFactory_NotObjectorOrAdmin(_objectionId, msg.sender);
    }

    o.status = HolacracyTypes.ObjectionStatus.Resolved;
    o.resolvedAt = uint64(block.timestamp);

    emit ObjectionResolved(_objectionId, o.proposalId, msg.sender);
  }

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IMeetingFactory
  function getProposal(
    uint256 _proposalId
  ) external view returns (ProposalRecord memory _proposal) {
    _proposal = _proposals[_proposalId];
  }

  /// @inheritdoc IMeetingFactory
  function getObjection(
    uint256 _objectionId
  ) external view returns (ObjectionRecord memory _objection) {
    _objection = _objections[_objectionId];
  }

  /// @inheritdoc IMeetingFactory
  function proposalCount() external view returns (uint256 _count) {
    _count = _proposalCounter;
  }

  /// @inheritdoc IMeetingFactory
  function objectionCount() external view returns (uint256 _count) {
    _count = _objectionCounter;
  }
}
