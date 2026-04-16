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
  struct ObjectionRecord {
    uint256 id;
    uint256 proposalId;
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

  /// @notice Emitted when a proposal is adopted and its change is applied.
  event ProposalAdopted(uint256 indexed _proposalId, uint256 indexed _orgId, uint256 _resultId, address _adoptedBy);

  /// @notice Emitted when a proposal is discarded without applying its change.
  event ProposalDiscarded(uint256 indexed _proposalId, uint256 indexed _orgId, address _discardedBy);

  /// @notice Emitted when an objection is raised against a Draft proposal.
  event ObjectionRaised(
    uint256 indexed _objectionId, uint256 indexed _proposalId, address indexed _objector, bytes32 _concernHash
  );

  /// @notice Emitted when an objection is resolved (by the objector or by the facilitator).
  event ObjectionResolved(uint256 indexed _objectionId, uint256 indexed _proposalId, address _resolvedBy);

  /// @notice Emitted when a circle facilitator is set.
  event CircleFacilitatorSet(uint256 indexed _circleId, address indexed _facilitator);

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

  /// @notice Create a Draft proposal. Any org member may call.
  /// @param  _orgId           Organization the proposal targets
  /// @param  _circleId        Circle the change applies to (anchor = 0)
  /// @param  _proposerRoleId  0 if the proposer is not currently a role lead
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

  /// @notice Adopt a Draft proposal — applies its change to the RoleRegistry.
  /// @dev    Org admin only. The contract does NOT check that all objections
  ///         are resolved first — that is the meeting coordinator's job. The
  ///         event log provides a full auditable trail.
  function adoptProposal(
    uint256 _proposalId
  ) external returns (uint256 _resultId);

  /// @notice Discard a Draft proposal without applying its change.
  /// @dev    Org admin only.
  function discardProposal(
    uint256 _proposalId
  ) external;

  /// @notice Raise an objection against a Draft proposal. Any org member.
  /// @param  _proposalId   The proposal being objected to
  /// @param  _concernHash  Content-address of the objection text (off-chain)
  function raiseObjection(
    uint256 _proposalId,
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

  /// @notice Set the Facilitator for a circle. Admin only (until elections are onchain).
  /// @param _circleId The circle ID
  /// @param _facilitator The facilitator address
  function setCircleFacilitator(
    uint256 _circleId,
    address _facilitator
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
}
