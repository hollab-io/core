// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IOrganizationFactory
 * @notice Directory + creation entrypoint. After creation all org state lives on
 *         the per-org OrganizationInstance clone — the factory is read-only.
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

  /// @notice Emitted when a new organization is created.
  ///         `_instance` is the OrganizationInstance clone address — the authoritative
  ///         one-stop address for all org state from this point on.
  ///         `_roleRegistry` is emitted (non-indexed) so indexers can factory-discover
  ///         the RoleRegistry clone from this single event.
  event OrganizationCreated(
    uint256 indexed _orgId, string _subname, address indexed _creator, address indexed _instance, address _roleRegistry
  );

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  error OrganizationFactory_SubnameAlreadyTaken(string _subname);
  error OrganizationFactory_InvalidSubname(string _subname);
  error OrganizationFactory_SubnameTooShort(string _subname);
  error OrganizationFactory_ArrayLengthMismatch();

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Creates a new Holacracy organization.
  ///         Deploys a RoleRegistry clone, AccessManager, GovToken, and an
  ///         OrganizationInstance clone. Registers an ENS subname.
  /// @param _subname ENS subname (e.g. "myorg" for myorg.hollab.eth)
  /// @param _purpose Anchor circle purpose
  /// @param _tokenConfig Governance token parameters
  /// @return _orgId The numeric organization ID
  /// @return _instance The OrganizationInstance clone address
  function createOrganization(
    string calldata _subname,
    string calldata _purpose,
    TokenConfig calldata _tokenConfig
  ) external returns (uint256 _orgId, address _instance);

  /*///////////////////////////////////////////////////////////////
                            DIRECTORY
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the OrganizationInstance address for a given org ID.
  ///         Returns address(0) if the org does not exist.
  function getOrganization(
    uint256 _orgId
  ) external view returns (address _instance);

  /// @notice Returns the OrganizationInstance address for a given ENS subname.
  ///         Returns address(0) if not found.
  function getOrganizationBySubname(
    string calldata _subname
  ) external view returns (address _instance);

  /// @notice Total number of organizations created.
  function organizationCount() external view returns (uint256 _count);

  /// @notice The RoleRegistry implementation used for cloning.
  function roleRegistryImplementation() external view returns (address _impl);
}
