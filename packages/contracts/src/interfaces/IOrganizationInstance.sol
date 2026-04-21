// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IOrganizationInstance
 * @notice One-stop contract for a single Holacracy organization: holds its identity,
 *         wiring references (RoleRegistry, MeetingFactory, GovToken, AccessManager),
 *         membership state (admins + members), join-request lifecycle, and ERC-8004
 *         agent-identity links.
 *
 *         Deployed as an ERC-1167 minimal proxy clone by OrganizationFactory.
 *         The factory becomes a thin directory (id → instance address) after creation.
 */
interface IOrganizationInstance {
  /*///////////////////////////////////////////////////////////////
                           ERRORS
  //////////////////////////////////////////////////////////////*/

  error OrganizationInstance_AlreadyInitialized();
  error OrganizationInstance_Unauthorized();
  error OrganizationInstance_LastAdmin();
  error OrganizationInstance_JoinRequestAlreadyPending(address requester);
  error OrganizationInstance_JoinRequestNotFound(address requester);
  error OrganizationInstance_AgentNotOwner(uint256 agentId, address caller);
  error OrganizationInstance_MeetingFactoryAlreadySet();

  /*///////////////////////////////////////////////////////////////
                           EVENTS
  //////////////////////////////////////////////////////////////*/

  event AdminAdded(address indexed account);
  event AdminRemoved(address indexed account);
  event MemberAdded(address indexed account);
  event MemberRemoved(address indexed account);
  event JoinRequested(uint256 indexed requestId, address indexed requester, string message);
  event JoinApproved(uint256 indexed requestId, address indexed requester);
  event JoinRejected(uint256 indexed requestId, address indexed requester);
  event AgentIdentityLinked(address indexed account, address indexed agentRegistry, uint256 agentId);
  event MeetingFactorySet(address indexed meetingFactory);

  /*///////////////////////////////////////////////////////////////
                      INITIALISATION (ONE-SHOT)
  //////////////////////////////////////////////////////////////*/

  struct InitParams {
    uint256 id;
    string subname;
    string purpose;
    address creator;
    address roleRegistry;
    address accessManager;
    address token;
    uint256 anchorCircleId;
    address meetingComponentsFactory;
  }

  /// @notice Initializes the clone. Callable only once; reverts on re-call.
  ///         Must be called by the OrganizationFactory immediately after cloning.
  function initialize(
    InitParams calldata params
  ) external;

  /// @notice Wires the per-org MeetingFactory clone. One-shot (reverts if already set).
  ///         Callable only by the `meetingComponentsFactory` address stored at init.
  function setMeetingFactory(
    address meetingFactory
  ) external;

  /// @notice Grants MeetingFactory governance authority on the org's RoleRegistry.
  ///         Callable only by `meetingComponentsFactory`.
  function setRoleRegistryGovernanceProcess(
    address governanceProcess
  ) external;

  /*///////////////////////////////////////////////////////////////
                           IDENTITY
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns a full snapshot of this org's metadata + wiring addresses.
  function summary() external view returns (HolacracyTypes.Organization memory);

  function id() external view returns (uint256);
  function subname() external view returns (string memory);
  function creator() external view returns (address);
  function createdAt() external view returns (uint256);

  /*///////////////////////////////////////////////////////////////
                           WIRING
  //////////////////////////////////////////////////////////////*/

  function roleRegistry() external view returns (address);
  function meetingFactory() external view returns (address);
  function accessManager() external view returns (address);
  function token() external view returns (address);
  function anchorCircleId() external view returns (uint256);
  function meetingComponentsFactory() external view returns (address);

  /*///////////////////////////////////////////////////////////////
                        ADMIN / MEMBER
  //////////////////////////////////////////////////////////////*/

  function isAdmin(
    address account
  ) external view returns (bool);

  function isMember(
    address account
  ) external view returns (bool);

  function adminCount() external view returns (uint256);

  /// @notice Admin-only: grant admin privileges to `account`. No-op if already admin.
  function addAdmin(
    address account
  ) external;

  /// @notice Admin-only: revoke admin privileges from `account`.
  ///         Reverts with LastAdmin if the org would have zero admins.
  function removeAdmin(
    address account
  ) external;

  /// @notice Admin-only: add `account` as an org member.
  function addMember(
    address account
  ) external;

  /// @notice Admin-only: remove `account` from org membership.
  function removeMember(
    address account
  ) external;

  /*///////////////////////////////////////////////////////////////
                         JOIN REQUESTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Submit a join request from `msg.sender`.
  ///         Reverts if a request from this address is already pending.
  function requestToJoin(
    string calldata message
  ) external returns (uint256 requestId);

  /// @notice Admin-only: approve a pending join request, adding requester as member.
  function approveJoinRequest(
    address requester
  ) external;

  /// @notice Admin-only: reject a pending join request.
  function rejectJoinRequest(
    address requester
  ) external;

  /// @notice Returns true if `requester` has a pending join request on this org.
  function hasPendingRequest(
    address requester
  ) external view returns (bool);

  /*///////////////////////////////////////////////////////////////
                       ERC-8004 AGENT IDENTITY
  //////////////////////////////////////////////////////////////*/

  /// @notice Link an ERC-8004 agent identity to your org membership.
  ///         Caller must own the agent NFT on the given registry.
  function linkAgentIdentity(
    address agentRegistry,
    uint256 agentId
  ) external;

  /// @notice Returns the agent identity linked to `account`, or (address(0), 0) if none.
  function getAgentIdentity(
    address account
  ) external view returns (address agentRegistry, uint256 agentId);
}
