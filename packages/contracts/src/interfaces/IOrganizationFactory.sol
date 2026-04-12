// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IOrganizationFactory
 * @notice Deploys Holacracy organizations as ERC-1167 minimal proxy clones,
 *         deploys a governance token (ERC20Votes) for ActionVoting,
 *         and registers an ENS subname under hollab.eth.
 */
interface IOrganizationFactory {
  /*///////////////////////////////////////////////////////////////
                            TYPES
  //////////////////////////////////////////////////////////////*/

  /// @notice Parameters for the governance token deployed with each organization
  struct TokenConfig {
    string tokenName;
    string tokenSymbol;
    address[] initialHolders;
    uint256[] initialAmounts;
  }

  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a new organization is created
  /// @param _orgId The organization ID
  /// @param _subname The ENS subname registered
  /// @param _creator The address that created the organization
  event OrganizationCreated(uint256 indexed _orgId, string _subname, address indexed _creator);

  /// @notice Emitted alongside OrganizationCreated with the addresses of the
  ///         per-org clone contracts so off-chain indexers can discover them.
  /// @param _orgId The organization ID
  /// @param _circleRegistry The deployed CircleRegistry clone
  /// @param _roleRegistry The deployed RoleRegistry clone
  /// @param _governanceProcess The deployed GovernanceProcess clone
  event OrgComponentsDeployed(
    uint256 indexed _orgId, address indexed _circleRegistry, address indexed _roleRegistry, address _governanceProcess
  );
  event JoinRequested(uint256 indexed requestId, address indexed requester, uint256 indexed orgId, string message);
  event JoinApproved(uint256 indexed requestId, address indexed requester, uint256 indexed orgId);
  event JoinRejected(uint256 indexed requestId, address indexed requester, uint256 indexed orgId);
  event OrgAdminAdded(uint256 indexed orgId, address indexed account);
  event OrgAdminRemoved(uint256 indexed orgId, address indexed account);
  event OrgMemberAdded(uint256 indexed orgId, address indexed account);
  event OrgMemberRemoved(uint256 indexed orgId, address indexed account);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the requested subname is already taken
  error OrganizationFactory_SubnameAlreadyTaken(string _subname);

  /// @notice Thrown when the subname contains invalid characters
  error OrganizationFactory_InvalidSubname(string _subname);

  /// @notice Thrown when the subname is too short (minimum 3 characters)
  error OrganizationFactory_SubnameTooShort(string _subname);
  error OrganizationFactory_JoinRequestAlreadyPending(address requester, uint256 orgId);
  error OrganizationFactory_JoinRequestNotFound(address requester, uint256 orgId);
  error OrganizationFactory_JoinRequestUnauthorized(address caller, uint256 orgId);
  error OrganizationFactory_OrgNotFound(uint256 orgId);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Creates a new Holacracy organization with a governance token
  /// @param _subname The ENS subname to register (e.g. "myorg" for myorg.hollab.eth)
  /// @param _purpose The purpose of the organization's anchor circle
  /// @param _tokenConfig Parameters for the GovToken deployment
  /// @return _orgId The ID of the created organization
  function createOrganization(
    string calldata _subname,
    string calldata _purpose,
    TokenConfig calldata _tokenConfig
  ) external returns (uint256 _orgId);
  function requestToJoin(
    uint256 orgId,
    string calldata message
  ) external returns (uint256 requestId);
  function approveJoinRequest(
    uint256 orgId,
    address requester
  ) external;
  function rejectJoinRequest(
    uint256 orgId,
    address requester
  ) external;
  function addOrgAdmin(
    uint256 orgId,
    address account
  ) external;
  function removeOrgAdmin(
    uint256 orgId,
    address account
  ) external;
  function addOrgMember(
    uint256 orgId,
    address account
  ) external;
  function removeOrgMember(
    uint256 orgId,
    address account
  ) external;

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns an organization by its ID
  /// @param _orgId The organization ID
  /// @return _org The organization data
  function getOrganization(
    uint256 _orgId
  ) external view returns (HolacracyTypes.Organization memory _org);

  /// @notice Returns an organization by its ENS subname
  /// @param _subname The ENS subname
  /// @return _org The organization data
  function getOrganizationBySubname(
    string calldata _subname
  ) external view returns (HolacracyTypes.Organization memory _org);

  /// @notice Returns the total number of organizations created
  /// @return _count The organization count
  function organizationCount() external view returns (uint256 _count);

  /// @notice Returns a page of organizations by sequential IDs.
  /// @dev Reads IDs in range [_offset + 1, min(_offset + _limit, organizationCount)].
  /// @param _offset Zero-based offset into the organization list
  /// @param _limit Maximum number of organizations to return
  /// @return _orgs The paginated organization records
  function getOrganizations(
    uint256 _offset,
    uint256 _limit
  ) external view returns (HolacracyTypes.Organization[] memory _orgs);
  function hasPendingRequest(
    address requester,
    uint256 orgId
  ) external view returns (bool);
  function isOrgAdmin(
    uint256 orgId,
    address account
  ) external view returns (bool);
  function isOrgMember(
    uint256 orgId,
    address account
  ) external view returns (bool);

  /// @notice Returns the RoleRegistry implementation address
  /// @return _impl The implementation address
  function roleRegistryImplementation() external view returns (address _impl);
}
