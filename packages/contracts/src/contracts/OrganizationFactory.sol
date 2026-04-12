// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessManager} from '@openzeppelin/contracts/access/manager/AccessManager.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {GovTokenDeployer} from 'contracts/governance/GovTokenDeployer.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title OrganizationFactory
 * @notice Deploys core Holacracy organization infrastructure in a single transaction:
 *         ERC-1167 clones for holacracy contracts, a governance token (ERC20Votes)
 *         for ActionVoting, and an ENS subname.
 *
 *         Meeting components (MeetingFactory, ActionVoting) are
 *         deployed separately via MeetingComponentsFactory — an org can have multiple
 *         sets of meeting components (e.g. one per circle).
 *
 *         The ENSSubdomainRegistrar must authorize this contract before any
 *         organization can be created (call registrar.authorize(address(this))).
 */
contract OrganizationFactory is IOrganizationFactory {
  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice The RoleRegistry implementation used for cloning
  address public immutable roleRegistryImplementation;

  /// @notice Deploys GovToken instances (extracted to stay under contract size limit)
  GovTokenDeployer public immutable TOKEN_DEPLOYER;

  /// @notice ENS subdomain registrar — registers subnames under the parent node
  IENSSubdomainRegistrar public immutable ENS_REGISTRAR;

  /// @notice Auto-incrementing organization ID counter
  uint256 internal _orgCounter;

  /// @notice Org ID => Organization data
  mapping(uint256 => HolacracyTypes.Organization) internal _organizations;

  /// @notice subname hash => org ID (for uniqueness checks and lookups)
  mapping(bytes32 => uint256) internal _subnameToOrgId;

  /// @notice Auto-incrementing org join-request ID counter
  uint256 internal _joinRequestCounter;

  /// @notice orgId => requester => requestId (non-zero while pending)
  mapping(uint256 => mapping(address => uint256)) internal _joinRequestIds;

  /// @notice orgId => account => is org admin
  mapping(uint256 => mapping(address => bool)) internal _orgAdmins;

  /// @notice orgId => account => is org member
  mapping(uint256 => mapping(address => bool)) internal _orgMembers;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @param _roleRegistryImpl The RoleRegistry implementation address
  /// @param _ensRegistrar ENSSubdomainRegistrar authorized to register subnames under the parent node
  constructor(
    address _roleRegistryImpl,
    address _ensRegistrar
  ) {
    roleRegistryImplementation = _roleRegistryImpl;
    TOKEN_DEPLOYER = new GovTokenDeployer();
    ENS_REGISTRAR = IENSSubdomainRegistrar(_ensRegistrar);
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function createOrganization(
    string calldata _subname,
    string calldata _purpose,
    TokenConfig calldata _tokenConfig
  ) external returns (uint256 _orgId) {
    // Validate subname
    _validateSubname(_subname);

    bytes32 _subnameHash = keccak256(bytes(_subname));
    if (_subnameToOrgId[_subnameHash] != 0) {
      revert OrganizationFactory_SubnameAlreadyTaken(_subname);
    }

    // Clone remaining core contract(s)
    RoleRegistry _roleRegistry = RoleRegistry(Clones.clone(roleRegistryImplementation));

    // Initialize role registry
    _roleRegistry.initialize();
    _purpose;

    // Deploy AccessManager with org creator as initial admin
    address _accessManagerAddr = address(new AccessManager(msg.sender));

    // Deploy governance token (ERC20Votes) — used by ActionVoting for vote weight.
    // Factory is the initial minter so it can mint initial allocations, then
    // transfers the minter role to the org creator.
    GovToken _token = GovToken(TOKEN_DEPLOYER.deploy(_tokenConfig.tokenName, _tokenConfig.tokenSymbol, address(this)));
    _mintInitialTokens(_token, _tokenConfig);
    _token.setMinter(msg.sender);

    // Register ENS subname — the subdomain resolves to the access manager.
    ENS_REGISTRAR.registerSubnode(keccak256(bytes(_subname)), _accessManagerAddr);

    // Store organization record
    _orgId = ++_orgCounter;
    {
      HolacracyTypes.Organization storage _org = _organizations[_orgId];
      _org.id = _orgId;
      _org.name = _subname;
      _org.subname = _subname;
      _org.creator = msg.sender;
      _org.roleRegistry = address(_roleRegistry);
      _org.circleRegistry = address(0);
      _org.governanceProcess = address(0);
      _org.accessManager = _accessManagerAddr;
      _org.anchorCircleId = 0;
      _org.createdAt = block.timestamp;
      _org.token = address(_token);
    }

    _subnameToOrgId[_subnameHash] = _orgId;
    _seedOrgAccess(_orgId, msg.sender);

    emit OrganizationCreated(_orgId, _subname, msg.sender);
    emit OrgComponentsDeployed(_orgId, address(0), address(_roleRegistry), address(0));
  }

  /// @inheritdoc IOrganizationFactory
  function requestToJoin(
    uint256 orgId,
    string calldata message
  ) external returns (uint256 requestId) {
    if (_organizations[orgId].id == 0) revert OrganizationFactory_OrgNotFound(orgId);
    if (_joinRequestIds[orgId][msg.sender] != 0) {
      revert OrganizationFactory_JoinRequestAlreadyPending(msg.sender, orgId);
    }

    requestId = ++_joinRequestCounter;
    _joinRequestIds[orgId][msg.sender] = requestId;

    emit JoinRequested(requestId, msg.sender, orgId, message);
  }

  /// @inheritdoc IOrganizationFactory
  function approveJoinRequest(
    uint256 orgId,
    address requester
  ) external {
    uint256 requestId = _joinRequestIds[orgId][requester];
    if (requestId == 0) revert OrganizationFactory_JoinRequestNotFound(requester, orgId);

    _assertOrgAdmin(orgId);
    delete _joinRequestIds[orgId][requester];

    if (!_orgMembers[orgId][requester]) {
      _orgMembers[orgId][requester] = true;
      emit OrgMemberAdded(orgId, requester);
    }

    emit JoinApproved(requestId, requester, orgId);
  }

  /// @inheritdoc IOrganizationFactory
  function rejectJoinRequest(
    uint256 orgId,
    address requester
  ) external {
    uint256 requestId = _joinRequestIds[orgId][requester];
    if (requestId == 0) revert OrganizationFactory_JoinRequestNotFound(requester, orgId);

    _assertOrgAdmin(orgId);
    delete _joinRequestIds[orgId][requester];

    emit JoinRejected(requestId, requester, orgId);
  }

  /// @inheritdoc IOrganizationFactory
  function addOrgAdmin(
    uint256 orgId,
    address account
  ) external {
    _assertOrgAdmin(orgId);
    if (!_orgAdmins[orgId][account]) {
      _orgAdmins[orgId][account] = true;
      emit OrgAdminAdded(orgId, account);
    }
  }

  /// @inheritdoc IOrganizationFactory
  function removeOrgAdmin(
    uint256 orgId,
    address account
  ) external {
    _assertOrgAdmin(orgId);
    if (_orgAdmins[orgId][account]) {
      _orgAdmins[orgId][account] = false;
      emit OrgAdminRemoved(orgId, account);
    }
  }

  /// @inheritdoc IOrganizationFactory
  function addOrgMember(
    uint256 orgId,
    address account
  ) external {
    _assertOrgAdmin(orgId);
    if (!_orgMembers[orgId][account]) {
      _orgMembers[orgId][account] = true;
      emit OrgMemberAdded(orgId, account);
    }
  }

  /// @inheritdoc IOrganizationFactory
  function removeOrgMember(
    uint256 orgId,
    address account
  ) external {
    _assertOrgAdmin(orgId);
    if (_orgMembers[orgId][account]) {
      _orgMembers[orgId][account] = false;
      emit OrgMemberRemoved(orgId, account);
    }
  }

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function getOrganization(
    uint256 _orgId
  ) external view returns (HolacracyTypes.Organization memory _org) {
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

  /// @inheritdoc IOrganizationFactory
  function getOrganizations(
    uint256 _offset,
    uint256 _limit
  ) external view returns (HolacracyTypes.Organization[] memory _orgs) {
    uint256 _count = _orgCounter;
    if (_limit == 0 || _offset >= _count) {
      return new HolacracyTypes.Organization[](0);
    }

    uint256 _startId = _offset + 1;
    uint256 _endExclusive = _startId + _limit;
    uint256 _maxExclusive = _count + 1;
    if (_endExclusive > _maxExclusive) _endExclusive = _maxExclusive;

    uint256 _size = _endExclusive - _startId;
    _orgs = new HolacracyTypes.Organization[](_size);

    for (uint256 _i; _i < _size; ++_i) {
      _orgs[_i] = _organizations[_startId + _i];
    }
  }

  /// @inheritdoc IOrganizationFactory
  function hasPendingRequest(
    address requester,
    uint256 orgId
  ) external view returns (bool) {
    return _joinRequestIds[orgId][requester] != 0;
  }

  /// @inheritdoc IOrganizationFactory
  function isOrgAdmin(
    uint256 orgId,
    address account
  ) external view returns (bool) {
    return _orgAdmins[orgId][account];
  }

  /// @inheritdoc IOrganizationFactory
  function isOrgMember(
    uint256 orgId,
    address account
  ) external view returns (bool) {
    return _orgMembers[orgId][account];
  }

  /*///////////////////////////////////////////////////////////////
                            INTERNAL
  //////////////////////////////////////////////////////////////*/

  /// @notice Mints initial token allocations to holders.
  function _mintInitialTokens(
    GovToken _token,
    TokenConfig calldata _cfg
  ) internal {
    for (uint256 _i; _i < _cfg.initialHolders.length; ++_i) {
      _token.mint(_cfg.initialHolders[_i], _cfg.initialAmounts[_i]);
    }
  }

  /// @notice Validates a subname: min 3 chars, only [a-z0-9-], no leading/trailing hyphen.
  function _validateSubname(
    string calldata _subname
  ) internal pure {
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

  function _assertOrgAdmin(
    uint256 orgId
  ) internal view {
    HolacracyTypes.Organization memory org = _organizations[orgId];
    if (org.id == 0) revert OrganizationFactory_OrgNotFound(orgId);
    if (!_orgAdmins[orgId][msg.sender]) revert OrganizationFactory_JoinRequestUnauthorized(msg.sender, orgId);
  }

  function _seedOrgAccess(
    uint256 orgId,
    address creator
  ) internal {
    _orgAdmins[orgId][creator] = true;
    _orgMembers[orgId][creator] = true;
    emit OrgAdminAdded(orgId, creator);
    emit OrgMemberAdded(orgId, creator);
  }
}
