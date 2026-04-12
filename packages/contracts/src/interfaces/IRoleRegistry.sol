// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title IRoleRegistry
 * @notice Manages the creation, modification, and assignment of Roles
 * @dev Roles are the fundamental unit of organizational structure in Holacracy.
 *      Each Role must have a name and at least one of: purpose, domain, or accountability.
 */
interface IRoleRegistry {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when a new role is created
  /// @param _roleId The ID of the created role
  /// @param _circleId The circle this role belongs to
  /// @param _name The name of the role
  event RoleCreated(uint256 indexed _roleId, uint256 indexed _circleId, string _name);

  /// @notice Emitted when a role is updated
  /// @param _roleId The ID of the updated role
  event RoleUpdated(uint256 indexed _roleId);

  /// @notice Emitted when a role is removed
  /// @param _roleId The ID of the removed role
  /// @param _circleId The circle this role belonged to
  event RoleRemoved(uint256 indexed _roleId, uint256 indexed _circleId);

  /// @notice Emitted when a role lead is assigned to a role
  /// @param _roleId The ID of the role
  /// @param _lead The address of the assigned role lead
  event RoleLeadAssigned(uint256 indexed _roleId, address indexed _lead);

  /// @notice Emitted when a role lead is unassigned from a role
  /// @param _roleId The ID of the role
  /// @param _lead The address of the unassigned role lead
  event RoleLeadUnassigned(uint256 indexed _roleId, address indexed _lead);

  /// @notice Emitted when a content ref is set for an entity field
  /// @param _entityType The entity type (keccak256 of "role", "policy", etc.)
  /// @param _entityId The entity ID
  /// @param _fieldName The field name (keccak256 of field)
  /// @param _contentHash The hash of the plaintext content
  /// @param _visibility The visibility tier
  event ContentRefSet(
    bytes32 indexed _entityType,
    uint256 indexed _entityId,
    bytes32 indexed _fieldName,
    bytes32 _contentHash,
    HolacracyTypes.DataVisibility _visibility
  );

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when a role does not exist
  error RoleRegistry_RoleNotFound(uint256 _roleId);

  /// @notice Thrown when a role name is empty
  error RoleRegistry_EmptyName();

  /// @notice Thrown when a role has no purpose, domains, or accountabilities
  error RoleRegistry_InvalidRole();

  /// @notice Thrown when the caller is not authorized
  error RoleRegistry_Unauthorized();

  /// @notice Thrown when the address is already a role lead
  error RoleRegistry_AlreadyRoleLead(uint256 _roleId, address _lead);

  /// @notice Thrown when the address is not a role lead
  error RoleRegistry_NotRoleLead(uint256 _roleId, address _lead);

  /// @notice Thrown when the contract has already been initialized
  error RoleRegistry_AlreadyInitialized();

  /// @notice Thrown when fieldNames and refs arrays have different lengths
  error RoleRegistry_ArrayLengthMismatch();

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the total number of roles created
  /// @return _count The role count
  function roleCount() external view returns (uint256 _count);

  /// @notice Returns a role by its ID
  /// @param _roleId The role ID
  /// @return _role The role data
  function getRole(
    uint256 _roleId
  ) external view returns (HolacracyTypes.Role memory _role);

  /// @notice Returns the domains of a role
  /// @param _roleId The role ID
  /// @return _domains The role's domains
  function getRoleDomains(
    uint256 _roleId
  ) external view returns (string[] memory _domains);

  /// @notice Returns the accountabilities of a role
  /// @param _roleId The role ID
  /// @return _accountabilities The role's accountabilities
  function getRoleAccountabilities(
    uint256 _roleId
  ) external view returns (string[] memory _accountabilities);

  /// @notice Returns the role leads for a role
  /// @param _roleId The role ID
  /// @return _leads The addresses of role leads
  function getRoleLeads(
    uint256 _roleId
  ) external view returns (address[] memory _leads);

  /// @notice Checks if an address is a role lead for a given role
  /// @param _roleId The role ID
  /// @param _account The address to check
  /// @return _isLead Whether the address is a role lead
  function isRoleLead(
    uint256 _roleId,
    address _account
  ) external view returns (bool _isLead);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Initializes a clone of the RoleRegistry
  function initialize() external;

  /// @notice Creates a new role within a circle
  /// @param _circleId The circle ID this role belongs to
  /// @param _name The name of the role
  /// @param _purpose The purpose of the role
  /// @param _domains The domains the role controls
  /// @param _accountabilities The accountabilities of the role
  /// @return _roleId The ID of the created role
  function createRole(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external returns (uint256 _roleId);

  /// @notice Updates an existing role
  /// @param _roleId The role ID to update
  /// @param _name The new name
  /// @param _purpose The new purpose
  /// @param _domains The new domains
  /// @param _accountabilities The new accountabilities
  function updateRole(
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external;

  /// @notice Removes a role
  /// @param _roleId The role ID to remove
  function removeRole(
    uint256 _roleId
  ) external;

  /// @notice Assigns a role lead to a role
  /// @param _roleId The role ID
  /// @param _lead The address to assign as role lead
  function assignRoleLead(
    uint256 _roleId,
    address _lead
  ) external;

  /// @notice Unassigns a role lead from a role
  /// @param _roleId The role ID
  /// @param _lead The address to unassign
  function unassignRoleLead(
    uint256 _roleId,
    address _lead
  ) external;

  /// @notice Creates a new role with content refs for off-chain encrypted fields
  /// @param _circleId The circle ID this role belongs to
  /// @param _name The name of the role
  /// @param _purpose The purpose (may be a sentinel string)
  /// @param _domains The domains (may contain sentinel strings)
  /// @param _accountabilities The accountabilities (may contain sentinel strings)
  /// @param _fieldNames The field name hashes for content refs
  /// @param _refs The content refs corresponding to each field name
  /// @return _roleId The ID of the created role
  function createRoleWithRefs(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external returns (uint256 _roleId);

  /// @notice Updates an existing role with content refs
  /// @param _roleId The role ID to update
  /// @param _name The new name
  /// @param _purpose The new purpose (may be a sentinel string)
  /// @param _domains The new domains (may contain sentinel strings)
  /// @param _accountabilities The new accountabilities (may contain sentinel strings)
  /// @param _fieldNames The field name hashes for content refs
  /// @param _refs The content refs corresponding to each field name
  function updateRoleWithRefs(
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external;

  /// @notice Returns the content ref for a role field
  /// @param _roleId The role ID
  /// @param _fieldName The field name hash
  /// @return _ref The content ref
  function getRoleContentRef(
    uint256 _roleId,
    bytes32 _fieldName
  ) external view returns (HolacracyTypes.ContentRef memory _ref);
}
