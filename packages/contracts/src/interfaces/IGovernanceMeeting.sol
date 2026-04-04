// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IGovernanceMeeting
 * @notice Real-time governance meeting process (Holacracy Constitution §5.4)
 * @dev Coordinates meeting phases, IDM proposal processing, and integrative elections.
 *      Proposal mutations delegate to GovernanceProcess; election results are set via CircleRegistry.
 */
interface IGovernanceMeeting {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  // ── Meeting lifecycle ──────────────────────────────────────

  /// @notice Emitted when a meeting is scheduled
  event MeetingScheduled(
    uint256 indexed _meetingId, uint256 indexed _circleId, address indexed _scheduledBy, bool _isSpecial
  );

  /// @notice Emitted when a meeting begins (transitions to CheckIn)
  event MeetingStarted(uint256 indexed _meetingId);

  /// @notice Emitted when the meeting phase changes
  event MeetingPhaseChanged(uint256 indexed _meetingId, HolacracyTypes.MeetingStatus _phase);

  /// @notice Emitted when the meeting ends normally
  event MeetingCompleted(uint256 indexed _meetingId);

  /// @notice Emitted when the meeting is cancelled before starting
  event MeetingCancelled(uint256 indexed _meetingId);

  /// @notice Emitted when the meeting duration is extended
  event MeetingExtended(uint256 indexed _meetingId, uint256 _newDuration);

  // ── Participants ───────────────────────────────────────────

  /// @notice Emitted when a circle member joins the meeting
  event ParticipantJoined(uint256 indexed _meetingId, address indexed _participant);

  /// @notice Emitted when a Circle Rep invites a guest
  event GuestInvited(uint256 indexed _meetingId, address indexed _guest, address indexed _invitedBy);

  // ── Rounds ─────────────────────────────────────────────────

  /// @notice Emitted when a participant records their check-in
  event CheckInRecorded(uint256 indexed _meetingId, address indexed _participant);

  /// @notice Emitted when a participant records their closing reflection
  event ClosingRecorded(uint256 indexed _meetingId, address indexed _participant);

  // ── Agenda ─────────────────────────────────────────────────

  /// @notice Emitted when an agenda item is added
  event AgendaItemAdded(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    address indexed _owner,
    HolacracyTypes.AgendaItemType _itemType
  );

  /// @notice Emitted when the facilitator starts processing an item
  event AgendaItemStarted(uint256 indexed _meetingId, uint256 indexed _itemId);

  /// @notice Emitted when an agenda item finishes processing
  event AgendaItemCompleted(uint256 indexed _meetingId, uint256 indexed _itemId);

  /// @notice Emitted when the facilitator drops an agenda item
  event AgendaItemDropped(uint256 indexed _meetingId, uint256 indexed _itemId);

  // ── IDM ────────────────────────────────────────────────────

  /// @notice Emitted when the IDM step advances
  event IDMStepAdvanced(uint256 indexed _meetingId, uint256 indexed _itemId, HolacracyTypes.IDMStep _step);

  /// @notice Emitted when a proposal is presented (created in GovernanceProcess)
  event ProposalPresented(uint256 indexed _meetingId, uint256 indexed _itemId, uint256 indexed _proposalId);

  /// @notice Emitted when a proposal is amended during ClarifyOption
  event ProposalAmended(uint256 indexed _meetingId, uint256 indexed _itemId, uint256 indexed _proposalId);

  // ── Elections ──────────────────────────────────────────────

  /// @notice Emitted when an election step advances
  event ElectionStepAdvanced(
    uint256 indexed _meetingId, uint256 indexed _itemId, HolacracyTypes.ElectionStep _step
  );

  /// @notice Emitted when a nomination is cast
  event NominationCast(
    uint256 indexed _meetingId, uint256 indexed _itemId, address indexed _nominator, address _candidate
  );

  /// @notice Emitted when a nomination is changed
  event NominationChanged(
    uint256 indexed _meetingId, uint256 indexed _itemId, address indexed _nominator, address _newCandidate
  );

  /// @notice Emitted when the facilitator proposes a candidate
  event CandidateProposed(uint256 indexed _meetingId, uint256 indexed _itemId, address _candidate);

  /// @notice Emitted when an election is completed and the role is set
  event ElectionCompleted(uint256 indexed _meetingId, uint256 indexed _itemId, address _elected);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error GovernanceMeeting_NotSecretary(uint256 _circleId);
  error GovernanceMeeting_NotFacilitator(uint256 _circleId);
  error GovernanceMeeting_NotParticipant(uint256 _meetingId, address _caller);
  error GovernanceMeeting_MeetingNotFound(uint256 _meetingId);
  error GovernanceMeeting_InvalidPhase(uint256 _meetingId, HolacracyTypes.MeetingStatus _expected);
  error GovernanceMeeting_InvalidIDMStep(uint256 _meetingId, uint256 _itemId, HolacracyTypes.IDMStep _expected);
  error GovernanceMeeting_InvalidElectionStep(
    uint256 _meetingId, uint256 _itemId, HolacracyTypes.ElectionStep _expected
  );
  error GovernanceMeeting_AgendaItemNotFound(uint256 _itemId);
  error GovernanceMeeting_AgendaItemNotActive(uint256 _itemId);
  error GovernanceMeeting_AlreadyCheckedIn(uint256 _meetingId, address _participant);
  error GovernanceMeeting_NotCircleMember(uint256 _circleId, address _caller);
  error GovernanceMeeting_AlreadyInitialized();
  error GovernanceMeeting_AlreadyNominated(uint256 _itemId, address _nominator);
  error GovernanceMeeting_NotAgendaItemOwner(uint256 _itemId, address _caller);

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the total number of meetings created
  function meetingCount() external view returns (uint256 _count);

  /// @notice Returns a meeting by ID
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.GovernanceMeeting memory _meeting);

  /// @notice Returns the participants of a meeting
  function getMeetingParticipants(uint256 _meetingId) external view returns (address[] memory _participants);

  /// @notice Returns the agenda item IDs for a meeting
  function getAgendaItems(uint256 _meetingId) external view returns (uint256[] memory _itemIds);

  /// @notice Returns an agenda item by ID
  function getAgendaItem(uint256 _itemId) external view returns (HolacracyTypes.GovernanceAgendaItem memory _item);

  /// @notice Returns the election state for an agenda item
  function getElectionState(uint256 _itemId) external view returns (HolacracyTypes.MeetingElection memory _election);

  /// @notice Returns the nominations for an election agenda item
  function getNominations(uint256 _itemId) external view returns (HolacracyTypes.Nomination[] memory _nominations);

  /// @notice Returns the meeting IDs for a circle
  function getCircleMeetings(uint256 _circleId) external view returns (uint256[] memory _meetingIds);

  /// @notice Returns the current IDM step for an active proposal agenda item
  function getIDMStep(uint256 _itemId) external view returns (HolacracyTypes.IDMStep _step);

  /*///////////////////////////////////////////////////////////////
                      MEETING LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  /// @notice Schedules a regular governance meeting
  /// @dev Only callable by the circle's Secretary (or circle lead if no Secretary)
  /// @param _circleId The circle this meeting is for
  /// @param _duration Duration in seconds
  /// @param _scheduledAt Timestamp when the meeting is scheduled
  /// @return _meetingId The created meeting ID
  function scheduleMeeting(
    uint256 _circleId,
    uint256 _duration,
    uint256 _scheduledAt
  ) external returns (uint256 _meetingId);

  /// @notice Schedules a special governance meeting with intention and limits
  /// @dev Only callable by the circle's Secretary
  /// @param _circleId The circle this meeting is for
  /// @param _duration Duration in seconds
  /// @param _scheduledAt Timestamp when the meeting is scheduled
  /// @param _requester The circle member who requested the meeting
  /// @param _intention The intention of the special meeting
  /// @param _limits Any limits on the meeting scope
  /// @return _meetingId The created meeting ID
  function scheduleSpecialMeeting(
    uint256 _circleId,
    uint256 _duration,
    uint256 _scheduledAt,
    address _requester,
    string calldata _intention,
    string calldata _limits
  ) external returns (uint256 _meetingId);

  /// @notice Cancels a scheduled meeting before it starts
  /// @dev Only callable by the Secretary
  /// @param _meetingId The meeting to cancel
  function cancelMeeting(uint256 _meetingId) external;

  /// @notice Extends the duration of an active meeting
  /// @dev Only callable by the Secretary. Any circle member may object (not enforced on-chain).
  /// @param _meetingId The meeting to extend
  /// @param _additionalSeconds Extra duration in seconds
  function extendMeeting(uint256 _meetingId, uint256 _additionalSeconds) external;

  /*///////////////////////////////////////////////////////////////
                      PHASE TRANSITIONS
  //////////////////////////////////////////////////////////////*/

  /// @notice Starts the meeting (transitions to CheckIn phase)
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting to start
  function startMeeting(uint256 _meetingId) external;

  /// @notice Transitions from CheckIn to AgendaBuilding phase
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  function startAgendaBuilding(uint256 _meetingId) external;

  /// @notice Transitions to the Closing phase
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  function startClosingRound(uint256 _meetingId) external;

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

  /// @notice Invites a guest from a containing circle (Circle Rep only, §5.4.1)
  /// @param _meetingId The meeting
  /// @param _guest The address to invite
  function inviteGuest(uint256 _meetingId, address _guest) external;

  /*///////////////////////////////////////////////////////////////
                      CHECK-IN / CLOSING
  //////////////////////////////////////////////////////////////*/

  /// @notice Records a check-in statement during the CheckIn phase
  /// @param _meetingId The meeting
  function recordCheckIn(uint256 _meetingId) external;

  /// @notice Records a closing reflection during the Closing phase
  /// @param _meetingId The meeting
  function recordClosing(uint256 _meetingId) external;

  /*///////////////////////////////////////////////////////////////
                      AGENDA MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /// @notice Adds an agenda item during AgendaBuilding or between item processing
  /// @param _meetingId The meeting
  /// @param _label Short label for the tension
  /// @param _itemType Whether this is a Proposal or Election item
  /// @return _itemId The created agenda item ID
  function addAgendaItem(
    uint256 _meetingId,
    string calldata _label,
    HolacracyTypes.AgendaItemType _itemType
  ) external returns (uint256 _itemId);

  /// @notice Starts processing a specific agenda item
  /// @dev Only callable by the Facilitator (or requester for special meetings)
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item to process
  function startProcessingItem(uint256 _meetingId, uint256 _itemId) external;

  /// @notice Drops an agenda item without processing
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item to drop
  function dropAgendaItem(uint256 _meetingId, uint256 _itemId) external;

  /*///////////////////////////////////////////////////////////////
                      IDM PROCESS
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

  /// @notice Advances the IDM step for the current agenda item
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  function advanceIDMStep(uint256 _meetingId, uint256 _itemId) external;

  /// @notice Completes a proposal agenda item (adopts the proposal via GovernanceProcess)
  /// @dev Only callable by the Facilitator after a clean objection round
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  function completeProposalItem(uint256 _meetingId, uint256 _itemId) external;

  /*///////////////////////////////////////////////////////////////
                      ELECTION PROCESS
  //////////////////////////////////////////////////////////////*/

  /// @notice Starts an election for the current agenda item
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _targetRole The elected role to fill
  /// @param _term Term duration in seconds
  function startElection(
    uint256 _meetingId,
    uint256 _itemId,
    HolacracyTypes.ElectedRole _targetRole,
    uint256 _term
  ) external;

  /// @notice Advances the election step
  /// @dev Only callable by the Facilitator
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  function advanceElectionStep(uint256 _meetingId, uint256 _itemId) external;

  /// @notice Casts a nomination during the Nominate step
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _candidate The nominated candidate address
  function castNomination(uint256 _meetingId, uint256 _itemId, address _candidate) external;

  /// @notice Changes a previous nomination during the NominationChange step
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _newCandidate The new candidate address
  function changeNomination(uint256 _meetingId, uint256 _itemId, address _newCandidate) external;

  /// @notice Proposes a candidate after counting nominations
  /// @dev Only callable by the Facilitator during MakeProposal step
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  /// @param _candidate The proposed candidate
  function proposeCandidate(uint256 _meetingId, uint256 _itemId, address _candidate) external;

  /// @notice Completes the election and sets the elected role via CircleRegistry
  /// @dev Only callable by the Facilitator after the objection round passes
  /// @param _meetingId The meeting
  /// @param _itemId The agenda item
  function completeElection(uint256 _meetingId, uint256 _itemId) external;
}
