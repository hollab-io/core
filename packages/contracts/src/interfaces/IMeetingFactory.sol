// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IMeetingFactory
 * @notice Unified event-driven meeting lifecycle for tactical and governance sessions.
 *         Also serves as the governance process: the only path to structural changes
 *         on the RoleRegistry, enforcing Holacracy's governance authority model.
 */
interface IMeetingFactory {
  /*///////////////////////////////////////////////////////////////
                            ENUMS
  //////////////////////////////////////////////////////////////*/

  /// @notice Kind of meeting being run.
  enum MeetingKind {
    Tactical,
    Governance
  }

  /*///////////////////////////////////////////////////////////////
                            STRUCTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Commitments-only record of a governance proposal.
  /// @dev    Timestamps are uint64 so they pack with address into one slot.
  ///         `changeData` is the same calldata shape as executeGovernance.
  ///         The contract does NOT model IDM rounds, clarifying questions, or
  ///         integration — those are meeting coordination and stay off-chain.
  ///         See specs/05-governance-process.md "On-chain Commitments Surface".
  struct ProposalRecord {
    uint256 id;
    uint256 orgId;
    uint256 circleId;
    address proposer;
    uint64 submittedAt;
    uint64 resolvedAt;
    uint256 proposerRoleId;
    bytes32 tensionHash;
    HolacracyTypes.ChangeType changeType;
    HolacracyTypes.ProposalStatus status;
    bytes changeData;
  }

  /// @notice Commitments-only record of an objection raised against a proposal.
  /// @dev    No on-chain validation of objection criteria (§5.3.4) — the
  ///         contract only records who raised what and when it was resolved.
  ///         The objectorRoleId records which role the objection represents,
  ///         enforcing §5.3's representation rule on-chain.
  struct ObjectionRecord {
    uint256 id;
    uint256 proposalId;
    uint256 objectorRoleId;
    address objector;
    uint64 raisedAt;
    uint64 resolvedAt;
    bytes32 concernHash;
    HolacracyTypes.ObjectionStatus status;
  }

  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  event MeetingStarted(
    uint256 indexed _meetingId,
    uint256 indexed _orgId,
    MeetingKind indexed _kind,
    address _startedBy,
    uint256 _timestamp
  );
  event MeetingEnded(
    uint256 indexed _meetingId, uint256 indexed _orgId, MeetingKind indexed _kind, address _endedBy, uint256 _timestamp
  );
  event MeetingOutputRecorded(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    uint256 indexed _orgId,
    HolacracyTypes.OutputType _outputType,
    address _assignedTo,
    uint256 _roleId,
    string _description
  );
  event MeetingProposalLinked(
    uint256 indexed _meetingId, uint256 indexed _itemId, uint256 indexed _orgId, uint256 _proposalId
  );

  /// @notice Emitted when a proposal record is created. Fully event-sourced —
  ///         the indexer can persist the full row without any contract reads.
  event ProposalCreated(
    uint256 indexed _proposalId,
    uint256 indexed _orgId,
    uint256 indexed _circleId,
    address _proposer,
    uint256 _proposerRoleId,
    bytes32 _tensionHash,
    uint8 _changeType,
    bytes _changeData
  );

  /// @notice Emitted alongside ProposalCreated when the proposer chose to
  ///         publish the tension plaintext on-chain (via createProposalWithTension).
  ///         The `_tensionHash` on the proposal record is the keccak256 of this
  ///         text, so consumers can verify that the text and hash agree.
  ///         Proposals created via the legacy bytes32-only `createProposal`
  ///         path do not emit this event — the tension stays off-chain.
  event ProposalTensionPublished(uint256 indexed _proposalId, string _text);

  /// @notice Emitted when a proposal is adopted and its change is applied.
  event ProposalAdopted(uint256 indexed _proposalId, uint256 indexed _orgId, uint256 _resultId, address _adoptedBy);

  /// @notice Emitted when a proposal is discarded without applying its change.
  event ProposalDiscarded(uint256 indexed _proposalId, uint256 indexed _orgId, address _discardedBy);

  /// @notice Emitted when an objection is raised against a Draft proposal.
  event ObjectionRaised(
    uint256 indexed _objectionId,
    uint256 indexed _proposalId,
    address indexed _objector,
    uint256 _objectorRoleId,
    bytes32 _concernHash
  );

  /// @notice Emitted when an objection is resolved (by the objector or by the facilitator).
  event ObjectionResolved(uint256 indexed _objectionId, uint256 indexed _proposalId, address _resolvedBy);

  /// @notice Emitted when a circle facilitator is set via the admin bootstrap path.
  event CircleFacilitatorSet(uint256 indexed _circleId, address indexed _facilitator);

  /// @notice Emitted when a circle secretary is set via the admin bootstrap path.
  event CircleSecretarySet(uint256 indexed _circleId, address indexed _secretary);

  /// @notice Emitted when a Facilitator Election is adopted for a circle. After this,
  ///         the admin setter for that circle is locked (§5.1.2).
  event FacilitatorElected(uint256 indexed _circleId, address indexed _facilitator, address _previousFacilitator);

  /// @notice Emitted when a Secretary Election is adopted for a circle. After this,
  ///         the admin setter for that circle is locked (§5.1.2).
  event SecretaryElected(uint256 indexed _circleId, address indexed _secretary, address _previousSecretary);

  /// @notice Emitted when the Secretary strikes a Draft proposal as invalid (§4.2.2).
  event ProposalStruck(uint256 indexed _proposalId, uint256 indexed _circleId, address indexed _secretary);

  /// @notice Emitted when an org admin updates the proposal age window.
  event ProposalMaxAgeUpdated(uint64 _oldAge, uint64 _newAge, address indexed _by);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error MeetingFactory_AlreadyInitialized();
  error MeetingFactory_NotOrgMember(uint256 _orgId, address _caller);
  error MeetingFactory_NotOrgAdmin(uint256 _orgId, address _caller);
  error MeetingFactory_EmptyString();
  error MeetingFactory_UnsupportedChangeType();
  error MeetingFactory_ProposalNotFound(uint256 _proposalId);
  error MeetingFactory_ObjectionNotFound(uint256 _objectionId);
  error MeetingFactory_InvalidProposalStatus(uint256 _proposalId, HolacracyTypes.ProposalStatus _status);
  error MeetingFactory_InvalidObjectionStatus(uint256 _objectionId, HolacracyTypes.ObjectionStatus _status);
  error MeetingFactory_NotObjectorOrFacilitator(uint256 _objectionId, address _caller);
  error MeetingFactory_OrgIdMismatch(uint256 _expected, uint256 _provided);
  error MeetingFactory_UnresolvedObjections(uint256 _proposalId, uint256 _count);
  error MeetingFactory_ProposalExpired(uint256 _proposalId);
  error MeetingFactory_ProposalNotExpired(uint256 _proposalId);

  /// @notice Thrown when a proposer isn't the role lead of the role they claim to represent (§5.3).
  error MeetingFactory_NotRoleLead(uint256 _roleId, address _caller);

  /// @notice Thrown when discarding a proposal from someone who is neither the proposer nor the circle facilitator (§5.3.4).
  error MeetingFactory_NotProposerOrFacilitator(uint256 _proposalId, address _caller);

  /// @notice Thrown when an objector's represented role is not in the proposal's circle (§5.3).
  error MeetingFactory_ObjectorRoleNotInCircle(uint256 _objectorRoleId, uint256 _circleId);

  /// @notice Thrown when the admin setter is called after a Facilitator Election has been adopted.
  error MeetingFactory_FacilitatorAlreadyElected(uint256 _circleId);

  /// @notice Thrown when the admin setter is called after a Secretary Election has been adopted.
  error MeetingFactory_SecretaryAlreadyElected(uint256 _circleId);

  /// @notice Thrown when a Secretary-only action is called by someone else.
  error MeetingFactory_NotSecretary(uint256 _circleId, address _caller);

  /// @notice Thrown when a proposal's change targets a circle other than the proposal's circle.
  error MeetingFactory_ChangeCircleMismatch(uint256 _proposalCircleId, uint256 _targetCircleId);

  /// @notice Thrown when a *WithRefs proposal encodes more content refs than MAX_CONTENT_REFS.
  /// @dev    Adoption is permissionless — capping the ref array at decode time prevents a
  ///         malicious proposer from crafting a huge-ref proposal that DoS's whoever adopts it.
  error MeetingFactory_TooManyContentRefs(uint256 _length, uint256 _max);

  /// @notice Thrown by setProposalMaxAge when the requested age is outside [MIN, MAX].
  error MeetingFactory_InvalidProposalMaxAge(uint64 _provided, uint64 _min, uint64 _max);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  function initialize(
    uint256 _orgId,
    address _orgFactory,
    address _roleRegistry
  ) external;
  function startMeeting(
    uint256 _orgId,
    MeetingKind _kind
  ) external returns (uint256 _meetingId);
  function endMeeting(
    uint256 _meetingId,
    uint256 _orgId,
    MeetingKind _kind
  ) external;
  function recordOutput(
    uint256 _meetingId,
    uint256 _orgId,
    HolacracyTypes.OutputType _outputType,
    string calldata _description,
    address _assignedTo,
    uint256 _roleId
  ) external returns (uint256 _itemId);
  function linkProposal(
    uint256 _meetingId,
    uint256 _orgId,
    uint256 _proposalId
  ) external returns (uint256 _itemId);

  /*///////////////////////////////////////////////////////////////
                        PROPOSAL LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  /// @notice Create a Draft proposal. Enforces §5.3's Representation Rule — the
  ///         caller must be a role lead of `_proposerRoleId`.
  /// @param  _orgId           Organization the proposal targets
  /// @param  _circleId        Circle the change applies to
  /// @param  _proposerRoleId  The role the proposer represents. Must be a role the
  ///                          caller leads (§5.3).
  /// @param  _tensionHash     Content-address (CIDv1, 0G root, or keccak) of
  ///                          the tension text — text itself stays off-chain
  /// @param  _changeType      The structural change to enact on adoption
  /// @param  _changeData      ABI-encoded params — see MeetingFactory._applyChange
  ///                          for the encoding of each ChangeType
  function createProposal(
    uint256 _orgId,
    uint256 _circleId,
    uint256 _proposerRoleId,
    bytes32 _tensionHash,
    HolacracyTypes.ChangeType _changeType,
    bytes calldata _changeData
  ) external returns (uint256 _proposalId);

  /// @notice Create a Draft proposal and publish the tension plaintext on-chain.
  ///         Semantics match `createProposal`: §5.3 Representation Rule applies
  ///         the same way, and the contract hashes `_tensionText` as keccak256
  ///         for the on-chain commitment so `ProposalRecord.tensionHash`
  ///         remains the canonical content address.
  /// @dev    Emits `ProposalCreated` with `_tensionHash = keccak256(bytes(_tensionText))`
  ///         plus `ProposalTensionPublished(_proposalId, _tensionText)` so indexers
  ///         can persist the plaintext without any off-chain retrieval.
  /// @param  _tensionText  Free-text tension description. Keep it short — every byte
  ///                       is event-log gas. Empty strings are allowed (hashes to
  ///                       the well-known keccak of empty bytes).
  function createProposalWithTension(
    uint256 _orgId,
    uint256 _circleId,
    uint256 _proposerRoleId,
    string calldata _tensionText,
    HolacracyTypes.ChangeType _changeType,
    bytes calldata _changeData
  ) external returns (uint256 _proposalId);

  /// @notice Adopt a Draft proposal — applies its change to the RoleRegistry.
  /// @dev    Permissionless once objections are resolved and the proposal is
  ///         still within MAX_PROPOSAL_AGE. Adoption expresses consent having
  ///         been reached; any caller can trigger it. (§5.3)
  function adoptProposal(
    uint256 _proposalId
  ) external returns (uint256 _resultId);

  /// @notice Discard a Draft proposal without applying its change.
  /// @dev    Callable by the original proposer (withdrawal) or the circle's
  ///         Facilitator (§5.3.4 — invalid proposal).
  function discardProposal(
    uint256 _proposalId
  ) external;

  /// @notice Raise an objection against a Draft proposal. Enforces §5.3's
  ///         Representation Rule — the objector must either lead a role in
  ///         the proposal's circle, or be the circle's elected Facilitator or
  ///         Secretary.
  /// @param  _proposalId      The proposal being objected to
  /// @param  _objectorRoleId  The role the objector represents (must belong to the proposal's circle)
  /// @param  _concernHash     Content-address of the objection text (off-chain)
  function raiseObjection(
    uint256 _proposalId,
    uint256 _objectorRoleId,
    bytes32 _concernHash
  ) external returns (uint256 _objectionId);

  /// @notice Resolve a Raised objection.
  /// @dev    Either the original objector (withdrawal) or the circle's
  ///         Facilitator (dismissal/integration per §5.3.3-5.3.4).
  ///         Per Holacracy: Lead Link / admin CANNOT unilaterally resolve.
  function resolveObjection(
    uint256 _objectionId
  ) external;

  /// @notice Discard an expired proposal. Permissionless — anyone can call.
  /// @param _proposalId The proposal to discard
  function discardExpiredProposal(
    uint256 _proposalId
  ) external;

  /// @notice Set the Facilitator for a circle via the admin bootstrap path. Locked
  ///         per-circle after a FacilitatorElection proposal is adopted (§5.1.2).
  /// @param _circleId The circle ID
  /// @param _facilitator The facilitator address
  function setCircleFacilitator(
    uint256 _circleId,
    address _facilitator
  ) external;

  /// @notice Set the Secretary for a circle via the admin bootstrap path. Locked
  ///         per-circle after a SecretaryElection proposal is adopted (§5.1.2).
  /// @param _circleId The circle ID
  /// @param _secretary The secretary address
  function setCircleSecretary(
    uint256 _circleId,
    address _secretary
  ) external;

  /// @notice Whether a FacilitatorElection has been adopted for the given circle.
  ///         When true, the admin bootstrap setter is locked — further changes
  ///         must go through the governance election path.
  /// @param _circleId The circle ID
  /// @return locked True once an election has adopted
  function isFacilitatorElected(
    uint256 _circleId
  ) external view returns (bool locked);

  /// @notice Whether a SecretaryElection has been adopted for the given circle.
  ///         When true, the admin bootstrap setter is locked — further changes
  ///         must go through the governance election path.
  /// @param _circleId The circle ID
  /// @return locked True once an election has adopted
  function isSecretaryElected(
    uint256 _circleId
  ) external view returns (bool locked);

  /// @notice Strike a Draft proposal as invalid. Callable only by the elected Secretary
  ///         of the proposal's circle (§4.2.2). Marks the proposal Discarded and emits
  ///         ProposalStruck so it's distinguishable from a normal discard.
  /// @param _proposalId The Draft proposal to strike
  function strikeProposal(
    uint256 _proposalId
  ) external;

  /// @notice Update the per-org proposal age window. Org admin only.
  /// @dev    Must be within [MIN_PROPOSAL_MAX_AGE, MAX_PROPOSAL_MAX_AGE].
  ///         See specs/99-agent-native-divergence.md for rationale.
  /// @param _newAge The new proposal max age, in seconds
  function setProposalMaxAge(
    uint64 _newAge
  ) external;

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  function getProposal(
    uint256 _proposalId
  ) external view returns (ProposalRecord memory _proposal);

  function getObjection(
    uint256 _objectionId
  ) external view returns (ObjectionRecord memory _objection);

  function proposalCount() external view returns (uint256 _count);
  function objectionCount() external view returns (uint256 _count);

  /// @notice Current proposal age window for this org (seconds). See setProposalMaxAge.
  function proposalMaxAge() external view returns (uint64);
}
