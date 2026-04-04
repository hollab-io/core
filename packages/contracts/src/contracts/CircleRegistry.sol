// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {ICircleRegistry} from 'interfaces/ICircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';

/**
 * @title CircleRegistry
 * @notice Manages the creation and hierarchy of Circles
 * @dev Circles organize Roles and Policies. The Anchor Circle is the root.
 */
contract CircleRegistry is ICircleRegistry {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice Reference to the role registry
  RoleRegistry public roleRegistry;

  /// @notice The deployer / org creator
  address public deployer;

  /// @notice Pending deployer during a two-step transfer (address(0) if none)
  address public pendingDeployer;

  /// @notice The governance process contract (set after deployment)
  address public governanceProcess;

  /// @notice The governance meeting contract (set after deployment)
  address public governanceMeeting;

  /// @notice Auto-incrementing circle ID counter
  uint256 internal _circleCounter;

  /// @notice Auto-incrementing policy ID counter
  uint256 internal _policyCounter;

  /// @notice The anchor circle ID
  uint256 internal _anchorCircleId;

  /// @notice Circle ID => Circle data
  mapping(uint256 => HolacracyTypes.Circle) internal _circles;

  /// @notice Circle ID => child circle IDs
  mapping(uint256 => uint256[]) internal _subCircles;

  /// @notice Circle ID => ElectedRole => address
  mapping(uint256 => mapping(HolacracyTypes.ElectedRole => address)) internal _electedRoles;

  /// @notice Circle ID => array of circle lead addresses
  mapping(uint256 => address[]) internal _circleLeads;

  /// @notice Circle ID => address => is circle lead
  mapping(uint256 => mapping(address => bool)) internal _isCircleLead;

  /// @notice Policy ID => Policy data
  mapping(uint256 => HolacracyTypes.Policy) internal _policies;

  /// @notice Circle ID => policy IDs
  mapping(uint256 => uint256[]) internal _circlePolicies;

  /// @notice Role ID => Circle ID (for roles broken down into sub-circles)
  mapping(uint256 => uint256) internal _roleToCircle;

  /// @notice Whether the contract has been initialized
  bool internal _initialized;

  /// @notice Circle ID => field name hash => ContentRef
  mapping(uint256 => mapping(bytes32 => HolacracyTypes.ContentRef)) internal _circleContentRefs;

  /// @notice Policy ID => field name hash => ContentRef
  mapping(uint256 => mapping(bytes32 => HolacracyTypes.ContentRef)) internal _policyContentRefs;

  /*///////////////////////////////////////////////////////////////
                            MODIFIERS
  //////////////////////////////////////////////////////////////*/

  /// @notice Restricts to circle leads of the given circle or the governance process
  modifier onlyCircleLeadOrGovernance(uint256 _circleId) {
    if (msg.sender != governanceProcess && !_isCircleLead[_circleId][msg.sender]) {
      revert CircleRegistry_NotCircleLead(_circleId);
    }
    _;
  }

  /// @notice Ensures the circle exists
  modifier circleExists(uint256 _circleId) {
    if (!_circles[_circleId].exists) {
      revert CircleRegistry_CircleNotFound(_circleId);
    }
    _;
  }

  /// @notice Prevents re-initialization
  modifier initializer() {
    if (_initialized) revert CircleRegistry_AlreadyInitialized();
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

  /// @notice Initializes a clone of CircleRegistry
  /// @param _roleRegistry The RoleRegistry contract
  /// @param _deployer The deployer / org creator
  /// @param _governanceProcess The governance process address (can be address(0) to set later)
  function initialize(RoleRegistry _roleRegistry, address _deployer, address _governanceProcess) external initializer {
    roleRegistry = _roleRegistry;
    deployer = _deployer;
    governanceProcess = _governanceProcess;
    _roleRegistry.setCircleRegistry(address(this));
  }

  /*///////////////////////////////////////////////////////////////
                            ADMIN
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc ICircleRegistry
  function proposeDeployerTransfer(address _newDeployer) external {
    if (msg.sender != deployer) revert CircleRegistry_Unauthorized();
    if (_newDeployer == address(0)) revert CircleRegistry_InvalidAddress();
    pendingDeployer = _newDeployer;
    emit DeployerTransferProposed(_newDeployer);
  }

  /// @inheritdoc ICircleRegistry
  function acceptDeployerTransfer() external {
    if (msg.sender != pendingDeployer) revert CircleRegistry_NotPendingDeployer();
    address _oldDeployer = deployer;
    deployer = pendingDeployer;
    pendingDeployer = address(0);
    emit DeployerTransferred(_oldDeployer, deployer);
  }

  /// @notice Sets the governance process contract (can only be set once)
  /// @param _governanceProcess The governance process address
  function setGovernanceProcess(address _governanceProcess) external {
    if (governanceProcess != address(0)) revert CircleRegistry_Unauthorized();
    if (msg.sender != deployer) revert CircleRegistry_Unauthorized();
    governanceProcess = _governanceProcess;
  }

  /// @notice Sets the governance meeting contract (can only be set once)
  /// @param _governanceMeeting The governance meeting address
  function setGovernanceMeeting(address _governanceMeeting) external {
    if (governanceMeeting != address(0)) revert CircleRegistry_Unauthorized();
    if (msg.sender != deployer) revert CircleRegistry_Unauthorized();
    governanceMeeting = _governanceMeeting;
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc ICircleRegistry
  function anchorCircleId() external view returns (uint256 _circleId) {
    _circleId = _anchorCircleId;
  }

  /// @inheritdoc ICircleRegistry
  function getCircle(uint256 _circleId) external view circleExists(_circleId) returns (HolacracyTypes.Circle memory _circle) {
    _circle = _circles[_circleId];
  }

  /// @inheritdoc ICircleRegistry
  function getSubCircles(uint256 _circleId) external view circleExists(_circleId) returns (uint256[] memory _childIds) {
    _childIds = _subCircles[_circleId];
  }

  /// @inheritdoc ICircleRegistry
  function getElectedRole(
    uint256 _circleId,
    HolacracyTypes.ElectedRole _electedRole
  ) external view returns (address _account) {
    _account = _electedRoles[_circleId][_electedRole];
  }

  /// @inheritdoc ICircleRegistry
  function getCircleLeads(uint256 _circleId) external view returns (address[] memory _leads) {
    _leads = _circleLeads[_circleId];
  }

  /// @inheritdoc ICircleRegistry
  function isCircleLead(uint256 _circleId, address _account) external view returns (bool _isLead) {
    _isLead = _isCircleLead[_circleId][_account];
  }

  /// @inheritdoc ICircleRegistry
  function isCircleMember(uint256 _circleId, address _account) external view returns (bool _isMember) {
    _isMember = _computeIsCircleMember(_circleId, _account);
  }

  /// @inheritdoc ICircleRegistry
  function getPolicy(uint256 _policyId) external view returns (HolacracyTypes.Policy memory _policy) {
    _policy = _policies[_policyId];
    if (!_policy.exists) revert CircleRegistry_PolicyNotFound(_policyId);
  }

  /// @inheritdoc ICircleRegistry
  function getCirclePolicies(uint256 _circleId) external view returns (uint256[] memory _policyIds) {
    _policyIds = _circlePolicies[_circleId];
  }

  /// @inheritdoc ICircleRegistry
  function roleToCircle(uint256 _roleId) external view returns (uint256 _circleId) {
    _circleId = _roleToCircle[_roleId];
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc ICircleRegistry
  function createAnchorCircle(
    string calldata _name,
    string calldata _purpose
  ) external returns (uint256 _circleId) {
    if (_anchorCircleId != 0) revert CircleRegistry_AnchorAlreadyExists();

    _circleId = ++_circleCounter;
    _anchorCircleId = _circleId;

    HolacracyTypes.Circle storage _circle = _circles[_circleId];
    _circle.id = _circleId;
    _circle.name = _name;
    _circle.purpose = _purpose;
    _circle.isAnchor = true;
    _circle.exists = true;

    // Deployer becomes the first circle lead of the anchor circle
    _isCircleLead[_circleId][deployer] = true;
    _circleLeads[_circleId].push(deployer);

    emit AnchorCircleCreated(_circleId, _name);
    emit CircleLeadAdded(_circleId, deployer);
  }

  /// @inheritdoc ICircleRegistry
  function createSubCircle(uint256 _roleId) external returns (uint256 _circleId) {
    HolacracyTypes.Role memory _role = roleRegistry.getRole(_roleId);
    uint256 _parentCircleId = _role.circleId;

    if (!_isCircleLead[_parentCircleId][msg.sender]) {
      revert CircleRegistry_NotCircleLead(_parentCircleId);
    }
    if (_roleToCircle[_roleId] != 0) {
      revert CircleRegistry_RoleAlreadyCircle(_roleId);
    }

    _circleId = ++_circleCounter;

    HolacracyTypes.Circle storage _circle = _circles[_circleId];
    _circle.id = _circleId;
    _circle.parentCircleId = _parentCircleId;
    _circle.roleId = _roleId;
    _circle.name = _role.name;
    _circle.purpose = _role.purpose;
    _circle.exists = true;

    _subCircles[_parentCircleId].push(_circleId);
    _roleToCircle[_roleId] = _circleId;

    // Role leads of the containing role become circle leads of the sub-circle
    address[] memory _roleLds = roleRegistry.getRoleLeads(_roleId);
    for (uint256 _i; _i < _roleLds.length; ++_i) {
      _isCircleLead[_circleId][_roleLds[_i]] = true;
      _circleLeads[_circleId].push(_roleLds[_i]);
      emit CircleLeadAdded(_circleId, _roleLds[_i]);
    }

    emit SubCircleCreated(_circleId, _parentCircleId, _roleId);
  }

  /// @inheritdoc ICircleRegistry
  function createRoleInCircle(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) returns (uint256 _roleId) {
    _roleId = roleRegistry.createRole(_circleId, _name, _purpose, _domains, _accountabilities);
    emit CircleRoleCreated(_circleId, _roleId);
  }

  /// @inheritdoc ICircleRegistry
  function updateRoleInCircle(
    uint256 _circleId,
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    _assertRoleInCircle(_roleId, _circleId);
    roleRegistry.updateRole(_roleId, _name, _purpose, _domains, _accountabilities);
  }

  /// @inheritdoc ICircleRegistry
  function removeRoleFromCircle(
    uint256 _circleId,
    uint256 _roleId
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    _assertRoleInCircle(_roleId, _circleId);
    roleRegistry.removeRole(_roleId);
  }

  /// @inheritdoc ICircleRegistry
  function assignRoleLeadInCircle(
    uint256 _circleId,
    uint256 _roleId,
    address _lead
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    _assertRoleInCircle(_roleId, _circleId);
    roleRegistry.assignRoleLead(_roleId, _lead);
    emit RoleLeadAssignedViaCircle(_circleId, _roleId, _lead);
  }

  /// @inheritdoc ICircleRegistry
  function unassignRoleLeadInCircle(
    uint256 _circleId,
    uint256 _roleId,
    address _lead
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    _assertRoleInCircle(_roleId, _circleId);
    roleRegistry.unassignRoleLead(_roleId, _lead);
  }

  /// @inheritdoc ICircleRegistry
  function setElectedRole(
    uint256 _circleId,
    HolacracyTypes.ElectedRole _electedRole,
    address _account
  ) external circleExists(_circleId) {
    if (
      msg.sender != governanceProcess && msg.sender != governanceMeeting
        && !_isCircleLead[_circleId][msg.sender]
    ) {
      revert CircleRegistry_Unauthorized();
    }

    _electedRoles[_circleId][_electedRole] = _account;
    emit ElectedRoleSet(_circleId, _electedRole, _account);
  }

  /// @inheritdoc ICircleRegistry
  function addCircleLead(uint256 _circleId, address _lead) external circleExists(_circleId) {
    HolacracyTypes.Circle storage _circle = _circles[_circleId];

    if (_circle.isAnchor) {
      // Only deployer can add leads to anchor circle
      if (msg.sender != deployer) revert CircleRegistry_Unauthorized();
    } else {
      // For sub-circles, parent circle lead must add
      if (!_isCircleLead[_circle.parentCircleId][msg.sender]) {
        revert CircleRegistry_Unauthorized();
      }
    }

    if (_isCircleLead[_circleId][_lead]) {
      revert CircleRegistry_AlreadyCircleLead(_circleId, _lead);
    }

    _isCircleLead[_circleId][_lead] = true;
    _circleLeads[_circleId].push(_lead);

    emit CircleLeadAdded(_circleId, _lead);
  }

  /// @inheritdoc ICircleRegistry
  function removeCircleLead(uint256 _circleId, address _lead) external circleExists(_circleId) {
    HolacracyTypes.Circle storage _circle = _circles[_circleId];

    if (_circle.isAnchor) {
      if (msg.sender != deployer) revert CircleRegistry_Unauthorized();
    } else {
      if (!_isCircleLead[_circle.parentCircleId][msg.sender]) {
        revert CircleRegistry_Unauthorized();
      }
    }

    if (!_isCircleLead[_circleId][_lead]) {
      revert CircleRegistry_NotACircleLead(_circleId, _lead);
    }

    _isCircleLead[_circleId][_lead] = false;

    address[] storage _leads = _circleLeads[_circleId];
    for (uint256 _i; _i < _leads.length; ++_i) {
      if (_leads[_i] == _lead) {
        _leads[_i] = _leads[_leads.length - 1];
        _leads.pop();
        break;
      }
    }

    emit CircleLeadRemoved(_circleId, _lead);
  }

  /// @inheritdoc ICircleRegistry
  function addPolicy(
    uint256 _circleId,
    string calldata _name,
    string calldata _body
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) returns (uint256 _policyId) {
    _policyId = ++_policyCounter;

    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    _policy.id = _policyId;
    _policy.circleId = _circleId;
    _policy.name = _name;
    _policy.body = _body;
    _policy.exists = true;

    _circlePolicies[_circleId].push(_policyId);

    emit PolicyAdded(_circleId, _policyId, _name);
  }

  /// @inheritdoc ICircleRegistry
  function updateCircle(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    HolacracyTypes.Circle storage _circle = _circles[_circleId];
    _circle.name = _name;
    _circle.purpose = _purpose;
    emit CircleUpdated(_circleId, _name, _purpose);
  }

  /// @inheritdoc ICircleRegistry
  function removePolicy(
    uint256 _circleId,
    uint256 _policyId
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    if (!_policy.exists) revert CircleRegistry_PolicyNotFound(_policyId);
    if (_policy.circleId != _circleId) revert CircleRegistry_PolicyNotFound(_policyId);

    _policy.exists = false;

    uint256[] storage _pIds = _circlePolicies[_circleId];
    for (uint256 _i; _i < _pIds.length; ++_i) {
      if (_pIds[_i] == _policyId) {
        _pIds[_i] = _pIds[_pIds.length - 1];
        _pIds.pop();
        break;
      }
    }

    emit PolicyRemoved(_circleId, _policyId);
  }

  /// @inheritdoc ICircleRegistry
  function createRoleInCircleWithRefs(
    uint256 _circleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) returns (uint256 _roleId) {
    _roleId = roleRegistry.createRoleWithRefs(_circleId, _name, _purpose, _domains, _accountabilities, _fieldNames, _refs);
    emit CircleRoleCreated(_circleId, _roleId);
  }

  /// @inheritdoc ICircleRegistry
  function updateRoleInCircleWithRefs(
    uint256 _circleId,
    uint256 _roleId,
    string calldata _name,
    string calldata _purpose,
    string[] calldata _domains,
    string[] calldata _accountabilities,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) {
    _assertRoleInCircle(_roleId, _circleId);
    roleRegistry.updateRoleWithRefs(_roleId, _name, _purpose, _domains, _accountabilities, _fieldNames, _refs);
  }

  /// @inheritdoc ICircleRegistry
  function addPolicyWithRefs(
    uint256 _circleId,
    string calldata _name,
    string calldata _body,
    bytes32[] calldata _fieldNames,
    HolacracyTypes.ContentRef[] calldata _refs
  ) external circleExists(_circleId) onlyCircleLeadOrGovernance(_circleId) returns (uint256 _policyId) {
    if (_fieldNames.length != _refs.length) revert CircleRegistry_ArrayLengthMismatch();

    _policyId = ++_policyCounter;

    HolacracyTypes.Policy storage _policy = _policies[_policyId];
    _policy.id = _policyId;
    _policy.circleId = _circleId;
    _policy.name = _name;
    _policy.body = _body;
    _policy.exists = true;

    _circlePolicies[_circleId].push(_policyId);

    for (uint256 _i; _i < _fieldNames.length; ++_i) {
      _policyContentRefs[_policyId][_fieldNames[_i]] = _refs[_i];
      emit ContentRefSet(keccak256('policy'), _policyId, _fieldNames[_i], _refs[_i].contentHash, _refs[_i].visibility);
    }

    emit PolicyAdded(_circleId, _policyId, _name);
  }

  /// @inheritdoc ICircleRegistry
  function getCircleContentRef(
    uint256 _circleId,
    bytes32 _fieldName
  ) external view returns (HolacracyTypes.ContentRef memory _ref) {
    _ref = _circleContentRefs[_circleId][_fieldName];
  }

  /// @inheritdoc ICircleRegistry
  function getPolicyContentRef(
    uint256 _policyId,
    bytes32 _fieldName
  ) external view returns (HolacracyTypes.ContentRef memory _ref) {
    _ref = _policyContentRefs[_policyId][_fieldName];
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Checks if an account is a circle member
  /// @dev Circle Members = Circle Leads + Role Leads of roles in the circle
  function _computeIsCircleMember(uint256 _circleId, address _account) internal view returns (bool) {
    // Circle leads are always members
    if (_isCircleLead[_circleId][_account]) return true;

    // Check if the account is a role lead of any role in the circle
    uint256[] memory _roleIds = roleRegistry.getCircleRoleIds(_circleId);
    for (uint256 _i; _i < _roleIds.length; ++_i) {
      if (roleRegistry.isRoleLead(_roleIds[_i], _account)) return true;
    }

    return false;
  }

  /// @notice Asserts that a role belongs to a given circle
  function _assertRoleInCircle(uint256 _roleId, uint256 _circleId) internal view {
    HolacracyTypes.Role memory _role = roleRegistry.getRole(_roleId);
    if (_role.circleId != _circleId) {
      revert CircleRegistry_RoleNotInCircle(_roleId, _circleId);
    }
  }
}
