// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {CircleRegistry, ICircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry, IRoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitCircleRegistry is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;

  address internal _deployer = makeAddr('deployer');
  address internal _stranger = makeAddr('stranger');
  address internal _lead1 = makeAddr('lead1');
  address internal _lead2 = makeAddr('lead2');

  string internal _orgName = 'HolLab';
  string internal _orgPurpose = 'Build holacracy tools';

  string[] internal _domains;
  string[] internal _accountabilities;

  event AnchorCircleCreated(uint256 indexed _circleId, string _name);
  event SubCircleCreated(uint256 indexed _circleId, uint256 indexed _parentCircleId, uint256 indexed _roleId);
  event CircleRoleCreated(uint256 indexed _circleId, uint256 indexed _roleId);
  event CircleLeadAdded(uint256 indexed _circleId, address indexed _lead);
  event CircleLeadRemoved(uint256 indexed _circleId, address indexed _lead);
  event ElectedRoleSet(uint256 indexed _circleId, HolacracyTypes.ElectedRole indexed _electedRole, address _account);
  event PolicyAdded(uint256 indexed _circleId, uint256 indexed _policyId, string _name);
  event PolicyRemoved(uint256 indexed _circleId, uint256 indexed _policyId);
  event RoleLeadAssignedViaCircle(uint256 indexed _circleId, uint256 indexed _roleId, address indexed _lead);

  function setUp() external {
    // Deploy as implementations, then deploy fresh clones for testing
    // For unit tests, we use initialize() directly on fresh instances
    _roleRegistry = new RoleRegistry();
    _circleRegistry = new CircleRegistry();

    // Deploy via clones to get uninitialized instances
    _roleRegistry = RoleRegistry(Clones.clone(address(_roleRegistry)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_circleRegistry)));

    _roleRegistry.initialize();
    vm.prank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(0));

    _domains.push('Engineering');
    _accountabilities.push('Ship features');
  }

  /*///////////////////////////////////////////////////////////////
                      HELPER FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function _createAnchorCircle() internal returns (uint256 _circleId) {
    vm.prank(_deployer);
    _circleId = _circleRegistry.createAnchorCircle(_orgName, _orgPurpose);
  }

  function _createRoleInAnchorCircle(
    uint256 _circleId,
    string memory _name,
    string memory _purpose
  ) internal returns (uint256 _roleId) {
    vm.prank(_deployer);
    _roleId = _circleRegistry.createRoleInCircle(_circleId, _name, _purpose, _domains, _accountabilities);
  }

  /*///////////////////////////////////////////////////////////////
                    CREATE ANCHOR CIRCLE
  //////////////////////////////////////////////////////////////*/

  function test_CreateAnchorCircleWhenValid() external {
    vm.prank(_deployer);

    // it emits AnchorCircleCreated
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit AnchorCircleCreated(1, _orgName);

    // it emits CircleLeadAdded for deployer
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit CircleLeadAdded(1, _deployer);

    uint256 _circleId = _circleRegistry.createAnchorCircle(_orgName, _orgPurpose);

    // it sets anchor circle ID
    assertEq(_circleRegistry.anchorCircleId(), _circleId);

    // it stores circle data
    HolacracyTypes.Circle memory _circle = _circleRegistry.getCircle(_circleId);
    assertEq(_circle.id, _circleId);
    assertEq(_circle.name, _orgName);
    assertEq(_circle.purpose, _orgPurpose);
    assertTrue(_circle.isAnchor);
    assertTrue(_circle.exists);
    assertEq(_circle.parentCircleId, 0);

    // it makes deployer a circle lead
    assertTrue(_circleRegistry.isCircleLead(_circleId, _deployer));
    address[] memory _leads = _circleRegistry.getCircleLeads(_circleId);
    assertEq(_leads.length, 1);
    assertEq(_leads[0], _deployer);
  }

  function test_CreateAnchorCircleWhenAlreadyExists() external {
    _createAnchorCircle();

    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_AnchorAlreadyExists.selector);
    _circleRegistry.createAnchorCircle(_orgName, _orgPurpose);
  }

  /*///////////////////////////////////////////////////////////////
                      CREATE SUB-CIRCLE
  //////////////////////////////////////////////////////////////*/

  function test_CreateSubCircleWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Engineering', 'Build products');

    // Assign a role lead so they become circle lead of sub-circle
    vm.prank(_deployer);
    _circleRegistry.assignRoleLeadInCircle(_anchorId, _roleId, _lead1);

    vm.prank(_deployer);

    // it emits SubCircleCreated
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit SubCircleCreated(2, _anchorId, _roleId);

    uint256 _subCircleId = _circleRegistry.createSubCircle(_roleId);

    // it creates a new circle
    HolacracyTypes.Circle memory _circle = _circleRegistry.getCircle(_subCircleId);
    assertEq(_circle.parentCircleId, _anchorId);
    assertEq(_circle.roleId, _roleId);
    assertEq(_circle.name, 'Engineering');
    assertEq(_circle.purpose, 'Build products');
    assertFalse(_circle.isAnchor);
    assertTrue(_circle.exists);

    // it tracks parent-child relationship
    uint256[] memory _children = _circleRegistry.getSubCircles(_anchorId);
    assertEq(_children.length, 1);
    assertEq(_children[0], _subCircleId);

    // it maps role to circle
    assertEq(_circleRegistry.roleToCircle(_roleId), _subCircleId);

    // it makes role leads into circle leads
    assertTrue(_circleRegistry.isCircleLead(_subCircleId, _lead1));
  }

  function test_CreateSubCircleWhenNotCircleLead() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Engineering', 'Build products');

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_NotCircleLead.selector, _anchorId));
    _circleRegistry.createSubCircle(_roleId);
  }

  function test_CreateSubCircleWhenAlreadyCircle() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Engineering', 'Build products');

    vm.prank(_deployer);
    _circleRegistry.createSubCircle(_roleId);

    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_RoleAlreadyCircle.selector, _roleId));
    _circleRegistry.createSubCircle(_roleId);
  }

  /*///////////////////////////////////////////////////////////////
                    ROLE MANAGEMENT VIA CIRCLE
  //////////////////////////////////////////////////////////////*/

  function test_CreateRoleInCircleWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);

    // it emits CircleRoleCreated
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit CircleRoleCreated(_anchorId, 1);

    uint256 _roleId =
      _circleRegistry.createRoleInCircle(_anchorId, 'Designer', 'Design things', _domains, _accountabilities);

    // it creates the role in RoleRegistry
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.name, 'Designer');
    assertEq(_role.circleId, _anchorId);
  }

  function test_CreateRoleInCircleWhenNotCircleLead() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_NotCircleLead.selector, _anchorId));
    _circleRegistry.createRoleInCircle(_anchorId, 'Designer', 'Design things', _domains, _accountabilities);
  }

  function test_CreateRoleInCircleWhenCircleDoesNotExist() external {
    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_CircleNotFound.selector, 999));
    _circleRegistry.createRoleInCircle(999, 'Designer', 'Design things', _domains, _accountabilities);
  }

  function test_UpdateRoleInCircleWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Designer', 'Design things');

    string[] memory _newDomains = new string[](1);
    _newDomains[0] = 'UI/UX';
    string[] memory _newAccs = new string[](1);
    _newAccs[0] = 'Create mockups';

    vm.prank(_deployer);
    _circleRegistry.updateRoleInCircle(_anchorId, _roleId, 'Lead Designer', 'Lead design', _newDomains, _newAccs);

    // it updates the role
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.name, 'Lead Designer');
    assertEq(_role.purpose, 'Lead design');
  }

  function test_UpdateRoleInCircleWhenRoleNotInCircle() external {
    uint256 _anchorId = _createAnchorCircle();
    _createRoleInAnchorCircle(_anchorId, 'Designer', 'Design things');

    vm.prank(_deployer);
    // it reverts (role 999 doesn't exist)
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _circleRegistry.updateRoleInCircle(_anchorId, 999, 'New', 'Purpose', _domains, _accountabilities);
  }

  function test_RemoveRoleFromCircleWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Designer', 'Design things');

    vm.prank(_deployer);
    _circleRegistry.removeRoleFromCircle(_anchorId, _roleId);

    // it removes the role
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, _roleId));
    _roleRegistry.getRole(_roleId);
  }

  /*///////////////////////////////////////////////////////////////
                      ROLE LEAD ASSIGNMENT
  //////////////////////////////////////////////////////////////*/

  function test_AssignRoleLeadInCircleWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Designer', 'Design things');

    vm.prank(_deployer);

    // it emits RoleLeadAssignedViaCircle
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit RoleLeadAssignedViaCircle(_anchorId, _roleId, _lead1);

    _circleRegistry.assignRoleLeadInCircle(_anchorId, _roleId, _lead1);

    // it assigns the lead in role registry
    assertTrue(_roleRegistry.isRoleLead(_roleId, _lead1));
  }

  function test_UnassignRoleLeadInCircleWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Designer', 'Design things');

    vm.prank(_deployer);
    _circleRegistry.assignRoleLeadInCircle(_anchorId, _roleId, _lead1);

    vm.prank(_deployer);
    _circleRegistry.unassignRoleLeadInCircle(_anchorId, _roleId, _lead1);

    // it unassigns the lead
    assertFalse(_roleRegistry.isRoleLead(_roleId, _lead1));
  }

  /*///////////////////////////////////////////////////////////////
                        ELECTED ROLES
  //////////////////////////////////////////////////////////////*/

  function test_SetElectedRoleWhenCircleLead() external {
    uint256 _anchorId = _createAnchorCircle();
    address _facilitator = makeAddr('facilitator');

    vm.prank(_deployer);

    // it emits ElectedRoleSet
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit ElectedRoleSet(_anchorId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);

    _circleRegistry.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);

    // it sets the elected role
    assertEq(_circleRegistry.getElectedRole(_anchorId, HolacracyTypes.ElectedRole.Facilitator), _facilitator);
  }

  function test_SetElectedRoleWhenGovernanceProcess() external {
    uint256 _anchorId = _createAnchorCircle();
    address _govProcess = makeAddr('govProcess');
    address _secretary = makeAddr('secretary');

    vm.prank(_deployer);
    _circleRegistry.setGovernanceProcess(_govProcess);

    vm.prank(_govProcess);
    _circleRegistry.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.Secretary, _secretary);

    // it sets the elected role
    assertEq(_circleRegistry.getElectedRole(_anchorId, HolacracyTypes.ElectedRole.Secretary), _secretary);
  }

  function test_SetElectedRoleWhenUnauthorized() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.Facilitator, makeAddr('f'));
  }

  function test_SetAllElectedRoles() external {
    uint256 _anchorId = _createAnchorCircle();
    address _facilitator = makeAddr('facilitator');
    address _secretary = makeAddr('secretary');
    address _circleRep = makeAddr('circleRep');

    vm.startPrank(_deployer);
    _circleRegistry.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);
    _circleRegistry.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.Secretary, _secretary);
    _circleRegistry.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.CircleRep, _circleRep);
    vm.stopPrank();

    // it stores all three elected roles
    assertEq(_circleRegistry.getElectedRole(_anchorId, HolacracyTypes.ElectedRole.Facilitator), _facilitator);
    assertEq(_circleRegistry.getElectedRole(_anchorId, HolacracyTypes.ElectedRole.Secretary), _secretary);
    assertEq(_circleRegistry.getElectedRole(_anchorId, HolacracyTypes.ElectedRole.CircleRep), _circleRep);
  }

  /*///////////////////////////////////////////////////////////////
                        CIRCLE LEADS
  //////////////////////////////////////////////////////////////*/

  function test_AddCircleLeadToAnchorWhenDeployer() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);

    // it emits CircleLeadAdded
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit CircleLeadAdded(_anchorId, _lead1);

    _circleRegistry.addCircleLead(_anchorId, _lead1);

    // it adds the circle lead
    assertTrue(_circleRegistry.isCircleLead(_anchorId, _lead1));
    address[] memory _leads = _circleRegistry.getCircleLeads(_anchorId);
    assertEq(_leads.length, 2); // deployer + lead1
  }

  function test_AddCircleLeadToAnchorWhenNotDeployer() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.addCircleLead(_anchorId, _lead1);
  }

  function test_AddCircleLeadWhenAlreadyLead() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);
    // it reverts (deployer is already a lead)
    vm.expectRevert(
      abi.encodeWithSelector(ICircleRegistry.CircleRegistry_AlreadyCircleLead.selector, _anchorId, _deployer)
    );
    _circleRegistry.addCircleLead(_anchorId, _deployer);
  }

  function test_RemoveCircleLeadWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);
    _circleRegistry.addCircleLead(_anchorId, _lead1);

    vm.prank(_deployer);

    // it emits CircleLeadRemoved
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit CircleLeadRemoved(_anchorId, _lead1);

    _circleRegistry.removeCircleLead(_anchorId, _lead1);

    // it removes the circle lead
    assertFalse(_circleRegistry.isCircleLead(_anchorId, _lead1));
  }

  function test_RemoveCircleLeadWhenNotLead() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(ICircleRegistry.CircleRegistry_NotACircleLead.selector, _anchorId, _stranger)
    );
    _circleRegistry.removeCircleLead(_anchorId, _stranger);
  }

  function test_AddCircleLeadToSubCircleWhenParentLead() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Eng', 'Build');
    vm.prank(_deployer);
    uint256 _subCircleId = _circleRegistry.createSubCircle(_roleId);

    vm.prank(_deployer);
    _circleRegistry.addCircleLead(_subCircleId, _lead1);

    // it adds the lead
    assertTrue(_circleRegistry.isCircleLead(_subCircleId, _lead1));
  }

  function test_AddCircleLeadToSubCircleWhenNotParentLead() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Eng', 'Build');
    vm.prank(_deployer);
    _circleRegistry.createSubCircle(_roleId);

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.addCircleLead(2, _lead1);
  }

  /*///////////////////////////////////////////////////////////////
                          POLICIES
  //////////////////////////////////////////////////////////////*/

  function test_AddPolicyWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);

    // it emits PolicyAdded
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit PolicyAdded(_anchorId, 1, 'Code Review');

    uint256 _policyId = _circleRegistry.addPolicy(_anchorId, 'Code Review', 'All PRs require 2 approvals');

    // it stores the policy
    HolacracyTypes.Policy memory _policy = _circleRegistry.getPolicy(_policyId);
    assertEq(_policy.id, _policyId);
    assertEq(_policy.circleId, _anchorId);
    assertEq(_policy.name, 'Code Review');
    assertEq(_policy.body, 'All PRs require 2 approvals');
    assertTrue(_policy.exists);

    // it adds to circle policies
    uint256[] memory _policyIds = _circleRegistry.getCirclePolicies(_anchorId);
    assertEq(_policyIds.length, 1);
    assertEq(_policyIds[0], _policyId);
  }

  function test_AddPolicyWhenNotCircleLead() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_NotCircleLead.selector, _anchorId));
    _circleRegistry.addPolicy(_anchorId, 'Policy', 'Body');
  }

  function test_RemovePolicyWhenValid() external {
    uint256 _anchorId = _createAnchorCircle();
    vm.prank(_deployer);
    uint256 _policyId = _circleRegistry.addPolicy(_anchorId, 'Policy', 'Body');

    vm.prank(_deployer);

    // it emits PolicyRemoved
    vm.expectEmit(true, true, true, true, address(_circleRegistry));
    emit PolicyRemoved(_anchorId, _policyId);

    _circleRegistry.removePolicy(_anchorId, _policyId);

    // it marks policy as not existing
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_PolicyNotFound.selector, _policyId));
    _circleRegistry.getPolicy(_policyId);

    // it removes from circle policies
    uint256[] memory _policyIds = _circleRegistry.getCirclePolicies(_anchorId);
    assertEq(_policyIds.length, 0);
  }

  function test_RemovePolicyWhenDoesNotExist() external {
    uint256 _anchorId = _createAnchorCircle();

    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_PolicyNotFound.selector, 999));
    _circleRegistry.removePolicy(_anchorId, 999);
  }

  function test_RemovePolicyWhenWrongCircle() external {
    uint256 _anchorId = _createAnchorCircle();
    vm.prank(_deployer);
    uint256 _policyId = _circleRegistry.addPolicy(_anchorId, 'Policy', 'Body');

    // Create sub-circle and make deployer a lead of it
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Eng', 'Build');
    vm.prank(_deployer);
    _circleRegistry.assignRoleLeadInCircle(_anchorId, _roleId, _deployer);
    vm.prank(_deployer);
    uint256 _subId = _circleRegistry.createSubCircle(_roleId);

    // Try to remove anchor's policy via sub-circle (deployer is lead of both but policy is in anchor)
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_PolicyNotFound.selector, _policyId));
    _circleRegistry.removePolicy(_subId, _policyId);
  }

  /*///////////////////////////////////////////////////////////////
                      CIRCLE MEMBERSHIP
  //////////////////////////////////////////////////////////////*/

  function test_IsCircleMemberWhenCircleLead() external {
    uint256 _anchorId = _createAnchorCircle();

    // it returns true for circle leads
    assertTrue(_circleRegistry.isCircleMember(_anchorId, _deployer));
  }

  function test_IsCircleMemberWhenRoleLead() external {
    uint256 _anchorId = _createAnchorCircle();
    uint256 _roleId = _createRoleInAnchorCircle(_anchorId, 'Designer', 'Design things');

    vm.prank(_deployer);
    _circleRegistry.assignRoleLeadInCircle(_anchorId, _roleId, _lead1);

    // it returns true for role leads
    assertTrue(_circleRegistry.isCircleMember(_anchorId, _lead1));
  }

  function test_IsCircleMemberWhenNotMember() external {
    uint256 _anchorId = _createAnchorCircle();

    // it returns false for strangers
    assertFalse(_circleRegistry.isCircleMember(_anchorId, _stranger));
  }

  /*///////////////////////////////////////////////////////////////
                        ADMIN
  //////////////////////////////////////////////////////////////*/

  function test_SetGovernanceProcessWhenDeployer() external {
    address _govProcess = makeAddr('govProcess');

    vm.prank(_deployer);
    _circleRegistry.setGovernanceProcess(_govProcess);

    // it sets the governance process
    assertEq(_circleRegistry.governanceProcess(), _govProcess);
  }

  function test_SetGovernanceProcessWhenNotDeployer() external {
    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.setGovernanceProcess(makeAddr('govProcess'));
  }

  function test_SetGovernanceProcessWhenAlreadySet() external {
    vm.prank(_deployer);
    _circleRegistry.setGovernanceProcess(makeAddr('govProcess'));

    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.setGovernanceProcess(makeAddr('other'));
  }

  /*///////////////////////////////////////////////////////////////
                      VIEW ERRORS
  //////////////////////////////////////////////////////////////*/

  function test_GetCircleWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_CircleNotFound.selector, 999));
    _circleRegistry.getCircle(999);
  }

  function test_GetSubCirclesWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_CircleNotFound.selector, 999));
    _circleRegistry.getSubCircles(999);
  }

  function test_GetPolicyWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_PolicyNotFound.selector, 999));
    _circleRegistry.getPolicy(999);
  }

  /*///////////////////////////////////////////////////////////////
                    UPDATE CIRCLE
  //////////////////////////////////////////////////////////////*/

  event CircleUpdated(uint256 indexed _circleId, string _name, string _purpose);

  function test_UpdateCircleWhenCircleLead() external {
    uint256 _circleId = _createAnchorCircle();

    vm.prank(_deployer);

    // it emits CircleUpdated
    vm.expectEmit(true, false, false, true, address(_circleRegistry));
    emit CircleUpdated(_circleId, 'NewName', 'NewPurpose');

    _circleRegistry.updateCircle(_circleId, 'NewName', 'NewPurpose');

    // it updates the stored name and purpose
    HolacracyTypes.Circle memory _circle = _circleRegistry.getCircle(_circleId);
    assertEq(_circle.name, 'NewName');
    assertEq(_circle.purpose, 'NewPurpose');
  }

  function test_UpdateCircleWhenGovernanceProcess() external {
    address _mockGovernance = makeAddr('mockGovernance');
    uint256 _circleId = _createAnchorCircle();

    // Wire a governance process address
    vm.prank(_deployer);
    _circleRegistry.setGovernanceProcess(_mockGovernance);

    vm.prank(_mockGovernance);
    _circleRegistry.updateCircle(_circleId, 'GovernanceName', 'GovernancePurpose');

    HolacracyTypes.Circle memory _circle = _circleRegistry.getCircle(_circleId);
    assertEq(_circle.name, 'GovernanceName');
    assertEq(_circle.purpose, 'GovernancePurpose');
  }

  function test_UpdateCircleWhenNotAuthorized() external {
    uint256 _circleId = _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_NotCircleLead.selector, _circleId));
    _circleRegistry.updateCircle(_circleId, 'Hack', 'Hack');
  }

  function test_UpdateCircleWhenDoesNotExist() external {
    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(ICircleRegistry.CircleRegistry_CircleNotFound.selector, 999));
    _circleRegistry.updateCircle(999, 'Name', 'Purpose');
  }

  function test_UpdateCirclePreservesOtherFields() external {
    uint256 _circleId = _createAnchorCircle();

    vm.prank(_deployer);
    _circleRegistry.updateCircle(_circleId, 'Updated', 'Updated purpose');

    HolacracyTypes.Circle memory _circle = _circleRegistry.getCircle(_circleId);
    // it does not touch structural fields
    assertTrue(_circle.isAnchor);
    assertTrue(_circle.exists);
    assertEq(_circle.id, _circleId);
  }

  /*///////////////////////////////////////////////////////////////
                    TRANSFER DEPLOYER
  //////////////////////////////////////////////////////////////*/

  event DeployerTransferProposed(address indexed _pendingDeployer);
  event DeployerTransferred(address indexed _oldDeployer, address indexed _newDeployer);

  address internal _newDeployer = makeAddr('newDeployer');

  function test_ProposeDeployerTransferWhenDeployer() external {
    _createAnchorCircle();

    vm.prank(_deployer);

    // it emits DeployerTransferProposed
    vm.expectEmit(true, false, false, false, address(_circleRegistry));
    emit DeployerTransferProposed(_newDeployer);

    _circleRegistry.proposeDeployerTransfer(_newDeployer);

    // it sets pendingDeployer
    assertEq(_circleRegistry.pendingDeployer(), _newDeployer);
    // it does not yet change deployer
    assertEq(_circleRegistry.deployer(), _deployer);
  }

  function test_ProposeDeployerTransferWhenNotDeployer() external {
    _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.proposeDeployerTransfer(_newDeployer);
  }

  function test_ProposeDeployerTransferWhenZeroAddress() external {
    _createAnchorCircle();

    vm.prank(_deployer);
    // it reverts
    vm.expectRevert(ICircleRegistry.CircleRegistry_InvalidAddress.selector);
    _circleRegistry.proposeDeployerTransfer(address(0));
  }

  function test_AcceptDeployerTransferWhenPending() external {
    _createAnchorCircle();

    vm.prank(_deployer);
    _circleRegistry.proposeDeployerTransfer(_newDeployer);

    vm.prank(_newDeployer);

    // it emits DeployerTransferred
    vm.expectEmit(true, true, false, false, address(_circleRegistry));
    emit DeployerTransferred(_deployer, _newDeployer);

    _circleRegistry.acceptDeployerTransfer();

    // it updates deployer
    assertEq(_circleRegistry.deployer(), _newDeployer);
    // it clears pendingDeployer
    assertEq(_circleRegistry.pendingDeployer(), address(0));
  }

  function test_AcceptDeployerTransferWhenNotPending() external {
    _createAnchorCircle();

    vm.prank(_stranger);
    // it reverts — no pending transfer in progress
    vm.expectRevert(ICircleRegistry.CircleRegistry_NotPendingDeployer.selector);
    _circleRegistry.acceptDeployerTransfer();
  }

  function test_DeployerTransferGrantsAnchorLeadControl() external {
    uint256 _anchorId = _createAnchorCircle();

    // Transfer deployer to newDeployer
    vm.prank(_deployer);
    _circleRegistry.proposeDeployerTransfer(_newDeployer);
    vm.prank(_newDeployer);
    _circleRegistry.acceptDeployerTransfer();

    // Old deployer can no longer add leads to anchor circle
    vm.prank(_deployer);
    vm.expectRevert(ICircleRegistry.CircleRegistry_Unauthorized.selector);
    _circleRegistry.addCircleLead(_anchorId, _stranger);

    // New deployer can add leads to anchor circle
    vm.prank(_newDeployer);
    _circleRegistry.addCircleLead(_anchorId, _stranger);
    assertTrue(_circleRegistry.isCircleLead(_anchorId, _stranger));
  }
}
