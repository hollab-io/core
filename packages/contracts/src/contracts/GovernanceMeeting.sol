// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IGovernanceMeeting} from 'interfaces/IGovernanceMeeting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/**
 * @title GovernanceMeeting
 * @notice Real-time governance meeting process (Holacracy Constitution §5.4)
 * @dev Coordinates meeting phases, IDM proposal processing, and integrative elections.
 *      Acts as a state coordinator — proposal mutations delegate to GovernanceProcess,
 *      election results are set via CircleRegistry.setElectedRole.
 */
contract GovernanceMeeting is IGovernanceMeeting {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  CircleRegistry public circleRegistry;
  RoleRegistry public roleRegistry;
  GovernanceProcess public governanceProcess;

  uint256 internal _meetingCounter;
  uint256 internal _agendaItemCounter;
  bool internal _initialized;

  /// @notice Meeting ID => Meeting data
  mapping(uint256 => HolacracyTypes.GovernanceMeeting) internal _meetings;

  /// @notice Meeting ID => intention string (stored separately to keep struct flat)
  mapping(uint256 => string) internal _meetingIntention;

  /// @notice Meeting ID => limits string
  mapping(uint256 => string) internal _meetingLimits;

  /// @notice Meeting ID => participant addresses
  mapping(uint256 => address[]) internal _meetingParticipants;

  /// @notice Meeting ID => address => is participant
  mapping(uint256 => mapping(address => bool)) internal _isParticipant;

  /// @notice Meeting ID => agenda item IDs
  mapping(uint256 => uint256[]) internal _meetingAgendaItems;

  /// @notice Agenda item ID => agenda item data
  mapping(uint256 => HolacracyTypes.GovernanceAgendaItem) internal _agendaItems;

  /// @notice Meeting ID => currently active agenda item ID (0 if none)
  mapping(uint256 => uint256) internal _activeItemId;

  /// @notice Agenda item ID => current IDM step
  mapping(uint256 => HolacracyTypes.IDMStep) internal _idmStep;

  /// @notice Meeting ID => address => has checked in
  mapping(uint256 => mapping(address => bool)) internal _hasCheckedIn;

  /// @notice Meeting ID => address => has recorded closing
  mapping(uint256 => mapping(address => bool)) internal _hasRecordedClosing;

  /// @notice Agenda item ID => election state
  mapping(uint256 => HolacracyTypes.MeetingElection) internal _elections;

  /// @notice Agenda item ID => nominations array
  mapping(uint256 => HolacracyTypes.Nomination[]) internal _nominations;

  /// @notice Agenda item ID => address => has nominated
  mapping(uint256 => mapping(address => bool)) internal _hasNominated;

  /// @notice Agenda item ID => address => nomination index
  mapping(uint256 => mapping(address => uint256)) internal _nominationIndex;

  /// @notice Circle ID => meeting IDs
  mapping(uint256 => uint256[]) internal _circleMeetings;

  /// @notice Meeting ID => address => is guest
  mapping(uint256 => mapping(address => bool)) internal _isGuest;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  modifier initializer() {
    if (_initialized) revert GovernanceMeeting_AlreadyInitialized();
    _initialized = true;
    _;
  }

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  constructor() {
    _initialized = true;
  }

  /// @notice Initializes a clone of GovernanceMeeting
  function initialize(
    CircleRegistry _circleRegistry,
    RoleRegistry _roleRegistry,
    GovernanceProcess _governanceProcess
  ) external initializer {
    circleRegistry = _circleRegistry;
    roleRegistry = _roleRegistry;
    governanceProcess = _governanceProcess;
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function meetingCount() external view returns (uint256 _count) {
    _count = _meetingCounter;
  }

  /// @inheritdoc IGovernanceMeeting
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.GovernanceMeeting memory _meeting) {
    _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
  }

  /// @inheritdoc IGovernanceMeeting
  function getMeetingParticipants(uint256 _meetingId) external view returns (address[] memory _participants) {
    _participants = _meetingParticipants[_meetingId];
  }

  /// @inheritdoc IGovernanceMeeting
  function getAgendaItems(uint256 _meetingId) external view returns (uint256[] memory _itemIds) {
    _itemIds = _meetingAgendaItems[_meetingId];
  }

  /// @inheritdoc IGovernanceMeeting
  function getAgendaItem(uint256 _itemId) external view returns (HolacracyTypes.GovernanceAgendaItem memory _item) {
    _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
  }

  /// @inheritdoc IGovernanceMeeting
  function getElectionState(uint256 _itemId) external view returns (HolacracyTypes.MeetingElection memory _election) {
    _election = _elections[_itemId];
  }

  /// @inheritdoc IGovernanceMeeting
  function getNominations(uint256 _itemId) external view returns (HolacracyTypes.Nomination[] memory _noms) {
    _noms = _nominations[_itemId];
  }

  /// @inheritdoc IGovernanceMeeting
  function getCircleMeetings(uint256 _circleId) external view returns (uint256[] memory _meetingIds) {
    _meetingIds = _circleMeetings[_circleId];
  }

  /// @inheritdoc IGovernanceMeeting
  function getIDMStep(uint256 _itemId) external view returns (HolacracyTypes.IDMStep _step) {
    _step = _idmStep[_itemId];
  }

  /*///////////////////////////////////////////////////////////////
                      MEETING LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function scheduleMeeting(
    uint256 _circleId,
    uint256 _duration,
    uint256 _scheduledAt
  ) external returns (uint256 _meetingId) {
    _assertSecretary(_circleId);

    _meetingId = _createMeeting(_circleId, _duration, _scheduledAt, false, address(0));

    emit MeetingScheduled(_meetingId, _circleId, msg.sender, false);
  }

  /// @inheritdoc IGovernanceMeeting
  function scheduleSpecialMeeting(
    uint256 _circleId,
    uint256 _duration,
    uint256 _scheduledAt,
    address _requester,
    string calldata _intention,
    string calldata _limits
  ) external returns (uint256 _meetingId) {
    _assertSecretary(_circleId);

    _meetingId = _createMeeting(_circleId, _duration, _scheduledAt, true, _requester);
    _meetingIntention[_meetingId] = _intention;
    _meetingLimits[_meetingId] = _limits;

    emit MeetingScheduled(_meetingId, _circleId, msg.sender, true);
  }

  /// @inheritdoc IGovernanceMeeting
  function cancelMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertSecretary(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Scheduled) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.Scheduled);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.Cancelled;
    emit MeetingCancelled(_meetingId);
  }

  /// @inheritdoc IGovernanceMeeting
  function extendMeeting(uint256 _meetingId, uint256 _additionalSeconds) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertSecretary(_meeting.circleId);
    // Must be an active meeting (not Scheduled, Completed, or Cancelled)
    if (
      _meeting.status == HolacracyTypes.MeetingStatus.Scheduled
        || _meeting.status == HolacracyTypes.MeetingStatus.Completed
        || _meeting.status == HolacracyTypes.MeetingStatus.Cancelled
    ) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.CheckIn);
    }

    _meeting.duration += _additionalSeconds;
    emit MeetingExtended(_meetingId, _meeting.duration);
  }

  /*///////////////////////////////////////////////////////////////
                      PHASE TRANSITIONS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function startMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Scheduled) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.Scheduled);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.CheckIn;
    _meeting.startedAt = block.timestamp;

    // Auto-join the facilitator and secretary as participants (§5.4.1)
    _addParticipant(_meetingId, msg.sender);

    emit MeetingStarted(_meetingId);
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.CheckIn);
  }

  /// @inheritdoc IGovernanceMeeting
  function startAgendaBuilding(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.CheckIn) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.CheckIn);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.AgendaBuilding;
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
  }

  /// @inheritdoc IGovernanceMeeting
  function startClosingRound(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    // Can transition from AgendaBuilding or Processing
    if (
      _meeting.status != HolacracyTypes.MeetingStatus.AgendaBuilding
        && _meeting.status != HolacracyTypes.MeetingStatus.Processing
    ) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.Closing;
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.Closing);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Closing) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.Closing);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.Completed;
    _meeting.completedAt = block.timestamp;

    emit MeetingCompleted(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      PARTICIPATION
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function joinMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    // Can join during any active phase
    if (
      _meeting.status == HolacracyTypes.MeetingStatus.Scheduled
        || _meeting.status == HolacracyTypes.MeetingStatus.Completed
        || _meeting.status == HolacracyTypes.MeetingStatus.Cancelled
    ) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.CheckIn);
    }

    // Must be a circle member (or guest)
    if (!circleRegistry.isCircleMember(_meeting.circleId, msg.sender) && !_isGuest[_meetingId][msg.sender]) {
      revert GovernanceMeeting_NotCircleMember(_meeting.circleId, msg.sender);
    }

    _addParticipant(_meetingId, msg.sender);
  }

  /// @inheritdoc IGovernanceMeeting
  function inviteGuest(uint256 _meetingId, address _guest) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (!_isParticipant[_meetingId][msg.sender]) {
      revert GovernanceMeeting_NotParticipant(_meetingId, msg.sender);
    }

    _isGuest[_meetingId][_guest] = true;
    emit GuestInvited(_meetingId, _guest, msg.sender);
  }

  /*///////////////////////////////////////////////////////////////
                      CHECK-IN / CLOSING
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function recordCheckIn(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.CheckIn) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.CheckIn);
    }
    _assertParticipant(_meetingId);
    if (_hasCheckedIn[_meetingId][msg.sender]) {
      revert GovernanceMeeting_AlreadyCheckedIn(_meetingId, msg.sender);
    }

    _hasCheckedIn[_meetingId][msg.sender] = true;
    emit CheckInRecorded(_meetingId, msg.sender);
  }

  /// @inheritdoc IGovernanceMeeting
  function recordClosing(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Closing) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.Closing);
    }
    _assertParticipant(_meetingId);

    _hasRecordedClosing[_meetingId][msg.sender] = true;
    emit ClosingRecorded(_meetingId, msg.sender);
  }

  /*///////////////////////////////////////////////////////////////
                      AGENDA MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function addAgendaItem(
    uint256 _meetingId,
    string calldata _label,
    HolacracyTypes.AgendaItemType _itemType
  ) external returns (uint256 _itemId) {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    // Can add items during AgendaBuilding or Processing (between items)
    if (
      _meeting.status != HolacracyTypes.MeetingStatus.AgendaBuilding
        && _meeting.status != HolacracyTypes.MeetingStatus.Processing
    ) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
    }
    _assertParticipant(_meetingId);

    _itemId = ++_agendaItemCounter;

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    _item.id = _itemId;
    _item.meetingId = _meetingId;
    _item.owner = msg.sender;
    _item.label = _label;
    _item.itemType = _itemType;
    _item.status = HolacracyTypes.AgendaItemStatus.Pending;

    _meetingAgendaItems[_meetingId].push(_itemId);

    emit AgendaItemAdded(_meetingId, _itemId, msg.sender, _itemType);
  }

  /// @inheritdoc IGovernanceMeeting
  function startProcessingItem(uint256 _meetingId, uint256 _itemId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    if (
      _meeting.status != HolacracyTypes.MeetingStatus.AgendaBuilding
        && _meeting.status != HolacracyTypes.MeetingStatus.Processing
    ) {
      revert GovernanceMeeting_InvalidPhase(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
    }

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_item.status != HolacracyTypes.AgendaItemStatus.Pending) {
      revert GovernanceMeeting_AgendaItemNotActive(_itemId);
    }

    _item.status = HolacracyTypes.AgendaItemStatus.Active;
    _activeItemId[_meetingId] = _itemId;
    _meeting.status = HolacracyTypes.MeetingStatus.Processing;

    emit AgendaItemStarted(_meetingId, _itemId);
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.Processing);
  }

  /// @inheritdoc IGovernanceMeeting
  function dropAgendaItem(uint256 _meetingId, uint256 _itemId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);

    _item.status = HolacracyTypes.AgendaItemStatus.Dropped;

    // If this was the active item, clear it and go back to AgendaBuilding
    if (_activeItemId[_meetingId] == _itemId) {
      _activeItemId[_meetingId] = 0;
      _meeting.status = HolacracyTypes.MeetingStatus.AgendaBuilding;
      emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
    }

    emit AgendaItemDropped(_meetingId, _itemId);
  }

  /*///////////////////////////////////////////////////////////////
                      IDM PROCESS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function presentProposal(
    uint256 _meetingId,
    uint256 _itemId,
    uint256 _proposerRoleId,
    string calldata _tension,
    string calldata _example,
    string calldata _explanation,
    HolacracyTypes.GovernanceChange calldata _change
  ) external returns (uint256 _proposalId) {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertParticipant(_meetingId);

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_item.status != HolacracyTypes.AgendaItemStatus.Active) {
      revert GovernanceMeeting_AgendaItemNotActive(_itemId);
    }
    if (_item.owner != msg.sender) revert GovernanceMeeting_NotAgendaItemOwner(_itemId, msg.sender);

    // Submit and activate proposal via GovernanceProcess (meeting-specific path)
    _proposalId = governanceProcess.submitProposalFromMeeting(
      msg.sender, _meeting.circleId, _proposerRoleId, _tension, _example, _explanation, _change
    );

    _item.proposalId = _proposalId;
    _idmStep[_itemId] = HolacracyTypes.IDMStep.PresentProposal;

    emit ProposalPresented(_meetingId, _itemId, _proposalId);
    emit IDMStepAdvanced(_meetingId, _itemId, HolacracyTypes.IDMStep.PresentProposal);
  }

  /// @inheritdoc IGovernanceMeeting
  function advanceIDMStep(uint256 _meetingId, uint256 _itemId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_item.status != HolacracyTypes.AgendaItemStatus.Active) {
      revert GovernanceMeeting_AgendaItemNotActive(_itemId);
    }

    HolacracyTypes.IDMStep _currentStep = _idmStep[_itemId];
    HolacracyTypes.IDMStep _nextStep;

    if (_currentStep == HolacracyTypes.IDMStep.PresentProposal) {
      _nextStep = HolacracyTypes.IDMStep.ClarifyingQuestions;
    } else if (_currentStep == HolacracyTypes.IDMStep.ClarifyingQuestions) {
      _nextStep = HolacracyTypes.IDMStep.ReactionRound;
    } else if (_currentStep == HolacracyTypes.IDMStep.ReactionRound) {
      _nextStep = HolacracyTypes.IDMStep.ClarifyOption;
    } else if (_currentStep == HolacracyTypes.IDMStep.ClarifyOption) {
      _nextStep = HolacracyTypes.IDMStep.ObjectionRound;
    } else if (_currentStep == HolacracyTypes.IDMStep.ObjectionRound) {
      // After objection round, if objections were raised we go to Integration
      _nextStep = HolacracyTypes.IDMStep.Integration;
    } else {
      // Integration → back to ObjectionRound with amended proposal
      _nextStep = HolacracyTypes.IDMStep.ObjectionRound;
    }

    _idmStep[_itemId] = _nextStep;
    emit IDMStepAdvanced(_meetingId, _itemId, _nextStep);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeProposalItem(uint256 _meetingId, uint256 _itemId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_item.status != HolacracyTypes.AgendaItemStatus.Active) {
      revert GovernanceMeeting_AgendaItemNotActive(_itemId);
    }

    // Must be in ObjectionRound step (clean round, no objections)
    if (_idmStep[_itemId] != HolacracyTypes.IDMStep.ObjectionRound) {
      revert GovernanceMeeting_InvalidIDMStep(_meetingId, _itemId, HolacracyTypes.IDMStep.ObjectionRound);
    }

    // Adopt the proposal via GovernanceProcess (meeting-specific path)
    governanceProcess.adoptProposalFromMeeting(_item.proposalId);

    _item.status = HolacracyTypes.AgendaItemStatus.Completed;
    _activeItemId[_meetingId] = 0;
    _meeting.status = HolacracyTypes.MeetingStatus.AgendaBuilding;

    emit AgendaItemCompleted(_meetingId, _itemId);
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
  }

  /*///////////////////////////////////////////////////////////////
                      ELECTION PROCESS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function startElection(
    uint256 _meetingId,
    uint256 _itemId,
    HolacracyTypes.ElectedRole _targetRole,
    uint256 _term
  ) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    if (_item.id == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_item.status != HolacracyTypes.AgendaItemStatus.Active) {
      revert GovernanceMeeting_AgendaItemNotActive(_itemId);
    }

    _item.electedRole = _targetRole;
    _item.electionTerm = _term;

    HolacracyTypes.MeetingElection storage _election = _elections[_itemId];
    _election.agendaItemId = _itemId;
    _election.circleId = _meeting.circleId;
    _election.targetRole = _targetRole;
    _election.term = _term;
    _election.currentStep = HolacracyTypes.ElectionStep.DescribeRole;

    emit ElectionStepAdvanced(_meetingId, _itemId, HolacracyTypes.ElectionStep.DescribeRole);
  }

  /// @inheritdoc IGovernanceMeeting
  function advanceElectionStep(uint256 _meetingId, uint256 _itemId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.MeetingElection storage _election = _elections[_itemId];
    if (_election.agendaItemId == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);

    HolacracyTypes.ElectionStep _currentStep = _election.currentStep;
    HolacracyTypes.ElectionStep _nextStep;

    if (_currentStep == HolacracyTypes.ElectionStep.DescribeRole) {
      _nextStep = HolacracyTypes.ElectionStep.Nominate;
    } else if (_currentStep == HolacracyTypes.ElectionStep.Nominate) {
      _nextStep = HolacracyTypes.ElectionStep.NominationSharing;
    } else if (_currentStep == HolacracyTypes.ElectionStep.NominationSharing) {
      _nextStep = HolacracyTypes.ElectionStep.NominationChange;
    } else if (_currentStep == HolacracyTypes.ElectionStep.NominationChange) {
      _nextStep = HolacracyTypes.ElectionStep.MakeProposal;
    } else if (_currentStep == HolacracyTypes.ElectionStep.MakeProposal) {
      _nextStep = HolacracyTypes.ElectionStep.ObjectionRound;
    } else {
      // ObjectionRound → back to MakeProposal if objection discards candidate
      _nextStep = HolacracyTypes.ElectionStep.MakeProposal;
    }

    _election.currentStep = _nextStep;
    emit ElectionStepAdvanced(_meetingId, _itemId, _nextStep);
  }

  /// @inheritdoc IGovernanceMeeting
  function castNomination(uint256 _meetingId, uint256 _itemId, address _candidate) external {
    _assertParticipant(_meetingId);
    HolacracyTypes.MeetingElection storage _election = _elections[_itemId];
    if (_election.agendaItemId == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_election.currentStep != HolacracyTypes.ElectionStep.Nominate) {
      revert GovernanceMeeting_InvalidElectionStep(_meetingId, _itemId, HolacracyTypes.ElectionStep.Nominate);
    }
    if (_hasNominated[_itemId][msg.sender]) revert GovernanceMeeting_AlreadyNominated(_itemId, msg.sender);

    _hasNominated[_itemId][msg.sender] = true;
    _nominationIndex[_itemId][msg.sender] = _nominations[_itemId].length;
    _nominations[_itemId].push(
      HolacracyTypes.Nomination({nominator: msg.sender, candidate: _candidate, changed: false, changedTo: address(0)})
    );

    emit NominationCast(_meetingId, _itemId, msg.sender, _candidate);
  }

  /// @inheritdoc IGovernanceMeeting
  function changeNomination(uint256 _meetingId, uint256 _itemId, address _newCandidate) external {
    _assertParticipant(_meetingId);
    HolacracyTypes.MeetingElection storage _election = _elections[_itemId];
    if (_election.agendaItemId == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_election.currentStep != HolacracyTypes.ElectionStep.NominationChange) {
      revert GovernanceMeeting_InvalidElectionStep(_meetingId, _itemId, HolacracyTypes.ElectionStep.NominationChange);
    }

    uint256 _idx = _nominationIndex[_itemId][msg.sender];
    HolacracyTypes.Nomination storage _nom = _nominations[_itemId][_idx];
    _nom.changed = true;
    _nom.changedTo = _newCandidate;

    emit NominationChanged(_meetingId, _itemId, msg.sender, _newCandidate);
  }

  /// @inheritdoc IGovernanceMeeting
  function proposeCandidate(uint256 _meetingId, uint256 _itemId, address _candidate) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.MeetingElection storage _election = _elections[_itemId];
    if (_election.agendaItemId == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_election.currentStep != HolacracyTypes.ElectionStep.MakeProposal) {
      revert GovernanceMeeting_InvalidElectionStep(_meetingId, _itemId, HolacracyTypes.ElectionStep.MakeProposal);
    }

    _election.proposedCandidate = _candidate;
    emit CandidateProposed(_meetingId, _itemId, _candidate);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeElection(uint256 _meetingId, uint256 _itemId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);

    HolacracyTypes.MeetingElection storage _election = _elections[_itemId];
    if (_election.agendaItemId == 0) revert GovernanceMeeting_AgendaItemNotFound(_itemId);
    if (_election.currentStep != HolacracyTypes.ElectionStep.ObjectionRound) {
      revert GovernanceMeeting_InvalidElectionStep(_meetingId, _itemId, HolacracyTypes.ElectionStep.ObjectionRound);
    }

    address _elected = _election.proposedCandidate;
    _election.completed = true;

    // Set the elected role via CircleRegistry
    circleRegistry.setElectedRole(_meeting.circleId, _election.targetRole, _elected);

    HolacracyTypes.GovernanceAgendaItem storage _item = _agendaItems[_itemId];
    _item.status = HolacracyTypes.AgendaItemStatus.Completed;
    _activeItemId[_meetingId] = 0;
    _meeting.status = HolacracyTypes.MeetingStatus.AgendaBuilding;

    emit ElectionCompleted(_meetingId, _itemId, _elected);
    emit AgendaItemCompleted(_meetingId, _itemId);
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  function _createMeeting(
    uint256 _circleId,
    uint256 _duration,
    uint256 _scheduledAt,
    bool _isSpecial,
    address _requester
  ) internal returns (uint256 _meetingId) {
    _meetingId = ++_meetingCounter;

    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    _meeting.id = _meetingId;
    _meeting.circleId = _circleId;
    _meeting.scheduledBy = msg.sender;
    _meeting.isSpecial = _isSpecial;
    _meeting.requester = _requester;
    _meeting.status = HolacracyTypes.MeetingStatus.Scheduled;
    _meeting.scheduledAt = _scheduledAt;
    _meeting.duration = _duration;

    _circleMeetings[_circleId].push(_meetingId);
  }

  function _addParticipant(uint256 _meetingId, address _participant) internal {
    if (!_isParticipant[_meetingId][_participant]) {
      _isParticipant[_meetingId][_participant] = true;
      _meetingParticipants[_meetingId].push(_participant);
      emit ParticipantJoined(_meetingId, _participant);
    }
  }

  function _assertSecretary(uint256 _circleId) internal view {
    address _secretary = circleRegistry.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Secretary);
    if (_secretary == address(0)) {
      if (!circleRegistry.isCircleLead(_circleId, msg.sender)) {
        revert GovernanceMeeting_NotSecretary(_circleId);
      }
    } else {
      if (msg.sender != _secretary) {
        revert GovernanceMeeting_NotSecretary(_circleId);
      }
    }
  }

  function _assertFacilitator(uint256 _circleId) internal view {
    address _facilitator = circleRegistry.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Facilitator);
    if (_facilitator == address(0)) {
      if (!circleRegistry.isCircleLead(_circleId, msg.sender)) {
        revert GovernanceMeeting_NotFacilitator(_circleId);
      }
    } else {
      if (msg.sender != _facilitator) {
        revert GovernanceMeeting_NotFacilitator(_circleId);
      }
    }
  }

  function _assertParticipant(uint256 _meetingId) internal view {
    if (!_isParticipant[_meetingId][msg.sender]) {
      revert GovernanceMeeting_NotParticipant(_meetingId, msg.sender);
    }
  }
}
