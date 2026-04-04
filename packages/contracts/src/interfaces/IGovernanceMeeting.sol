// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IGovernanceMeeting
 * @notice Thin governance meeting executor (Holacracy Constitution §5.4)
 * @dev On-chain: authorization + outcomes only. Meeting coordination state lives off-chain,
 *      reconstructed by the indexer from events.
 */
interface IGovernanceMeeting {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  // ── Meeting lifecycle ──────────────────────────────────────

  /// @notice Emitted when a meeting is scheduled
  /// @param _meetingId The meeting ID
  /// @param _circleId The circle this meeting is for
  /// @param _scheduledBy The address that scheduled the meeting
  /// @param _isSpecial Whether this is a special meeting
  /// @param _requester The circle member who requested the meeting (special meetings only)
  /// @param _intention The intention of the special meeting
  /// @param _limits Any limits on the meeting scope
  event MeetingScheduled(
    uint256 indexed _meetingId,
    uint256 indexed _circleId,
    address indexed _scheduledBy,
    bool _isSpecial,
    address _requester,
    string _intention,
    string _limits
  );

  /// @notice Emitted when a meeting begins
  /// @param _meetingId The meeting ID
  event MeetingStarted(uint256 indexed _meetingId);

  /// @notice Emitted when the meeting ends normally
  /// @param _meetingId The meeting ID
  event MeetingCompleted(uint256 indexed _meetingId);

  /// @notice Emitted when the meeting is cancelled before starting
  /// @param _meetingId The meeting ID
  event MeetingCancelled(uint256 indexed _meetingId);

  // ── Participants ───────────────────────────────────────────

  /// @notice Emitted when a circle member joins the meeting
  /// @param _meetingId The meeting ID
  /// @param _participant The participant address
  event ParticipantJoined(uint256 indexed _meetingId, address indexed _participant);

  // ── Rounds (event-only, no storage) ────────────────────────

  /// @notice Emitted when a participant records their check-in
  /// @param _meetingId The meeting ID
  /// @param _participant The participant address
  event CheckInRecorded(uint256 indexed _meetingId, address indexed _participant);

  /// @notice Emitted when a participant records their closing reflection
  /// @param _meetingId The meeting ID
  /// @param _participant The participant address
  event ClosingRecorded(uint256 indexed _meetingId, address indexed _participant);

  // ── Agenda (event-only, no storage) ────────────────────────

  /// @notice Emitted when an agenda item is added
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _owner The participant who added the item
  /// @param _label Short label for the tension
  /// @param _itemType Whether this is a Proposal or Election item
  event AgendaItemAdded(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    address indexed _owner,
    string _label,
    HolacracyTypes.AgendaItemType _itemType
  );

  /// @notice Emitted when the facilitator starts processing an item
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  event AgendaItemStarted(uint256 indexed _meetingId, uint256 indexed _itemId);

  /// @notice Emitted when an agenda item finishes processing
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  event AgendaItemCompleted(uint256 indexed _meetingId, uint256 indexed _itemId);

  /// @notice Emitted when the facilitator drops an agenda item
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  event AgendaItemDropped(uint256 indexed _meetingId, uint256 indexed _itemId);

  // ── IDM (event-only, no storage) ───────────────────────────

  /// @notice Emitted when the IDM step advances
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _step The new IDM step
  event IDMStepAdvanced(uint256 indexed _meetingId, uint256 indexed _itemId, HolacracyTypes.IDMStep _step);

  /// @notice Emitted when a proposal is presented (created in GovernanceProcess)
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _proposalId The proposal ID
  event ProposalPresented(uint256 indexed _meetingId, uint256 indexed _itemId, uint256 indexed _proposalId);

  // ── Elections (event-only, no storage) ─────────────────────

  /// @notice Emitted when an election step advances
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _step The new election step
  event ElectionStepAdvanced(
    uint256 indexed _meetingId, uint256 indexed _itemId, HolacracyTypes.ElectionStep _step
  );

  /// @notice Emitted when a nomination is cast
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _nominator The address casting the nomination
  /// @param _candidate The nominated candidate address
  event NominationCast(
    uint256 indexed _meetingId, uint256 indexed _itemId, address indexed _nominator, address _candidate
  );

  /// @notice Emitted when a nomination is changed
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _nominator The address changing their nomination
  /// @param _newCandidate The new candidate address
  event NominationChanged(
    uint256 indexed _meetingId, uint256 indexed _itemId, address indexed _nominator, address _newCandidate
  );

  /// @notice Emitted when the facilitator proposes a candidate
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _candidate The proposed candidate
  event CandidateProposed(uint256 indexed _meetingId, uint256 indexed _itemId, address _candidate);

  /// @notice Emitted when an election is completed and the role is set
  /// @param _meetingId The meeting ID
  /// @param _itemId The agenda item ID
  /// @param _circleId The circle ID
  /// @param _targetRole The elected role type
  /// @param _elected The elected address
  event ElectionCompleted(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    uint256 indexed _circleId,
    HolacracyTypes.ElectedRole _targetRole,
    address _elected
  );

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the caller is not the circle's Secretary
  error GovernanceMeeting_NotSecretary(uint256 _circleId);

  /// @notice Thrown when the caller is not the circle's Facilitator
  error GovernanceMeeting_NotFacilitator(uint256 _circleId);

  /// @notice Thrown when the caller is not a meeting participant
  error GovernanceMeeting_NotParticipant(uint256 _meetingId, address _caller);

  /// @notice Thrown when a meeting does not exist
  error GovernanceMeeting_MeetingNotFound(uint256 _meetingId);

  /// @notice Thrown when the meeting is not in the expected status
  error GovernanceMeeting_InvalidStatus(uint256 _meetingId, HolacracyTypes.MeetingStatus _expected);

  /// @notice Thrown when the caller is not a circle member
  error GovernanceMeeting_NotCircleMember(uint256 _circleId, address _caller);

  /// @notice Thrown when the contract has already been initialized
  error GovernanceMeeting_AlreadyInitialized();

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the total number of meetings created
  function meetingCount() external view returns (uint256 _count);

  /// @notice Returns a meeting by ID
  /// @param _meetingId The meeting to look up
  /// @return _meeting The meeting data
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.GovernanceMeeting memory _meeting);

  /*///////////////////////////////////////////////////////////////
                      MEETING LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  /// @notice Schedules a regular governance meeting
  /// @dev Only callable by the circle's Secretary (or circle lead if no Secretary)
  /// @param _circleId The circle this meeting is for
  /// @return _meetingId The created meeting ID
  function scheduleMeeting(uint256 _circleId) external returns (uint256 _meetingId);

  /// @notice Schedules a special governance meeting with intention and limits
  /// @dev Only callable by the circle's Secretary
  /// @param _circleId The circle this meeting is for
  /// @param _requester The circle member who requested the meeting
  /// @param _intention The intention of the special meeting
  /// @param _limits Any limits on the meeting scope
  /// @return _meetingId The created meeting ID
  function scheduleSpecialMeeting(
    uint256 _circleId,
    address _requester,
    string calldata _intention,
    string calldata _limits
  ) external returns (uint256 _meetingId);

  /// @notice Cancels a scheduled meeting before it starts
  /// @dev Only callable by the Secretary
  /// @param _meetingId The meeting to cancel
  function cancelMeeting(uint256 _meetingId) external;

  /// @notice Starts the meeting (transitions to Active status)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting to start
  function startMeeting(uint256 _meetingId) external;

  /// @notice Completes the meeting
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting to complete
  function completeMeeting(uint256 _meetingId) external;

  /*///////////////////////////////////////////////////////////////
                      PARTICIPATION
  //////////////////////////////////////////////////////////////*/

  /// @notice Joins an active meeting as a circle member
  /// @param _meetingId The meeting to join
  function joinMeeting(uint256 _meetingId) external;

  /*///////////////////////////////////////////////////////////////
                      EVENT-ONLY ACTIONS
  //////////////////////////////////////////////////////////////*/

  /// @notice Records a check-in statement (event-only, no storage)
  /// @param _meetingId The meeting
  function recordCheckIn(uint256 _meetingId) external;

  /// @notice Records a closing reflection (event-only, no storage)
  /// @param _meetingId The meeting
  function recordClosing(uint256 _meetingId) external;

  /// @notice Adds an agenda item (event-only, no storage)
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item ID (assigned off-chain)
  /// @param _label Short label for the tension
  /// @param _itemType Whether this is a Proposal or Election item
  function addAgendaItem(
    uint256 _meetingId,
    uint256 _itemId,
    string calldata _label,
    HolacracyTypes.AgendaItemType _itemType
  ) external;

  /// @notice Starts processing a specific agenda item (event-only)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item to process
  function startProcessingItem(uint256 _meetingId, uint256 _itemId) external;

  /// @notice Drops an agenda item without processing (event-only)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item to drop
  function dropAgendaItem(uint256 _meetingId, uint256 _itemId) external;

  /// @notice Advances the IDM step for the current agenda item (event-only)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _step The IDM step to advance to
  function advanceIDMStep(uint256 _meetingId, uint256 _itemId, HolacracyTypes.IDMStep _step) external;

  /// @notice Advances the election step (event-only)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _step The election step to advance to
  function advanceElectionStep(uint256 _meetingId, uint256 _itemId, HolacracyTypes.ElectionStep _step) external;

  /// @notice Casts a nomination during the election process (event-only)
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _candidate The nominated candidate address
  function castNomination(uint256 _meetingId, uint256 _itemId, address _candidate) external;

  /// @notice Changes a previous nomination (event-only)
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _newCandidate The new candidate address
  function changeNomination(uint256 _meetingId, uint256 _itemId, address _newCandidate) external;

  /// @notice Proposes a candidate after counting nominations (event-only)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _candidate The proposed candidate
  function proposeCandidate(uint256 _meetingId, uint256 _itemId, address _candidate) external;

  /*///////////////////////////////////////////////////////////////
                      OUTCOME ACTIONS
  //////////////////////////////////////////////////////////////*/

  /// @notice Presents a proposal for the current agenda item (IDM step 1)
  /// @dev Called by the agenda item owner. Creates a proposal in GovernanceProcess.
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _proposerRoleId The role the proposer acts from
  /// @param _tension Description of the tension
  /// @param _example An actual example illustrating the tension
  /// @param _explanation How the proposal reduces the tension
  /// @param _change The governance change being proposed
  /// @return _proposalId The proposal ID created in GovernanceProcess
  function presentProposal(
    uint256 _meetingId,
    uint256 _itemId,
    uint256 _proposerRoleId,
    string calldata _tension,
    string calldata _example,
    string calldata _explanation,
    HolacracyTypes.GovernanceChange calldata _change
  ) external returns (uint256 _proposalId);

  /// @notice Completes a proposal agenda item (adopts the proposal via GovernanceProcess)
  /// @dev Only callable by the Facilitator after a clean objection round
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _proposalId The proposal to adopt
  function completeProposalItem(uint256 _meetingId, uint256 _itemId, uint256 _proposalId) external;

  /// @notice Completes the election and sets the elected role via CircleRegistry
  /// @dev Only callable by the Facilitator after the objection round passes
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _circleId The circle for the election
  /// @param _targetRole The elected role to fill
  /// @param _candidate The elected candidate
  function completeElection(
    uint256 _meetingId,
    uint256 _itemId,
    uint256 _circleId,
    HolacracyTypes.ElectedRole _targetRole,
    address _candidate
  ) external;
}
