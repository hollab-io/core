// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IRoleRegistry, RoleRegistry} from 'contracts/RoleRegistry.sol';
import {Test} from 'forge-std/Test.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

contract UnitRoleRegistry is Test {
  RoleRegistry internal _roleRegistry;

  address internal _governanceProcess = makeAddr('governanceProcess');
  address internal _stranger = makeAddr('stranger');

  string internal _roleName = 'Developer';
  string internal _rolePurpose = 'Build software';
  string[] internal _domains;
  string[] internal _accountabilities;

  event RoleCreated(uint256 indexed _roleId, uint256 indexed _circleId, string _name);
  event RoleUpdated(uint256 indexed _roleId);
  event RoleRemoved(uint256 indexed _roleId, uint256 indexed _circleId);
  event RoleLeadAssigned(uint256 indexed _roleId, address indexed _lead);
  event RoleLeadUnassigned(uint256 indexed _roleId, address indexed _lead);
  event PolicyCreated(uint256 indexed _policyId, uint256 indexed _circleId, string _name);
  event PolicyUpdated(uint256 indexed _policyId);
  event PolicyRemoved(uint256 indexed _policyId, uint256 indexed _circleId);
  event RoleMoved(uint256 indexed _roleId, uint256 indexed _fromCircleId, uint256 indexed _toCircleId);

  function setUp() external {
    RoleRegistry _impl = new RoleRegistry();
    _roleRegistry = RoleRegistry(Clones.clone(address(_impl)));
    // Use address(this) as factory so this test contract can call setGovernanceProcess
    _roleRegistry.initialize(address(this));
    // Seed the anchor circle so createRole can target circle 1 (the anchor).
    _roleRegistry.initAnchorCircle(address(this), 'Anchor', 'Hold the organization purpose');
    _roleRegistry.setGovernanceProcess(_governanceProcess);

    _domains.push('Codebase');
    _accountabilities.push('Write clean code');
  }

  /*///////////////////////////////////////////////////////////////
                        SET GOVERNANCE PROCESS
  //////////////////////////////////////////////////////////////*/

  function test_SetGovernanceProcessWhenAlreadySet() external {
    // it reverts
    vm.expectRevert(IRoleRegistry.RoleRegistry_Unauthorized.selector);
    _roleRegistry.setGovernanceProcess(makeAddr('other'));
  }

  function test_SetGovernanceProcessWhenNotFactory() external {
    RoleRegistry _fresh = RoleRegistry(Clones.clone(address(new RoleRegistry())));
    _fresh.initialize(address(this));

    // stranger can't call setGovernanceProcess
    vm.prank(_stranger);
    vm.expectRevert(IRoleRegistry.RoleRegistry_Unauthorized.selector);
    _fresh.setGovernanceProcess(_governanceProcess);
  }

  /*///////////////////////////////////////////////////////////////
                            CREATE ROLE
  //////////////////////////////////////////////////////////////*/

  modifier whenCalledByGovernanceProcess() {
    vm.startPrank(_governanceProcess);
    _;
    vm.stopPrank();
  }

  function test_CreateRoleWhenValidParams() external whenCalledByGovernanceProcess {
    uint256 _circleId = 1;
    // Anchor init already created role 1 inside circle 1, so the next id is 2.
    uint256 _expectedRoleId = 2;

    // it emits RoleCreated
    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleCreated(_expectedRoleId, _circleId, _roleName);

    uint256 _roleId = _roleRegistry.createRole(_circleId, _roleName, _rolePurpose, _domains, _accountabilities);

    assertEq(_roleId, _expectedRoleId);
    // it increments role count (anchor role + new role)
    assertEq(_roleRegistry.roleCount(), 2);

    // it stores the role data
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.id, _expectedRoleId);
    assertEq(_role.circleId, _circleId);
    assertEq(_role.name, _roleName);
    assertEq(_role.purpose, _rolePurpose);
    assertTrue(_role.exists);

    // it stores domains
    string[] memory _storedDomains = _roleRegistry.getRoleDomains(_roleId);
    assertEq(_storedDomains.length, 1);
    assertEq(_storedDomains[0], 'Codebase');

    // it stores accountabilities
    string[] memory _storedAccs = _roleRegistry.getRoleAccountabilities(_roleId);
    assertEq(_storedAccs.length, 1);
    assertEq(_storedAccs[0], 'Write clean code');

    // it adds to circle roles (anchor role already at index 0, new role at index 1)
    uint256[] memory _circleRoleIds = _roleRegistry.getCircleRoleIds(_circleId);
    assertEq(_circleRoleIds.length, 2);
    assertEq(_circleRoleIds[1], _roleId);
  }

  function test_CreateRoleWhenEmptyName() external whenCalledByGovernanceProcess {
    // it reverts
    vm.expectRevert(IRoleRegistry.RoleRegistry_EmptyName.selector);
    _roleRegistry.createRole(1, '', _rolePurpose, _domains, _accountabilities);
  }

  function test_CreateRoleWhenNoPurposeDomainsOrAccountabilities() external whenCalledByGovernanceProcess {
    string[] memory _emptyArr = new string[](0);

    // it reverts
    vm.expectRevert(IRoleRegistry.RoleRegistry_InvalidRole.selector);
    _roleRegistry.createRole(1, _roleName, '', _emptyArr, _emptyArr);
  }

  function test_CreateRoleWhenOnlyPurposeProvided() external whenCalledByGovernanceProcess {
    string[] memory _emptyArr = new string[](0);

    // it succeeds with just purpose
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _emptyArr, _emptyArr);
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.purpose, _rolePurpose);
  }

  function test_CreateRoleWhenOnlyDomainsProvided() external whenCalledByGovernanceProcess {
    string[] memory _emptyArr = new string[](0);

    // it succeeds with just domains
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, '', _domains, _emptyArr);
    string[] memory _storedDomains = _roleRegistry.getRoleDomains(_roleId);
    assertEq(_storedDomains.length, 1);
  }

  function test_CreateRoleWhenOnlyAccountabilitiesProvided() external whenCalledByGovernanceProcess {
    string[] memory _emptyArr = new string[](0);

    // it succeeds with just accountabilities
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, '', _emptyArr, _accountabilities);
    string[] memory _storedAccs = _roleRegistry.getRoleAccountabilities(_roleId);
    assertEq(_storedAccs.length, 1);
  }

  function test_CreateRoleWhenCalledByNonGovernanceProcess(
    address _caller
  ) external {
    vm.assume(_caller != _governanceProcess);
    vm.prank(_caller);

    // it reverts
    vm.expectRevert(IRoleRegistry.RoleRegistry_Unauthorized.selector);
    _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
  }

  /*///////////////////////////////////////////////////////////////
                            UPDATE ROLE
  //////////////////////////////////////////////////////////////*/

  function test_UpdateRoleWhenValidParams() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);

    string[] memory _newDomains = new string[](2);
    _newDomains[0] = 'Frontend';
    _newDomains[1] = 'Backend';

    string[] memory _newAccs = new string[](1);
    _newAccs[0] = 'Deploy services';

    // it emits RoleUpdated
    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleUpdated(_roleId);

    _roleRegistry.updateRole(_roleId, 'Senior Dev', 'Lead development', _newDomains, _newAccs);

    // it updates the role data
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.name, 'Senior Dev');
    assertEq(_role.purpose, 'Lead development');

    // it replaces domains
    string[] memory _storedDomains = _roleRegistry.getRoleDomains(_roleId);
    assertEq(_storedDomains.length, 2);
    assertEq(_storedDomains[0], 'Frontend');
    assertEq(_storedDomains[1], 'Backend');

    // it replaces accountabilities
    string[] memory _storedAccs = _roleRegistry.getRoleAccountabilities(_roleId);
    assertEq(_storedAccs.length, 1);
    assertEq(_storedAccs[0], 'Deploy services');
  }

  function test_UpdateRoleWhenRoleDoesNotExist() external whenCalledByGovernanceProcess {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.updateRole(999, _roleName, _rolePurpose, _domains, _accountabilities);
  }

  function test_UpdateRoleWhenInvalidData() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
    string[] memory _emptyArr = new string[](0);

    // it reverts with empty name
    vm.expectRevert(IRoleRegistry.RoleRegistry_EmptyName.selector);
    _roleRegistry.updateRole(_roleId, '', _rolePurpose, _domains, _accountabilities);

    // it reverts with no purpose/domains/accountabilities
    vm.expectRevert(IRoleRegistry.RoleRegistry_InvalidRole.selector);
    _roleRegistry.updateRole(_roleId, _roleName, '', _emptyArr, _emptyArr);
  }

  /*///////////////////////////////////////////////////////////////
                            REMOVE ROLE
  //////////////////////////////////////////////////////////////*/

  function test_RemoveRoleWhenExists() external whenCalledByGovernanceProcess {
    uint256 _circleId = 1;
    uint256 _roleId = _roleRegistry.createRole(_circleId, _roleName, _rolePurpose, _domains, _accountabilities);

    // Assign a role lead first
    address _lead = makeAddr('lead');
    _roleRegistry.assignRoleLead(_roleId, _lead);

    // it emits RoleRemoved
    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleRemoved(_roleId, _circleId);

    _roleRegistry.removeRole(_roleId);

    // it marks role as not existing
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, _roleId));
    _roleRegistry.getRole(_roleId);

    // it removes role leads
    assertFalse(_roleRegistry.isRoleLead(_roleId, _lead));

    // it removes from circle roles (the anchor role created in setUp remains)
    uint256[] memory _circleRoleIds = _roleRegistry.getCircleRoleIds(_circleId);
    assertEq(_circleRoleIds.length, 1);
    assertEq(_circleRoleIds[0], 1);
  }

  function test_RemoveRoleWhenDoesNotExist() external whenCalledByGovernanceProcess {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.removeRole(999);
  }

  /*///////////////////////////////////////////////////////////////
                        ASSIGN ROLE LEAD
  //////////////////////////////////////////////////////////////*/

  function test_AssignRoleLeadWhenValid() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
    address _lead = makeAddr('lead');

    // it emits RoleLeadAssigned
    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleLeadAssigned(_roleId, _lead);

    _roleRegistry.assignRoleLead(_roleId, _lead);

    // it marks the address as a role lead
    assertTrue(_roleRegistry.isRoleLead(_roleId, _lead));

    // it adds to the leads array
    address[] memory _leads = _roleRegistry.getRoleLeads(_roleId);
    assertEq(_leads.length, 1);
    assertEq(_leads[0], _lead);
  }

  function test_AssignRoleLeadWhenAlreadyAssigned() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
    address _lead = makeAddr('lead');
    _roleRegistry.assignRoleLead(_roleId, _lead);

    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_AlreadyRoleLead.selector, _roleId, _lead));
    _roleRegistry.assignRoleLead(_roleId, _lead);
  }

  function test_AssignRoleLeadWhenRoleDoesNotExist() external whenCalledByGovernanceProcess {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.assignRoleLead(999, makeAddr('lead'));
  }

  function test_AssignMultipleRoleLeads() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
    address _lead1 = makeAddr('lead1');
    address _lead2 = makeAddr('lead2');

    _roleRegistry.assignRoleLead(_roleId, _lead1);
    _roleRegistry.assignRoleLead(_roleId, _lead2);

    // it tracks both leads
    address[] memory _leads = _roleRegistry.getRoleLeads(_roleId);
    assertEq(_leads.length, 2);
    assertTrue(_roleRegistry.isRoleLead(_roleId, _lead1));
    assertTrue(_roleRegistry.isRoleLead(_roleId, _lead2));
  }

  /*///////////////////////////////////////////////////////////////
                      UNASSIGN ROLE LEAD
  //////////////////////////////////////////////////////////////*/

  function test_UnassignRoleLeadWhenValid() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
    address _lead = makeAddr('lead');
    _roleRegistry.assignRoleLead(_roleId, _lead);

    // it emits RoleLeadUnassigned
    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleLeadUnassigned(_roleId, _lead);

    _roleRegistry.unassignRoleLead(_roleId, _lead);

    // it removes the role lead
    assertFalse(_roleRegistry.isRoleLead(_roleId, _lead));
    address[] memory _leads = _roleRegistry.getRoleLeads(_roleId);
    assertEq(_leads.length, 0);
  }

  function test_UnassignRoleLeadWhenNotAssigned() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, _roleName, _rolePurpose, _domains, _accountabilities);
    address _lead = makeAddr('lead');

    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_NotRoleLead.selector, _roleId, _lead));
    _roleRegistry.unassignRoleLead(_roleId, _lead);
  }

  function test_UnassignRoleLeadWhenRoleDoesNotExist() external whenCalledByGovernanceProcess {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.unassignRoleLead(999, makeAddr('lead'));
  }

  /*///////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function test_GetRoleWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.getRole(999);
  }

  function test_GetRoleDomainsWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.getRoleDomains(999);
  }

  function test_GetRoleAccountabilitiesWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.getRoleAccountabilities(999);
  }

  function test_GetRoleLeadsWhenDoesNotExist() external {
    // it reverts
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_RoleNotFound.selector, 999));
    _roleRegistry.getRoleLeads(999);
  }

  function test_IsRoleLeadWhenNotAssigned() external view {
    // it returns false for non-existent role
    assertFalse(_roleRegistry.isRoleLead(999, _stranger));
  }

  /*///////////////////////////////////////////////////////////////
                            POLICIES
  //////////////////////////////////////////////////////////////*/

  function test_CreatePolicyWhenValidParams() external whenCalledByGovernanceProcess {
    uint256 _circleId = 1;
    uint256 _expectedPolicyId = 1;

    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit PolicyCreated(_expectedPolicyId, _circleId, 'No after-hours meetings');

    uint256 _policyId = _roleRegistry.createPolicy(_circleId, 'No after-hours meetings', 'Meetings after 6pm require consent');

    assertEq(_policyId, _expectedPolicyId);
    assertEq(_roleRegistry.policyCount(), 1);

    HolacracyTypes.Policy memory _policy = _roleRegistry.getPolicy(_policyId);
    assertEq(_policy.id, _expectedPolicyId);
    assertEq(_policy.circleId, _circleId);
    assertEq(_policy.name, 'No after-hours meetings');
    assertEq(_policy.body, 'Meetings after 6pm require consent');
    assertTrue(_policy.exists);

    uint256[] memory _ids = _roleRegistry.getCirclePolicyIds(_circleId);
    assertEq(_ids.length, 1);
    assertEq(_ids[0], _policyId);
  }

  function test_CreatePolicyWhenCalledByNonGovernanceProcess(
    address _caller
  ) external {
    vm.assume(_caller != _governanceProcess);
    vm.prank(_caller);
    vm.expectRevert(IRoleRegistry.RoleRegistry_Unauthorized.selector);
    _roleRegistry.createPolicy(1, 'Name', 'Body');
  }

  function test_CreatePolicyWhenEmptyName() external whenCalledByGovernanceProcess {
    vm.expectRevert(IRoleRegistry.RoleRegistry_EmptyPolicyName.selector);
    _roleRegistry.createPolicy(1, '', 'Body');
  }

  function test_CreatePolicyWhenCircleDoesNotExist() external whenCalledByGovernanceProcess {
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_CircleNotFound.selector, 42));
    _roleRegistry.createPolicy(42, 'Name', 'Body');
  }

  function test_UpdatePolicyWhenValid() external whenCalledByGovernanceProcess {
    uint256 _policyId = _roleRegistry.createPolicy(1, 'Name', 'Body');

    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit PolicyUpdated(_policyId);

    _roleRegistry.updatePolicy(_policyId, 'NewName', 'NewBody');

    HolacracyTypes.Policy memory _policy = _roleRegistry.getPolicy(_policyId);
    assertEq(_policy.name, 'NewName');
    assertEq(_policy.body, 'NewBody');
  }

  function test_UpdatePolicyWhenDoesNotExist() external whenCalledByGovernanceProcess {
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_PolicyNotFound.selector, 999));
    _roleRegistry.updatePolicy(999, 'N', 'B');
  }

  function test_RemovePolicyWhenExists() external whenCalledByGovernanceProcess {
    uint256 _policyId = _roleRegistry.createPolicy(1, 'Name', 'Body');

    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit PolicyRemoved(_policyId, 1);

    _roleRegistry.removePolicy(_policyId);

    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_PolicyNotFound.selector, _policyId));
    _roleRegistry.getPolicy(_policyId);

    uint256[] memory _ids = _roleRegistry.getCirclePolicyIds(1);
    assertEq(_ids.length, 0);
  }

  function test_RemovePolicyWhenDoesNotExist() external whenCalledByGovernanceProcess {
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_PolicyNotFound.selector, 999));
    _roleRegistry.removePolicy(999);
  }

  function test_GetPolicyCircleIdWhenDoesNotExist() external {
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_PolicyNotFound.selector, 999));
    _roleRegistry.getPolicyCircleId(999);
  }

  /*///////////////////////////////////////////////////////////////
                            MOVE ROLE
  //////////////////////////////////////////////////////////////*/

  function test_MoveRoleWhenValid() external whenCalledByGovernanceProcess {
    // Create a role in the anchor circle (id 1) and a sub-circle to move it into.
    uint256 _roleId = _roleRegistry.createRole(1, 'Mover', 'Move purposefully', _domains, _accountabilities);
    uint256 _destCircleId = _roleRegistry.expandToCircle(_roleId);

    // Create a leaf role inside the anchor circle, then move it into the sub-circle.
    uint256 _leafRoleId = _roleRegistry.createRole(1, 'Leaf', 'Rooted', _domains, _accountabilities);

    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleMoved(_leafRoleId, 1, _destCircleId);

    _roleRegistry.moveRole(_leafRoleId, _destCircleId);

    assertEq(_roleRegistry.getRoleCircleId(_leafRoleId), _destCircleId);
  }

  function test_MoveRoleWhenSameCircle() external whenCalledByGovernanceProcess {
    uint256 _leafRoleId = _roleRegistry.createRole(1, 'Leaf', 'Rooted', _domains, _accountabilities);
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_SameCircle.selector, _leafRoleId, 1));
    _roleRegistry.moveRole(_leafRoleId, 1);
  }

  function test_MoveRoleWhenRoleIsCircle() external whenCalledByGovernanceProcess {
    uint256 _roleId = _roleRegistry.createRole(1, 'Expander', 'Expand', _domains, _accountabilities);
    _roleRegistry.expandToCircle(_roleId);

    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_CannotMoveCircleRole.selector, _roleId));
    _roleRegistry.moveRole(_roleId, 1);
  }

  function test_MoveRoleWhenDestCircleDoesNotExist() external whenCalledByGovernanceProcess {
    uint256 _leafRoleId = _roleRegistry.createRole(1, 'Leaf', 'Rooted', _domains, _accountabilities);
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_CircleNotFound.selector, 99));
    _roleRegistry.moveRole(_leafRoleId, 99);
  }

  function test_MoveRoleWhenCalledByNonGovernanceProcess(
    address _caller
  ) external {
    vm.assume(_caller != _governanceProcess);
    vm.prank(_caller);
    vm.expectRevert(IRoleRegistry.RoleRegistry_Unauthorized.selector);
    _roleRegistry.moveRole(1, 2);
  }
}
