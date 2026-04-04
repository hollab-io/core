// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {TacticalMeeting, ITacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry, IRoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitTacticalMeeting is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  TacticalMeeting internal _tacticalMeeting;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _member2 = makeAddr('member2');
  address internal _facilitator = makeAddr('facilitator');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _anchorCircleId;
  uint256 internal _role1Id;
  uint256 internal _role2Id;

  string[] internal _domains;
  string[] internal _accountabilities;

  event MeetingConvened(uint256 indexed _meetingId, uint256 indexed _circleId, address indexed _convenedBy);
  event MeetingCompleted(uint256 indexed _meetingId);
  event OutputRecorded(
    uint256 indexed _meetingId,
    uint256 indexed _outputId,
    HolacracyTypes.OutputType indexed _outputType,
    address _assignedTo
  );
  event ChecklistItemAdded(uint256 indexed _roleId, uint256 indexed _checklistItemId, string _label);
  event ChecklistItemRemoved(uint256 indexed _roleId, uint256 indexed _checklistItemId);
  event MetricAdded(uint256 indexed _roleId, uint256 indexed _metricId, string _label);
  event MetricRemoved(uint256 indexed _roleId, uint256 indexed _metricId);

  function setUp() external {
    _roleRegistry = new RoleRegistry();
    _circleRegistry = new CircleRegistry();
    _tacticalMeeting = new TacticalMeeting();

    _roleRegistry = RoleRegistry(Clones.clone(address(_roleRegistry)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_circleRegistry)));
    _tacticalMeeting = TacticalMeeting(Clones.clone(address(_tacticalMeeting)));

    _roleRegistry.initialize();
    vm.prank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(0));
    _tacticalMeeting.initialize(_circleRegistry, _roleRegistry);

    _domains.push('Engineering');
    _accountabilities.push('Ship features');

    // Create anchor circle and roles
    vm.startPrank(_deployer);
    _anchorCircleId = _circleRegistry.createAnchorCircle('Build holacracy tools');
    _role1Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Dev', 'Develop', _domains, _accountabilities);
    _role2Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Design', 'Design', _domains, _accountabilities);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role1Id, _member1);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role2Id, _member2);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);
    _circleRegistry.addCircleLead(_anchorCircleId, _facilitator);
    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                        HELPERS
  //////////////////////////////////////////////////////////////*/

  function _conveneMeeting() internal returns (uint256 _meetingId) {
    vm.prank(_deployer);
    _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);
  }

  /*///////////////////////////////////////////////////////////////
                      CONVENE MEETING
  //////////////////////////////////////////////////////////////*/

  function test_conveneMeetingWhenCircleMember() external {
    vm.prank(_deployer);

    vm.expectEmit(true, true, true, true, address(_tacticalMeeting));
    emit MeetingConvened(1, _anchorCircleId, _deployer);

    uint256 _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);

    HolacracyTypes.TacticalMeeting memory _meeting = _tacticalMeeting.getMeeting(_meetingId);
    assertEq(_meeting.id, _meetingId);
    assertEq(_meeting.circleId, _anchorCircleId);
    assertEq(_meeting.convenedBy, _deployer);
    assertGt(_meeting.createdAt, 0);
    assertEq(_meeting.completedAt, 0);
    assertTrue(_meeting.exists);
  }

  function test_conveneMeetingWhenRoleLead() external {
    vm.prank(_member1);
    uint256 _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);

    HolacracyTypes.TacticalMeeting memory _meeting = _tacticalMeeting.getMeeting(_meetingId);
    assertEq(_meeting.convenedBy, _member1);
  }

  function test_conveneMeetingWhenNotCircleMember() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotCircleMember.selector, _anchorCircleId, _stranger)
    );
    _tacticalMeeting.conveneMeeting(_anchorCircleId);
  }

  function test_getCircleMeetings() external {
    _conveneMeeting();

    vm.prank(_member1);
    _tacticalMeeting.conveneMeeting(_anchorCircleId);

    uint256[] memory _ids = _tacticalMeeting.getCircleMeetings(_anchorCircleId);
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

    vm.expectEmit(true, false, false, false, address(_tacticalMeeting));
    emit MeetingCompleted(_meetingId);

    _tacticalMeeting.completeMeeting(_meetingId);

    HolacracyTypes.TacticalMeeting memory _meeting = _tacticalMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);
  }

  function test_completeMeetingWhenFacilitator() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_facilitator);
    _tacticalMeeting.completeMeeting(_meetingId);

    HolacracyTypes.TacticalMeeting memory _meeting = _tacticalMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);
  }

  function test_completeMeetingWhenCircleLead() external {
    // member1 convenes, but deployer (circle lead) can complete
    vm.prank(_member1);
    uint256 _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);

    vm.prank(_deployer);
    _tacticalMeeting.completeMeeting(_meetingId);

    HolacracyTypes.TacticalMeeting memory _meeting = _tacticalMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);
  }

  function test_completeMeetingWhenNotFacilitator() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotFacilitator.selector, _meetingId));
    _tacticalMeeting.completeMeeting(_meetingId);
  }

  function test_completeMeetingWhenAlreadyCompleted() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_deployer);
    _tacticalMeeting.completeMeeting(_meetingId);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_MeetingAlreadyCompleted.selector, _meetingId)
    );
    _tacticalMeeting.completeMeeting(_meetingId);
  }

  function test_completeMeetingWhenNotFound() external {
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_MeetingNotFound.selector, 999));
    _tacticalMeeting.completeMeeting(999);
  }

  /*///////////////////////////////////////////////////////////////
                      RECORD OUTPUT
  //////////////////////////////////////////////////////////////*/

  function test_recordOutputNextAction() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_member1);

    vm.expectEmit(true, true, true, true, address(_tacticalMeeting));
    emit OutputRecorded(_meetingId, 1, HolacracyTypes.OutputType.NextAction, _member1);

    uint256 _outputId =
      _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.NextAction, 'Build landing page', _member1, _role1Id);

    HolacracyTypes.MeetingOutput memory _output = _tacticalMeeting.getOutput(_outputId);
    assertEq(_output.id, _outputId);
    assertEq(_output.meetingId, _meetingId);
    assertEq(uint8(_output.outputType), uint8(HolacracyTypes.OutputType.NextAction));
    assertEq(_output.description, 'Build landing page');
    assertEq(_output.assignedTo, _member1);
    assertEq(_output.roleId, _role1Id);
    assertGt(_output.createdAt, 0);
  }

  function test_recordOutputProject() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_member2);
    uint256 _outputId =
      _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.Project, 'Website redesign', _member2, _role2Id);

    HolacracyTypes.MeetingOutput memory _output = _tacticalMeeting.getOutput(_outputId);
    assertEq(uint8(_output.outputType), uint8(HolacracyTypes.OutputType.Project));
    assertEq(_output.description, 'Website redesign');
  }

  function test_recordOutputRequest() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_deployer);
    uint256 _outputId = _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.Request, 'Need brand guidelines from Design', _member2, _role2Id
    );

    HolacracyTypes.MeetingOutput memory _output = _tacticalMeeting.getOutput(_outputId);
    assertEq(uint8(_output.outputType), uint8(HolacracyTypes.OutputType.Request));
  }

  function test_recordOutputInformation() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_member1);
    uint256 _outputId = _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.Information, 'CI pipeline is now green', address(0), 0
    );

    HolacracyTypes.MeetingOutput memory _output = _tacticalMeeting.getOutput(_outputId);
    assertEq(uint8(_output.outputType), uint8(HolacracyTypes.OutputType.Information));
    assertEq(_output.assignedTo, address(0));
    assertEq(_output.roleId, 0);
  }

  function test_recordOutputWhenNotCircleMember() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotCircleMember.selector, _anchorCircleId, _stranger)
    );
    _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.NextAction, 'Task', _stranger, 0);
  }

  function test_recordOutputWhenMeetingCompleted() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_deployer);
    _tacticalMeeting.completeMeeting(_meetingId);

    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_MeetingAlreadyCompleted.selector, _meetingId)
    );
    _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.NextAction, 'Task', _member1, 0);
  }

  function test_recordOutputWhenEmptyDescription() external {
    uint256 _meetingId = _conveneMeeting();

    vm.prank(_member1);
    vm.expectRevert(ITacticalMeeting.TacticalMeeting_EmptyString.selector);
    _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.NextAction, '', _member1, 0);
  }

  function test_getMeetingOutputs() external {
    uint256 _meetingId = _conveneMeeting();

    vm.startPrank(_member1);
    _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.NextAction, 'Task 1', _member1, _role1Id);
    _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.Project, 'Project 1', _member1, _role1Id);
    vm.stopPrank();

    uint256[] memory _ids = _tacticalMeeting.getMeetingOutputs(_meetingId);
    assertEq(_ids.length, 2);
    assertEq(_ids[0], 1);
    assertEq(_ids[1], 2);
  }

  /*///////////////////////////////////////////////////////////////
                      CHECKLIST ITEMS
  //////////////////////////////////////////////////////////////*/

  function test_addChecklistItem() external {
    vm.prank(_deployer);

    vm.expectEmit(true, true, false, true, address(_tacticalMeeting));
    emit ChecklistItemAdded(_role1Id, 1, 'Deploy staging build');

    uint256 _itemId = _tacticalMeeting.addChecklistItem(_role1Id, 'Deploy staging build');

    HolacracyTypes.ChecklistItem memory _item = _tacticalMeeting.getChecklistItem(_itemId);
    assertEq(_item.id, _itemId);
    assertEq(_item.roleId, _role1Id);
    assertEq(_item.label, 'Deploy staging build');
    assertTrue(_item.exists);
  }

  function test_addChecklistItemWhenNotCircleLead() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotCircleLead.selector, _anchorCircleId)
    );
    _tacticalMeeting.addChecklistItem(_role1Id, 'Label');
  }

  function test_addChecklistItemWhenEmptyLabel() external {
    vm.prank(_deployer);
    vm.expectRevert(ITacticalMeeting.TacticalMeeting_EmptyString.selector);
    _tacticalMeeting.addChecklistItem(_role1Id, '');
  }

  function test_removeChecklistItem() external {
    vm.prank(_deployer);
    uint256 _itemId = _tacticalMeeting.addChecklistItem(_role1Id, 'Deploy staging build');

    vm.prank(_deployer);

    vm.expectEmit(true, true, false, false, address(_tacticalMeeting));
    emit ChecklistItemRemoved(_role1Id, _itemId);

    _tacticalMeeting.removeChecklistItem(_itemId);

    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_ChecklistItemNotFound.selector, _itemId)
    );
    _tacticalMeeting.getChecklistItem(_itemId);

    uint256[] memory _ids = _tacticalMeeting.getRoleChecklistItems(_role1Id);
    assertEq(_ids.length, 0);
  }

  function test_removeChecklistItemWhenNotCircleLead() external {
    vm.prank(_deployer);
    uint256 _itemId = _tacticalMeeting.addChecklistItem(_role1Id, 'Label');

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotCircleLead.selector, _anchorCircleId)
    );
    _tacticalMeeting.removeChecklistItem(_itemId);
  }

  function test_removeChecklistItemWhenNotFound() external {
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_ChecklistItemNotFound.selector, 999));
    _tacticalMeeting.removeChecklistItem(999);
  }

  function test_getRoleChecklistItems() external {
    vm.startPrank(_deployer);
    _tacticalMeeting.addChecklistItem(_role1Id, 'Item 1');
    _tacticalMeeting.addChecklistItem(_role1Id, 'Item 2');
    _tacticalMeeting.addChecklistItem(_role2Id, 'Item 3');
    vm.stopPrank();

    uint256[] memory _role1Items = _tacticalMeeting.getRoleChecklistItems(_role1Id);
    assertEq(_role1Items.length, 2);

    uint256[] memory _role2Items = _tacticalMeeting.getRoleChecklistItems(_role2Id);
    assertEq(_role2Items.length, 1);
  }

  /*///////////////////////////////////////////////////////////////
                        METRICS
  //////////////////////////////////////////////////////////////*/

  function test_addMetric() external {
    vm.prank(_deployer);

    vm.expectEmit(true, true, false, true, address(_tacticalMeeting));
    emit MetricAdded(_role1Id, 1, 'Weekly deploys');

    uint256 _metricId = _tacticalMeeting.addMetric(_role1Id, 'Weekly deploys');

    HolacracyTypes.Metric memory _metric = _tacticalMeeting.getMetric(_metricId);
    assertEq(_metric.id, _metricId);
    assertEq(_metric.roleId, _role1Id);
    assertEq(_metric.label, 'Weekly deploys');
    assertTrue(_metric.exists);
  }

  function test_addMetricWhenNotCircleLead() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotCircleLead.selector, _anchorCircleId)
    );
    _tacticalMeeting.addMetric(_role1Id, 'Metric');
  }

  function test_addMetricWhenEmptyLabel() external {
    vm.prank(_deployer);
    vm.expectRevert(ITacticalMeeting.TacticalMeeting_EmptyString.selector);
    _tacticalMeeting.addMetric(_role1Id, '');
  }

  function test_removeMetric() external {
    vm.prank(_deployer);
    uint256 _metricId = _tacticalMeeting.addMetric(_role1Id, 'Weekly deploys');

    vm.prank(_deployer);

    vm.expectEmit(true, true, false, false, address(_tacticalMeeting));
    emit MetricRemoved(_role1Id, _metricId);

    _tacticalMeeting.removeMetric(_metricId);

    vm.expectRevert(abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_MetricNotFound.selector, _metricId));
    _tacticalMeeting.getMetric(_metricId);

    uint256[] memory _ids = _tacticalMeeting.getRoleMetrics(_role1Id);
    assertEq(_ids.length, 0);
  }

  function test_removeMetricWhenNotCircleLead() external {
    vm.prank(_deployer);
    uint256 _metricId = _tacticalMeeting.addMetric(_role1Id, 'Metric');

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_NotCircleLead.selector, _anchorCircleId)
    );
    _tacticalMeeting.removeMetric(_metricId);
  }

  function test_removeMetricWhenNotFound() external {
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_MetricNotFound.selector, 999));
    _tacticalMeeting.removeMetric(999);
  }

  function test_getRoleMetrics() external {
    vm.startPrank(_deployer);
    _tacticalMeeting.addMetric(_role1Id, 'Deploys');
    _tacticalMeeting.addMetric(_role1Id, 'Uptime');
    vm.stopPrank();

    uint256[] memory _ids = _tacticalMeeting.getRoleMetrics(_role1Id);
    assertEq(_ids.length, 2);
  }

  /*///////////////////////////////////////////////////////////////
                      INITIALIZATION
  //////////////////////////////////////////////////////////////*/

  function test_initializeRevertsIfAlreadyInitialized() external {
    vm.expectRevert(ITacticalMeeting.TacticalMeeting_AlreadyInitialized.selector);
    _tacticalMeeting.initialize(_circleRegistry, _roleRegistry);
  }

  function test_implementationCannotBeInitialized() external {
    TacticalMeeting _impl = new TacticalMeeting();

    vm.expectRevert(ITacticalMeeting.TacticalMeeting_AlreadyInitialized.selector);
    _impl.initialize(_circleRegistry, _roleRegistry);
  }

  /*///////////////////////////////////////////////////////////////
                    FULL FLOW INTEGRATION
  //////////////////////////////////////////////////////////////*/

  function test_fullTacticalMeetingFlow() external {
    // 1. Member convenes a meeting
    vm.prank(_member1);
    uint256 _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);

    // 2. During triage, members record outputs
    vm.prank(_member1);
    _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.Project, 'Launch website', _member1, _role1Id
    );

    vm.prank(_member2);
    _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.NextAction, 'Create brand kit', _member2, _role2Id
    );

    vm.prank(_deployer);
    _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.Request, 'Need OKR framework decision', _deployer, 0
    );

    vm.prank(_member1);
    _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.Information, 'Domain purchased: hollab.io', address(0), 0
    );

    // 3. Verify outputs
    uint256[] memory _outputIds = _tacticalMeeting.getMeetingOutputs(_meetingId);
    assertEq(_outputIds.length, 4);

    // 4. Facilitator completes the meeting
    vm.prank(_facilitator);
    _tacticalMeeting.completeMeeting(_meetingId);

    // 5. Meeting is now completed
    HolacracyTypes.TacticalMeeting memory _meeting = _tacticalMeeting.getMeeting(_meetingId);
    assertGt(_meeting.completedAt, 0);

    // 6. Cannot add more outputs
    vm.prank(_member1);
    vm.expectRevert(
      abi.encodeWithSelector(ITacticalMeeting.TacticalMeeting_MeetingAlreadyCompleted.selector, _meetingId)
    );
    _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.NextAction, 'Late task', _member1, _role1Id
    );
  }
}
