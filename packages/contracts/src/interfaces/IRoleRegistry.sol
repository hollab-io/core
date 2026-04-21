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

  /// @notice Emitted when a role is expanded into a circle
  /// @param _roleId The ID of the role that became a circle
  event RoleExpandedToCircle(uint256 indexed _roleId);

  /// @notice Emitted when a role lead is assigned to a role
  /// @param _roleId The ID of the role
  /// @param _lead The address of the assigned role lead
  event RoleLeadAssigned(uint256 indexed _roleId, address indexed _lead);

  /// @notice Emitted when a role lead is unassigned from a role
  /// @param _roleId The ID of the role
  /// @param _lead The address of the unassigned role lead
  event RoleLeadUnassigned(uint256 indexed _roleId, address indexed _lead);

  /// @notice Emitted when the governance process address is set
  /// @param _governanceProcess The new governance process address
  event GovernanceProcessSet(address indexed _governanceProcess);

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

  /// @notice Emitted when a circle is created (anchor or sub-circle)
  /// @param _circleId The new circle ID
  /// @param _parentCircleId The parent circle ID (0 for the anchor circle)
  /// @param _roleId The role the circle is anchored on (lead-link-style)
  event CircleCreated(uint256 indexed _circleId, uint256 indexed _parentCircleId, uint256 indexed _roleId);

  /// @notice Emitted once when the Anchor Circle is initialized
  /// @param _circleId The anchor circle ID
  /// @param _roleId The anchor role ID
  /// @param _creator The creator seeded as the anchor role lead
  event AnchorCircleInitialized(uint256 indexed _circleId, uint256 indexed _roleId, address indexed _creator);

  /// @notice Emitted when a policy is created
  /// @param _policyId The ID of the created policy
  /// @param _circleId The circle this policy belongs to
  /// @param _name The name of the policy
  event PolicyCreated(uint256 indexed _policyId, uint256 indexed _circleId, string _name);

  /// @notice Emitted when a policy is updated
  /// @param _policyId The ID of the updated policy
  event PolicyUpdated(uint256 indexed _policyId);

  /// @notice Emitted when a policy is removed
  /// @param _policyId The ID of the removed policy
  /// @param _circleId The circle this policy belonged to
  event PolicyRemoved(uint256 indexed _policyId, uint256 indexed _circleId);

  /// @notice Emitted when a role is moved to a different circle
  /// @param _roleId The ID of the role
  /// @param _fromCircleId The circle the role moved from
  /// @param _toCircleId The circle the role moved to
  event RoleMoved(uint256 indexed _roleId, uint256 indexed _fromCircleId, uint256 indexed _toCircleId);

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

  /// @notice Thrown when the role is already a circle
  error RoleRegistry_AlreadyCircle(uint256 _roleId);

  /// @notice Thrown when fieldNames and refs arrays have different lengths
  error RoleRegistry_ArrayLengthMismatch();

  /// @notice Thrown when the anchor circle has already been initialized
  error RoleRegistry_AnchorAlreadyInitialized();

  /// @notice Thrown when looking up a circle that doesn't exist
  error RoleRegistry_CircleNotFound(uint256 _circleId);

  /// @notice Thrown when a policy does not exist
  error RoleRegistry_PolicyNotFound(uint256 _policyId);

  /// @notice Thrown when a policy has an empty name
  error RoleRegistry_EmptyPolicyName();

  /// @notice Thrown when a move target circle is the same as the current circle
  error RoleRegistry_SameCircle(uint256 _roleId, uint256 _circleId);

  /// @notice Thrown when attempting to move a role that has been expanded to a circle
  error RoleRegistry_CannotMoveCircleRole(uint256 _roleId);

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

  /// @notice Returns a circle by its ID. Reverts if the circle doesn't exist.
  /// @param _circleId The circle ID
  /// @return _circle The circle data
  function getCircle(
    uint256 _circleId
  ) external view returns (HolacracyTypes.Circle memory _circle);

  /// @notice Returns the circle ID a role belongs to. Reverts if the role doesn't exist.
  /// @param _roleId The role ID
  /// @return _circleId The circle ID this role was created in
  function getRoleCircleId(
    uint256 _roleId
  ) external view returns (uint256 _circleId);

  /// @notice Total number of circles created
  /// @return _count The circle count
  function circleCount() external view returns (uint256 _count);

  /// @notice Returns the anchor circle ID (0 until initAnchorCircle is called)
  function anchorCircleId() external view returns (uint256 _anchorCircleId);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Initializes a clone of the RoleRegistry
  /// @param _factory The address authorized to call setGovernanceProcess (typically the OrganizationFactory)
  function initialize(
    address _factory
  ) external;

  /// @notice Sets the governance process (MeetingFactory) authorized to mutate roles.
  ///         Callable only once, and only by the `factory` address.
  /// @param _governanceProcess The MeetingFactory clone address
  function setGovernanceProcess(
    address _governanceProcess
  ) external;

  /// @notice Transfers the `factory` role to a new address.
  ///         One-time hand-off from OrganizationFactory to the per-org OrganizationInstance
  ///         after org creation, so the instance can directly wire the governance process.
  /// @param _newFactory The address that will become the new factory
  function transferFactory(
    address _newFactory
  ) external;

  /// @notice One-shot initializer that creates the Anchor Circle and seeds the Anchor Role lead.
  ///         Callable only by `factory`. Per Holacracy Constitution §1.3.3 every org has one
  ///         Anchor Circle at the top of its hierarchy.
  /// @param _creator Address seeded as the first Anchor Role lead (typically the org creator)
  /// @param _name Display name for the Anchor Circle and Anchor Role
  /// @param _purpose Stated purpose for the Anchor Circle and Anchor Role
  /// @return _circleId The ID of the newly-created anchor circle
  /// @return _roleId The ID of the newly-created anchor role
  function initAnchorCircle(
    address _creator,
    string calldata _name,
    string calldata _purpose
  ) external returns (uint256 _circleId, uint256 _roleId);

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

  /// @notice Expands a role into a sub-circle of its current circle.
  ///         Creates a new Circle record whose parent is the role's current circleId and
  ///         whose roleId points back at the expanded role (lead-link-style).
  ///         Sub-roles are added later via createRole targeting the returned circleId.
  /// @param _roleId The role ID to expand
  /// @return _circleId The ID of the newly-created sub-circle
  function expandToCircle(
    uint256 _roleId
  ) external returns (uint256 _circleId);

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

  /*///////////////////////////////////////////////////////////////
                            POLICIES
  //////////////////////////////////////////////////////////////*/

  /// @notice Creates a new policy within a circle
  /// @param _circleId The circle ID this policy belongs to
  /// @param _name The policy name
  /// @param _body The policy body (plaintext; may be a sentinel when using content refs)
  /// @return _policyId The ID of the created policy
  function createPolicy(
    uint256 _circleId,
    string calldata _name,
    string calldata _body
  ) external returns (uint256 _policyId);

  /// @notice Updates an existing policy
  /// @param _policyId The policy ID to update
  /// @param _name The new name
  /// @param _body The new body
  function updatePolicy(
    uint256 _policyId,
    string calldata _name,
    string calldata _body
  ) external;

  /// @notice Removes a policy
  /// @param _policyId The policy ID to remove
  function removePolicy(
    uint256 _policyId
  ) external;

  /// @notice Creates a new policy with content refs for off-chain encrypted fields
  /// @param _circleId The circle ID this policy belongs to
  /// @param _name The name of the policy
  /// @param _body The body (may be a sentinel string)
  /// @param _fieldNames The field name hashes for content refs
  /// @param _refs The content refs corresponding to each field name
  /// @return _policyId The ID of the created policy
  function createPolicyWithRefs(
    uint256 _circleId,
    string calldata _name,
    string calldata _body,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external returns (uint256 _policyId);

  /// @notice Updates an existing policy with content refs
  /// @param _policyId The policy ID
  /// @param _name The new name
  /// @param _body The new body (may be sentinel)
  /// @param _fieldNames The field name hashes
  /// @param _refs The content refs
  function updatePolicyWithRefs(
    uint256 _policyId,
    string calldata _name,
    string calldata _body,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external;

  /// @notice Returns a policy by its ID
  function getPolicy(
    uint256 _policyId
  ) external view returns (HolacracyTypes.Policy memory _policy);

  /// @notice Returns the circle ID a policy belongs to. Reverts if the policy doesn't exist.
  function getPolicyCircleId(
    uint256 _policyId
  ) external view returns (uint256 _circleId);

  /// @notice Returns all policy IDs within a circle
  function getCirclePolicyIds(
    uint256 _circleId
  ) external view returns (uint256[] memory _policyIds);

  /// @notice Total number of policies created
  function policyCount() external view returns (uint256 _count);

  /// @notice Returns the content ref for a policy field
  function getPolicyContentRef(
    uint256 _policyId,
    bytes32 _fieldName
  ) external view returns (HolacracyTypes.ContentRef memory _ref);

  /*///////////////////////////////////////////////////////////////
                            MOVE ROLE
  //////////////////////////////////////////////////////////////*/

  /// @notice Moves a leaf role to a different circle. Disallowed for roles that have been expanded.
  /// @param _roleId The role to move
  /// @param _toCircleId The destination circle ID
  function moveRole(
    uint256 _roleId,
    uint256 _toCircleId
  ) external;
}
