// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title ITacticalMeeting
 * @notice Manages tactical meetings and their outputs for operational synchronization
 * @dev Based on Holacracy Constitution v5.0, Article 3.
 *      Phase facilitation is handled off-chain. This contract records meetings,
 *      their outputs (actions, projects, requests, information), and role-level
 *      checklists and metrics that meetings review.
 */
interface ITacticalMeeting {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a tactical meeting is created
  /// @param _meetingId The meeting ID
  /// @param _circleId The circle the meeting belongs to
  /// @param _convenedBy The address that convened the meeting
  event MeetingConvened(uint256 indexed _meetingId, uint256 indexed _circleId, address indexed _convenedBy);

  /// @notice Emitted when a tactical meeting is completed
  /// @param _meetingId The meeting ID
  event MeetingCompleted(uint256 indexed _meetingId);

  /// @notice Emitted when a meeting output is recorded
  /// @param _meetingId The meeting ID
  /// @param _outputId The output ID
  /// @param _outputType The type of output
  /// @param _assignedTo The address the output is assigned to
  event OutputRecorded(
    uint256 indexed _meetingId,
    uint256 indexed _outputId,
    HolacracyTypes.OutputType indexed _outputType,
    address _assignedTo
  );

  /// @notice Emitted when a checklist item is added to a role
  /// @param _roleId The role ID
  /// @param _checklistItemId The checklist item ID
  /// @param _label The label
  event ChecklistItemAdded(uint256 indexed _roleId, uint256 indexed _checklistItemId, string _label);

  /// @notice Emitted when a checklist item is removed
  /// @param _roleId The role ID
  /// @param _checklistItemId The checklist item ID
  event ChecklistItemRemoved(uint256 indexed _roleId, uint256 indexed _checklistItemId);

  /// @notice Emitted when a metric is added to a role
  /// @param _roleId The role ID
  /// @param _metricId The metric ID
  /// @param _label The label
  event MetricAdded(uint256 indexed _roleId, uint256 indexed _metricId, string _label);

  /// @notice Emitted when a metric is removed
  /// @param _roleId The role ID
  /// @param _metricId The metric ID
  event MetricRemoved(uint256 indexed _roleId, uint256 indexed _metricId);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the caller is not a circle member
  error TacticalMeeting_NotCircleMember(uint256 _circleId, address _caller);

  /// @notice Thrown when a meeting does not exist
  error TacticalMeeting_MeetingNotFound(uint256 _meetingId);

  /// @notice Thrown when trying to act on an already-completed meeting
  error TacticalMeeting_MeetingAlreadyCompleted(uint256 _meetingId);

  /// @notice Thrown when the caller is not the facilitator or convener
  error TacticalMeeting_NotFacilitator(uint256 _meetingId);

  /// @notice Thrown when a string argument is empty
  error TacticalMeeting_EmptyString();

  /// @notice Thrown when the contract has already been initialized
  error TacticalMeeting_AlreadyInitialized();

  /// @notice Thrown when the caller is not a circle lead
  error TacticalMeeting_NotCircleLead(uint256 _circleId);

  /// @notice Thrown when a checklist item does not exist
  error TacticalMeeting_ChecklistItemNotFound(uint256 _checklistItemId);

  /// @notice Thrown when a metric does not exist
  error TacticalMeeting_MetricNotFound(uint256 _metricId);

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns meeting data by ID
  /// @param _meetingId The meeting ID
  /// @return _meeting The meeting data
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.TacticalMeeting memory _meeting);

  /// @notice Returns the meeting IDs for a circle
  /// @param _circleId The circle ID
  /// @return _meetingIds The meeting IDs
  function getCircleMeetings(uint256 _circleId) external view returns (uint256[] memory _meetingIds);

  /// @notice Returns a meeting output by ID
  /// @param _outputId The output ID
  /// @return _output The output data
  function getOutput(uint256 _outputId) external view returns (HolacracyTypes.MeetingOutput memory _output);

  /// @notice Returns the output IDs for a meeting
  /// @param _meetingId The meeting ID
  /// @return _outputIds The output IDs
  function getMeetingOutputs(uint256 _meetingId) external view returns (uint256[] memory _outputIds);

  /// @notice Returns a checklist item by ID
  /// @param _checklistItemId The checklist item ID
  /// @return _item The checklist item data
  function getChecklistItem(
    uint256 _checklistItemId
  ) external view returns (HolacracyTypes.ChecklistItem memory _item);

  /// @notice Returns the checklist item IDs for a role
  /// @param _roleId The role ID
  /// @return _itemIds The checklist item IDs
  function getRoleChecklistItems(uint256 _roleId) external view returns (uint256[] memory _itemIds);

  /// @notice Returns a metric by ID
  /// @param _metricId The metric ID
  /// @return _metric The metric data
  function getMetric(uint256 _metricId) external view returns (HolacracyTypes.Metric memory _metric);

  /// @notice Returns the metric IDs for a role
  /// @param _roleId The role ID
  /// @return _metricIds The metric IDs
  function getRoleMetrics(uint256 _roleId) external view returns (uint256[] memory _metricIds);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Convenes a new tactical meeting for a circle
  /// @dev Any circle member can convene
  /// @param _circleId The circle to hold the meeting in
  /// @return _meetingId The created meeting ID
  function conveneMeeting(uint256 _circleId) external returns (uint256 _meetingId);

  /// @notice Completes a tactical meeting
  /// @dev Only callable by the circle's facilitator or the meeting convener
  /// @param _meetingId The meeting to complete
  function completeMeeting(uint256 _meetingId) external;

  /// @notice Records an output from a tactical meeting
  /// @dev Only callable by circle members while the meeting is open
  /// @param _meetingId The meeting the output was produced in
  /// @param _outputType The type of output
  /// @param _description Description of the output
  /// @param _assignedTo The address the output is assigned to
  /// @param _roleId The role ID the output relates to (0 if general)
  /// @return _outputId The created output ID
  function recordOutput(
    uint256 _meetingId,
    HolacracyTypes.OutputType _outputType,
    string calldata _description,
    address _assignedTo,
    uint256 _roleId
  ) external returns (uint256 _outputId);

  /// @notice Adds a recurring checklist item to a role
  /// @dev Only callable by a circle lead of the role's circle
  /// @param _roleId The role to add the checklist item to
  /// @param _label The checklist item label
  /// @return _checklistItemId The created checklist item ID
  function addChecklistItem(uint256 _roleId, string calldata _label) external returns (uint256 _checklistItemId);

  /// @notice Removes a checklist item
  /// @dev Only callable by a circle lead of the role's circle
  /// @param _checklistItemId The checklist item to remove
  function removeChecklistItem(uint256 _checklistItemId) external;

  /// @notice Adds a recurring metric to a role
  /// @dev Only callable by a circle lead of the role's circle
  /// @param _roleId The role to add the metric to
  /// @param _label The metric label
  /// @return _metricId The created metric ID
  function addMetric(uint256 _roleId, string calldata _label) external returns (uint256 _metricId);

  /// @notice Removes a metric
  /// @dev Only callable by a circle lead of the role's circle
  /// @param _metricId The metric to remove
  function removeMetric(uint256 _metricId) external;
}
