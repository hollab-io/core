// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {INameWrapper} from 'interfaces/IENS.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/**
 * @title OrganizationFactory
 * @notice Deploys Holacracy organizations as ERC-1167 minimal proxy clones
 *         and registers ENS subnames under hollab.eth via NameWrapper
 */
contract OrganizationFactory is IOrganizationFactory {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice The RoleRegistry implementation used for cloning
  address public immutable roleRegistryImplementation;

  /// @notice The CircleRegistry implementation used for cloning
  address public immutable circleRegistryImplementation;

  /// @notice The GovernanceProcess implementation used for cloning
  address public immutable governanceProcessImplementation;

  /// @notice The ENS NameWrapper contract
  INameWrapper public immutable ENS_NAMEWRAPPER;

  /// @notice The namehash of the parent ENS node (hollab.eth)
  bytes32 public immutable PARENT_NODE;

  /// @notice The ENS resolver address used for subnames
  address public immutable ENS_RESOLVER;

  /// @notice Auto-incrementing organization ID counter
  uint256 internal _orgCounter;

  /// @notice Org ID => Organization data
  mapping(uint256 => HolacracyTypes.Organization) internal _organizations;

  /// @notice subname hash => org ID (for uniqueness checks and lookups)
  mapping(bytes32 => uint256) internal _subnameToOrgId;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @notice Deploys implementation contracts and stores ENS references
  /// @param _nameWrapper The ENS NameWrapper contract address
  /// @param _parentNode The namehash of the parent node (hollab.eth)
  /// @param _resolver The ENS resolver address
  constructor(address _nameWrapper, bytes32 _parentNode, address _resolver) {
    // Deploy implementation contracts
    roleRegistryImplementation = address(new RoleRegistry());
    circleRegistryImplementation = address(new CircleRegistry());
    governanceProcessImplementation = address(new GovernanceProcess());

    ENS_NAMEWRAPPER = INameWrapper(_nameWrapper);
    PARENT_NODE = _parentNode;
    ENS_RESOLVER = _resolver;
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function createOrganization(
    string calldata _subname,
    string calldata _purpose
  ) external returns (uint256 _orgId) {
    // Validate subname
    _validateSubname(_subname);

    bytes32 _subnameHash = keccak256(bytes(_subname));
    if (_subnameToOrgId[_subnameHash] != 0) {
      revert OrganizationFactory_SubnameAlreadyTaken(_subname);
    }

    // Clone contracts
    RoleRegistry _roleRegistry = RoleRegistry(Clones.clone(roleRegistryImplementation));
    CircleRegistry _circleRegistry = CircleRegistry(Clones.clone(circleRegistryImplementation));
    GovernanceProcess _governanceProcess = GovernanceProcess(Clones.clone(governanceProcessImplementation));

    // Initialize all three — CircleRegistry.initialize sets itself as the authorized caller on RoleRegistry
    _roleRegistry.initialize();
    _governanceProcess.initialize(_circleRegistry, _roleRegistry);
    _circleRegistry.initialize(_roleRegistry, msg.sender, address(_governanceProcess));

    // Create anchor circle with caller as first circle lead
    uint256 _anchorCircleId = _circleRegistry.createAnchorCircle(_subname, _purpose);

    // Register ENS subname — org creator becomes the subname owner
    ENS_NAMEWRAPPER.setSubnodeRecord(PARENT_NODE, _subname, msg.sender, ENS_RESOLVER, 0, 0, type(uint64).max);

    // Store organization record
    _orgId = ++_orgCounter;
    HolacracyTypes.Organization storage _org = _organizations[_orgId];
    _org.id = _orgId;
    _org.name = _subname;
    _org.subname = _subname;
    _org.creator = msg.sender;
    _org.roleRegistry = address(_roleRegistry);
    _org.circleRegistry = address(_circleRegistry);
    _org.governanceProcess = address(_governanceProcess);
    _org.anchorCircleId = _anchorCircleId;
    _org.createdAt = block.timestamp;

    _subnameToOrgId[_subnameHash] = _orgId;

    emit OrganizationCreated(_orgId, _subname, msg.sender);
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function getOrganization(uint256 _orgId) external view returns (HolacracyTypes.Organization memory _org) {
    _org = _organizations[_orgId];
  }

  /// @inheritdoc IOrganizationFactory
  function getOrganizationBySubname(
    string calldata _subname
  ) external view returns (HolacracyTypes.Organization memory _org) {
    bytes32 _subnameHash = keccak256(bytes(_subname));
    uint256 _orgId = _subnameToOrgId[_subnameHash];
    _org = _organizations[_orgId];
  }

  /// @inheritdoc IOrganizationFactory
  function organizationCount() external view returns (uint256 _count) {
    _count = _orgCounter;
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Validates a subname according to the rules:
  ///         - Min 3 characters
  ///         - Only lowercase alphanumeric + hyphens
  ///         - Cannot start/end with hyphen
  function _validateSubname(string calldata _subname) internal pure {
    bytes calldata _b = bytes(_subname);

    if (_b.length < 3) {
      revert OrganizationFactory_SubnameTooShort(_subname);
    }

    // Cannot start or end with hyphen
    if (_b[0] == 0x2d || _b[_b.length - 1] == 0x2d) {
      revert OrganizationFactory_InvalidSubname(_subname);
    }

    for (uint256 _i; _i < _b.length; ++_i) {
      bytes1 _c = _b[_i];
      // lowercase a-z: 0x61-0x7a, digits 0-9: 0x30-0x39, hyphen: 0x2d
      bool _isLowerAlpha = _c >= 0x61 && _c <= 0x7a;
      bool _isDigit = _c >= 0x30 && _c <= 0x39;
      bool _isHyphen = _c == 0x2d;

      if (!_isLowerAlpha && !_isDigit && !_isHyphen) {
        revert OrganizationFactory_InvalidSubname(_subname);
      }
    }
  }
}
