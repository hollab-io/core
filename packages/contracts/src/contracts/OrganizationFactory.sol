// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessManager} from '@openzeppelin/contracts/access/manager/AccessManager.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {GovTokenDeployer} from 'contracts/governance/GovTokenDeployer.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {IERC8004} from 'interfaces/IERC8004.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {IRoleRegistry} from 'interfaces/IRoleRegistry.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title OrganizationFactory
 * @notice Thin directory + creation entrypoint. Deploys one OrganizationInstance clone
 *         per org and stores (id → instance) and (subnameHash → instance) indices.
 *
 *         After creation the factory has no further write authority over any org.
 *         All membership, wiring, and governance authority lives on the
 *         OrganizationInstance clone.
 */
contract OrganizationFactory is IOrganizationFactory {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice RoleRegistry implementation used for cloning
  address public immutable roleRegistryImplementation;

  /// @notice OrganizationInstance implementation used for cloning
  address public immutable organizationInstanceImplementation;

  /// @notice Deploys GovToken instances
  GovTokenDeployer public immutable TOKEN_DEPLOYER;

  /// @notice ENS subdomain registrar
  IENSSubdomainRegistrar public immutable ENS_REGISTRAR;

  /// @notice Authorized MeetingComponentsFactory address (stored so it can be passed to instances)
  address public immutable meetingComponentsFactory;

  /// @notice Auto-incrementing organization ID counter
  uint256 internal _orgCounter;

  /// @notice Org ID => OrganizationInstance clone address
  mapping(uint256 => address) internal _orgInstances;

  /// @notice subnameHash => OrganizationInstance clone address
  mapping(bytes32 => address) internal _subnameToInstance;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  constructor(
    address _roleRegistryImpl,
    address _orgInstanceImpl,
    address _ensRegistrar,
    address _meetingComponentsFactory
  ) {
    roleRegistryImplementation = _roleRegistryImpl;
    organizationInstanceImplementation = _orgInstanceImpl;
    TOKEN_DEPLOYER = new GovTokenDeployer();
    ENS_REGISTRAR = IENSSubdomainRegistrar(_ensRegistrar);
    meetingComponentsFactory = _meetingComponentsFactory;
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function createOrganization(
    string calldata _subname,
    string calldata _purpose,
    TokenConfig calldata _tokenConfig
  ) external returns (uint256 _orgId, address _instance) {
    _validateSubname(_subname);

    bytes32 _subnameHash = keccak256(bytes(_subname));
    if (_subnameToInstance[_subnameHash] != address(0)) {
      revert OrganizationFactory_SubnameAlreadyTaken(_subname);
    }

    // ── Clone + initialize RoleRegistry ────────────────────────────────────
    RoleRegistry _roleRegistry = RoleRegistry(Clones.clone(roleRegistryImplementation));
    _roleRegistry.initialize(address(this)); // factory = this (temporarily)

    // ── Deploy access layer ─────────────────────────────────────────────────
    address _accessManagerAddr = address(new AccessManager(msg.sender));

    // ── Deploy governance token ─────────────────────────────────────────────
    GovToken _token = GovToken(TOKEN_DEPLOYER.deploy(_tokenConfig.tokenName, _tokenConfig.tokenSymbol, address(this)));
    _mintInitialTokens(_token, _tokenConfig);
    _token.transferOwnership(msg.sender);

    // ── Register ENS subname ────────────────────────────────────────────────
    ENS_REGISTRAR.registerSubnode(keccak256(bytes(_subname)), _accessManagerAddr);

    // ── Seed Anchor Circle (while this contract is still RoleRegistry.factory) ──
    (uint256 _anchorCircleId,) = _roleRegistry.initAnchorCircle(msg.sender, _subname, _purpose);

    // ── Assign org ID ──────────────────────────────────────────────────────
    _orgId = ++_orgCounter;

    // ── Clone + initialize OrganizationInstance ─────────────────────────────
    _instance = Clones.clone(organizationInstanceImplementation);
    IOrganizationInstance(_instance)
      .initialize(
        IOrganizationInstance.InitParams({
        id: _orgId,
        subname: _subname,
        purpose: _purpose,
        creator: msg.sender,
        roleRegistry: address(_roleRegistry),
        accessManager: _accessManagerAddr,
        token: address(_token),
        anchorCircleId: _anchorCircleId,
        meetingComponentsFactory: meetingComponentsFactory
      })
      );

    // ── Hand factory authority on RoleRegistry to the instance ────────────
    // From this point forward, only the instance can wire the governance
    // process on its own RoleRegistry.
    _roleRegistry.transferFactory(_instance);

    // ── Index ───────────────────────────────────────────────────────────────
    _orgInstances[_orgId] = _instance;
    _subnameToInstance[_subnameHash] = _instance;

    emit OrganizationCreated(_orgId, _subname, msg.sender, _instance, address(_roleRegistry));
  }

  /*///////////////////////////////////////////////////////////////
                            DIRECTORY (READ-ONLY)
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function getOrganization(
    uint256 _orgId
  ) external view returns (address _instance) {
    _instance = _orgInstances[_orgId];
  }

  /// @inheritdoc IOrganizationFactory
  function getOrganizationBySubname(
    string calldata _subname
  ) external view returns (address _instance) {
    _instance = _subnameToInstance[keccak256(bytes(_subname))];
  }

  /// @inheritdoc IOrganizationFactory
  function organizationCount() external view returns (uint256 _count) {
    _count = _orgCounter;
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  function _mintInitialTokens(
    GovToken _token,
    TokenConfig calldata _cfg
  ) internal {
    if (_cfg.initialHolders.length != _cfg.initialAmounts.length) {
      revert OrganizationFactory_ArrayLengthMismatch();
    }
    for (uint256 _i; _i < _cfg.initialHolders.length; ++_i) {
      _token.mint(_cfg.initialHolders[_i], _cfg.initialAmounts[_i]);
    }
  }

  function _validateSubname(
    string calldata _subname
  ) internal pure {
    bytes calldata _b = bytes(_subname);
    if (_b.length < 3) revert OrganizationFactory_SubnameTooShort(_subname);
    if (_b[0] == 0x2d || _b[_b.length - 1] == 0x2d) revert OrganizationFactory_InvalidSubname(_subname);
    for (uint256 _i; _i < _b.length; ++_i) {
      bytes1 _c = _b[_i];
      bool _isLowerAlpha = _c >= 0x61 && _c <= 0x7a;
      bool _isDigit = _c >= 0x30 && _c <= 0x39;
      bool _isHyphen = _c == 0x2d;
      if (!_isLowerAlpha && !_isDigit && !_isHyphen) revert OrganizationFactory_InvalidSubname(_subname);
    }
  }
}
