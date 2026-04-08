// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IMeetingFactory} from 'interfaces/IMeetingFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';

/**
 * @title MeetingFactory
 * @notice Unified meeting contract with event-only lifecycle and minimal state.
 */
contract MeetingFactory is IMeetingFactory {
  IOrganizationFactory public orgFactory;

  uint256 internal _meetingCounter;
  uint256 internal _itemCounter;
  bool internal _initialized;

  modifier initializer() {
    if (_initialized) revert MeetingFactory_AlreadyInitialized();
    _initialized = true;
    _;
  }

  constructor() {
    _initialized = true;
  }

  function initialize(address _orgFactory, address _roleRegistry, address _unused) external initializer {
    orgFactory = IOrganizationFactory(_orgFactory);
    _roleRegistry;
    _unused;
  }

  function startMeeting(uint256 _orgId, MeetingKind _kind) external returns (uint256 _meetingId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    _meetingId = ++_meetingCounter;
    emit MeetingStarted(_meetingId, _orgId, _kind, msg.sender, block.timestamp);
  }

  function endMeeting(uint256 _meetingId, uint256 _orgId, MeetingKind _kind) external {
    if (!orgFactory.isOrgAdmin(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgAdmin(_orgId, msg.sender);
    }
    emit MeetingEnded(_meetingId, _orgId, _kind, msg.sender, block.timestamp);
  }

  function recordOutput(
    uint256 _meetingId,
    uint256 _orgId,
    HolacracyTypes.OutputType _outputType,
    string calldata _description,
    address _assignedTo,
    uint256 _roleId
  ) external returns (uint256 _itemId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }
    if (bytes(_description).length == 0) revert MeetingFactory_EmptyString();

    _roleId;

    _itemId = ++_itemCounter;
    emit MeetingOutputRecorded(_meetingId, _itemId, _orgId, _outputType, _assignedTo, _roleId, _description);
  }

  function linkProposal(
    uint256 _meetingId,
    uint256 _orgId,
    uint256 _proposalId
  ) external returns (uint256 _itemId) {
    if (!orgFactory.isOrgMember(_orgId, msg.sender)) {
      revert MeetingFactory_NotOrgMember(_orgId, msg.sender);
    }

    _proposalId;

    _itemId = ++_itemCounter;
    emit MeetingProposalLinked(_meetingId, _itemId, _orgId, _proposalId);
  }
}
