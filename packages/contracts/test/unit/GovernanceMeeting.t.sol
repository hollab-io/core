// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {GovernanceMeeting, IGovernanceMeeting} from 'contracts/GovernanceMeeting.sol';
import {GovernanceProcess, IGovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitGovernanceMeeting is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  GovernanceProcess internal _governanceProcess;
  GovernanceMeeting internal _governanceMeeting;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _facilitator = makeAddr('facilitator');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _anchorCircleId;
  uint256 internal _role1Id;

  string[] internal _domains;
  string[] internal _accountabilities;

  event MeetingConvened(uint256 indexed _meetingId, uint256 indexed _circleId, address indexed _convenedBy);
  event MeetingCompleted(uint256 indexed _meetingId);
  event ProposalLinked(uint256 indexed _meetingId, uint256 indexed _proposalId);

  function setUp() external {
    _roleRegistry = new RoleRegistry();
    _circleRegistry = new CircleRegistry();
    _governanceProcess = new GovernanceProcess();
    _governanceMeeting = new GovernanceMeeting();

    _roleRegistry = RoleRegistry(Clones.clone(address(_roleRegistry)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_circleRegistry)));
    _governanceProcess = GovernanceProcess(Clones.clone(address(_governanceProcess)));
    _governanceMeeting = GovernanceMeeting(Clones.clone(address(_governanceMeeting)));

    _roleRegistry.initialize();
    _governanceProcess.initialize(_circleRegistry, _roleRegistry);
    vm.prank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(_governanceProcess));
    _governanceMeeting.initialize(_circleRegistry, _governanceProcess);

    _domains.push('Engineering');
    _accountabilities.push('Ship features');

    // Create anchor circle and roles
    vm.startPrank(_deployer);
    _anchorCircleId = _circleRegistry.createAnchorCircle('HolLab', 'Build holacracy tools');
    _role1Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Dev', 'Develop', _domains, _accountabilities);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role1Id, _member1);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);
    _circleRegistry.addCircleLead(_anchorCircleId, _facilitator);
    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                        HELPERS
  //////////////////////////////////////////////////////////////*/

  function _conveneMeeting() internal returns (uint256 _meetingId) {
    vm.prank(_deployer);
    _meetingId = _governanceMeeting.conveneMeeting(_anchorCircleId);
  }

  function _createProposal() internal returns (uint256 _proposalId) {
    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: _anchorCircleId,
      encodedData: abi.encode('Community', 'Community circle')
    });

    vm.prank(_deployer);
    _proposalId = _governanceProcess.submitProposal(
      _anchorCircleId, 0, 'Need a community circle', 'External contributors want to participate', 'Creates a space for community', _change
    );
  }

  /*///////////////////////////////////////////////////////////////
                      CONVENE MEETING
  //////////////////////////////////////////////////////////////*/

  function test_conveneMeetingWhenCircleMember() external {
    vm.prank(_deployer);

    vm.expectEmit(true, true, true, true, address(_governanceMeeting));
    emit MeetingConvened(1, _anchorCircleId, _deployer);

    uint256 _meetingId = _governanceMeeting.conveneMeeting(_anchorCircleId);

    HolacracyTypes.GovernanceMeeting memory _meeting = _governanceMeeting.getMeeting(_meetingId);
    assertEq(_meeting.id, _meetingId);
    assertEq(_meeting.circleId, _anchorCircleId);
    assertEq(_meeting.convenedBy, _deployer);
    assertGt(_meeting.createdAt, 0);
    assertEq(_meeting.completedAt, 0);
    assertTrue(_meeting.exists);
  }

  function test_conveneMeetingWhenRoleLead() external {
    vm.prank(_member1);
    uint256 _meetingId = _governanceMeeting.conveneMeeting(_anchorCircleId);

    HolacracyTypes.GovernanceMeeting memory _meeting = _governanceMeeting.getMeeting(_meetingId);
    assertEq(_meeting.convenedBy, _member1);
  }

  function test_conveneMeetingWhenNotCircleMember() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotCircleMember.selector, _anchorCircleId, _stranger)
    );
    _governanceMeeting.conveneMeeting(_anchorCircleId);
  }

  function test_getCircleMeetings() external {
    _conveneMeeting();

    vm.prank(_member1);
    _governanceMeeting.conveneMeeting(_anchorCircleId);

    uint256[] memory _ids = _governanceMeeting.getCircleMeetings(_anchorCircleId);
    assertEq(_ids.length, 2);
    assertEq(_ids[0], 1);
    assertEq(_ids[1], 2);
  }

  /*///////////////////////////////////////////////////////////////
                      COMPLETE MEETING
  //////////////////////////////////////////////////////////////*/

  function test_completeMeetingWhenConvener() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_deployer);

    vm.expectEmit(true, false, false, false, address(_governanceMeeting));
    emit MeetingCompleted(_meetingId);

    _governanceMeeting.completeMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _meeting = _governanceMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);
  }

  function test_completeMeetingWhenFacilitator() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_facilitator);
    _governanceMeeting.completeMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _meeting = _governanceMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);
  }

  function test_completeMeetingWhenCircleLead() external {
    vm.prank(_member1);
    uint256 _meetingId = _governanceMeeting.conveneMeeting(_anchorCircleId);

    vm.prank(_deployer);
    _governanceMeeting.completeMeeting(_meetingId);

    HolacracyTypes.GovernanceMeeting memory _meeting = _governanceMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);
  }

  function test_completeMeetingWhenNotFacilitator() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_NotFacilitator.selector, _meetingId));
    _governanceMeeting.completeMeeting(_meetingId);
  }

  function test_completeMeetingWhenAlreadyCompleted() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_deployer);
    _governanceMeeting.completeMeeting(_meetingId);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_MeetingAlreadyCompleted.selector, _meetingId)
    );
    _governanceMeeting.completeMeeting(_meetingId);
  }

  function test_completeMeetingWhenNotFound() external {
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_MeetingNotFound.selector, 999));
    _governanceMeeting.completeMeeting(999);
  }

  /*///////////////////////////////////////////////////////////////
                      LINK PROPOSAL
  //////////////////////////////////////////////////////////////*/

  function test_linkProposal() external {
    uint256 _meetingId = _conveneMeeting();
    uint256 _proposalId = _createProposal();

    vm.prank(_deployer);

    vm.expectEmit(true, true, false, false, address(_governanceMeeting));
    emit ProposalLinked(_meetingId, _proposalId);

    _governanceMeeting.linkProposal(_meetingId, _proposalId);

    uint256[] memory _ids = _governanceMeeting.getMeetingProposals(_meetingId);
    assertEq(_ids.length, 1);
    assertEq(_ids[0], _proposalId);
  }

  function test_linkMultipleProposals() external {
    uint256 _meetingId = _conveneMeeting();
    uint256 _proposal1 = _createProposal();
    uint256 _proposal2 = _createProposal();

    vm.startPrank(_deployer);
    _governanceMeeting.linkProposal(_meetingId, _proposal1);
    _governanceMeeting.linkProposal(_meetingId, _proposal2);
    vm.stopPrank();

    uint256[] memory _ids = _governanceMeeting.getMeetingProposals(_meetingId);
    assertEq(_ids.length, 2);
  }

  function test_linkProposalWhenNotCircleMember() external {
    uint256 _meetingId = _conveneMeeting();
    uint256 _proposalId = _createProposal();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_NotCircleMember.selector, _anchorCircleId, _stranger
      )
    );
    _governanceMeeting.linkProposal(_meetingId, _proposalId);
  }

  function test_linkProposalWhenMeetingCompleted() external {
    uint256 _meetingId = _conveneMeeting();
    uint256 _proposalId = _createProposal();

    vm.prank(_deployer);
    _governanceMeeting.completeMeeting(_meetingId);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_MeetingAlreadyCompleted.selector, _meetingId)
    );
    _governanceMeeting.linkProposal(_meetingId, _proposalId);
  }

  function test_linkProposalWhenAlreadyLinked() external {
    uint256 _meetingId = _conveneMeeting();
    uint256 _proposalId = _createProposal();

    vm.startPrank(_deployer);
    _governanceMeeting.linkProposal(_meetingId, _proposalId);

    vm.expectRevert(
      abi.encodeWithSelector(
        IGovernanceMeeting.GovernanceMeeting_ProposalAlreadyLinked.selector, _meetingId, _proposalId
      )
    );
    _governanceMeeting.linkProposal(_meetingId, _proposalId);
    vm.stopPrank();
  }

  function test_linkProposalWhenProposalNotFound() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IGovernanceProcess.GovernanceProcess_ProposalNotFound.selector, 999));
    _governanceMeeting.linkProposal(_meetingId, 999);
  }

  function test_linkProposalWhenMeetingNotFound() external {
    uint256 _proposalId = _createProposal();

    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_MeetingNotFound.selector, 999));
    _governanceMeeting.linkProposal(999, _proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                      INITIALIZATION
  //////////////////////////////////////////////////////////////*/

  function test_initializeRevertsIfAlreadyInitialized() external {
    vm.expectRevert(IGovernanceMeeting.GovernanceMeeting_AlreadyInitialized.selector);
    _governanceMeeting.initialize(_circleRegistry, _governanceProcess);
  }

  function test_implementationCannotBeInitialized() external {
    GovernanceMeeting _impl = new GovernanceMeeting();

    vm.expectRevert(IGovernanceMeeting.GovernanceMeeting_AlreadyInitialized.selector);
    _impl.initialize(_circleRegistry, _governanceProcess);
  }

  /*///////////////////////////////////////////////////////////////
                    FULL FLOW INTEGRATION
  //////////////////////////////////////////////////////////////*/

  function test_fullGovernanceHuddleFlow() external {
    // 1. Member convenes a governance meeting
    vm.prank(_member1);
    uint256 _meetingId = _governanceMeeting.conveneMeeting(_anchorCircleId);

    // 2. Proposals are submitted and linked to the meeting
    HolacracyTypes.GovernanceChange memory _change1 = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: _anchorCircleId,
      encodedData: abi.encode('Community Lead', 'Bridge org and community')
    });

    vm.prank(_deployer);
    uint256 _proposal1 = _governanceProcess.submitProposal(
      _anchorCircleId,
      0,
      'Need someone to manage community',
      'External contributors have no point of contact',
      'Creates a dedicated community role',
      _change1
    );

    HolacracyTypes.GovernanceChange memory _change2 = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreatePolicy,
      targetId: _anchorCircleId,
      encodedData: abi.encode('Open Contribution', 'External PRs welcome with review')
    });

    vm.prank(_member1);
    uint256 _proposal2 = _governanceProcess.submitProposal(
      _anchorCircleId,
      _role1Id,
      'No policy for external contributions',
      'Contributors submit PRs but no clear process',
      'Defines how external contributions are reviewed',
      _change2
    );

    // 3. Link proposals to the meeting
    vm.startPrank(_deployer);
    _governanceMeeting.linkProposal(_meetingId, _proposal1);
    _governanceMeeting.linkProposal(_meetingId, _proposal2);
    vm.stopPrank();

    // 4. Verify proposals are linked
    uint256[] memory _proposalIds = _governanceMeeting.getMeetingProposals(_meetingId);
    assertEq(_proposalIds.length, 2);
    assertEq(_proposalIds[0], _proposal1);
    assertEq(_proposalIds[1], _proposal2);

    // 5. Facilitator completes the meeting
    vm.prank(_facilitator);
    _governanceMeeting.completeMeeting(_meetingId);

    // 6. Meeting is completed
    HolacracyTypes.GovernanceMeeting memory _meeting = _governanceMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);

    // 7. Cannot link more proposals
    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IGovernanceMeeting.GovernanceMeeting_MeetingAlreadyCompleted.selector, _meetingId)
    );
    _governanceMeeting.linkProposal(_meetingId, _proposal1);
  }
}
