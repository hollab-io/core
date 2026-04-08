// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IMeetingFactory
 * @notice Unified event-driven meeting lifecycle for tactical and governance sessions.
 * @dev Minimal on-chain state: deterministic counters only.
 */
interface IMeetingFactory {
  /*///////////////////////////////////////////////////////////////
                            ENUMS
  //////////////////////////////////////////////////////////////*/

  /// @notice Kind of meeting being run.
  enum MeetingKind {
    Tactical,
    Governance
  }

  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  event MeetingStarted(
    uint256 indexed _meetingId, uint256 indexed _orgId, MeetingKind indexed _kind, address _startedBy, uint256 _timestamp
  );
  event MeetingEnded(uint256 indexed _meetingId, uint256 indexed _orgId, MeetingKind indexed _kind, address _endedBy, uint256 _timestamp);
  event MeetingOutputRecorded(
    uint256 indexed _meetingId,
    uint256 indexed _itemId,
    uint256 indexed _orgId,
    HolacracyTypes.OutputType _outputType,
    address _assignedTo,
    uint256 _roleId,
    string _description
  );
  event MeetingProposalLinked(uint256 indexed _meetingId, uint256 indexed _itemId, uint256 indexed _orgId, uint256 _proposalId);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error MeetingFactory_AlreadyInitialized();
  error MeetingFactory_NotOrgMember(uint256 _orgId, address _caller);
  error MeetingFactory_NotOrgAdmin(uint256 _orgId, address _caller);
  error MeetingFactory_EmptyString();

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  function initialize(address _orgFactory, address _roleRegistry, address _unused) external;
  function startMeeting(uint256 _orgId, MeetingKind _kind) external returns (uint256 _meetingId);
  function endMeeting(uint256 _meetingId, uint256 _orgId, MeetingKind _kind) external;
  function recordOutput(
    uint256 _meetingId,
    uint256 _orgId,
    HolacracyTypes.OutputType _outputType,
    string calldata _description,
    address _assignedTo,
    uint256 _roleId
  ) external returns (uint256 _itemId);
  function linkProposal(
    uint256 _meetingId,
    uint256 _orgId,
    uint256 _proposalId
  ) external returns (uint256 _itemId);
}
