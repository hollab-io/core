// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IGovernanceMeeting} from 'interfaces/IGovernanceMeeting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/**
 * @title GovernanceMeeting
 * @notice Manages governance meetings — synchronous sessions where proposals are processed live
 * @dev IDM facilitation is handled off-chain. This contract records meetings
 *      and links them to proposals processed via the GovernanceProcess contract.
 */
contract GovernanceMeeting is IGovernanceMeeting {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to the circle registry
  CircleRegistry public circleRegistry;

  /// @notice Reference to the governance process
  GovernanceProcess public governanceProcess;

  /// @notice Auto-incrementing meeting ID counter
  uint256 internal _meetingCounter;

  /// @notice Meeting ID => Meeting data
  mapping(uint256 => HolacracyTypes.GovernanceMeeting) internal _meetings;

  /// @notice Circle ID => meeting IDs
  mapping(uint256 => uint256[]) internal _circleMeetings;

  /// @notice Meeting ID => proposal IDs
  mapping(uint256 => uint256[]) internal _meetingProposals;

  /// @notice Meeting ID => proposal ID => linked
  mapping(uint256 => mapping(uint256 => bool)) internal _proposalLinked;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Prevents re-initialization
  modifier initializer() {
    if (_initialized) revert GovernanceMeeting_AlreadyInitialized();
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

  /// @notice Initializes a clone of GovernanceMeeting
  /// @param _circleRegistry The CircleRegistry contract
  /// @param _governanceProcess The GovernanceProcess contract
  function initialize(CircleRegistry _circleRegistry, GovernanceProcess _governanceProcess) external initializer {
    circleRegistry = _circleRegistry;
    governanceProcess = _governanceProcess;
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.GovernanceMeeting memory _meeting) {
    _meeting = _meetings[_meetingId];
    if (!_meeting.exists) revert GovernanceMeeting_MeetingNotFound(_meetingId);
  }

  /// @inheritdoc IGovernanceMeeting
  function getCircleMeetings(uint256 _circleId) external view returns (uint256[] memory _meetingIds) {
    _meetingIds = _circleMeetings[_circleId];
  }

  /// @inheritdoc IGovernanceMeeting
  function getMeetingProposals(uint256 _meetingId) external view returns (uint256[] memory _proposalIds) {
    _proposalIds = _meetingProposals[_meetingId];
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IGovernanceMeeting
  function conveneMeeting(uint256 _circleId) external returns (uint256 _meetingId) {
    if (!circleRegistry.isCircleMember(_circleId, msg.sender)) {
      revert GovernanceMeeting_NotCircleMember(_circleId, msg.sender);
    }

    _meetingId = ++_meetingCounter;

    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    _meeting.id = _meetingId;
    _meeting.circleId = _circleId;
    _meeting.convenedBy = msg.sender;
    _meeting.createdAt = block.timestamp;
    _meeting.exists = true;

    _circleMeetings[_circleId].push(_meetingId);

    emit MeetingConvened(_meetingId, _circleId, msg.sender);
  }

  /// @inheritdoc IGovernanceMeeting
  function completeMeeting(uint256 _meetingId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (!_meeting.exists) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.completedAt != 0) revert GovernanceMeeting_MeetingAlreadyCompleted(_meetingId);
    _assertFacilitatorOrConvener(_meeting);

    _meeting.completedAt = block.timestamp;

    emit MeetingCompleted(_meetingId);
  }

  /// @inheritdoc IGovernanceMeeting
  function linkProposal(uint256 _meetingId, uint256 _proposalId) external {
    HolacracyTypes.GovernanceMeeting storage _meeting = _meetings[_meetingId];
    if (!_meeting.exists) revert GovernanceMeeting_MeetingNotFound(_meetingId);
    if (_meeting.completedAt != 0) revert GovernanceMeeting_MeetingAlreadyCompleted(_meetingId);
    if (!circleRegistry.isCircleMember(_meeting.circleId, msg.sender)) {
      revert GovernanceMeeting_NotCircleMember(_meeting.circleId, msg.sender);
    }
    if (_proposalLinked[_meetingId][_proposalId]) {
      revert GovernanceMeeting_ProposalAlreadyLinked(_meetingId, _proposalId);
    }

    // Verify the proposal exists by reading it (reverts if not found)
    governanceProcess.getProposal(_proposalId);

    _proposalLinked[_meetingId][_proposalId] = true;
    _meetingProposals[_meetingId].push(_proposalId);

    emit ProposalLinked(_meetingId, _proposalId);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Checks if caller is the facilitator of the meeting's circle, or the convener
  function _assertFacilitatorOrConvener(HolacracyTypes.GovernanceMeeting storage _meeting) internal view {
    if (msg.sender == _meeting.convenedBy) return;

    address _facilitator =
      circleRegistry.getElectedRole(_meeting.circleId, HolacracyTypes.ElectedRole.Facilitator);
    if (_facilitator != address(0) && msg.sender == _facilitator) return;

    // Fall back to circle lead
    if (circleRegistry.isCircleLead(_meeting.circleId, msg.sender)) return;

    revert GovernanceMeeting_NotFacilitator(_meeting.id);
  }
}
