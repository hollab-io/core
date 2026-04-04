// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IGovernanceMeeting
 * @notice Manages governance meetings — synchronous sessions where proposals are processed live
 * @dev Based on Holacracy Constitution v5.0, Section 5.4.
 *      IDM facilitation is handled off-chain. This contract records meetings
 *      and links them to proposals processed via the GovernanceProcess contract.
 */
interface IGovernanceMeeting {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a governance meeting is convened
  /// @param _meetingId The meeting ID
  /// @param _circleId The circle the meeting belongs to
  /// @param _convenedBy The address that convened the meeting
  event MeetingConvened(uint256 indexed _meetingId, uint256 indexed _circleId, address indexed _convenedBy);

  /// @notice Emitted when a governance meeting is completed
  /// @param _meetingId The meeting ID
  event MeetingCompleted(uint256 indexed _meetingId);

  /// @notice Emitted when a proposal is linked to a meeting for processing
  /// @param _meetingId The meeting ID
  /// @param _proposalId The proposal ID
  event ProposalLinked(uint256 indexed _meetingId, uint256 indexed _proposalId);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the caller is not a circle member
  error GovernanceMeeting_NotCircleMember(uint256 _circleId, address _caller);

  /// @notice Thrown when a meeting does not exist
  error GovernanceMeeting_MeetingNotFound(uint256 _meetingId);

  /// @notice Thrown when trying to act on an already-completed meeting
  error GovernanceMeeting_MeetingAlreadyCompleted(uint256 _meetingId);

  /// @notice Thrown when the caller is not the facilitator or convener
  error GovernanceMeeting_NotFacilitator(uint256 _meetingId);

  /// @notice Thrown when the contract has already been initialized
  error GovernanceMeeting_AlreadyInitialized();

  /// @notice Thrown when a proposal is already linked to the meeting
  error GovernanceMeeting_ProposalAlreadyLinked(uint256 _meetingId, uint256 _proposalId);

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns meeting data by ID
  /// @param _meetingId The meeting ID
  /// @return _meeting The meeting data
  function getMeeting(uint256 _meetingId) external view returns (HolacracyTypes.GovernanceMeeting memory _meeting);

  /// @notice Returns the meeting IDs for a circle
  /// @param _circleId The circle ID
  /// @return _meetingIds The meeting IDs
  function getCircleMeetings(uint256 _circleId) external view returns (uint256[] memory _meetingIds);

  /// @notice Returns the proposal IDs linked to a meeting
  /// @param _meetingId The meeting ID
  /// @return _proposalIds The proposal IDs
  function getMeetingProposals(uint256 _meetingId) external view returns (uint256[] memory _proposalIds);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Convenes a new governance meeting for a circle
  /// @dev Any circle member can convene
  /// @param _circleId The circle to hold the meeting in
  /// @return _meetingId The created meeting ID
  function conveneMeeting(uint256 _circleId) external returns (uint256 _meetingId);

  /// @notice Completes a governance meeting
  /// @dev Only callable by the circle's facilitator or the meeting convener
  /// @param _meetingId The meeting to complete
  function completeMeeting(uint256 _meetingId) external;

  /// @notice Links a proposal to this meeting, recording that it was processed here
  /// @dev Only callable by circle members while the meeting is open
  /// @param _meetingId The meeting the proposal is being processed in
  /// @param _proposalId The proposal ID (from GovernanceProcess)
  function linkProposal(uint256 _meetingId, uint256 _proposalId) external;
}
