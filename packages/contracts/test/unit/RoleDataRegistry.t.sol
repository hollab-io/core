// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {RoleDataRegistry} from 'contracts/RoleDataRegistry.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {IRoleDataRegistry} from 'interfaces/IRoleDataRegistry.sol';
import {Test} from 'forge-std/Test.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

contract StubENSForRoleData is IENSSubdomainRegistrar {
  function registerSubnode(
    bytes32,
    address
  ) external {} // solhint-disable-line no-empty-blocks
}

contract UnitRoleDataRegistry is Test {
  OrganizationFactory internal _orgFactory;
  IOrganizationInstance internal _org;
  RoleRegistry internal _roleRegistry;
  RoleDataRegistry internal _roleDataRegistry;

  address internal _deployer = makeAddr('deployer');
  address internal _lead = makeAddr('lead');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _orgId;
  uint256 internal _anchorCircleId;
  uint256 internal _anchorRoleId;
  uint256 internal _workerRoleId;

  event ChecklistItemAdded(uint256 indexed _itemId, uint256 indexed _roleId, string _label);
  event ChecklistItemRemoved(uint256 indexed _itemId, uint256 indexed _roleId);
  event MetricAdded(uint256 indexed _metricId, uint256 indexed _roleId, string _label);
  event MetricRemoved(uint256 indexed _metricId, uint256 indexed _roleId);

  function _tokenConfig() internal view returns (IOrganizationFactory.TokenConfig memory _cfg) {
    address[] memory _holders = new address[](1);
    _holders[0] = _deployer;
    uint256[] memory _amounts = new uint256[](1);
    _amounts[0] = 1_000_000e18;
    _cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'RoleData Token', tokenSymbol: 'RDR', initialHolders: _holders, initialAmounts: _amounts
    });
  }

  function setUp() external {
    _orgFactory = new OrganizationFactory(
      address(new RoleRegistry()),
      address(new OrganizationInstance()),
      address(new StubENSForRoleData()),
      address(0)
    );

    vm.prank(_deployer);
    (uint256 _newOrgId, address _instance) =
      _orgFactory.createOrganization('role-data-org', 'Store role data', _tokenConfig());
    _orgId = _newOrgId;
    _org = IOrganizationInstance(_instance);
    _roleRegistry = RoleRegistry(_org.roleRegistry());
    _anchorCircleId = _roleRegistry.anchorCircleId();
    _anchorRoleId = _roleRegistry.getCircle(_anchorCircleId).roleId;

    // Wire the governance process so we can create a worker role.
    address _gov = makeAddr('gov');
    vm.prank(_instance);
    _roleRegistry.setGovernanceProcess(_gov);

    string[] memory emptyStrings;
    vm.prank(_gov);
    _workerRoleId = _roleRegistry.createRole(_anchorCircleId, 'Worker', 'Do the work', emptyStrings, emptyStrings);

    vm.prank(_gov);
    _roleRegistry.assignRoleLead(_workerRoleId, _lead);

    // Clone and initialize the RoleDataRegistry.
    _roleDataRegistry = RoleDataRegistry(Clones.clone(address(new RoleDataRegistry())));
    _roleDataRegistry.initialize(_orgId, _instance, address(_roleRegistry));
  }

  /*///////////////////////////////////////////////////////////////
                            CHECKLIST
  //////////////////////////////////////////////////////////////*/

  function test_AddChecklistItemByLead() external {
    vm.expectEmit(true, true, true, true, address(_roleDataRegistry));
    emit ChecklistItemAdded(1, _workerRoleId, 'Open laptop');

    vm.prank(_lead);
    uint256 _itemId = _roleDataRegistry.addChecklistItem(_workerRoleId, 'Open laptop');

    assertEq(_itemId, 1);
    assertEq(_roleDataRegistry.checklistItemCount(), 1);

    HolacracyTypes.ChecklistItem memory _item = _roleDataRegistry.getChecklistItem(_itemId);
    assertEq(_item.roleId, _workerRoleId);
    assertEq(_item.label, 'Open laptop');
    assertTrue(_item.exists);

    uint256[] memory _ids = _roleDataRegistry.getChecklistItemsByRole(_workerRoleId);
    assertEq(_ids.length, 1);
    assertEq(_ids[0], _itemId);
  }

  function test_AddChecklistItemByAdmin() external {
    // deployer is an admin on the instance
    vm.prank(_deployer);
    uint256 _itemId = _roleDataRegistry.addChecklistItem(_workerRoleId, 'Say hello');
    assertEq(_itemId, 1);
  }

  function test_AddChecklistItemRevertsByStranger() external {
    vm.prank(_stranger);
    vm.expectRevert(IRoleDataRegistry.RoleDataRegistry_Unauthorized.selector);
    _roleDataRegistry.addChecklistItem(_workerRoleId, 'Snoop');
  }

  function test_AddChecklistItemRevertsEmptyLabel() external {
    vm.prank(_lead);
    vm.expectRevert(IRoleDataRegistry.RoleDataRegistry_EmptyLabel.selector);
    _roleDataRegistry.addChecklistItem(_workerRoleId, '');
  }

  function test_AddChecklistItemRevertsUnknownRole() external {
    vm.prank(_lead);
    vm.expectRevert();
    _roleDataRegistry.addChecklistItem(999, 'Ghost task');
  }

  function test_RemoveChecklistItem() external {
    vm.prank(_lead);
    uint256 _itemId = _roleDataRegistry.addChecklistItem(_workerRoleId, 'Temp');

    vm.expectEmit(true, true, true, true, address(_roleDataRegistry));
    emit ChecklistItemRemoved(_itemId, _workerRoleId);

    vm.prank(_lead);
    _roleDataRegistry.removeChecklistItem(_itemId);

    vm.expectRevert(
      abi.encodeWithSelector(IRoleDataRegistry.RoleDataRegistry_ChecklistItemNotFound.selector, _itemId)
    );
    _roleDataRegistry.getChecklistItem(_itemId);

    uint256[] memory _ids = _roleDataRegistry.getChecklistItemsByRole(_workerRoleId);
    assertEq(_ids.length, 0);
  }

  function test_RemoveChecklistItemRevertsByStranger() external {
    vm.prank(_lead);
    uint256 _itemId = _roleDataRegistry.addChecklistItem(_workerRoleId, 'Stay');

    vm.prank(_stranger);
    vm.expectRevert(IRoleDataRegistry.RoleDataRegistry_Unauthorized.selector);
    _roleDataRegistry.removeChecklistItem(_itemId);
  }

  function test_RemoveChecklistItemRevertsNotFound() external {
    vm.prank(_lead);
    vm.expectRevert(abi.encodeWithSelector(IRoleDataRegistry.RoleDataRegistry_ChecklistItemNotFound.selector, 999));
    _roleDataRegistry.removeChecklistItem(999);
  }

  /*///////////////////////////////////////////////////////////////
                            METRICS
  //////////////////////////////////////////////////////////////*/

  function test_AddMetricByLead() external {
    vm.expectEmit(true, true, true, true, address(_roleDataRegistry));
    emit MetricAdded(1, _workerRoleId, 'Active users');

    vm.prank(_lead);
    uint256 _metricId = _roleDataRegistry.addMetric(_workerRoleId, 'Active users');

    assertEq(_metricId, 1);
    HolacracyTypes.Metric memory _metric = _roleDataRegistry.getMetric(_metricId);
    assertEq(_metric.roleId, _workerRoleId);
    assertEq(_metric.label, 'Active users');
    assertTrue(_metric.exists);

    uint256[] memory _ids = _roleDataRegistry.getMetricsByRole(_workerRoleId);
    assertEq(_ids.length, 1);
    assertEq(_ids[0], _metricId);
  }

  function test_AddMetricRevertsByStranger() external {
    vm.prank(_stranger);
    vm.expectRevert(IRoleDataRegistry.RoleDataRegistry_Unauthorized.selector);
    _roleDataRegistry.addMetric(_workerRoleId, 'Active users');
  }

  function test_RemoveMetric() external {
    vm.prank(_lead);
    uint256 _metricId = _roleDataRegistry.addMetric(_workerRoleId, 'Temp');

    vm.expectEmit(true, true, true, true, address(_roleDataRegistry));
    emit MetricRemoved(_metricId, _workerRoleId);

    vm.prank(_lead);
    _roleDataRegistry.removeMetric(_metricId);

    vm.expectRevert(abi.encodeWithSelector(IRoleDataRegistry.RoleDataRegistry_MetricNotFound.selector, _metricId));
    _roleDataRegistry.getMetric(_metricId);
  }

  function test_InitializeTwiceReverts() external {
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    _roleDataRegistry.initialize(_orgId, address(_org), address(_roleRegistry));
  }
}
