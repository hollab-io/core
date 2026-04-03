// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';

/**
 * @title RoleRegistry
 * @notice Manages the creation, modification, and assignment of Roles
 * @dev Roles are the fundamental unit of organizational structure in Holacracy.
 *      A Role must have a name and at least one of: purpose, domain, or accountability.
 */
contract RoleRegistry is IRoleRegistry {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Auto-incrementing role ID counter
  uint256 internal _roleCounter;

  /// @notice Role ID => Role data
  mapping(uint256 => HolacracyTypes.Role) internal _roles;

  /// @notice Role ID => array of role lead addresses
  mapping(uint256 => address[]) internal _roleLeads;

  /// @notice Role ID => address => whether they are a role lead
  mapping(uint256 => mapping(address => bool)) internal _isRoleLead;

  /// @notice Circle ID => array of role IDs within the circle
  mapping(uint256 => uint256[]) internal _circleRoles;

  /// @notice Address authorized to manage roles (set to CircleRegistry)
  address public circleRegistry;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Restricts calls to the circle registry
  modifier onlyCircleRegistry() {
    if (msg.sender != circleRegistry) {
      revert RoleRegistry_Unauthorized();
    }
    _;
  }

  /// @notice Prevents re-initialization
  modifier initializer() {
    if (_initialized) revert RoleRegistry_AlreadyInitialized();
    _initialized = true;
    _;
  }

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @notice Disables initialization on the implementation contract
  constructor() {
    _initialized = true;
  }

  /// @notice Initializes a clone of RoleRegistry
  function initialize() external initializer {}

  /*///////////////////////////////////////////////////////////////
                            ADMIN
  //////////////////////////////////////////////////////////////*/

  /// @notice Sets the circle registry address (can only be set once)
  /// @param _circleRegistry The address of the circle registry
  function setCircleRegistry(address _circleRegistry) external {
    if (circleRegistry != address(0)) revert RoleRegistry_Unauthorized();
    circleRegistry = _circleRegistry;
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleRegistry
  function roleCount() external view returns (uint256 _count) {
    _count = _roleCounter;
  }

  /// @inheritdoc IRoleRegistry
  function getRole(uint256 _roleId) external view returns (HolacracyTypes.Role memory _role) {
    _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);
  }

  /// @inheritdoc IRoleRegistry
  function getRoleDomains(uint256 _roleId) external view returns (string[] memory _domains) {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _domains = _roles[_roleId].domains;
  }

  /// @inheritdoc IRoleRegistry
  function getRoleAccountabilities(uint256 _roleId) external view returns (string[] memory _accountabilities) {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _accountabilities = _roles[_roleId].accountabilities;
  }

  /// @inheritdoc IRoleRegistry
  function getRoleLeads(uint256 _roleId) external view returns (address[] memory _leads) {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _leads = _roleLeads[_roleId];
  }

  /// @inheritdoc IRoleRegistry
  function isRoleLead(uint256 _roleId, address _account) external view returns (bool _isLead) {
    _isLead = _isRoleLead[_roleId][_account];
  }

  /// @notice Returns all role IDs within a circle
  /// @param _circleId The circle ID
  /// @return _roleIds The role IDs
  function getCircleRoleIds(uint256 _circleId) external view returns (uint256[] memory _roleIds) {
    _roleIds = _circleRoles[_circleId];
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleRegistry
  function createRole(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external onlyCircleRegistry returns (uint256 _roleId) {
    _validateRole(_name, _purpose, _domains, _accountabilities);

    _roleId = ++_roleCounter;

    HolacracyTypes.Role storage _role = _roles[_roleId];
    _role.id = _roleId;
    _role.circleId = _circleId;
    _role.name = _name;
    _role.purpose = _purpose;
    _role.exists = true;

    for (uint256 _i; _i < _domains.length; ++_i) {
      _role.domains.push(_domains[_i]);
    }
    for (uint256 _i; _i < _accountabilities.length; ++_i) {
      _role.accountabilities.push(_accountabilities[_i]);
    }

    _circleRoles[_circleId].push(_roleId);

    emit RoleCreated(_roleId, _circleId, _name);
  }

  /// @inheritdoc IRoleRegistry
  function updateRole(
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external onlyCircleRegistry {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _validateRole(_name, _purpose, _domains, _accountabilities);

    HolacracyTypes.Role storage _role = _roles[_roleId];
    _role.name = _name;
    _role.purpose = _purpose;

    // Replace domains
    delete _role.domains;
    for (uint256 _i; _i < _domains.length; ++_i) {
      _role.domains.push(_domains[_i]);
    }

    // Replace accountabilities
    delete _role.accountabilities;
    for (uint256 _i; _i < _accountabilities.length; ++_i) {
      _role.accountabilities.push(_accountabilities[_i]);
    }

    emit RoleUpdated(_roleId);
  }

  /// @inheritdoc IRoleRegistry
  function removeRole(uint256 _roleId) external onlyCircleRegistry {
    HolacracyTypes.Role storage _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);

    uint256 _circleId = _role.circleId;

    // Remove all role leads
    address[] storage _leads = _roleLeads[_roleId];
    for (uint256 _i = _leads.length; _i > 0; --_i) {
      address _lead = _leads[_i - 1];
      _isRoleLead[_roleId][_lead] = false;
      _leads.pop();
    }

    // Remove from circle roles array
    uint256[] storage _cRoles = _circleRoles[_circleId];
    for (uint256 _i; _i < _cRoles.length; ++_i) {
      if (_cRoles[_i] == _roleId) {
        _cRoles[_i] = _cRoles[_cRoles.length - 1];
        _cRoles.pop();
        break;
      }
    }

    _role.exists = false;

    emit RoleRemoved(_roleId, _circleId);
  }

  /// @inheritdoc IRoleRegistry
  function assignRoleLead(uint256 _roleId, address _lead) external onlyCircleRegistry {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    if (_isRoleLead[_roleId][_lead]) revert RoleRegistry_AlreadyRoleLead(_roleId, _lead);

    _isRoleLead[_roleId][_lead] = true;
    _roleLeads[_roleId].push(_lead);

    emit RoleLeadAssigned(_roleId, _lead);
  }

  /// @inheritdoc IRoleRegistry
  function unassignRoleLead(uint256 _roleId, address _lead) external onlyCircleRegistry {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    if (!_isRoleLead[_roleId][_lead]) revert RoleRegistry_NotRoleLead(_roleId, _lead);

    _isRoleLead[_roleId][_lead] = false;

    address[] storage _leads = _roleLeads[_roleId];
    for (uint256 _i; _i < _leads.length; ++_i) {
      if (_leads[_i] == _lead) {
        _leads[_i] = _leads[_leads.length - 1];
        _leads.pop();
        break;
      }
    }

    emit RoleLeadUnassigned(_roleId, _lead);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Validates that a role has a name and at least one of purpose, domain, or accountability
  function _validateRole(
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) internal pure {
    if (bytes(_name).length == 0) revert RoleRegistry_EmptyName();
    if (bytes(_purpose).length == 0 && _domains.length == 0 && _accountabilities.length == 0) {
      revert RoleRegistry_InvalidRole();
    }
  }
}
