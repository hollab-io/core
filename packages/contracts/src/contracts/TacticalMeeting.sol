// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {ITacticalMeeting} from 'interfaces/ITacticalMeeting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';

/**
 * @title TacticalMeeting
 * @notice Manages tactical meetings and their outputs for operational synchronization
 * @dev Phase facilitation is handled off-chain. This contract records meetings,
 *      outputs, and role-level checklists/metrics.
 */
contract TacticalMeeting is ITacticalMeeting {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to the circle registry
  CircleRegistry public circleRegistry;

  /// @notice Reference to the role registry
  RoleRegistry public roleRegistry;

  /// @notice Auto-incrementing meeting ID counter
  uint256 internal _meetingCounter;

  /// @notice Auto-incrementing output ID counter
  uint256 internal _outputCounter;

  /// @notice Auto-incrementing checklist item ID counter
  uint256 internal _checklistItemCounter;

  /// @notice Auto-incrementing metric ID counter
  uint256 internal _metricCounter;

  /// @notice Meeting ID => Meeting data
  mapping(uint256 => HolacracyTypes.TacticalMeeting) internal _meetings;

  /// @notice Output ID => Output data
  mapping(uint256 => HolacracyTypes.MeetingOutput) internal _outputs;

  /// @notice Checklist item ID => ChecklistItem data
  mapping(uint256 => HolacracyTypes.ChecklistItem) internal _checklistItems;

  /// @notice Metric ID => Metric data
  mapping(uint256 => HolacracyTypes.Metric) internal _metrics;

  /// @notice Circle ID => meeting IDs
  mapping(uint256 => uint256[]) internal _circleMeetings;

  /// @notice Meeting ID => output IDs
  mapping(uint256 => uint256[]) internal _meetingOutputs;

  /// @notice Role ID => checklist item IDs
  mapping(uint256 => uint256[]) internal _roleChecklistItems;

  /// @notice Role ID => metric IDs
  mapping(uint256 => uint256[]) internal _roleMetrics;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Prevents re-initialization
  modifier initializer() {
    if (_initialized) revert TacticalMeeting_AlreadyInitialized();
    _initialized = true;
    _;
  }

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @notice Disables initialization on the implementation contract
  constructor() {
    _initialized = true;
  }

  /// @notice Initializes a clone of TacticalMeeting
  /// @param _circleRegistry The CircleRegistry contract
  /// @param _roleRegistry The RoleRegistry contract
  function initialize(CircleRegistry _circleRegistry, RoleRegistry _roleRegistry) external initializer {
    circleRegistry = _circleRegistry;
    roleRegistry = _roleRegistry;
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc ITacticalMeeting
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.TacticalMeeting memory _meeting) {
    _meeting = _meetings[_meetingId];
    if (!_meeting.exists) revert TacticalMeeting_MeetingNotFound(_meetingId);
  }

  /// @inheritdoc ITacticalMeeting
  function getCircleMeetings(uint256 _circleId) external view returns (uint256[] memory _meetingIds) {
    _meetingIds = _circleMeetings[_circleId];
  }

  /// @inheritdoc ITacticalMeeting
  function getOutput(uint256 _outputId) external view returns (HolacracyTypes.MeetingOutput memory _output) {
    _output = _outputs[_outputId];
    if (_output.id == 0) revert TacticalMeeting_MeetingNotFound(_outputId);
  }

  /// @inheritdoc ITacticalMeeting
  function getMeetingOutputs(uint256 _meetingId) external view returns (uint256[] memory _outputIds) {
    _outputIds = _meetingOutputs[_meetingId];
  }

  /// @inheritdoc ITacticalMeeting
  function getChecklistItem(
    uint256 _checklistItemId
  ) external view returns (HolacracyTypes.ChecklistItem memory _item) {
    _item = _checklistItems[_checklistItemId];
    if (!_item.exists) revert TacticalMeeting_ChecklistItemNotFound(_checklistItemId);
  }

  /// @inheritdoc ITacticalMeeting
  function getRoleChecklistItems(uint256 _roleId) external view returns (uint256[] memory _itemIds) {
    _itemIds = _roleChecklistItems[_roleId];
  }

  /// @inheritdoc ITacticalMeeting
  function getMetric(uint256 _metricId) external view returns (HolacracyTypes.Metric memory _metric) {
    _metric = _metrics[_metricId];
    if (!_metric.exists) revert TacticalMeeting_MetricNotFound(_metricId);
  }

  /// @inheritdoc ITacticalMeeting
  function getRoleMetrics(uint256 _roleId) external view returns (uint256[] memory _metricIds) {
    _metricIds = _roleMetrics[_roleId];
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc ITacticalMeeting
  function conveneMeeting(uint256 _circleId) external returns (uint256 _meetingId) {
    if (!circleRegistry.isCircleMember(_circleId, msg.sender)) {
      revert TacticalMeeting_NotCircleMember(_circleId, msg.sender);
    }

    _meetingId = ++_meetingCounter;

    HolacracyTypes.TacticalMeeting storage _meeting = _meetings[_meetingId];
    _meeting.id = _meetingId;
    _meeting.circleId = _circleId;
    _meeting.convenedBy = msg.sender;
    _meeting.createdAt = block.timestamp;
    _meeting.exists = true;

    _circleMeetings[_circleId].push(_meetingId);

    emit MeetingConvened(_meetingId, _circleId, msg.sender);
  }

  /// @inheritdoc ITacticalMeeting
  function completeMeeting(uint256 _meetingId) external {
    HolacracyTypes.TacticalMeeting storage _meeting = _meetings[_meetingId];
    if (!_meeting.exists) revert TacticalMeeting_MeetingNotFound(_meetingId);
    if (_meeting.completedAt != 0) revert TacticalMeeting_MeetingAlreadyCompleted(_meetingId);
    _assertFacilitatorOrConvener(_meeting);

    _meeting.completedAt = block.timestamp;

    emit MeetingCompleted(_meetingId);
  }

  /// @inheritdoc ITacticalMeeting
  function recordOutput(
    uint256 _meetingId,
    HolacracyTypes.OutputType _outputType,
    string calldata _description,
    address _assignedTo,
    uint256 _roleId
  ) external returns (uint256 _outputId) {
    HolacracyTypes.TacticalMeeting storage _meeting = _meetings[_meetingId];
    if (!_meeting.exists) revert TacticalMeeting_MeetingNotFound(_meetingId);
    if (_meeting.completedAt != 0) revert TacticalMeeting_MeetingAlreadyCompleted(_meetingId);
    if (!circleRegistry.isCircleMember(_meeting.circleId, msg.sender)) {
      revert TacticalMeeting_NotCircleMember(_meeting.circleId, msg.sender);
    }
    if (bytes(_description).length == 0) revert TacticalMeeting_EmptyString();

    _outputId = ++_outputCounter;

    HolacracyTypes.MeetingOutput storage _output = _outputs[_outputId];
    _output.id = _outputId;
    _output.meetingId = _meetingId;
    _output.outputType = _outputType;
    _output.description = _description;
    _output.assignedTo = _assignedTo;
    _output.roleId = _roleId;
    _output.createdAt = block.timestamp;

    _meetingOutputs[_meetingId].push(_outputId);

    emit OutputRecorded(_meetingId, _outputId, _outputType, _assignedTo);
  }

  /// @inheritdoc ITacticalMeeting
  function addChecklistItem(uint256 _roleId, string calldata _label) external returns (uint256 _checklistItemId) {
    _assertCircleLeadForRole(_roleId);
    if (bytes(_label).length == 0) revert TacticalMeeting_EmptyString();

    _checklistItemId = ++_checklistItemCounter;

    HolacracyTypes.ChecklistItem storage _item = _checklistItems[_checklistItemId];
    _item.id = _checklistItemId;
    _item.roleId = _roleId;
    _item.label = _label;
    _item.exists = true;

    _roleChecklistItems[_roleId].push(_checklistItemId);

    emit ChecklistItemAdded(_roleId, _checklistItemId, _label);
  }

  /// @inheritdoc ITacticalMeeting
  function removeChecklistItem(uint256 _checklistItemId) external {
    HolacracyTypes.ChecklistItem storage _item = _checklistItems[_checklistItemId];
    if (!_item.exists) revert TacticalMeeting_ChecklistItemNotFound(_checklistItemId);
    _assertCircleLeadForRole(_item.roleId);

    uint256 _roleId = _item.roleId;
    _item.exists = false;

    uint256[] storage _ids = _roleChecklistItems[_roleId];
    for (uint256 _i; _i < _ids.length; ++_i) {
      if (_ids[_i] == _checklistItemId) {
        _ids[_i] = _ids[_ids.length - 1];
        _ids.pop();
        break;
      }
    }

    emit ChecklistItemRemoved(_roleId, _checklistItemId);
  }

  /// @inheritdoc ITacticalMeeting
  function addMetric(uint256 _roleId, string calldata _label) external returns (uint256 _metricId) {
    _assertCircleLeadForRole(_roleId);
    if (bytes(_label).length == 0) revert TacticalMeeting_EmptyString();

    _metricId = ++_metricCounter;

    HolacracyTypes.Metric storage _metric = _metrics[_metricId];
    _metric.id = _metricId;
    _metric.roleId = _roleId;
    _metric.label = _label;
    _metric.exists = true;

    _roleMetrics[_roleId].push(_metricId);

    emit MetricAdded(_roleId, _metricId, _label);
  }

  /// @inheritdoc ITacticalMeeting
  function removeMetric(uint256 _metricId) external {
    HolacracyTypes.Metric storage _metric = _metrics[_metricId];
    if (!_metric.exists) revert TacticalMeeting_MetricNotFound(_metricId);
    _assertCircleLeadForRole(_metric.roleId);

    uint256 _roleId = _metric.roleId;
    _metric.exists = false;

    uint256[] storage _ids = _roleMetrics[_roleId];
    for (uint256 _i; _i < _ids.length; ++_i) {
      if (_ids[_i] == _metricId) {
        _ids[_i] = _ids[_ids.length - 1];
        _ids.pop();
        break;
      }
    }

    emit MetricRemoved(_roleId, _metricId);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Checks if caller is the facilitator of the meeting's circle, or the convener
  function _assertFacilitatorOrConvener(HolacracyTypes.TacticalMeeting storage _meeting) internal view {
    if (msg.sender == _meeting.convenedBy) return;

    address _facilitator =
      circleRegistry.getElectedRole(_meeting.circleId, HolacracyTypes.ElectedRole.Facilitator);
    if (_facilitator != address(0) && msg.sender == _facilitator) return;

    // Fall back to circle lead
    if (circleRegistry.isCircleLead(_meeting.circleId, msg.sender)) return;

    revert TacticalMeeting_NotFacilitator(_meeting.id);
  }

  /// @notice Checks if caller is a circle lead of the circle that contains the given role
  function _assertCircleLeadForRole(uint256 _roleId) internal view {
    HolacracyTypes.Role memory _role = roleRegistry.getRole(_roleId);
    if (!circleRegistry.isCircleLead(_role.circleId, msg.sender)) {
      revert TacticalMeeting_NotCircleLead(_role.circleId);
    }
  }
}
