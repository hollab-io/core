// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IOrganizationFactory
 * @notice Deploys Holacracy organizations as ERC-1167 minimal proxy clones
 *         and registers ENS subnames under hollab.eth
 */
interface IOrganizationFactory {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a new organization is created
  /// @param _orgId The organization ID
  /// @param _subname The ENS subname registered
  /// @param _creator The address that created the organization
  event OrganizationCreated(uint256 indexed _orgId, string _subname, address indexed _creator);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the requested subname is already taken
  error OrganizationFactory_SubnameAlreadyTaken(string _subname);

  /// @notice Thrown when the subname contains invalid characters
  error OrganizationFactory_InvalidSubname(string _subname);

  /// @notice Thrown when the subname is too short (minimum 3 characters)
  error OrganizationFactory_SubnameTooShort(string _subname);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Creates a new Holacracy organization
  /// @param _subname The ENS subname to register (e.g. "myorg" for myorg.hollab.eth)
  /// @param _purpose The purpose of the organization's anchor circle
  /// @return _orgId The ID of the created organization
  function createOrganization(string calldata _subname, string calldata _purpose) external returns (uint256 _orgId);

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns an organization by its ID
  /// @param _orgId The organization ID
  /// @return _org The organization data
  function getOrganization(uint256 _orgId) external view returns (HolacracyTypes.Organization memory _org);

  /// @notice Returns an organization by its ENS subname
  /// @param _subname The ENS subname
  /// @return _org The organization data
  function getOrganizationBySubname(string calldata _subname) external view returns (HolacracyTypes.Organization memory _org);

  /// @notice Returns the total number of organizations created
  /// @return _count The organization count
  function organizationCount() external view returns (uint256 _count);

  /// @notice Returns the RoleRegistry implementation address
  /// @return _impl The implementation address
  function roleRegistryImplementation() external view returns (address _impl);

  /// @notice Returns the CircleRegistry implementation address
  /// @return _impl The implementation address
  function circleRegistryImplementation() external view returns (address _impl);

  /// @notice Returns the GovernanceProcess implementation address
  /// @return _impl The implementation address
  function governanceProcessImplementation() external view returns (address _impl);
}
