// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {IMeetingFactory} from 'interfaces/IMeetingFactory.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {ChangeValidator} from 'libraries/ChangeValidator.sol';
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
contract MeetingFactory is Initializable, IMeetingFactory {
  uint256 public orgId;
  IOrganizationInstance public org;
  IRoleRegistry public roleRegistry;

  uint256 internal _meetingCounter;
  uint256 internal _itemCounter;

  // ── Proposal lifecycle storage ────────────────────────────────────────────
  // Append-only; safe in clones because each clone gets a fresh storage layout
  // at deploy time. See specs/05-governance-process.md "On-chain Commitments
  // Surface" for the full design rationale.
  uint256 internal _proposalCounter;
  uint256 internal _objectionCounter;
  mapping(uint256 => ProposalRecord) internal _proposals;
  mapping(uint256 => ObjectionRecord) internal _objections;
  mapping(uint256 => uint256) internal _openObjectionCount;

  /// @notice Circle ID => elected facilitator address (§5.1.2)
  mapping(uint256 => address) internal _circleFacilitators;

  /// @notice Circle ID => elected secretary address (§5.1.2, §4.2)
  mapping(uint256 => address) internal _circleSecretaries;

  /// @notice Circle ID => whether a FacilitatorElection has been adopted.
  ///         Once true, the admin bootstrap setter is locked for that circle.
  mapping(uint256 => bool) internal _facilitatorElected;

  /// @notice Circle ID => whether a SecretaryElection has been adopted.
  ///         Once true, the admin bootstrap setter is locked for that circle.
  mapping(uint256 => bool) internal _secretaryElected;

  /// @notice Per-org maximum age of a proposal before it expires. Settable by org admin
  ///         within [MIN_PROPOSAL_MAX_AGE, MAX_PROPOSAL_MAX_AGE]. Defaults to
  ///         DEFAULT_PROPOSAL_MAX_AGE at initialize time.
  ///         See specs/99-agent-native-divergence.md — the Holacracy v5.0 text assumes
  ///         a human-meeting cadence that doesn't fit continuous agent operation.
  uint64 internal _proposalMaxAge;

  /// @notice Default proposal age window for newly initialized orgs.
  uint64 public constant DEFAULT_PROPOSAL_MAX_AGE = 7 days;
  /// @notice Minimum admin-configurable proposal age. Guards against accidental zero.
  uint64 public constant MIN_PROPOSAL_MAX_AGE = 1 hours;
  /// @notice Maximum admin-configurable proposal age.
  uint64 public constant MAX_PROPOSAL_MAX_AGE = 30 days;

  /// @notice Maximum number of ContentRef entries accepted by any *WithRefs change type.
  ///         Bounds adoption gas so a malicious proposer can't brick adoption by stuffing
  ///         unbounded arrays into changeData (adoption is permissionless).
  uint256 public constant MAX_CONTENT_REFS = 32;

  constructor() {
    _disableInitializers();
  }

  function initialize(
    uint256 _orgId,
    address _orgInstance,
    address _roleRegistry
  ) external initializer {
    orgId = _orgId;
    org = IOrganizationInstance(_orgInstance);
    roleRegistry = IRoleRegistry(_roleRegistry);
    _proposalMaxAge = DEFAULT_PROPOSAL_MAX_AGE;
  }

  /// @inheritdoc IMeetingFactory
  function proposalMaxAge() external view returns (uint64) {
    return _proposalMaxAge;
  }

  /// @inheritdoc IMeetingFactory
  function setProposalMaxAge(
    uint64 _newAge
  ) external {
    if (!org.isAdmin(msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(orgId, msg.sender);
    }
    if (_newAge < MIN_PROPOSAL_MAX_AGE || _newAge > MAX_PROPOSAL_MAX_AGE) {
      revert MeetingFactory_InvalidProposalMaxAge(_newAge, MIN_PROPOSAL_MAX_AGE, MAX_PROPOSAL_MAX_AGE);
    }
    uint64 _oldAge = _proposalMaxAge;
    _proposalMaxAge = _newAge;
    emit ProposalMaxAgeUpdated(_oldAge, _newAge, msg.sender);
  }

  function _validateOrgId(
    uint256 _orgId
  ) internal view {
    if (_orgId != orgId) revert MeetingFactory_OrgIdMismatch(orgId, _orgId);
  }

  /*///////////////////////////////////////////////////////////////
                        MEETING LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  function startMeeting(
    uint256 _orgId,
    MeetingKind _kind
  ) external returns (uint256 _meetingId) {
    _validateOrgId(_orgId);
    if (!org.isMember(msg.sender)) {
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
    _validateOrgId(_orgId);
    if (!org.isAdmin(msg.sender)) {
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
    _validateOrgId(_orgId);
    if (!org.isMember(msg.sender)) {
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
    _validateOrgId(_orgId);
    if (!org.isMember(msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    _itemId = ++_itemCounter;
    emit MeetingProposalLinked(_meetingId, _itemId, _orgId, _proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                    GOVERNANCE EXECUTION
  //////////////////////////////////////////////////////////////*/

  function _validateChange(
    uint256 _proposalCircleId,
    HolacracyTypes.ChangeType _changeType,
    bytes memory _data
  ) internal view {
    ChangeValidator.validate(_proposalCircleId, _changeType, _data, roleRegistry);
  }

  function _handleCreateRole(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 circleId,
      string memory name,
      string memory purpose,
      string[] memory domains,
      string[] memory accountabilities
    ) = abi.decode(_data, (uint256, string, string, string[], string[]));
    return roleRegistry.createRole(circleId, name, purpose, domains, accountabilities);
  }

  function _handleAmendRole(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 roleId,
      string memory name,
      string memory purpose,
      string[] memory domains,
      string[] memory accountabilities
    ) = abi.decode(_data, (uint256, string, string, string[], string[]));
    roleRegistry.updateRole(roleId, name, purpose, domains, accountabilities);
    return roleId;
  }

  function _handleRemoveRole(
    bytes memory _data
  ) internal returns (uint256) {
    uint256 roleId = abi.decode(_data, (uint256));
    roleRegistry.removeRole(roleId);
    return roleId;
  }

  function _handleElection(
    bytes memory _data
  ) internal returns (uint256) {
    (uint256 roleId, address newLead, address previousLead) = abi.decode(_data, (uint256, address, address));
    if (previousLead != address(0)) {
      roleRegistry.unassignRoleLead(roleId, previousLead);
    }
    roleRegistry.assignRoleLead(roleId, newLead);
    return roleId;
  }

  function _handleCreateRoleWithRefs(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 circleId,
      string memory name,
      string memory purpose,
      string[] memory domains,
      string[] memory accountabilities,
      bytes32[] memory fieldNames,
      HolacracyTypes.ContentRef[] memory refs
    ) = abi.decode(_data, (uint256, string, string, string[], string[], bytes32[], HolacracyTypes.ContentRef[]));
    if (fieldNames.length > MAX_CONTENT_REFS) {
      revert MeetingFactory_TooManyContentRefs(fieldNames.length, MAX_CONTENT_REFS);
    }
    return roleRegistry.createRoleWithRefs(circleId, name, purpose, domains, accountabilities, fieldNames, refs);
  }

  function _handleAmendRoleWithRefs(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 roleId,
      string memory name,
      string memory purpose,
      string[] memory domains,
      string[] memory accountabilities,
      bytes32[] memory fieldNames,
      HolacracyTypes.ContentRef[] memory refs
    ) = abi.decode(_data, (uint256, string, string, string[], string[], bytes32[], HolacracyTypes.ContentRef[]));
    if (fieldNames.length > MAX_CONTENT_REFS) {
      revert MeetingFactory_TooManyContentRefs(fieldNames.length, MAX_CONTENT_REFS);
    }
    roleRegistry.updateRoleWithRefs(roleId, name, purpose, domains, accountabilities, fieldNames, refs);
    return roleId;
  }

  function _handleExpandRoleToCircle(
    bytes memory _data
  ) internal returns (uint256) {
    uint256 roleId = abi.decode(_data, (uint256));
    roleRegistry.expandToCircle(roleId);
    return roleId;
  }

  function _handleMoveRole(
    bytes memory _data
  ) internal returns (uint256) {
    (uint256 roleId, uint256 toCircleId) = abi.decode(_data, (uint256, uint256));
    roleRegistry.moveRole(roleId, toCircleId);
    return roleId;
  }

  function _handleCreatePolicy(
    bytes memory _data
  ) internal returns (uint256) {
    (uint256 circleId, string memory name, string memory body) = abi.decode(_data, (uint256, string, string));
    return roleRegistry.createPolicy(circleId, name, body);
  }

  function _handleAmendPolicy(
    bytes memory _data
  ) internal returns (uint256) {
    (uint256 policyId, string memory name, string memory body) = abi.decode(_data, (uint256, string, string));
    roleRegistry.updatePolicy(policyId, name, body);
    return policyId;
  }

  function _handleRemovePolicy(
    bytes memory _data
  ) internal returns (uint256) {
    uint256 policyId = abi.decode(_data, (uint256));
    roleRegistry.removePolicy(policyId);
    return policyId;
  }

  function _handleCreatePolicyWithRefs(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 circleId,
      string memory name,
      string memory body,
      bytes32[] memory fieldNames,
      HolacracyTypes.ContentRef[] memory refs
    ) = abi.decode(_data, (uint256, string, string, bytes32[], HolacracyTypes.ContentRef[]));
    if (fieldNames.length > MAX_CONTENT_REFS) {
      revert MeetingFactory_TooManyContentRefs(fieldNames.length, MAX_CONTENT_REFS);
    }
    return roleRegistry.createPolicyWithRefs(circleId, name, body, fieldNames, refs);
  }

  function _handleAmendPolicyWithRefs(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 policyId,
      string memory name,
      string memory body,
      bytes32[] memory fieldNames,
      HolacracyTypes.ContentRef[] memory refs
    ) = abi.decode(_data, (uint256, string, string, bytes32[], HolacracyTypes.ContentRef[]));
    if (fieldNames.length > MAX_CONTENT_REFS) {
      revert MeetingFactory_TooManyContentRefs(fieldNames.length, MAX_CONTENT_REFS);
    }
    roleRegistry.updatePolicyWithRefs(policyId, name, body, fieldNames, refs);
    return policyId;
  }

  function _handleCreateCircle(
    bytes memory _data
  ) internal returns (uint256) {
    (
      uint256 parentCircleId,
      string memory name,
      string memory purpose,
      string[] memory domains,
      string[] memory accountabilities
    ) = abi.decode(_data, (uint256, string, string, string[], string[]));
    uint256 newRoleId = roleRegistry.createRole(parentCircleId, name, purpose, domains, accountabilities);
    return roleRegistry.expandToCircle(newRoleId);
  }

  function _handleFacilitatorElection(
    bytes memory _data
  ) internal returns (uint256) {
    (uint256 circleId, address newFacilitator, address previousFacilitator) =
      abi.decode(_data, (uint256, address, address));
    _circleFacilitators[circleId] = newFacilitator;
    _facilitatorElected[circleId] = true;
    emit CircleFacilitatorSet(circleId, newFacilitator);
    emit FacilitatorElected(circleId, newFacilitator, previousFacilitator);
    return circleId;
  }

  function _handleSecretaryElection(
    bytes memory _data
  ) internal returns (uint256) {
    (uint256 circleId, address newSecretary, address previousSecretary) = abi.decode(_data, (uint256, address, address));
    _circleSecretaries[circleId] = newSecretary;
    _secretaryElected[circleId] = true;
    emit CircleSecretarySet(circleId, newSecretary);
    emit SecretaryElected(circleId, newSecretary, previousSecretary);
    return circleId;
  }

  /// @notice Route a change to its handler via direct dispatch (zero branching).
  function _applyChange(
    HolacracyTypes.ChangeType _changeType,
    bytes memory _data
  ) internal returns (uint256 _resultId) {
    uint256 ct = uint256(_changeType);
    if (ct == uint256(HolacracyTypes.ChangeType.CreateRole)) return _handleCreateRole(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.AmendRole)) return _handleAmendRole(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.RemoveRole)) return _handleRemoveRole(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.Election)) return _handleElection(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.CreateRoleWithRefs)) return _handleCreateRoleWithRefs(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.AmendRoleWithRefs)) return _handleAmendRoleWithRefs(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.ExpandRoleToCircle)) return _handleExpandRoleToCircle(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.MoveRole)) return _handleMoveRole(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.CreatePolicy)) return _handleCreatePolicy(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.AmendPolicy)) return _handleAmendPolicy(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.RemovePolicy)) return _handleRemovePolicy(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.CreatePolicyWithRefs)) return _handleCreatePolicyWithRefs(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.AmendPolicyWithRefs)) return _handleAmendPolicyWithRefs(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.CreateCircle)) return _handleCreateCircle(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.FacilitatorElection)) return _handleFacilitatorElection(_data);
    if (ct == uint256(HolacracyTypes.ChangeType.SecretaryElection)) return _handleSecretaryElection(_data);
    revert MeetingFactory_UnsupportedChangeType();
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
    _proposalId = _createProposal(_orgId, _circleId, _proposerRoleId, _tensionHash, _changeType, _changeData);
  }

  /// @inheritdoc IMeetingFactory
  function createProposalWithTension(
    uint256 _orgId,
    uint256 _circleId,
    uint256 _proposerRoleId,
    string calldata _tensionText,
    HolacracyTypes.ChangeType _changeType,
    bytes calldata _changeData
  ) external returns (uint256 _proposalId) {
    bytes32 _hash = keccak256(bytes(_tensionText));
    _proposalId = _createProposal(_orgId, _circleId, _proposerRoleId, _hash, _changeType, _changeData);
    emit ProposalTensionPublished(_proposalId, _tensionText);
  }

  function _createProposal(
    uint256 _orgId,
    uint256 _circleId,
    uint256 _proposerRoleId,
    bytes32 _tensionHash,
    HolacracyTypes.ChangeType _changeType,
    bytes calldata _changeData
  ) internal returns (uint256 _proposalId) {
    _validateOrgId(_orgId);
    if (!org.isMember(msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }
    // §5.3 divergence (see specs/99-agent-native-divergence.md):
    //   _proposerRoleId == 0  → proposing as an org member; no role claim is made.
    //   _proposerRoleId != 0  → claim is still verified, so attribution can't be forged.
    // The objection path remains strictly gated by circle role-leads (raiseObjection),
    // which is the real guardrail on adoption.
    if (_proposerRoleId != 0 && !roleRegistry.isRoleLead(_proposerRoleId, msg.sender)) {
      revert MeetingFactory_NotRoleLead(_proposerRoleId, msg.sender);
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
    // status defaults to Draft (== 0), resolvedAt defaults to 0
    p.submittedAt = uint64(block.timestamp);

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
    if (uint64(block.timestamp) > p.submittedAt + _proposalMaxAge) {
      revert MeetingFactory_ProposalExpired(_proposalId);
    }
    if (_openObjectionCount[_proposalId] > 0) {
      revert MeetingFactory_UnresolvedObjections(_proposalId, _openObjectionCount[_proposalId]);
    }
    // §5.3 — adoption is permissionless once consent is reached (zero open objections).
    // Anyone can ring the bell; authority flowed from the absence of objections.

    _validateChange(p.circleId, p.changeType, p.changeData);
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
    // §5.3.4 — proposer may withdraw; Facilitator may discard an invalid proposal.
    if (msg.sender != p.proposer && msg.sender != _circleFacilitators[p.circleId]) {
      revert MeetingFactory_NotProposerOrFacilitator(_proposalId, msg.sender);
    }

    p.status = HolacracyTypes.ProposalStatus.Discarded;
    p.resolvedAt = uint64(block.timestamp);

    emit ProposalDiscarded(_proposalId, p.orgId, msg.sender);
  }

  /// @inheritdoc IMeetingFactory
  function raiseObjection(
    uint256 _proposalId,
    uint256 _objectorRoleId,
    bytes32 _concernHash
  ) external returns (uint256 _objectionId) {
    ProposalRecord storage p = _proposals[_proposalId];
    if (p.id == 0) revert MeetingFactory_ProposalNotFound(_proposalId);
    if (p.status != HolacracyTypes.ProposalStatus.Draft) {
      revert MeetingFactory_InvalidProposalStatus(_proposalId, p.status);
    }
    if (!org.isMember(msg.sender)) {
      revert MeetingFactory_NotOrgMember(p.orgId, msg.sender);
    }
    // §5.3 Representation Rule for objections: objector must either lead a role
    // in the proposal's circle, or be the circle's elected Facilitator or Secretary.
    bool isFacilitator = _circleFacilitators[p.circleId] == msg.sender;
    bool isSecretary = _circleSecretaries[p.circleId] == msg.sender;
    if (!isFacilitator && !isSecretary) {
      if (!roleRegistry.isRoleLead(_objectorRoleId, msg.sender)) {
        revert MeetingFactory_NotRoleLead(_objectorRoleId, msg.sender);
      }
      if (roleRegistry.getRoleCircleId(_objectorRoleId) != p.circleId) {
        revert MeetingFactory_ObjectorRoleNotInCircle(_objectorRoleId, p.circleId);
      }
    }

    _objectionId = ++_objectionCounter;
    ObjectionRecord storage o = _objections[_objectionId];
    o.id = _objectionId;
    o.proposalId = _proposalId;
    o.objectorRoleId = _objectorRoleId;
    o.objector = msg.sender;
    o.concernHash = _concernHash;
    o.status = HolacracyTypes.ObjectionStatus.Raised;
    o.raisedAt = uint64(block.timestamp);
    _openObjectionCount[_proposalId] += 1;

    emit ObjectionRaised(_objectionId, _proposalId, msg.sender, _objectorRoleId, _concernHash);
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
    bool isFacilitator = _circleFacilitators[p.circleId] == msg.sender;
    if (!isObjector && !isFacilitator) {
      revert MeetingFactory_NotObjectorOrFacilitator(_objectionId, msg.sender);
    }

    o.status = HolacracyTypes.ObjectionStatus.Resolved;
    o.resolvedAt = uint64(block.timestamp);
    _openObjectionCount[o.proposalId] -= 1;

    emit ObjectionResolved(_objectionId, o.proposalId, msg.sender);
  }

  /*///////////////////////////////////////////////////////////////
                      FACILITATOR & EXPIRY
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IMeetingFactory
  function setCircleFacilitator(
    uint256 _circleId,
    address _facilitator
  ) external {
    // §5.1.2: Facilitator MUST be elected. The admin setter is a pre-election bootstrap
    // that locks once a FacilitatorElection is adopted for the circle.
    if (_facilitatorElected[_circleId]) revert MeetingFactory_FacilitatorAlreadyElected(_circleId);
    if (!org.isAdmin(msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(orgId, msg.sender);
    }
    _circleFacilitators[_circleId] = _facilitator;
    emit CircleFacilitatorSet(_circleId, _facilitator);
  }

  /// @inheritdoc IMeetingFactory
  function setCircleSecretary(
    uint256 _circleId,
    address _secretary
  ) external {
    // §5.1.2: Secretary MUST be elected. The admin setter is a pre-election bootstrap
    // that locks once a SecretaryElection is adopted for the circle.
    if (_secretaryElected[_circleId]) revert MeetingFactory_SecretaryAlreadyElected(_circleId);
    if (!org.isAdmin(msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(orgId, msg.sender);
    }
    _circleSecretaries[_circleId] = _secretary;
    emit CircleSecretarySet(_circleId, _secretary);
  }

  /// @inheritdoc IMeetingFactory
  function isFacilitatorElected(
    uint256 _circleId
  ) external view returns (bool) {
    return _facilitatorElected[_circleId];
  }

  /// @inheritdoc IMeetingFactory
  function isSecretaryElected(
    uint256 _circleId
  ) external view returns (bool) {
    return _secretaryElected[_circleId];
  }

  /// @inheritdoc IMeetingFactory
  function strikeProposal(
    uint256 _proposalId
  ) external {
    ProposalRecord storage p = _proposals[_proposalId];
    if (p.id == 0) revert MeetingFactory_ProposalNotFound(_proposalId);
    if (p.status != HolacracyTypes.ProposalStatus.Draft) {
      revert MeetingFactory_InvalidProposalStatus(_proposalId, p.status);
    }
    // §4.2.2 — Secretary rules on constitutional validity and strikes invalid governance.
    if (_circleSecretaries[p.circleId] != msg.sender) {
      revert MeetingFactory_NotSecretary(p.circleId, msg.sender);
    }

    p.status = HolacracyTypes.ProposalStatus.Discarded;
    p.resolvedAt = uint64(block.timestamp);

    emit ProposalStruck(_proposalId, p.circleId, msg.sender);
    emit ProposalDiscarded(_proposalId, p.orgId, msg.sender);
  }

  /// @inheritdoc IMeetingFactory
  function discardExpiredProposal(
    uint256 _proposalId
  ) external {
    ProposalRecord storage p = _proposals[_proposalId];
    if (p.id == 0) revert MeetingFactory_ProposalNotFound(_proposalId);
    if (p.status != HolacracyTypes.ProposalStatus.Draft) {
      revert MeetingFactory_InvalidProposalStatus(_proposalId, p.status);
    }
    if (uint64(block.timestamp) <= p.submittedAt + _proposalMaxAge) {
      revert MeetingFactory_ProposalNotExpired(_proposalId);
    }

    p.status = HolacracyTypes.ProposalStatus.Discarded;
    p.resolvedAt = uint64(block.timestamp);

    emit ProposalDiscarded(_proposalId, p.orgId, msg.sender);
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
