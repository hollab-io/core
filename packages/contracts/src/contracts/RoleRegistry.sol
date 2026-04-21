// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title RoleRegistry
 * @notice Manages the creation, modification, and assignment of Roles
 * @dev Roles are the fundamental unit of organizational structure in Holacracy.
 *      A Role must have a name and at least one of: purpose, domain, or accountability.
 *
 *      Structural changes are restricted to the governance process (MeetingFactory),
 *      enforcing Holacracy's rule that structure can only change through governance.
 */
contract RoleRegistry is Initializable, IRoleRegistry {
  using EnumerableSet for EnumerableSet.AddressSet;
  using EnumerableSet for EnumerableSet.UintSet;
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Entity type hash for role content refs
  bytes32 internal constant _ROLE_ENTITY_TYPE = keccak256('role');

  /// @notice Entity type hash for policy content refs
  bytes32 internal constant _POLICY_ENTITY_TYPE = keccak256('policy');

  /// @notice Auto-incrementing role ID counter
  uint256 internal _roleCounter;

  /// @notice Role ID => Role data
  mapping(uint256 => HolacracyTypes.Role) internal _roles;

  /// @notice Role ID => set of role lead addresses
  mapping(uint256 => EnumerableSet.AddressSet) internal _roleLeads;

  /// @notice Circle ID => set of role IDs within the circle
  mapping(uint256 => EnumerableSet.UintSet) internal _circleRoles;

  /// @notice Address authorized to manage roles (the governance process / MeetingFactory)
  address public governanceProcess;

  /// @notice OrganizationFactory that deployed this clone (only address that can set governance process)
  address public factory;

  /// @notice Role ID => field name hash => ContentRef
  mapping(uint256 => mapping(bytes32 => HolacracyTypes.ContentRef)) internal _roleContentRefs;

  /// @notice Circle ID => Circle data (explicit circle storage with parentCircleId)
  mapping(uint256 => HolacracyTypes.Circle) internal _circles;

  /// @notice Auto-incrementing circle ID counter
  uint256 internal _circleCounter;

  /// @notice ID of the Anchor Circle for this organization (0 until initAnchorCircle is called)
  uint256 public anchorCircleId;

  /// @notice Whether the anchor circle has been initialized (one-shot)
  bool internal _anchorInitialized;

  /// @notice Auto-incrementing policy ID counter
  uint256 internal _policyCounter;

  /// @notice Policy ID => Policy data
  mapping(uint256 => HolacracyTypes.Policy) internal _policies;

  /// @notice Circle ID => set of policy IDs within the circle
  mapping(uint256 => EnumerableSet.UintSet) internal _circlePolicies;

  /// @notice Policy ID => field name hash => ContentRef
  mapping(uint256 => mapping(bytes32 => HolacracyTypes.ContentRef)) internal _policyContentRefs;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Restricts calls to the governance process (MeetingFactory)
  modifier onlyGovernanceProcess() {
    if (msg.sender != governanceProcess) {
      revert RoleRegistry_Unauthorized();
    }
    _;
  }

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @notice Disables initialization on the implementation contract
  constructor() {
    _disableInitializers();
  }

  /// @notice Initializes a clone of RoleRegistry
  /// @param _factory The OrganizationFactory (only address that can set governance process)
  function initialize(
    address _factory
  ) external initializer {
    factory = _factory;
  }

  /*///////////////////////////////////////////////////////////////
                            ADMIN
  //////////////////////////////////////////////////////////////*/

  /// @notice Sets the governance process address (can only be set once, factory only)
  /// @param _governanceProcess The address of the governance process (MeetingFactory)
  function setGovernanceProcess(
    address _governanceProcess
  ) external {
    if (msg.sender != factory) revert RoleRegistry_Unauthorized();
    if (governanceProcess != address(0)) revert RoleRegistry_Unauthorized();
    governanceProcess = _governanceProcess;
    emit GovernanceProcessSet(_governanceProcess);
  }

  /// @inheritdoc IRoleRegistry
  function transferFactory(
    address _newFactory
  ) external {
    if (msg.sender != factory) revert RoleRegistry_Unauthorized();
    factory = _newFactory;
  }

  /// @inheritdoc IRoleRegistry
  function initAnchorCircle(
    address _creator,
    string calldata _name,
    string calldata _purpose
  ) external returns (uint256 _circleId, uint256 _roleId) {
    if (msg.sender != factory) revert RoleRegistry_Unauthorized();
    if (_anchorInitialized) revert RoleRegistry_AnchorAlreadyInitialized();
    _anchorInitialized = true;

    // Create Anchor Circle first — parentCircleId is 0 (none), roleId will be set to the anchor role id below.
    _circleId = ++_circleCounter;
    HolacracyTypes.Circle storage _circle = _circles[_circleId];
    _circle.id = _circleId;
    _circle.parentCircleId = 0;
    _circle.name = _name;
    _circle.purpose = _purpose;
    _circle.isAnchor = true;
    _circle.exists = true;

    anchorCircleId = _circleId;

    // Create Anchor Role inside the anchor circle. Uses the unchecked internal path
    // because the circle was just created in this tx and _validateRole's invariants
    // are enforced below.
    _roleId = ++_roleCounter;
    HolacracyTypes.Role storage _role = _roles[_roleId];
    _role.id = _roleId;
    _role.circleId = _circleId;
    _role.name = _name;
    _role.purpose = _purpose;
    _role.exists = true;
    _role.isCircle = true;

    _circleRoles[_circleId].add(_roleId);
    _circle.roleId = _roleId;

    // Seed the creator as the Anchor Role lead so they can propose from day one.
    _roleLeads[_roleId].add(_creator);

    emit CircleCreated(_circleId, 0, _roleId);
    emit AnchorCircleInitialized(_circleId, _roleId, _creator);
    emit RoleCreated(_roleId, _circleId, _name);
    emit RoleExpandedToCircle(_roleId);
    emit RoleLeadAssigned(_roleId, _creator);
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleRegistry
  function roleCount() external view returns (uint256 _count) {
    _count = _roleCounter;
  }

  /// @inheritdoc IRoleRegistry
  function getRole(
    uint256 _roleId
  ) external view returns (HolacracyTypes.Role memory _role) {
    _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);
  }

  /// @inheritdoc IRoleRegistry
  function getRoleDomains(
    uint256 _roleId
  ) external view returns (string[] memory _domains) {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _domains = _roles[_roleId].domains;
  }

  /// @inheritdoc IRoleRegistry
  function getRoleAccountabilities(
    uint256 _roleId
  ) external view returns (string[] memory _accountabilities) {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _accountabilities = _roles[_roleId].accountabilities;
  }

  /// @inheritdoc IRoleRegistry
  function getRoleLeads(
    uint256 _roleId
  ) external view returns (address[] memory _leads) {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _leads = _roleLeads[_roleId].values();
  }

  /// @inheritdoc IRoleRegistry
  function isRoleLead(
    uint256 _roleId,
    address _account
  ) external view returns (bool _isLead) {
    _isLead = _roleLeads[_roleId].contains(_account);
  }

  /// @notice Returns all role IDs within a circle
  /// @param _circleId The circle ID
  /// @return _roleIds The role IDs
  function getCircleRoleIds(
    uint256 _circleId
  ) external view returns (uint256[] memory _roleIds) {
    _roleIds = _circleRoles[_circleId].values();
  }

  /// @inheritdoc IRoleRegistry
  function getCircle(
    uint256 _circleId
  ) external view returns (HolacracyTypes.Circle memory _circle) {
    _circle = _circles[_circleId];
    if (!_circle.exists) revert RoleRegistry_CircleNotFound(_circleId);
  }

  /// @inheritdoc IRoleRegistry
  function getRoleCircleId(
    uint256 _roleId
  ) external view returns (uint256 _circleId) {
    HolacracyTypes.Role storage _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);
    _circleId = _role.circleId;
  }

  /// @inheritdoc IRoleRegistry
  function circleCount() external view returns (uint256 _count) {
    _count = _circleCounter;
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
  ) external onlyGovernanceProcess returns (uint256 _roleId) {
    _roleId = _createRole(_circleId, _name, _purpose, _domains, _accountabilities);
  }

  /// @inheritdoc IRoleRegistry
  function updateRole(
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external onlyGovernanceProcess {
    _updateRole(_roleId, _name, _purpose, _domains, _accountabilities);
  }

  /// @inheritdoc IRoleRegistry
  function removeRole(
    uint256 _roleId
  ) external onlyGovernanceProcess {
    HolacracyTypes.Role storage _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);

    uint256 _circleId = _role.circleId;

    // Remove all role leads
    address[] memory _leads = _roleLeads[_roleId].values();
    for (uint256 _i; _i < _leads.length; ++_i) {
      _roleLeads[_roleId].remove(_leads[_i]);
    }

    // Remove from circle roles set
    _circleRoles[_circleId].remove(_roleId);

    _role.exists = false;

    emit RoleRemoved(_roleId, _circleId);
  }

  /// @inheritdoc IRoleRegistry
  function assignRoleLead(
    uint256 _roleId,
    address _lead
  ) external onlyGovernanceProcess {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    if (_roleLeads[_roleId].contains(_lead)) revert RoleRegistry_AlreadyRoleLead(_roleId, _lead);

    _roleLeads[_roleId].add(_lead);

    emit RoleLeadAssigned(_roleId, _lead);
  }

  /// @inheritdoc IRoleRegistry
  function unassignRoleLead(
    uint256 _roleId,
    address _lead
  ) external onlyGovernanceProcess {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    if (!_roleLeads[_roleId].contains(_lead)) revert RoleRegistry_NotRoleLead(_roleId, _lead);

    _roleLeads[_roleId].remove(_lead);

    emit RoleLeadUnassigned(_roleId, _lead);
  }

  /// @inheritdoc IRoleRegistry
  function expandToCircle(
    uint256 _roleId
  ) external onlyGovernanceProcess returns (uint256 _circleId) {
    HolacracyTypes.Role storage _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);
    if (_role.isCircle) revert RoleRegistry_AlreadyCircle(_roleId);

    uint256 _parentCircleId = _role.circleId;
    // Parent must be an existing circle. (The anchor circle is created via initAnchorCircle.)
    if (!_circles[_parentCircleId].exists) revert RoleRegistry_CircleNotFound(_parentCircleId);

    _role.isCircle = true;

    _circleId = ++_circleCounter;
    HolacracyTypes.Circle storage _circle = _circles[_circleId];
    _circle.id = _circleId;
    _circle.parentCircleId = _parentCircleId;
    _circle.roleId = _roleId;
    _circle.name = _role.name;
    _circle.purpose = _role.purpose;
    _circle.isAnchor = false;
    _circle.exists = true;

    emit RoleExpandedToCircle(_roleId);
    emit CircleCreated(_circleId, _parentCircleId, _roleId);
  }

  /// @inheritdoc IRoleRegistry
  function createRoleWithRefs(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external onlyGovernanceProcess returns (uint256 _roleId) {
    if (_fieldNames.length != _refs.length) revert RoleRegistry_ArrayLengthMismatch();

    _roleId = _createRole(_circleId, _name, _purpose, _domains, _accountabilities);
    _setContentRefs(_ROLE_ENTITY_TYPE, _roleId, _fieldNames, _refs);
  }

  /// @inheritdoc IRoleRegistry
  function updateRoleWithRefs(
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external onlyGovernanceProcess {
    if (_fieldNames.length != _refs.length) revert RoleRegistry_ArrayLengthMismatch();

    _updateRole(_roleId, _name, _purpose, _domains, _accountabilities);
    _setContentRefs(_ROLE_ENTITY_TYPE, _roleId, _fieldNames, _refs);
  }

  /// @inheritdoc IRoleRegistry
  function getRoleContentRef(
    uint256 _roleId,
    bytes32 _fieldName
  ) external view returns (HolacracyTypes.ContentRef memory _ref) {
    _ref = _roleContentRefs[_roleId][_fieldName];
  }

  /*///////////////////////////////////////////////////////////////
                            POLICIES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleRegistry
  function createPolicy(
    uint256 _circleId,
    string calldata _name,
    string calldata _body
  ) external onlyGovernanceProcess returns (uint256 _policyId) {
    _policyId = _createPolicy(_circleId, _name, _body);
  }

  /// @inheritdoc IRoleRegistry
  function updatePolicy(
    uint256 _policyId,
    string calldata _name,
    string calldata _body
  ) external onlyGovernanceProcess {
    _updatePolicy(_policyId, _name, _body);
  }

  /// @inheritdoc IRoleRegistry
  function removePolicy(
    uint256 _policyId
  ) external onlyGovernanceProcess {
    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    if (!_policy.exists) revert RoleRegistry_PolicyNotFound(_policyId);

    uint256 _circleId = _policy.circleId;
    _circlePolicies[_circleId].remove(_policyId);

    _policy.exists = false;

    emit PolicyRemoved(_policyId, _circleId);
  }

  /// @inheritdoc IRoleRegistry
  function createPolicyWithRefs(
    uint256 _circleId,
    string calldata _name,
    string calldata _body,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external onlyGovernanceProcess returns (uint256 _policyId) {
    if (_fieldNames.length != _refs.length) revert RoleRegistry_ArrayLengthMismatch();
    _policyId = _createPolicy(_circleId, _name, _body);
    _setPolicyContentRefs(_policyId, _fieldNames, _refs);
  }

  /// @inheritdoc IRoleRegistry
  function updatePolicyWithRefs(
    uint256 _policyId,
    string calldata _name,
    string calldata _body,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external onlyGovernanceProcess {
    if (_fieldNames.length != _refs.length) revert RoleRegistry_ArrayLengthMismatch();
    _updatePolicy(_policyId, _name, _body);
    _setPolicyContentRefs(_policyId, _fieldNames, _refs);
  }

  /// @inheritdoc IRoleRegistry
  function getPolicy(
    uint256 _policyId
  ) external view returns (HolacracyTypes.Policy memory _policy) {
    _policy = _policies[_policyId];
    if (!_policy.exists) revert RoleRegistry_PolicyNotFound(_policyId);
  }

  /// @inheritdoc IRoleRegistry
  function getPolicyCircleId(
    uint256 _policyId
  ) external view returns (uint256 _circleId) {
    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    if (!_policy.exists) revert RoleRegistry_PolicyNotFound(_policyId);
    _circleId = _policy.circleId;
  }

  /// @inheritdoc IRoleRegistry
  function getCirclePolicyIds(
    uint256 _circleId
  ) external view returns (uint256[] memory _policyIds) {
    _policyIds = _circlePolicies[_circleId].values();
  }

  /// @inheritdoc IRoleRegistry
  function policyCount() external view returns (uint256 _count) {
    _count = _policyCounter;
  }

  /// @inheritdoc IRoleRegistry
  function getPolicyContentRef(
    uint256 _policyId,
    bytes32 _fieldName
  ) external view returns (HolacracyTypes.ContentRef memory _ref) {
    _ref = _policyContentRefs[_policyId][_fieldName];
  }

  /*///////////////////////////////////////////////////////////////
                            MOVE ROLE
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IRoleRegistry
  function moveRole(
    uint256 _roleId,
    uint256 _toCircleId
  ) external onlyGovernanceProcess {
    HolacracyTypes.Role storage _role = _roles[_roleId];
    if (!_role.exists) revert RoleRegistry_RoleNotFound(_roleId);
    if (_role.isCircle) revert RoleRegistry_CannotMoveCircleRole(_roleId);
    if (!_circles[_toCircleId].exists) revert RoleRegistry_CircleNotFound(_toCircleId);

    uint256 _fromCircleId = _role.circleId;
    if (_fromCircleId == _toCircleId) revert RoleRegistry_SameCircle(_roleId, _toCircleId);

    _circleRoles[_fromCircleId].remove(_roleId);
    _circleRoles[_toCircleId].add(_roleId);
    _role.circleId = _toCircleId;

    emit RoleMoved(_roleId, _fromCircleId, _toCircleId);
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Stores content refs and emits events
  function _setContentRefs(
    bytes32 _entityType,
    uint256 _entityId,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) internal {
    for (uint256 _i; _i < _fieldNames.length; ++_i) {
      _roleContentRefs[_entityId][_fieldNames[_i]] = _refs[_i];
      emit ContentRefSet(_entityType, _entityId, _fieldNames[_i], _refs[_i].contentHash, _refs[_i].visibility);
    }
  }

  /// @notice Internal implementation for creating a role
  function _createRole(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) internal returns (uint256 _roleId) {
    _validateRole(_name, _purpose, _domains, _accountabilities);

    // Reject role creation in a non-existent circle. Anchor circle is bootstrapped
    // via initAnchorCircle; every other circle is created via expandToCircle.
    if (!_circles[_circleId].exists) revert RoleRegistry_CircleNotFound(_circleId);

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

    _circleRoles[_circleId].add(_roleId);

    emit RoleCreated(_roleId, _circleId, _name);
  }

  /// @notice Internal implementation for updating a role
  function _updateRole(
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) internal {
    if (!_roles[_roleId].exists) revert RoleRegistry_RoleNotFound(_roleId);
    _validateRole(_name, _purpose, _domains, _accountabilities);

    HolacracyTypes.Role storage _role = _roles[_roleId];
    _role.name = _name;
    _role.purpose = _purpose;

    delete _role.domains;
    for (uint256 _i; _i < _domains.length; ++_i) {
      _role.domains.push(_domains[_i]);
    }

    delete _role.accountabilities;
    for (uint256 _i; _i < _accountabilities.length; ++_i) {
      _role.accountabilities.push(_accountabilities[_i]);
    }

    emit RoleUpdated(_roleId);
  }

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

  /// @notice Internal implementation for creating a policy
  function _createPolicy(
    uint256 _circleId,
    string calldata _name,
    string calldata _body
  ) internal returns (uint256 _policyId) {
    if (bytes(_name).length == 0) revert RoleRegistry_EmptyPolicyName();
    if (!_circles[_circleId].exists) revert RoleRegistry_CircleNotFound(_circleId);

    _policyId = ++_policyCounter;
    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    _policy.id = _policyId;
    _policy.circleId = _circleId;
    _policy.name = _name;
    _policy.body = _body;
    _policy.exists = true;

    _circlePolicies[_circleId].add(_policyId);

    emit PolicyCreated(_policyId, _circleId, _name);
  }

  /// @notice Internal implementation for updating a policy
  function _updatePolicy(
    uint256 _policyId,
    string calldata _name,
    string calldata _body
  ) internal {
    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    if (!_policy.exists) revert RoleRegistry_PolicyNotFound(_policyId);
    if (bytes(_name).length == 0) revert RoleRegistry_EmptyPolicyName();

    _policy.name = _name;
    _policy.body = _body;

    emit PolicyUpdated(_policyId);
  }

  /// @notice Stores policy content refs and emits events
  function _setPolicyContentRefs(
    uint256 _policyId,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) internal {
    for (uint256 _i; _i < _fieldNames.length; ++_i) {
      _policyContentRefs[_policyId][_fieldNames[_i]] = _refs[_i];
      emit ContentRefSet(_POLICY_ENTITY_TYPE, _policyId, _fieldNames[_i], _refs[_i].contentHash, _refs[_i].visibility);
    }
  }
}
