// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {GovernanceMeeting, IGovernanceMeeting} from 'contracts/GovernanceMeeting.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitGovernanceMeeting is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  GovernanceProcess internal _governance;
  GovernanceMeeting internal _meeting;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _member2 = makeAddr('member2');
  address internal _facilitator = makeAddr('facilitator');
  address internal _secretary = makeAddr('secretary');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _anchorCircleId;
  uint256 internal _role1Id;
  uint256 internal _role2Id;

  string[] internal _domains;
  string[] internal _accountabilities;

  // Events
  event MeetingScheduled(
    uint256 indexed _meetingId, uint256 indexed _circleId, address indexed _scheduledBy, bool _isSpecial
  );
  event MeetingStarted(uint256 indexed _meetingId);
  event MeetingPhaseChanged(uint256 indexed _meetingId, HolacracyTypes.MeetingStatus _phase);
  event MeetingCompleted(uint256 indexed _meetingId);
  event MeetingCancelled(uint256 indexed _meetingId);
  event MeetingExtended(uint256 indexed _meetingId, uint256 _newDuration);
  event ParticipantJoined(uint256 indexed _meetingId, address indexed _participant);
  event GuestInvited(uint256 indexed _meetingId, address indexed _guest, address indexed _invitedBy);
  event CheckInRecorded(uint256 indexed _meetingId, address indexed _participant);
  event ClosingRecorded(uint256 indexed _meetingId, address indexed _participant);
  event AgendaItemAdded(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    address indexed _owner,
    HolacracyTypes.AgendaItemType _itemType
  );
  event AgendaItemStarted(uint256 indexed _meetingId, uint256 indexed _itemId);
  event AgendaItemCompleted(uint256 indexed _meetingId, uint256 indexed _itemId);
  event AgendaItemDropped(uint256 indexed _meetingId, uint256 indexed _itemId);
  event IDMStepAdvanced(uint256 indexed _meetingId, uint256 indexed _itemId, HolacracyTypes.IDMStep _step);
  event ProposalPresented(uint256 indexed _meetingId, uint256 indexed _itemId, uint256 indexed _proposalId);
  event ElectionStepAdvanced(
    uint256 indexed _meetingId, uint256 indexed _itemId, HolacracyTypes.ElectionStep _step
  );
  event NominationCast(
    uint256 indexed _meetingId, uint256 indexed _itemId, address indexed _nominator, address _candidate
  );
  event NominationChanged(
    uint256 indexed _meetingId, uint256 indexed _itemId, address indexed _nominator, address _newCandidate
  );
  event CandidateProposed(uint256 indexed _meetingId, uint256 indexed _itemId, address _candidate);
  event ElectionCompleted(uint256 indexed _meetingId, uint256 indexed _itemId, address _elected);

  function setUp() external {
    _domains.push('TestDomain');
    _accountabilities.push('TestAccountability');

    // Deploy implementations
    RoleRegistry _rrImpl = new RoleRegistry();
    CircleRegistry _crImpl = new CircleRegistry();
    GovernanceProcess _govImpl = new GovernanceProcess();
    GovernanceMeeting _meetImpl = new GovernanceMeeting();

    // Clone and initialize
    _roleRegistry = RoleRegistry(Clones.clone(address(_rrImpl)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_crImpl)));
    _governance = GovernanceProcess(Clones.clone(address(_govImpl)));
    _meeting = GovernanceMeeting(Clones.clone(address(_meetImpl)));

    _roleRegistry.initialize();
    _governance.initialize(_circleRegistry, _roleRegistry);
    _governance.setGovernanceMeeting(address(_meeting));
    _meeting.initialize(_circleRegistry, _roleRegistry, _governance);

    vm.startPrank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(_governance));
    _circleRegistry.setGovernanceMeeting(address(_meeting));

    // Create anchor circle
    _anchorCircleId = _circleRegistry.createAnchorCircle('HolLab', 'Build tools');

    // Create roles and assign members
    _role1Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Dev', 'Develop', _domains, _accountabilities);
    _role2Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Design', 'Design', _domains, _accountabilities);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role1Id, _member1);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role2Id, _member2);

    // Set elected roles
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Secretary, _secretary);

    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _defaultChange() internal pure returns (HolacracyTypes.GovernanceChange memory) {
    string[] memory _emptyArr = new string[](0);
    return HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('NewRole', 'NewPurpose', _emptyArr, _emptyArr)
    });
  }

  function _scheduleMeeting() internal returns (uint256 _meetingId) {
    vm.prank(_secretary);
    _meetingId = _meeting.scheduleMeeting(_anchorCircleId, 3600, block.timestamp + 1 days);
  }

  function _startMeeting(uint256 _meetingId) internal {
    vm.prank(_facilitator);
    _meeting.startMeeting(_meetingId);
  }

  function _joinAndCheckIn(uint256 _meetingId, address _participant) internal {
    vm.startPrank(_participant);
    _meeting.joinMeeting(_meetingId);
    _meeting.recordCheckIn(_meetingId);
    vm.stopPrank();
  }

  function _setupActiveMeeting() internal returns (uint256 _meetingId) {
    _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);
    _joinAndCheckIn(_meetingId, _member1);
    _joinAndCheckIn(_meetingId, _member2);
    vm.prank(_facilitator);
    _meeting.startAgendaBuilding(_meetingId);
  }

  function _addAndStartProposalItem(uint256 _meetingId) internal returns (uint256 _itemId) {
    vm.prank(_member1);
    _itemId = _meeting.addAgendaItem(_meetingId, 'My tension', HolacracyTypes.AgendaItemType.Proposal);
    vm.prank(_facilitator);
    _meeting.startProcessingItem(_meetingId, _itemId);
  }

  function _addAndStartElectionItem(uint256 _meetingId) internal returns (uint256 _itemId) {
    vm.prank(_member1);
    _itemId = _meeting.addAgendaItem(_meetingId, 'Elect facilitator', HolacracyTypes.AgendaItemType.Election);
    vm.prank(_facilitator);
    _meeting.startProcessingItem(_meetingId, _itemId);
  }

  /*///////////////////////////////////////////////////////////////
                      INITIALIZE
  //////////////////////////////////////////////////////////////*/

  function test_InitializeWhenAlreadyInitialized() external {
    vm.expectRevert(IGovernanceMeeting.GovernanceMeeting_AlreadyInitialized.selector);
    _meeting.initialize(_circleRegistry, _roleRegistry, _governance);
  }

  /*///////////////////////////////////////////////////////////////
                      SCHEDULE MEETING
  //////////////////////////////////////////////////////////////*/

  function test_ScheduleMeetingWhenSecretary() external {
    vm.prank(_secretary);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingScheduled(1, _anchorCircleId, _secretary, false);

    uint256 _meetingId = _meeting.scheduleMeeting(_anchorCircleId, 3600, block.timestamp + 1 days);

    assertEq(_meeting.meetingCount(), 1);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(_m.id, 1);
    assertEq(_m.circleId, _anchorCircleId);
    assertEq(_m.scheduledBy, _secretary);
    assertEq(_m.isSpecial, false);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Scheduled));
    assertEq(_m.duration, 3600);

    uint256[] memory _circleMeetings = _meeting.getCircleMeetings(_anchorCircleId);
    assertEq(_circleMeetings.length, 1);
    assertEq(_circleMeetings[0], _meetingId);
  }

  function test_ScheduleMeetingWhenNotSecretary() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotSecretary.selector, _anchorCircleId)
    );
    _meeting.scheduleMeeting(_anchorCircleId, 3600, block.timestamp + 1 days);
  }

  function test_ScheduleSpecialMeetingWhenSecretary() external {
    vm.prank(_secretary);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingScheduled(1, _anchorCircleId, _secretary, true);

    uint256 _meetingId = _meeting.scheduleSpecialMeeting(
      _anchorCircleId, 3600, block.timestamp + 1 days, _member1, 'Discuss Dev role', 'Only Dev role'
    );

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(_m.isSpecial, true);
    assertEq(_m.requester, _member1);
  }

  /*///////////////////////////////////////////////////////////////
                      CANCEL MEETING
  //////////////////////////////////////////////////////////////*/

  function test_CancelMeetingWhenScheduled() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_secretary);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingCancelled(_meetingId);

    _meeting.cancelMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Cancelled));
  }

  function test_CancelMeetingWhenAlreadyStarted() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_secretary);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Scheduled
      )
    );
    _meeting.cancelMeeting(_meetingId);
  }

  function test_CancelMeetingWhenNotSecretary() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotSecretary.selector, _anchorCircleId)
    );
    _meeting.cancelMeeting(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      EXTEND MEETING
  //////////////////////////////////////////////////////////////*/

  function test_ExtendMeetingWhenActive() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_secretary);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingExtended(_meetingId, 7200);

    _meeting.extendMeeting(_meetingId, 3600);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(_m.duration, 7200);
  }

  function test_ExtendMeetingWhenNotStarted() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_secretary);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.CheckIn
      )
    );
    _meeting.extendMeeting(_meetingId, 3600);
  }

  /*///////////////////////////////////////////////////////////////
                      START MEETING
  //////////////////////////////////////////////////////////////*/

  function test_StartMeetingWhenFacilitator() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingStarted(_meetingId);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.CheckIn);

    _meeting.startMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.CheckIn));
    assertGt(_m.startedAt, 0);

    // Facilitator auto-joined
    address[] memory _participants = _meeting.getMeetingParticipants(_meetingId);
    assertEq(_participants.length, 1);
    assertEq(_participants[0], _facilitator);
  }

  function test_StartMeetingWhenNotFacilitator() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotFacilitator.selector, _anchorCircleId)
    );
    _meeting.startMeeting(_meetingId);
  }

  function test_StartMeetingWhenNotScheduled() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Scheduled
      )
    );
    _meeting.startMeeting(_meetingId);
  }

  function test_StartMeetingWhenDoesNotExist() external {
    vm.prank(_facilitator);
    vm.expectRevert(abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_MeetingNotFound.selector, 999));
    _meeting.startMeeting(999);
  }

  /*///////////////////////////////////////////////////////////////
                      JOIN MEETING
  //////////////////////////////////////////////////////////////*/

  function test_JoinMeetingWhenCircleMember() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ParticipantJoined(_meetingId, _member1);

    _meeting.joinMeeting(_meetingId);

    address[] memory _participants = _meeting.getMeetingParticipants(_meetingId);
    // facilitator + member1
    assertEq(_participants.length, 2);
  }

  function test_JoinMeetingWhenNotCircleMember() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotCircleMember.selector, _anchorCircleId, _stranger)
    );
    _meeting.joinMeeting(_meetingId);
  }

  function test_JoinMeetingWhenNotActive() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.CheckIn
      )
    );
    _meeting.joinMeeting(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      INVITE GUEST
  //////////////////////////////////////////////////////////////*/

  function test_InviteGuestWhenParticipant() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    address _guest = makeAddr('guest');

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit GuestInvited(_meetingId, _guest, _facilitator);

    _meeting.inviteGuest(_meetingId, _guest);

    // Guest can now join
    vm.prank(_guest);
    _meeting.joinMeeting(_meetingId);

    address[] memory _participants = _meeting.getMeetingParticipants(_meetingId);
    assertEq(_participants.length, 2); // facilitator + guest
  }

  function test_InviteGuestWhenNotParticipant() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_member1); // not yet joined
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotParticipant.selector, _meetingId, _member1)
    );
    _meeting.inviteGuest(_meetingId, makeAddr('guest'));
  }

  /*///////////////////////////////////////////////////////////////
                      CHECK-IN ROUND
  //////////////////////////////////////////////////////////////*/

  function test_RecordCheckInWhenValid() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_member1);
    _meeting.joinMeeting(_meetingId);

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit CheckInRecorded(_meetingId, _member1);

    _meeting.recordCheckIn(_meetingId);
  }

  function test_RecordCheckInWhenAlreadyCheckedIn() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);
    _joinAndCheckIn(_meetingId, _member1);

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_AlreadyCheckedIn.selector, _meetingId, _member1)
    );
    _meeting.recordCheckIn(_meetingId);
  }

  function test_RecordCheckInWhenWrongPhase() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.CheckIn
      )
    );
    _meeting.recordCheckIn(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      PHASE TRANSITIONS
  //////////////////////////////////////////////////////////////*/

  function test_StartAgendaBuildingWhenValid() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.AgendaBuilding);

    _meeting.startAgendaBuilding(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.AgendaBuilding));
  }

  function test_StartAgendaBuildingWhenWrongPhase() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.CheckIn
      )
    );
    _meeting.startAgendaBuilding(_meetingId);
  }

  function test_StartClosingRoundWhenFromAgendaBuilding() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingPhaseChanged(_meetingId, HolacracyTypes.MeetingStatus.Closing);

    _meeting.startClosingRound(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Closing));
  }

  function test_CompleteMeetingWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);
    _meeting.startClosingRound(_meetingId);

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingCompleted(_meetingId);

    _meeting.completeMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Completed));
    assertGt(_m.completedAt, 0);
  }

  function test_CompleteMeetingWhenNotClosing() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Closing
      )
    );
    _meeting.completeMeeting(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      CLOSING ROUND
  //////////////////////////////////////////////////////////////*/

  function test_RecordClosingWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);
    _meeting.startClosingRound(_meetingId);

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ClosingRecorded(_meetingId, _member1);

    _meeting.recordClosing(_meetingId);
  }

  function test_RecordClosingWhenWrongPhase() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Closing
      )
    );
    _meeting.recordClosing(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      AGENDA MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  function test_AddAgendaItemWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemAdded(_meetingId, 1, _member1, HolacracyTypes.AgendaItemType.Proposal);

    uint256 _itemId = _meeting.addAgendaItem(_meetingId, 'My tension', HolacracyTypes.AgendaItemType.Proposal);

    HolacracyTypes.GovernanceAgendaItem memory _item = _meeting.getAgendaItem(_itemId);
    assertEq(_item.id, _itemId);
    assertEq(_item.meetingId, _meetingId);
    assertEq(_item.owner, _member1);
    assertEq(_item.label, 'My tension');
    assertEq(uint256(_item.itemType), uint256(HolacracyTypes.AgendaItemType.Proposal));
    assertEq(uint256(_item.status), uint256(HolacracyTypes.AgendaItemStatus.Pending));

    uint256[] memory _items = _meeting.getAgendaItems(_meetingId);
    assertEq(_items.length, 1);
    assertEq(_items[0], _itemId);
  }

  function test_AddAgendaItemWhenNotParticipant() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotParticipant.selector, _meetingId, _stranger)
    );
    _meeting.addAgendaItem(_meetingId, 'Tension', HolacracyTypes.AgendaItemType.Proposal);
  }

  function test_AddAgendaItemWhenWrongPhase() external {
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    _joinAndCheckIn(_meetingId, _member1);

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidPhase.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.AgendaBuilding
      )
    );
    _meeting.addAgendaItem(_meetingId, 'Tension', HolacracyTypes.AgendaItemType.Proposal);
  }

  function test_StartProcessingItemWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);
    uint256 _itemId = _meeting.addAgendaItem(_meetingId, 'Tension', HolacracyTypes.AgendaItemType.Proposal);

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemStarted(_meetingId, _itemId);

    _meeting.startProcessingItem(_meetingId, _itemId);

    HolacracyTypes.GovernanceAgendaItem memory _item = _meeting.getAgendaItem(_itemId);
    assertEq(uint256(_item.status), uint256(HolacracyTypes.AgendaItemStatus.Active));

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Processing));
  }

  function test_StartProcessingItemWhenNotFacilitator() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);
    uint256 _itemId = _meeting.addAgendaItem(_meetingId, 'Tension', HolacracyTypes.AgendaItemType.Proposal);

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotFacilitator.selector, _anchorCircleId)
    );
    _meeting.startProcessingItem(_meetingId, _itemId);
  }

  function test_DropAgendaItemWhenActive() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemDropped(_meetingId, _itemId);

    _meeting.dropAgendaItem(_meetingId, _itemId);

    HolacracyTypes.GovernanceAgendaItem memory _item = _meeting.getAgendaItem(_itemId);
    assertEq(uint256(_item.status), uint256(HolacracyTypes.AgendaItemStatus.Dropped));

    // Meeting goes back to AgendaBuilding
    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.AgendaBuilding));
  }

  /*///////////////////////////////////////////////////////////////
                      IDM PROCESS
  //////////////////////////////////////////////////////////////*/

  function test_PresentProposalWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    vm.prank(_member1);

    uint256 _proposalId =
      _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    // Proposal was created in GovernanceProcess
    assertGt(_proposalId, 0);
    HolacracyTypes.Proposal memory _p = _governance.getProposal(_proposalId);
    assertEq(uint256(_p.status), uint256(HolacracyTypes.ProposalStatus.Active));

    // Agenda item links to proposal
    HolacracyTypes.GovernanceAgendaItem memory _item = _meeting.getAgendaItem(_itemId);
    assertEq(_item.proposalId, _proposalId);

    // IDM step set
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.PresentProposal));
  }

  function test_PresentProposalWhenNotOwner() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    vm.prank(_member2);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotAgendaItemOwner.selector, _itemId, _member2)
    );
    _meeting.presentProposal(_meetingId, _itemId, _role2Id, 'Tension', 'Example', 'Explanation', _defaultChange());
  }

  function test_AdvanceIDMStepWhenFullFlow() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    // Present proposal
    vm.prank(_member1);
    _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    // PresentProposal → ClarifyingQuestions
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.ClarifyingQuestions));

    // ClarifyingQuestions → ReactionRound
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.ReactionRound));

    // ReactionRound → ClarifyOption
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.ClarifyOption));

    // ClarifyOption → ObjectionRound
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.ObjectionRound));
  }

  function test_AdvanceIDMStepWhenObjectionRoundToIntegration() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    vm.prank(_member1);
    _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    // Advance to ObjectionRound
    for (uint256 _i; _i < 4; ++_i) {
      vm.prank(_facilitator);
      _meeting.advanceIDMStep(_meetingId, _itemId);
    }
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.ObjectionRound));

    // ObjectionRound → Integration
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.Integration));

    // Integration → back to ObjectionRound
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getIDMStep(_itemId)), uint256(HolacracyTypes.IDMStep.ObjectionRound));
  }

  function test_AdvanceIDMStepWhenNotFacilitator() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    vm.prank(_member1);
    _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotFacilitator.selector, _anchorCircleId)
    );
    _meeting.advanceIDMStep(_meetingId, _itemId);
  }

  function test_CompleteProposalItemWhenCleanObjectionRound() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    // Present and advance to ObjectionRound
    vm.prank(_member1);
    uint256 _proposalId =
      _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    for (uint256 _i; _i < 4; ++_i) {
      vm.prank(_facilitator);
      _meeting.advanceIDMStep(_meetingId, _itemId);
    }

    // Complete the item (adopt proposal)
    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemCompleted(_meetingId, _itemId);

    _meeting.completeProposalItem(_meetingId, _itemId);

    // Proposal adopted
    HolacracyTypes.Proposal memory _p = _governance.getProposal(_proposalId);
    assertEq(uint256(_p.status), uint256(HolacracyTypes.ProposalStatus.Adopted));

    // Item completed
    HolacracyTypes.GovernanceAgendaItem memory _item = _meeting.getAgendaItem(_itemId);
    assertEq(uint256(_item.status), uint256(HolacracyTypes.AgendaItemStatus.Completed));

    // Meeting back to AgendaBuilding
    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.AgendaBuilding));
  }

  function test_CompleteProposalItemWhenNotObjectionRound() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    vm.prank(_member1);
    _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    // Still at PresentProposal step
    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidIDMStep.selector,
        _meetingId,
        _itemId,
        HolacracyTypes.IDMStep.ObjectionRound
      )
    );
    _meeting.completeProposalItem(_meetingId, _itemId);
  }

  /*///////////////////////////////////////////////////////////////
                      IDM — ROLE EDITING
  //////////////////////////////////////////////////////////////*/

  function test_AmendRoleThroughMeetingIDM() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartProposalItem(_meetingId);

    // Build an AmendRole change
    string[] memory _newDomains = new string[](1);
    _newDomains[0] = 'NewDomain';
    string[] memory _newAccounts = new string[](1);
    _newAccounts[0] = 'NewAccountability';

    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.AmendRole,
      targetId: _role1Id,
      encodedData: abi.encode('DevUpdated', 'New purpose', _newDomains, _newAccounts)
    });

    // Present the AmendRole proposal
    vm.prank(_member1);
    uint256 _proposalId =
      _meeting.presentProposal(_meetingId, _itemId, _role1Id, 'Role needs update', 'Workload shifted', 'Update role', _change);

    // Advance through IDM to ObjectionRound
    for (uint256 _i; _i < 4; ++_i) {
      vm.prank(_facilitator);
      _meeting.advanceIDMStep(_meetingId, _itemId);
    }

    // Complete — adopts the proposal and executes the role change
    vm.prank(_facilitator);
    _meeting.completeProposalItem(_meetingId, _itemId);

    // Verify the role was actually updated
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_role1Id);
    assertEq(_role.name, 'DevUpdated');
    assertEq(_role.purpose, 'New purpose');

    string[] memory _domains2 = _roleRegistry.getRoleDomains(_role1Id);
    assertEq(_domains2.length, 1);
    assertEq(_domains2[0], 'NewDomain');

    string[] memory _accnts = _roleRegistry.getRoleAccountabilities(_role1Id);
    assertEq(_accnts.length, 1);
    assertEq(_accnts[0], 'NewAccountability');
  }

  /*///////////////////////////////////////////////////////////////
                      ELECTION PROCESS
  //////////////////////////////////////////////////////////////*/

  function test_StartElectionWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ElectionStepAdvanced(_meetingId, _itemId, HolacracyTypes.ElectionStep.DescribeRole);

    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Facilitator, 365 days);

    HolacracyTypes.MeetingElection memory _e = _meeting.getElectionState(_itemId);
    assertEq(_e.agendaItemId, _itemId);
    assertEq(_e.circleId, _anchorCircleId);
    assertEq(uint256(_e.targetRole), uint256(HolacracyTypes.ElectedRole.Facilitator));
    assertEq(_e.term, 365 days);
    assertEq(uint256(_e.currentStep), uint256(HolacracyTypes.ElectionStep.DescribeRole));
  }

  function test_ElectionFullFlowWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    // Start election for Secretary
    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Secretary, 180 days);

    // DescribeRole → Nominate
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);
    assertEq(uint256(_meeting.getElectionState(_itemId).currentStep), uint256(HolacracyTypes.ElectionStep.Nominate));

    // Cast nominations
    vm.prank(_member1);
    _meeting.castNomination(_meetingId, _itemId, _member2);

    vm.prank(_member2);
    _meeting.castNomination(_meetingId, _itemId, _member2);

    HolacracyTypes.Nomination[] memory _noms = _meeting.getNominations(_itemId);
    assertEq(_noms.length, 2);
    assertEq(_noms[0].candidate, _member2);
    assertEq(_noms[1].candidate, _member2);

    // Nominate → NominationSharing
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);

    // NominationSharing → NominationChange
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);

    // Member1 changes nomination
    vm.prank(_member1);
    _meeting.changeNomination(_meetingId, _itemId, _member1);

    HolacracyTypes.Nomination[] memory _noms2 = _meeting.getNominations(_itemId);
    assertEq(_noms2[0].changed, true);
    assertEq(_noms2[0].changedTo, _member1);

    // NominationChange → MakeProposal
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);

    // Facilitator proposes the candidate with most nominations
    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit CandidateProposed(_meetingId, _itemId, _member2);

    _meeting.proposeCandidate(_meetingId, _itemId, _member2);

    // MakeProposal → ObjectionRound
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);

    // Complete the election
    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ElectionCompleted(_meetingId, _itemId, _member2);

    _meeting.completeElection(_meetingId, _itemId);

    // Verify the elected role was set
    assertEq(
      _circleRegistry.getElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Secretary),
      _member2
    );

    // Item completed, meeting back to AgendaBuilding
    HolacracyTypes.GovernanceAgendaItem memory _item = _meeting.getAgendaItem(_itemId);
    assertEq(uint256(_item.status), uint256(HolacracyTypes.AgendaItemStatus.Completed));

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.AgendaBuilding));
  }

  function test_CastNominationWhenWrongStep() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Facilitator, 365 days);

    // Still at DescribeRole, not Nominate
    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidElectionStep.selector,
        _meetingId,
        _itemId,
        HolacracyTypes.ElectionStep.Nominate
      )
    );
    _meeting.castNomination(_meetingId, _itemId, _member2);
  }

  function test_CastNominationWhenAlreadyNominated() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Facilitator, 365 days);

    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);

    vm.prank(_member1);
    _meeting.castNomination(_meetingId, _itemId, _member2);

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_AlreadyNominated.selector, _itemId, _member1)
    );
    _meeting.castNomination(_meetingId, _itemId, _member2);
  }

  function test_ChangeNominationWhenWrongStep() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Facilitator, 365 days);

    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _itemId);

    vm.prank(_member1);
    _meeting.castNomination(_meetingId, _itemId, _member2);

    // Still at Nominate, not NominationChange
    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidElectionStep.selector,
        _meetingId,
        _itemId,
        HolacracyTypes.ElectionStep.NominationChange
      )
    );
    _meeting.changeNomination(_meetingId, _itemId, _member1);
  }

  function test_ProposeCandidateWhenWrongStep() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Facilitator, 365 days);

    // Still at DescribeRole
    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidElectionStep.selector,
        _meetingId,
        _itemId,
        HolacracyTypes.ElectionStep.MakeProposal
      )
    );
    _meeting.proposeCandidate(_meetingId, _itemId, _member1);
  }

  function test_CompleteElectionWhenWrongStep() external {
    uint256 _meetingId = _setupActiveMeeting();
    uint256 _itemId = _addAndStartElectionItem(_meetingId);

    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _itemId, HolacracyTypes.ElectedRole.Facilitator, 365 days);

    // Still at DescribeRole
    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidElectionStep.selector,
        _meetingId,
        _itemId,
        HolacracyTypes.ElectionStep.ObjectionRound
      )
    );
    _meeting.completeElection(_meetingId, _itemId);
  }

  /*///////////////////////////////////////////////////////////////
                      FULL MEETING E2E
  //////////////////////////////////////////////////////////////*/

  function test_FullMeetingE2EWithProposalAndElection() external {
    // Schedule and start
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    // Join and check in
    _joinAndCheckIn(_meetingId, _member1);
    _joinAndCheckIn(_meetingId, _member2);
    vm.prank(_facilitator);
    _meeting.recordCheckIn(_meetingId);

    // Move to agenda building
    vm.prank(_facilitator);
    _meeting.startAgendaBuilding(_meetingId);

    // Add two agenda items
    vm.prank(_member1);
    uint256 _proposalItemId =
      _meeting.addAgendaItem(_meetingId, 'Create ops role', HolacracyTypes.AgendaItemType.Proposal);

    vm.prank(_member2);
    uint256 _electionItemId =
      _meeting.addAgendaItem(_meetingId, 'Elect new CircleRep', HolacracyTypes.AgendaItemType.Election);

    // --- Process proposal item ---
    vm.prank(_facilitator);
    _meeting.startProcessingItem(_meetingId, _proposalItemId);

    string[] memory _emptyArr = new string[](0);
    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('Ops', 'Operations', _emptyArr, _emptyArr)
    });

    vm.prank(_member1);
    _meeting.presentProposal(
      _meetingId, _proposalItemId, _role1Id, 'Need ops', 'Dropping balls', 'New ops role', _change
    );

    // Advance through IDM
    for (uint256 _i; _i < 4; ++_i) {
      vm.prank(_facilitator);
      _meeting.advanceIDMStep(_meetingId, _proposalItemId);
    }

    vm.prank(_facilitator);
    _meeting.completeProposalItem(_meetingId, _proposalItemId);

    // Verify role was created
    uint256 _newRoleCount = _roleRegistry.roleCount();
    HolacracyTypes.Role memory _newRole = _roleRegistry.getRole(_newRoleCount);
    assertEq(_newRole.name, 'Ops');
    assertEq(_newRole.purpose, 'Operations');

    // --- Process election item ---
    vm.prank(_facilitator);
    _meeting.startProcessingItem(_meetingId, _electionItemId);

    vm.prank(_facilitator);
    _meeting.startElection(_meetingId, _electionItemId, HolacracyTypes.ElectedRole.CircleRep, 180 days);

    // Advance to Nominate
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _electionItemId);

    vm.prank(_member1);
    _meeting.castNomination(_meetingId, _electionItemId, _member1);

    vm.prank(_member2);
    _meeting.castNomination(_meetingId, _electionItemId, _member1);

    // Advance through NominationSharing → NominationChange → MakeProposal
    for (uint256 _i; _i < 3; ++_i) {
      vm.prank(_facilitator);
      _meeting.advanceElectionStep(_meetingId, _electionItemId);
    }

    vm.prank(_facilitator);
    _meeting.proposeCandidate(_meetingId, _electionItemId, _member1);

    // Advance to ObjectionRound
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, _electionItemId);

    vm.prank(_facilitator);
    _meeting.completeElection(_meetingId, _electionItemId);

    assertEq(
      _circleRegistry.getElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.CircleRep),
      _member1
    );

    // --- Closing ---
    vm.prank(_facilitator);
    _meeting.startClosingRound(_meetingId);

    vm.prank(_member1);
    _meeting.recordClosing(_meetingId);

    vm.prank(_member2);
    _meeting.recordClosing(_meetingId);

    vm.prank(_facilitator);
    _meeting.recordClosing(_meetingId);

    vm.prank(_facilitator);
    _meeting.completeMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Completed));
  }

  /*///////////////////////////////////////////////////////////////
                      FALLBACK AUTH (NO ELECTED ROLES)
  //////////////////////////////////////////////////////////////*/

  function test_ScheduleMeetingWhenNoSecretaryFallsBackToCircleLead() external {
    // Clear secretary
    vm.prank(_deployer);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Secretary, address(0));

    // Circle lead (deployer) can schedule
    vm.prank(_deployer);
    uint256 _meetingId = _meeting.scheduleMeeting(_anchorCircleId, 3600, block.timestamp + 1 days);
    assertGt(_meetingId, 0);
  }

  function test_StartMeetingWhenNoFacilitatorFallsBackToCircleLead() external {
    // Clear facilitator
    vm.prank(_deployer);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, address(0));

    uint256 _meetingId = _scheduleMeeting();

    // Circle lead (deployer) can start
    vm.prank(_deployer);
    _meeting.startMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.CheckIn));
  }
}
