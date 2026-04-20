// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {IERC8004} from 'interfaces/IERC8004.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title OrganizationInstance
 * @notice Per-org contract holding all membership state and wiring for one
 *         Holacracy organization. Deployed as an ERC-1167 minimal proxy clone
 *         by OrganizationFactory.
 *
 *         Separation of concerns:
 *           - OrganizationFactory: directory + creation  (id/subname → instance)
 *           - OrganizationInstance: one org's identity, state, and authority
 *           - RoleRegistry: org's role + circle structure
 *           - MeetingFactory: governance process
 */
contract OrganizationInstance is Initializable, IOrganizationInstance {
  /*///////////////////////////////////////////////////////////////
                            IDENTITY
  //////////////////////////////////////////////////////////////*/

  uint256 public id;
  string public subname;
  string public creator_; // avoid shadowing address `creator`
  address public creator;
  uint256 public createdAt;
  string internal _purpose;

  /*///////////////////////////////////////////////////////////////
                            WIRING
  //////////////////////////////////////////////////////////////*/

  address public roleRegistry;
  address public meetingFactory;
  address public accessManager;
  address public token;
  uint256 public anchorCircleId;
  address public meetingComponentsFactory;

  /*///////////////////////////////////////////////////////////////
                            ADMIN / MEMBER
  //////////////////////////////////////////////////////////////*/

  mapping(address => bool) internal _isAdmin;
  uint256 internal _adminCount;
  mapping(address => bool) internal _isMember;

  /*///////////////////////////////////////////////////////////////
                          JOIN REQUESTS
  //////////////////////////////////////////////////////////////*/

  uint256 internal _joinRequestCounter;
  mapping(address => uint256) internal _joinRequestIds;

  /*///////////////////////////////////////////////////////////////
                       ERC-8004 AGENT IDENTITY
  //////////////////////////////////////////////////////////////*/

  mapping(address => uint256) internal _agentIds;
  mapping(address => address) internal _agentRegistries;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  constructor() {
    _disableInitializers();
  }

  /*///////////////////////////////////////////////////////////////
                           MODIFIERS
  //////////////////////////////////////////////////////////////*/

  modifier onlyAdmin() {
    if (!_isAdmin[msg.sender]) revert OrganizationInstance_Unauthorized();
    _;
  }

  modifier onlyMeetingComponentsFactory() {
    if (msg.sender != meetingComponentsFactory) revert OrganizationInstance_Unauthorized();
    _;
  }

  /*///////////////////////////////////////////////////////////////
                      INITIALISATION (ONE-SHOT)
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationInstance
  function initialize(
    InitParams calldata params
  ) external initializer {
    id = params.id;
    subname = params.subname;
    _purpose = params.purpose;
    creator = params.creator;
    createdAt = block.timestamp;
    roleRegistry = params.roleRegistry;
    accessManager = params.accessManager;
    token = params.token;
    anchorCircleId = params.anchorCircleId;
    meetingComponentsFactory = params.meetingComponentsFactory;

    // Seed creator as first admin and member.
    _isAdmin[params.creator] = true;
    _adminCount = 1;
    _isMember[params.creator] = true;

    emit AdminAdded(params.creator);
    emit MemberAdded(params.creator);
  }

  /// @inheritdoc IOrganizationInstance
  function setMeetingFactory(
    address _meetingFactory
  ) external onlyMeetingComponentsFactory {
    if (meetingFactory != address(0)) revert OrganizationInstance_MeetingFactoryAlreadySet();
    meetingFactory = _meetingFactory;
    emit MeetingFactorySet(_meetingFactory);
  }

  /// @inheritdoc IOrganizationInstance
  function setRoleRegistryGovernanceProcess(
    address governanceProcess
  ) external onlyMeetingComponentsFactory {
    IRoleRegistry(roleRegistry).setGovernanceProcess(governanceProcess);
  }

  /*///////////////////////////////////////////////////////////////
                            IDENTITY
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationInstance
  function summary() external view returns (HolacracyTypes.Organization memory) {
    return HolacracyTypes.Organization({
      id: id,
      name: subname,
      subname: subname,
      creator: creator,
      roleRegistry: roleRegistry,
      circleRegistry: address(0), // not used; kept for struct compat
      governanceProcess: meetingFactory,
      meetingFactory: meetingFactory,
      accessManager: accessManager,
      anchorCircleId: anchorCircleId,
      createdAt: createdAt,
      token: token
    });
  }

  /*///////////////////////////////////////////////////////////////
                        ADMIN / MEMBER
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationInstance
  function isAdmin(
    address account
  ) external view returns (bool) {
    return _isAdmin[account];
  }

  /// @inheritdoc IOrganizationInstance
  function isMember(
    address account
  ) external view returns (bool) {
    return _isMember[account];
  }

  /// @inheritdoc IOrganizationInstance
  function adminCount() external view returns (uint256) {
    return _adminCount;
  }

  /// @inheritdoc IOrganizationInstance
  function addAdmin(
    address account
  ) external onlyAdmin {
    if (!_isAdmin[account]) {
      _isAdmin[account] = true;
      _adminCount += 1;
      emit AdminAdded(account);
    }
  }

  /// @inheritdoc IOrganizationInstance
  function removeAdmin(
    address account
  ) external onlyAdmin {
    if (_isAdmin[account]) {
      if (_adminCount <= 1) revert OrganizationInstance_LastAdmin();
      _isAdmin[account] = false;
      _adminCount -= 1;
      emit AdminRemoved(account);
    }
  }

  /// @inheritdoc IOrganizationInstance
  function addMember(
    address account
  ) external onlyAdmin {
    if (!_isMember[account]) {
      _isMember[account] = true;
      emit MemberAdded(account);
    }
  }

  /// @inheritdoc IOrganizationInstance
  function removeMember(
    address account
  ) external onlyAdmin {
    if (_isMember[account]) {
      _isMember[account] = false;
      emit MemberRemoved(account);
    }
  }

  /*///////////////////////////////////////////////////////////////
                         JOIN REQUESTS
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationInstance
  function requestToJoin(
    string calldata message
  ) external returns (uint256 requestId) {
    if (_joinRequestIds[msg.sender] != 0) {
      revert OrganizationInstance_JoinRequestAlreadyPending(msg.sender);
    }
    requestId = ++_joinRequestCounter;
    _joinRequestIds[msg.sender] = requestId;
    emit JoinRequested(requestId, msg.sender, message);
  }

  /// @inheritdoc IOrganizationInstance
  function approveJoinRequest(
    address requester
  ) external onlyAdmin {
    uint256 requestId = _joinRequestIds[requester];
    if (requestId == 0) revert OrganizationInstance_JoinRequestNotFound(requester);
    delete _joinRequestIds[requester];
    if (!_isMember[requester]) {
      _isMember[requester] = true;
      emit MemberAdded(requester);
    }
    emit JoinApproved(requestId, requester);
  }

  /// @inheritdoc IOrganizationInstance
  function rejectJoinRequest(
    address requester
  ) external onlyAdmin {
    uint256 requestId = _joinRequestIds[requester];
    if (requestId == 0) revert OrganizationInstance_JoinRequestNotFound(requester);
    delete _joinRequestIds[requester];
    emit JoinRejected(requestId, requester);
  }

  /// @inheritdoc IOrganizationInstance
  function hasPendingRequest(
    address requester
  ) external view returns (bool) {
    return _joinRequestIds[requester] != 0;
  }

  /*///////////////////////////////////////////////////////////////
                       ERC-8004 AGENT IDENTITY
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationInstance
  function linkAgentIdentity(
    address agentRegistry,
    uint256 agentId
  ) external {
    if (!_isMember[msg.sender]) revert OrganizationInstance_Unauthorized();
    if (IERC8004(agentRegistry).ownerOf(agentId) != msg.sender) {
      revert OrganizationInstance_AgentNotOwner(agentId, msg.sender);
    }
    _agentIds[msg.sender] = agentId;
    _agentRegistries[msg.sender] = agentRegistry;
    emit AgentIdentityLinked(msg.sender, agentRegistry, agentId);
  }

  /// @inheritdoc IOrganizationInstance
  function getAgentIdentity(
    address account
  ) external view returns (address agentRegistry, uint256 agentId) {
    agentRegistry = _agentRegistries[account];
    agentId = _agentIds[account];
  }
}
