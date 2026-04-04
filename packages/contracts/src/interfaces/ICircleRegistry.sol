// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title ICircleRegistry
 * @notice Manages the creation and hierarchy of Circles
 * @dev Circles are containers for organizing Roles and Policies.
 *      The Anchor Circle is the broadest circle with no parent.
 *      Sub-Circles are created by breaking down a Role into a Circle.
 */
interface ICircleRegistry {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when the anchor circle is created
  /// @param _circleId The ID of the anchor circle
  /// @param _name The name of the organization
  event AnchorCircleCreated(uint256 indexed _circleId, string _name);

  /// @notice Emitted when a sub-circle is created
  /// @param _circleId The ID of the new sub-circle
  /// @param _parentCircleId The ID of the parent circle
  /// @param _roleId The role that was broken down into this circle
  event SubCircleCreated(uint256 indexed _circleId, uint256 indexed _parentCircleId, uint256 indexed _roleId);

  /// @notice Emitted when a role is created within a circle
  /// @param _circleId The circle ID
  /// @param _roleId The created role ID
  event CircleRoleCreated(uint256 indexed _circleId, uint256 indexed _roleId);

  /// @notice Emitted when an elected role is set
  /// @param _circleId The circle ID
  /// @param _electedRole The type of elected role
  /// @param _account The elected account
  event ElectedRoleSet(uint256 indexed _circleId, HolacracyTypes.ElectedRole indexed _electedRole, address _account);

  /// @notice Emitted when a circle lead is added
  /// @param _circleId The circle ID
  /// @param _lead The circle lead address
  event CircleLeadAdded(uint256 indexed _circleId, address indexed _lead);

  /// @notice Emitted when a circle lead is removed
  /// @param _circleId The circle ID
  /// @param _lead The circle lead address
  event CircleLeadRemoved(uint256 indexed _circleId, address indexed _lead);

  /// @notice Emitted when a policy is added to a circle
  /// @param _circleId The circle ID
  /// @param _policyId The policy ID
  /// @param _name The policy name
  event PolicyAdded(uint256 indexed _circleId, uint256 indexed _policyId, string _name);

  /// @notice Emitted when a policy is removed from a circle
  /// @param _circleId The circle ID
  /// @param _policyId The policy ID
  event PolicyRemoved(uint256 indexed _circleId, uint256 indexed _policyId);

  /// @notice Emitted when a role lead is assigned via the circle
  /// @param _circleId The circle ID
  /// @param _roleId The role ID
  /// @param _lead The assigned lead address
  event RoleLeadAssignedViaCircle(uint256 indexed _circleId, uint256 indexed _roleId, address indexed _lead);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the anchor circle already exists
  error CircleRegistry_AnchorAlreadyExists();

  /// @notice Thrown when a circle does not exist
  error CircleRegistry_CircleNotFound(uint256 _circleId);

  /// @notice Thrown when the caller is not a circle lead
  error CircleRegistry_NotCircleLead(uint256 _circleId);

  /// @notice Thrown when the caller is not authorized
  error CircleRegistry_Unauthorized();

  /// @notice Thrown when the role does not belong to the specified circle
  error CircleRegistry_RoleNotInCircle(uint256 _roleId, uint256 _circleId);

  /// @notice Thrown when a policy does not exist
  error CircleRegistry_PolicyNotFound(uint256 _policyId);

  /// @notice Thrown when trying to create a sub-circle from a role that is already a circle
  error CircleRegistry_RoleAlreadyCircle(uint256 _roleId);

  /// @notice Thrown when an address is already a circle lead
  error CircleRegistry_AlreadyCircleLead(uint256 _circleId, address _lead);

  /// @notice Thrown when an address is not a circle lead
  error CircleRegistry_NotACircleLead(uint256 _circleId, address _lead);

  /// @notice Thrown when the contract has already been initialized
  error CircleRegistry_AlreadyInitialized();

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice Returns the anchor circle ID (0 if not created)
  /// @return _circleId The anchor circle ID
  function anchorCircleId() external view returns (uint256 _circleId);

  /// @notice Returns circle data by ID
  /// @param _circleId The circle ID
  /// @return _circle The circle data
  function getCircle(uint256 _circleId) external view returns (HolacracyTypes.Circle memory _circle);

  /// @notice Returns the child circle IDs of a circle
  /// @param _circleId The parent circle ID
  /// @return _childIds The child circle IDs
  function getSubCircles(uint256 _circleId) external view returns (uint256[] memory _childIds);

  /// @notice Returns the elected account for a given role type in a circle
  /// @param _circleId The circle ID
  /// @param _electedRole The elected role type
  /// @return _account The elected account address
  function getElectedRole(
    uint256 _circleId,
    HolacracyTypes.ElectedRole _electedRole
  ) external view returns (address _account);

  /// @notice Returns the circle leads for a circle
  /// @param _circleId The circle ID
  /// @return _leads The circle lead addresses
  function getCircleLeads(uint256 _circleId) external view returns (address[] memory _leads);

  /// @notice Checks if an address is a circle lead
  /// @param _circleId The circle ID
  /// @param _account The address to check
  /// @return _isLead Whether the address is a circle lead
  function isCircleLead(uint256 _circleId, address _account) external view returns (bool _isLead);

  /// @notice Checks if an address is a circle member (circle lead or role lead of any role in the circle)
  /// @param _circleId The circle ID
  /// @param _account The address to check
  /// @return _isMember Whether the address is a circle member
  function isCircleMember(uint256 _circleId, address _account) external view returns (bool _isMember);

  /// @notice Returns a policy by ID
  /// @param _policyId The policy ID
  /// @return _policy The policy data
  function getPolicy(uint256 _policyId) external view returns (HolacracyTypes.Policy memory _policy);

  /// @notice Returns the policy IDs for a circle
  /// @param _circleId The circle ID
  /// @return _policyIds The policy IDs
  function getCirclePolicies(uint256 _circleId) external view returns (uint256[] memory _policyIds);

  /// @notice Returns the circle ID that a role belongs to as a sub-circle (0 if not a sub-circle)
  /// @param _roleId The role ID
  /// @return _circleId The circle ID
  function roleToCircle(uint256 _roleId) external view returns (uint256 _circleId);

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @notice Creates the anchor circle (organization root)
  /// @param _name The organization name
  /// @param _purpose The organization purpose
  /// @return _circleId The anchor circle ID
  function createAnchorCircle(string calldata _name, string calldata _purpose) external returns (uint256 _circleId);

  /// @notice Breaks down a role into a sub-circle
  /// @dev Only callable by a circle lead of the circle containing the role
  /// @param _roleId The role ID to break down
  /// @return _circleId The new sub-circle ID
  function createSubCircle(uint256 _roleId) external returns (uint256 _circleId);

  /// @notice Creates a role within a circle
  /// @dev Only callable by a circle lead
  /// @param _circleId The circle to create the role in
  /// @param _name The role name
  /// @param _purpose The role purpose
  /// @param _domains The role domains
  /// @param _accountabilities The role accountabilities
  /// @return _roleId The created role ID
  function createRoleInCircle(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external returns (uint256 _roleId);

  /// @notice Updates a role within a circle
  /// @dev Only callable by a circle lead
  /// @param _circleId The circle containing the role
  /// @param _roleId The role to update
  /// @param _name The new name
  /// @param _purpose The new purpose
  /// @param _domains The new domains
  /// @param _accountabilities The new accountabilities
  function updateRoleInCircle(
    uint256 _circleId,
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external;

  /// @notice Removes a role from a circle
  /// @dev Only callable by a circle lead
  /// @param _circleId The circle containing the role
  /// @param _roleId The role to remove
  function removeRoleFromCircle(uint256 _circleId, uint256 _roleId) external;

  /// @notice Assigns a role lead to a role within a circle
  /// @dev Only callable by a circle lead of the circle
  /// @param _circleId The circle containing the role
  /// @param _roleId The role to assign a lead to
  /// @param _lead The address to assign
  function assignRoleLeadInCircle(uint256 _circleId, uint256 _roleId, address _lead) external;

  /// @notice Unassigns a role lead from a role within a circle
  /// @dev Only callable by a circle lead of the circle
  /// @param _circleId The circle containing the role
  /// @param _roleId The role to unassign a lead from
  /// @param _lead The address to unassign
  function unassignRoleLeadInCircle(uint256 _circleId, uint256 _roleId, address _lead) external;

  /// @notice Sets an elected role (Facilitator, Secretary, or Circle Rep) for a circle
  /// @dev Only callable by the governance process
  /// @param _circleId The circle ID
  /// @param _electedRole The role type to set
  /// @param _account The elected account
  function setElectedRole(uint256 _circleId, HolacracyTypes.ElectedRole _electedRole, address _account) external;

  /// @notice Adds a circle lead to a circle
  /// @dev Only callable by the deployer for anchor circle, or by parent circle lead for sub-circles
  /// @param _circleId The circle ID
  /// @param _lead The address to add as circle lead
  function addCircleLead(uint256 _circleId, address _lead) external;

  /// @notice Removes a circle lead from a circle
  /// @param _circleId The circle ID
  /// @param _lead The address to remove
  function removeCircleLead(uint256 _circleId, address _lead) external;

  /// @notice Adds a policy to a circle
  /// @dev Only callable by a circle lead
  /// @param _circleId The circle ID
  /// @param _name The policy name
  /// @param _body The policy body
  /// @return _policyId The created policy ID
  function addPolicy(
    uint256 _circleId,
    string calldata _name,
    string calldata _body
  ) external returns (uint256 _policyId);

  /// @notice Removes a policy from a circle
  /// @dev Only callable by a circle lead
  /// @param _circleId The circle ID
  /// @param _policyId The policy ID to remove
  function removePolicy(uint256 _circleId, uint256 _policyId) external;
}
