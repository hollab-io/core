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

  // Events
  event MeetingScheduled(
    uint256 indexed _meetingId,
    uint256 indexed _circleId,
    address indexed _scheduledBy,
    bool _isSpecial,
    address _requester,
    string _intention,
    string _limits
  );
  event MeetingStarted(uint256 indexed _meetingId);
  event MeetingCompleted(uint256 indexed _meetingId);
  event MeetingCancelled(uint256 indexed _meetingId);
  event ParticipantJoined(uint256 indexed _meetingId, address indexed _participant);
  event CheckInRecorded(uint256 indexed _meetingId, address indexed _participant);
  event ClosingRecorded(uint256 indexed _meetingId, address indexed _participant);
  event AgendaItemAdded(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    address indexed _owner,
    string _label,
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
  event ElectionCompleted(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    uint256 indexed _circleId,
    HolacracyTypes.ElectedRole _targetRole,
    address _elected
  );

  function setUp() external {
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

    vm.startPrank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(_governance));
    _governance.setGovernanceMeeting(address(_meeting));
    _meeting.initialize(_circleRegistry, _roleRegistry, _governance);
    _circleRegistry.setGovernanceMeeting(address(_meeting));

    // Create anchor circle
    _anchorCircleId = _circleRegistry.createAnchorCircle('HolLab', 'Build tools');

    // Create roles and assign members
    string[] memory _domains = new string[](1);
    _domains[0] = 'TestDomain';
    string[] memory _accountabilities = new string[](1);
    _accountabilities[0] = 'TestAccountability';
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
    return HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('NewRole', 'NewPurpose', new string[](0), new string[](0))
    });
  }

  function _scheduleMeeting() internal returns (uint256 _meetingId) {
    vm.prank(_secretary);
    _meetingId = _meeting.scheduleMeeting(_anchorCircleId);
  }

  function _startMeeting(uint256 _meetingId) internal {
    vm.prank(_facilitator);
    _meeting.startMeeting(_meetingId);
  }

  function _joinMeeting(uint256 _meetingId, address _participant) internal {
    vm.prank(_participant);
    _meeting.joinMeeting(_meetingId);
  }

  function _setupActiveMeeting() internal returns (uint256 _meetingId) {
    _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);
    _joinMeeting(_meetingId, _member1);
    _joinMeeting(_meetingId, _member2);
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
    emit MeetingScheduled(1, _anchorCircleId, _secretary, false, address(0), '', '');

    uint256 _meetingId = _meeting.scheduleMeeting(_anchorCircleId);

    assertEq(_meeting.meetingCount(), 1);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(_m.id, 1);
    assertEq(_m.circleId, _anchorCircleId);
    assertEq(_m.scheduledBy, _secretary);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Scheduled));
  }

  function test_ScheduleMeetingWhenNotSecretary() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotSecretary.selector, _anchorCircleId)
    );
    _meeting.scheduleMeeting(_anchorCircleId);
  }

  function test_ScheduleSpecialMeetingWhenSecretary() external {
    vm.prank(_secretary);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingScheduled(1, _anchorCircleId, _secretary, true, _member1, 'Discuss Dev role', 'Only Dev role');

    _meeting.scheduleSpecialMeeting(_anchorCircleId, _member1, 'Discuss Dev role', 'Only Dev role');
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
        IGovernanceMeeting.GovernanceMeeting_InvalidStatus.selector,
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
                      START MEETING
  //////////////////////////////////////////////////////////////*/

  function test_StartMeetingWhenFacilitator() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingStarted(_meetingId);

    _meeting.startMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Active));
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
        IGovernanceMeeting.GovernanceMeeting_InvalidStatus.selector,
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
                      COMPLETE MEETING
  //////////////////////////////////////////////////////////////*/

  function test_CompleteMeetingWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit MeetingCompleted(_meetingId);

    _meeting.completeMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _m = _meeting.getMeeting(_meetingId);
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Completed));
  }

  function test_CompleteMeetingWhenNotActive() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_facilitator);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidStatus.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Active
      )
    );
    _meeting.completeMeeting(_meetingId);
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
        IGovernanceMeeting.GovernanceMeeting_InvalidStatus.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Active
      )
    );
    _meeting.joinMeeting(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      CHECK-IN / CLOSING
  //////////////////////////////////////////////////////////////*/

  function test_RecordCheckInWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit CheckInRecorded(_meetingId, _member1);

    _meeting.recordCheckIn(_meetingId);
  }

  function test_RecordCheckInWhenNotActive() external {
    uint256 _meetingId = _scheduleMeeting();

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_InvalidStatus.selector,
        _meetingId,
        HolacracyTypes.MeetingStatus.Active
      )
    );
    _meeting.recordCheckIn(_meetingId);
  }

  function test_RecordClosingWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ClosingRecorded(_meetingId, _member1);

    _meeting.recordClosing(_meetingId);
  }

  /*///////////////////////////////////////////////////////////////
                      AGENDA MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  function test_AddAgendaItemWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemAdded(_meetingId, 1, _member1, 'My tension', HolacracyTypes.AgendaItemType.Proposal);

    _meeting.addAgendaItem(_meetingId, 1, 'My tension', HolacracyTypes.AgendaItemType.Proposal);
  }

  function test_AddAgendaItemWhenNotParticipant() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotParticipant.selector, _meetingId, _stranger)
    );
    _meeting.addAgendaItem(_meetingId, 1, 'Tension', HolacracyTypes.AgendaItemType.Proposal);
  }

  function test_StartProcessingItemWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemStarted(_meetingId, 1);

    _meeting.startProcessingItem(_meetingId, 1);
  }

  function test_StartProcessingItemWhenNotFacilitator() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotFacilitator.selector, _anchorCircleId)
    );
    _meeting.startProcessingItem(_meetingId, 1);
  }

  function test_DropAgendaItemWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemDropped(_meetingId, 1);

    _meeting.dropAgendaItem(_meetingId, 1);
  }

  /*///////////////////////////////////////////////////////////////
                      IDM PROCESS
  //////////////////////////////////////////////////////////////*/

  function test_PresentProposalWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, false, true, address(_meeting));
    emit ProposalPresented(_meetingId, 1, 1);

    uint256 _proposalId =
      _meeting.presentProposal(_meetingId, 1, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    // Proposal was created in GovernanceProcess
    assertGt(_proposalId, 0);
    HolacracyTypes.Proposal memory _p = _governance.getProposal(_proposalId);
    assertEq(uint256(_p.status), uint256(HolacracyTypes.ProposalStatus.Active));
  }

  function test_PresentProposalWhenNotParticipant() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotParticipant.selector, _meetingId, _stranger)
    );
    _meeting.presentProposal(_meetingId, 1, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());
  }

  function test_AdvanceIDMStepWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit IDMStepAdvanced(_meetingId, 1, HolacracyTypes.IDMStep.ClarifyingQuestions);

    _meeting.advanceIDMStep(_meetingId, 1, HolacracyTypes.IDMStep.ClarifyingQuestions);
  }

  function test_AdvanceIDMStepWhenNotFacilitator() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotFacilitator.selector, _anchorCircleId)
    );
    _meeting.advanceIDMStep(_meetingId, 1, HolacracyTypes.IDMStep.ClarifyingQuestions);
  }

  function test_CompleteProposalItemWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    // Present proposal
    vm.prank(_member1);
    uint256 _proposalId =
      _meeting.presentProposal(_meetingId, 1, _role1Id, 'Tension', 'Example', 'Explanation', _defaultChange());

    // Complete the item (adopt proposal)
    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit AgendaItemCompleted(_meetingId, 1);

    _meeting.completeProposalItem(_meetingId, 1, _proposalId);

    // Proposal adopted
    HolacracyTypes.Proposal memory _p = _governance.getProposal(_proposalId);
    assertEq(uint256(_p.status), uint256(HolacracyTypes.ProposalStatus.Adopted));
  }

  /*///////////////////////////////////////////////////////////////
                      IDM — ROLE EDITING
  //////////////////////////////////////////////////////////////*/

  function test_AmendRoleThroughMeetingIDM() external {
    uint256 _meetingId = _setupActiveMeeting();

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
      _meeting.presentProposal(_meetingId, 1, _role1Id, 'Role needs update', 'Workload shifted', 'Update role', _change);

    // Complete — adopts the proposal and executes the role change
    vm.prank(_facilitator);
    _meeting.completeProposalItem(_meetingId, 1, _proposalId);

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

  function test_ElectionStepAdvanceWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ElectionStepAdvanced(_meetingId, 1, HolacracyTypes.ElectionStep.Nominate);

    _meeting.advanceElectionStep(_meetingId, 1, HolacracyTypes.ElectionStep.Nominate);
  }

  function test_CastNominationWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit NominationCast(_meetingId, 1, _member1, _member2);

    _meeting.castNomination(_meetingId, 1, _member2);
  }

  function test_ChangeNominationWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit NominationChanged(_meetingId, 1, _member1, _member2);

    _meeting.changeNomination(_meetingId, 1, _member2);
  }

  function test_ProposeCandidateWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit CandidateProposed(_meetingId, 1, _member2);

    _meeting.proposeCandidate(_meetingId, 1, _member2);
  }

  function test_CompleteElectionWhenValid() external {
    uint256 _meetingId = _setupActiveMeeting();

    vm.prank(_facilitator);

    vm.expectEmit(true, true, true, true, address(_meeting));
    emit ElectionCompleted(_meetingId, 1, _anchorCircleId, HolacracyTypes.ElectedRole.Secretary, _member2);

    _meeting.completeElection(_meetingId, 1, _anchorCircleId, HolacracyTypes.ElectedRole.Secretary, _member2);

    // Verify the elected role was set
    assertEq(
      _circleRegistry.getElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Secretary),
      _member2
    );
  }

  /*///////////////////////////////////////////////////////////////
                      FULL MEETING E2E
  //////////////////////////////////////////////////////////////*/

  function test_FullMeetingE2EWithProposalAndElection() external {
    // Schedule and start
    uint256 _meetingId = _scheduleMeeting();
    _startMeeting(_meetingId);

    // Join
    _joinMeeting(_meetingId, _member1);
    _joinMeeting(_meetingId, _member2);

    // Check-in (event only)
    vm.prank(_member1);
    _meeting.recordCheckIn(_meetingId);
    vm.prank(_member2);
    _meeting.recordCheckIn(_meetingId);
    vm.prank(_facilitator);
    _meeting.recordCheckIn(_meetingId);

    // Add agenda items (event only)
    vm.prank(_member1);
    _meeting.addAgendaItem(_meetingId, 1, 'Create ops role', HolacracyTypes.AgendaItemType.Proposal);

    vm.prank(_member2);
    _meeting.addAgendaItem(_meetingId, 2, 'Elect new CircleRep', HolacracyTypes.AgendaItemType.Election);

    // --- Process proposal item ---
    vm.prank(_facilitator);
    _meeting.startProcessingItem(_meetingId, 1);

    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('Ops', 'Operations', new string[](0), new string[](0))
    });

    vm.prank(_member1);
    uint256 _proposalId = _meeting.presentProposal(_meetingId, 1, _role1Id, 'Need ops', 'Dropping balls', 'New ops role', _change);

    // Advance IDM steps (event only)
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, 1, HolacracyTypes.IDMStep.ClarifyingQuestions);
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, 1, HolacracyTypes.IDMStep.ReactionRound);
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, 1, HolacracyTypes.IDMStep.ClarifyOption);
    vm.prank(_facilitator);
    _meeting.advanceIDMStep(_meetingId, 1, HolacracyTypes.IDMStep.ObjectionRound);

    // Adopt proposal
    vm.prank(_facilitator);
    _meeting.completeProposalItem(_meetingId, 1, _proposalId);

    // Verify role was created
    uint256 _newRoleCount = _roleRegistry.roleCount();
    HolacracyTypes.Role memory _newRole = _roleRegistry.getRole(_newRoleCount);
    assertEq(_newRole.name, 'Ops');

    // --- Process election item ---
    vm.prank(_facilitator);
    _meeting.startProcessingItem(_meetingId, 2);

    // Election steps (event only)
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, 2, HolacracyTypes.ElectionStep.DescribeRole);
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, 2, HolacracyTypes.ElectionStep.Nominate);

    vm.prank(_member1);
    _meeting.castNomination(_meetingId, 2, _member1);
    vm.prank(_member2);
    _meeting.castNomination(_meetingId, 2, _member1);

    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, 2, HolacracyTypes.ElectionStep.NominationSharing);
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, 2, HolacracyTypes.ElectionStep.NominationChange);
    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, 2, HolacracyTypes.ElectionStep.MakeProposal);

    vm.prank(_facilitator);
    _meeting.proposeCandidate(_meetingId, 2, _member1);

    vm.prank(_facilitator);
    _meeting.advanceElectionStep(_meetingId, 2, HolacracyTypes.ElectionStep.ObjectionRound);

    // Complete election (outcome)
    vm.prank(_facilitator);
    _meeting.completeElection(_meetingId, 2, _anchorCircleId, HolacracyTypes.ElectedRole.CircleRep, _member1);

    assertEq(
      _circleRegistry.getElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.CircleRep),
      _member1
    );

    // --- Closing ---
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
    uint256 _meetingId = _meeting.scheduleMeeting(_anchorCircleId);
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
    assertEq(uint256(_m.status), uint256(HolacracyTypes.MeetingStatus.Active));
  }
}
