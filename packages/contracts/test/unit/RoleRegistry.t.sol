// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {RoleRegistry, IRoleRegistry} from 'contracts/RoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

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

  function setUp() external {
    RoleRegistry _impl = new RoleRegistry();
    _roleRegistry = RoleRegistry(Clones.clone(address(_impl)));
    _roleRegistry.initialize();
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

    // it emits RoleCreated
    vm.expectEmit(true, true, true, true, address(_roleRegistry));
    emit RoleCreated(1, _circleId, _roleName);

    uint256 _roleId = _roleRegistry.createRole(_circleId, _roleName, _rolePurpose, _domains, _accountabilities);

    // it increments role count
    assertEq(_roleRegistry.roleCount(), 1);

    // it stores the role data
    HolacracyTypes.Role memory _role = _roleRegistry.getRole(_roleId);
    assertEq(_role.id, 1);
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

    // it adds to circle roles
    uint256[] memory _circleRoleIds = _roleRegistry.getCircleRoleIds(_circleId);
    assertEq(_circleRoleIds.length, 1);
    assertEq(_circleRoleIds[0], _roleId);
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

  function test_CreateRoleWhenCalledByNonGovernanceProcess(address _caller) external {
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

    // it removes from circle roles
    uint256[] memory _circleRoleIds = _roleRegistry.getCircleRoleIds(_circleId);
    assertEq(_circleRoleIds.length, 0);
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
}
