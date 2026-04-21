// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IRoleDataRegistry
 * @notice Per-role operational data — recurring checklist items and metrics.
 *
 * @dev These are NOT governance-gated. Per Holacracy §3 tactical meetings, role
 *      leads manage their own checklist items and metrics directly. The
 *      RoleDataRegistry lives alongside the MeetingFactory but accepts writes
 *      from the role lead of the target role or from an org admin.
 */
interface IRoleDataRegistry {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  event ChecklistItemAdded(uint256 indexed _itemId, uint256 indexed _roleId, string _label);
  event ChecklistItemRemoved(uint256 indexed _itemId, uint256 indexed _roleId);
  event MetricAdded(uint256 indexed _metricId, uint256 indexed _roleId, string _label);
  event MetricRemoved(uint256 indexed _metricId, uint256 indexed _roleId);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error RoleDataRegistry_AlreadyInitialized();
  error RoleDataRegistry_Unauthorized();
  error RoleDataRegistry_RoleNotFound(uint256 _roleId);
  error RoleDataRegistry_EmptyLabel();
  error RoleDataRegistry_ChecklistItemNotFound(uint256 _itemId);
  error RoleDataRegistry_MetricNotFound(uint256 _metricId);

  /*///////////////////////////////////////////////////////////////
                            VIEWS
  //////////////////////////////////////////////////////////////*/

  function orgId() external view returns (uint256);
  function checklistItemCount() external view returns (uint256);
  function metricCount() external view returns (uint256);

  function getChecklistItem(
    uint256 _itemId
  ) external view returns (HolacracyTypes.ChecklistItem memory _item);

  function getMetric(
    uint256 _metricId
  ) external view returns (HolacracyTypes.Metric memory _metric);

  function getChecklistItemsByRole(
    uint256 _roleId
  ) external view returns (uint256[] memory _itemIds);

  function getMetricsByRole(
    uint256 _roleId
  ) external view returns (uint256[] memory _metricIds);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Initializes a clone. Callable once, by the deployer (MeetingComponentsFactory).
  function initialize(
    uint256 _orgId,
    address _orgInstance,
    address _roleRegistry
  ) external;

  /// @notice Adds a recurring checklist item to a role. Caller must be role lead or admin.
  /// @return _itemId The newly created checklist item id
  function addChecklistItem(
    uint256 _roleId,
    string calldata _label
  ) external returns (uint256 _itemId);

  /// @notice Soft-removes a checklist item. Caller must be role lead of the item's role or admin.
  function removeChecklistItem(
    uint256 _itemId
  ) external;

  /// @notice Adds a recurring metric to a role. Caller must be role lead or admin.
  /// @return _metricId The newly created metric id
  function addMetric(
    uint256 _roleId,
    string calldata _label
  ) external returns (uint256 _metricId);

  /// @notice Soft-removes a metric. Caller must be role lead of the metric's role or admin.
  function removeMetric(
    uint256 _metricId
  ) external;
}
