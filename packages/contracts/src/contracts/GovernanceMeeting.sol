// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IGovernanceMeeting} from 'interfaces/IGovernanceMeeting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/**
 * @title GovernanceMeeting
 * @notice Thin governance meeting executor (Holacracy Constitution §5.4)
 * @dev On-chain: authorization + outcomes (proposal adoption, election results).
 *      All coordination state (check-ins, agenda items, IDM steps, nominations)
 *      emitted as events only — the indexer reconstructs full meeting state.
 */
contract GovernanceMeeting is IGovernanceMeeting {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  CircleRegistry public circleRegistry;
  RoleRegistry public roleRegistry;
  GovernanceProcess public governanceProcess;

  uint256 internal _meetingCounter;
  bool internal _initialized;

  /// @notice Meeting ID => Meeting data
  mapping(uint256 => HolacracyTypes.GovernanceMeeting) internal _meetings;

  /// @notice Meeting ID => address => is participant (needed for auth)
  mapping(uint256 => mapping(address => bool)) internal _isParticipant;

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
  /// @param _circleRegistry The CircleRegistry contract
  /// @param _roleRegistry The RoleRegistry contract
  /// @param _governanceProcess The GovernanceProcess contract
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
                            VIEWS
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

  /*///////////////////////////////////////////////////////////////
                      MEETING LIFECYCLE
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function scheduleMeeting(uint256 _circleId) external returns (uint256 _meetingId) {
    _assertSecretary(_circleId);
    _meetingId = _createMeeting(_circleId);
    emit MeetingScheduled(_meetingId, _circleId, msg.sender, false, address(0), '', '');
  }

  /// @inheritdoc IGovernanceMeeting
  function scheduleSpecialMeeting(
    uint256 _circleId,
    address _requester,
    string calldata _intention,
    string calldata _limits
  ) external returns (uint256 _meetingId) {
    _assertSecretary(_circleId);
    _meetingId = _createMeeting(_circleId);
    emit MeetingScheduled(_meetingId, _circleId, msg.sender, true, _requester, _intention, _limits);
  }

  /// @inheritdoc IGovernanceMeeting
  function cancelMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertSecretary(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Scheduled) {
      revert GovernanceMeeting_InvalidStatus(_meetingId, HolacracyTypes.MeetingStatus.Scheduled);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.Cancelled;
    emit MeetingCancelled(_meetingId);
  }

  /// @inheritdoc IGovernanceMeeting
  function startMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Scheduled) {
      revert GovernanceMeeting_InvalidStatus(_meetingId, HolacracyTypes.MeetingStatus.Scheduled);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.Active;

    // Auto-join the facilitator as participant
    _isParticipant[_meetingId][msg.sender] = true;

    emit MeetingStarted(_meetingId);
    emit ParticipantJoined(_meetingId, msg.sender);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    _assertFacilitator(_meeting.circleId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Active) {
      revert GovernanceMeeting_InvalidStatus(_meetingId, HolacracyTypes.MeetingStatus.Active);
    }

    _meeting.status = HolacracyTypes.MeetingStatus.Completed;
    emit MeetingCompleted(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      PARTICIPATION
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function joinMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Active) {
      revert GovernanceMeeting_InvalidStatus(_meetingId, HolacracyTypes.MeetingStatus.Active);
    }

    if (!circleRegistry.isCircleMember(_meeting.circleId, msg.sender)) {
      revert GovernanceMeeting_NotCircleMember(_meeting.circleId, msg.sender);
    }

    if (!_isParticipant[_meetingId][msg.sender]) {
      _isParticipant[_meetingId][msg.sender] = true;
      emit ParticipantJoined(_meetingId, msg.sender);
    }
  }

  /*///////////////////////////////////////////////////////////////
                      EVENT-ONLY ACTIONS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function recordCheckIn(uint256 _meetingId) external {
    _assertActiveMeeting(_meetingId);
    _assertParticipant(_meetingId);
    emit CheckInRecorded(_meetingId, msg.sender);
  }

  /// @inheritdoc IGovernanceMeeting
  function recordClosing(uint256 _meetingId) external {
    _assertActiveMeeting(_meetingId);
    _assertParticipant(_meetingId);
    emit ClosingRecorded(_meetingId, msg.sender);
  }

  /// @inheritdoc IGovernanceMeeting
  function addAgendaItem(
    uint256 _meetingId,
    uint256 _itemId,
    string calldata _label,
    HolacracyTypes.AgendaItemType _itemType
  ) external {
    _assertActiveMeeting(_meetingId);
    _assertParticipant(_meetingId);
    emit AgendaItemAdded(_meetingId, _itemId, msg.sender, _label, _itemType);
  }

  /// @inheritdoc IGovernanceMeeting
  function startProcessingItem(uint256 _meetingId, uint256 _itemId) external {
    _assertActiveMeetingFacilitator(_meetingId);
    emit AgendaItemStarted(_meetingId, _itemId);
  }

  /// @inheritdoc IGovernanceMeeting
  function dropAgendaItem(uint256 _meetingId, uint256 _itemId) external {
    _assertActiveMeetingFacilitator(_meetingId);
    emit AgendaItemDropped(_meetingId, _itemId);
  }

  /// @inheritdoc IGovernanceMeeting
  function advanceIDMStep(uint256 _meetingId, uint256 _itemId, HolacracyTypes.IDMStep _step) external {
    _assertActiveMeetingFacilitator(_meetingId);
    emit IDMStepAdvanced(_meetingId, _itemId, _step);
  }

  /// @inheritdoc IGovernanceMeeting
  function advanceElectionStep(uint256 _meetingId, uint256 _itemId, HolacracyTypes.ElectionStep _step) external {
    _assertActiveMeetingFacilitator(_meetingId);
    emit ElectionStepAdvanced(_meetingId, _itemId, _step);
  }

  /// @inheritdoc IGovernanceMeeting
  function castNomination(uint256 _meetingId, uint256 _itemId, address _candidate) external {
    _assertActiveMeeting(_meetingId);
    _assertParticipant(_meetingId);
    emit NominationCast(_meetingId, _itemId, msg.sender, _candidate);
  }

  /// @inheritdoc IGovernanceMeeting
  function changeNomination(uint256 _meetingId, uint256 _itemId, address _newCandidate) external {
    _assertActiveMeeting(_meetingId);
    _assertParticipant(_meetingId);
    emit NominationChanged(_meetingId, _itemId, msg.sender, _newCandidate);
  }

  /// @inheritdoc IGovernanceMeeting
  function proposeCandidate(uint256 _meetingId, uint256 _itemId, address _candidate) external {
    _assertActiveMeetingFacilitator(_meetingId);
    emit CandidateProposed(_meetingId, _itemId, _candidate);
  }

  /*///////////////////////////////////////////////////////////////
                      OUTCOME ACTIONS
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
    _assertActiveMeeting(_meetingId);
    _assertParticipant(_meetingId);

    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];

    _proposalId = governanceProcess.submitProposalFromMeeting(
      msg.sender, _meeting.circleId, _proposerRoleId, _tension, _example, _explanation, _change
    );

    emit ProposalPresented(_meetingId, _itemId, _proposalId);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeProposalItem(uint256 _meetingId, uint256 _itemId, uint256 _proposalId) external {
    _assertActiveMeetingFacilitator(_meetingId);

    if (governanceProcess.daoVoteRequired()) {
      governanceProcess.escalateFromMeeting(_proposalId, '');
    } else {
      governanceProcess.adoptProposalFromMeeting(_proposalId);
    }

    emit AgendaItemCompleted(_meetingId, _itemId);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeElection(
    uint256 _meetingId,
    uint256 _itemId,
    uint256 _circleId,
    HolacracyTypes.ElectedRole _targetRole,
    address _candidate
  ) external {
    _assertActiveMeetingFacilitator(_meetingId);
    circleRegistry.setElectedRole(_circleId, _targetRole, _candidate);
    emit ElectionCompleted(_meetingId, _itemId, _circleId, _targetRole, _candidate);
    emit AgendaItemCompleted(_meetingId, _itemId);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  function _createMeeting(uint256 _circleId) internal returns (uint256 _meetingId) {
    _meetingId = ++_meetingCounter;

    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    _meeting.id = _meetingId;
    _meeting.circleId = _circleId;
    _meeting.scheduledBy = msg.sender;
    _meeting.status = HolacracyTypes.MeetingStatus.Scheduled;
  }

  function _assertActiveMeeting(uint256 _meetingId) internal view {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Active) {
      revert GovernanceMeeting_InvalidStatus(_meetingId, HolacracyTypes.MeetingStatus.Active);
    }
  }

  function _assertActiveMeetingFacilitator(uint256 _meetingId) internal view {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (_meeting.id == 0) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.status != HolacracyTypes.MeetingStatus.Active) {
      revert GovernanceMeeting_InvalidStatus(_meetingId, HolacracyTypes.MeetingStatus.Active);
    }
    _assertFacilitator(_meeting.circleId);
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
