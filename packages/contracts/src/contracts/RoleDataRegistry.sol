// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {IRoleDataRegistry} from 'interfaces/IRoleDataRegistry.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title RoleDataRegistry
 * @notice Stores per-role checklist items and metrics — operational data that
 *         role leads manage directly (not governance-gated).
 *
 * @dev See specs/03-tactical-meetings.md §3.1 (Checklist Review) and §3.2
 *      (Metrics Review). Writes are authorized when the caller either (a)
 *      leads the target role, or (b) is an org admin (bootstrap + emergency).
 */
contract RoleDataRegistry is Initializable, IRoleDataRegistry {
  using EnumerableSet for EnumerableSet.UintSet;

  uint256 public orgId;
  IOrganizationInstance public org;
  IRoleRegistry public roleRegistry;

  uint256 internal _checklistCounter;
  uint256 internal _metricCounter;

  mapping(uint256 => HolacracyTypes.ChecklistItem) internal _checklists;
  mapping(uint256 => HolacracyTypes.Metric) internal _metrics;

  mapping(uint256 => EnumerableSet.UintSet) internal _roleChecklists;
  mapping(uint256 => EnumerableSet.UintSet) internal _roleMetrics;

  constructor() {
    _disableInitializers();
  }

  /// @inheritdoc IRoleDataRegistry
  function initialize(
    uint256 _orgId,
    address _orgInstance,
    address _roleRegistry
  ) external initializer {
    orgId = _orgId;
    org = IOrganizationInstance(_orgInstance);
    roleRegistry = IRoleRegistry(_roleRegistry);
  }

  /// @notice Authorizes the caller as either the lead of `_roleId` or an org admin.
  function _authorize(
    uint256 _roleId
  ) internal view {
    if (org.isAdmin(msg.sender)) return;
    if (roleRegistry.isRoleLead(_roleId, msg.sender)) return;
    revert RoleDataRegistry_Unauthorized();
  }

  /*///////////////////////////////////////////////////////////////
                            CHECKLIST ITEMS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleDataRegistry
  function addChecklistItem(
    uint256 _roleId,
    string calldata _label
  ) external returns (uint256 _itemId) {
    if (bytes(_label).length == 0) revert RoleDataRegistry_EmptyLabel();
    // getRole reverts if the role doesn't exist, so no extra check needed.
    roleRegistry.getRole(_roleId);
    _authorize(_roleId);

    _itemId = ++_checklistCounter;
    HolacracyTypes.ChecklistItem storage _item = _checklists[_itemId];
    _item.id = _itemId;
    _item.roleId = _roleId;
    _item.label = _label;
    _item.exists = true;

    _roleChecklists[_roleId].add(_itemId);

    emit ChecklistItemAdded(_itemId, _roleId, _label);
  }

  /// @inheritdoc IRoleDataRegistry
  function removeChecklistItem(
    uint256 _itemId
  ) external {
    HolacracyTypes.ChecklistItem storage _item = _checklists[_itemId];
    if (!_item.exists) revert RoleDataRegistry_ChecklistItemNotFound(_itemId);

    uint256 _roleId = _item.roleId;
    _authorize(_roleId);

    _roleChecklists[_roleId].remove(_itemId);
    _item.exists = false;

    emit ChecklistItemRemoved(_itemId, _roleId);
  }

  /*///////////////////////////////////////////////////////////////
                            METRICS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleDataRegistry
  function addMetric(
    uint256 _roleId,
    string calldata _label
  ) external returns (uint256 _metricId) {
    if (bytes(_label).length == 0) revert RoleDataRegistry_EmptyLabel();
    roleRegistry.getRole(_roleId);
    _authorize(_roleId);

    _metricId = ++_metricCounter;
    HolacracyTypes.Metric storage _metric = _metrics[_metricId];
    _metric.id = _metricId;
    _metric.roleId = _roleId;
    _metric.label = _label;
    _metric.exists = true;

    _roleMetrics[_roleId].add(_metricId);

    emit MetricAdded(_metricId, _roleId, _label);
  }

  /// @inheritdoc IRoleDataRegistry
  function removeMetric(
    uint256 _metricId
  ) external {
    HolacracyTypes.Metric storage _metric = _metrics[_metricId];
    if (!_metric.exists) revert RoleDataRegistry_MetricNotFound(_metricId);

    uint256 _roleId = _metric.roleId;
    _authorize(_roleId);

    _roleMetrics[_roleId].remove(_metricId);
    _metric.exists = false;

    emit MetricRemoved(_metricId, _roleId);
  }

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleDataRegistry
  function checklistItemCount() external view returns (uint256) {
    return _checklistCounter;
  }

  /// @inheritdoc IRoleDataRegistry
  function metricCount() external view returns (uint256) {
    return _metricCounter;
  }

  /// @inheritdoc IRoleDataRegistry
  function getChecklistItem(
    uint256 _itemId
  ) external view returns (HolacracyTypes.ChecklistItem memory _item) {
    _item = _checklists[_itemId];
    if (!_item.exists) revert RoleDataRegistry_ChecklistItemNotFound(_itemId);
  }

  /// @inheritdoc IRoleDataRegistry
  function getMetric(
    uint256 _metricId
  ) external view returns (HolacracyTypes.Metric memory _metric) {
    _metric = _metrics[_metricId];
    if (!_metric.exists) revert RoleDataRegistry_MetricNotFound(_metricId);
  }

  /// @inheritdoc IRoleDataRegistry
  function getChecklistItemsByRole(
    uint256 _roleId
  ) external view returns (uint256[] memory _itemIds) {
    _itemIds = _roleChecklists[_roleId].values();
  }

  /// @inheritdoc IRoleDataRegistry
  function getMetricsByRole(
    uint256 _roleId
  ) external view returns (uint256[] memory _metricIds) {
    _metricIds = _roleMetrics[_roleId].values();
  }
}
