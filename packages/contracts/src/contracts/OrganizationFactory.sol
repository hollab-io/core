// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {AccessManager} from '@openzeppelin/contracts/access/manager/AccessManager.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {CircleTreasury} from 'contracts/CircleTreasury.sol';
import {TreasuryDeployer} from 'contracts/TreasuryDeployer.sol';

/**
 * @title OrganizationFactory
 * @notice Deploys Holacracy organizations as ERC-1167 minimal proxy clones,
 *         deploys an on-chain governance suite (GovToken + Timelock + HolGovernor)
 *         via HolGovernorFactory, and registers an ENS subname pointing to the
 *         governor under hollab.eth via ENSSubdomainRegistrar.
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

  /// @notice The CircleRegistry implementation used for cloning
  address public immutable circleRegistryImplementation;

  /// @notice The GovernanceProcess implementation used for cloning
  address public immutable governanceProcessImplementation;

  /// @notice Factory used to deploy GovToken + TimelockController + HolGovernor per org
  HolGovernorFactory public immutable GOV_FACTORY;

  /// @notice ENS subdomain registrar — registers subnames under the parent node
  IENSSubdomainRegistrar public immutable ENS_REGISTRAR;

  /// @notice Deploys CircleTreasury instances (keeps OrganizationFactory under EIP-170 size limit)
  TreasuryDeployer public immutable TREASURY_DEPLOYER;

  /// @notice Auto-incrementing organization ID counter
  uint256 internal _orgCounter;

  /// @notice Org ID => Organization data
  mapping(uint256 => HolacracyTypes.Organization) internal _organizations;

  /// @notice subname hash => org ID (for uniqueness checks and lookups)
  mapping(bytes32 => uint256) internal _subnameToOrgId;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @param _roleRegistryImpl The RoleRegistry implementation address
  /// @param _circleRegistryImpl The CircleRegistry implementation address
  /// @param _governanceProcessImpl The GovernanceProcess implementation address
  /// @param _govFactory Deployed HolGovernorFactory used to create the governance suite
  /// @param _ensRegistrar ENSSubdomainRegistrar authorized to register subnames under the parent node
  constructor(
    address _roleRegistryImpl,
    address _circleRegistryImpl,
    address _governanceProcessImpl,
    address _govFactory,
    address _ensRegistrar
  ) {
    roleRegistryImplementation = _roleRegistryImpl;
    circleRegistryImplementation = _circleRegistryImpl;
    governanceProcessImplementation = _governanceProcessImpl;
    GOV_FACTORY = HolGovernorFactory(_govFactory);
    ENS_REGISTRAR = IENSSubdomainRegistrar(_ensRegistrar);
    TREASURY_DEPLOYER = new TreasuryDeployer();
  }

  /*///////////////////////////////////////////////////////////////
                            LOGIC
  //////////////////////////////////////////////////////////////*/

  /// @inheritdoc IOrganizationFactory
  function createOrganization(
    string calldata _subname,
    string calldata _purpose,
    GovernanceConfig calldata _govConfig
  ) external returns (uint256 _orgId) {
    // Validate subname
    _validateSubname(_subname);

    bytes32 _subnameHash = keccak256(bytes(_subname));
    if (_subnameToOrgId[_subnameHash] != 0) {
      revert OrganizationFactory_SubnameAlreadyTaken(_subname);
    }

    // Clone holacracy contracts
    RoleRegistry _roleRegistry = RoleRegistry(Clones.clone(roleRegistryImplementation));
    CircleRegistry _circleRegistry = CircleRegistry(Clones.clone(circleRegistryImplementation));
    GovernanceProcess _governanceProcess = GovernanceProcess(Clones.clone(governanceProcessImplementation));

    // Initialize all three
    _roleRegistry.initialize();
    _governanceProcess.initialize(_circleRegistry, _roleRegistry);
    _circleRegistry.initialize(_roleRegistry, msg.sender, address(_governanceProcess));

    // Create anchor circle with caller as first circle lead
    uint256 _anchorCircleId = _circleRegistry.createAnchorCircle(_purpose);

    // Deploy AccessManager with org creator as initial admin
    address _accessManagerAddr = address(new AccessManager(msg.sender));

    // Deploy on-chain governance suite (GovToken + TimelockController + HolGovernor).
    // ENS registration is handled below, so subdomain is left empty here.
    HolGovernorFactory.Deployment memory _gov = GOV_FACTORY.deploy(_buildGovDeploymentConfig(_subname, _govConfig));

    // Link the DAO governor and timelock to the holacracy governance process so that
    // circle proposals can be escalated to a DAO vote via escalateToDAO().
    _governanceProcess.setDAOGovernor(_gov.governor, _gov.timelock);

    // Register ENS subname — the subdomain resolves to the governor address.
    ENS_REGISTRAR.registerSubnode(keccak256(bytes(_subname)), _gov.governor);

    // Deploy anchor circle treasury only when a non-zero delay is requested.
    CircleTreasury _treasury;
    if (_govConfig.treasuryTimelockDelay != 0) {
      _treasury = CircleTreasury(
        payable(TREASURY_DEPLOYER.deployTreasury(_circleRegistry, _anchorCircleId, _govConfig.treasuryTimelockDelay))
      );
    }

    // Store organization record
    _orgId = ++_orgCounter;
    {
      HolacracyTypes.Organization storage _org = _organizations[_orgId];
      _org.id = _orgId;
      _org.name = _subname;
      _org.subname = _subname;
      _org.creator = msg.sender;
      _org.roleRegistry = address(_roleRegistry);
      _org.circleRegistry = address(_circleRegistry);
      _org.governanceProcess = address(_governanceProcess);
      _org.accessManager = _accessManagerAddr;
      _org.anchorCircleId = _anchorCircleId;
      _org.createdAt = block.timestamp;
      _org.governor = _gov.governor;
      _org.token = _gov.token;
      _org.timelock = _gov.timelock;
      _org.treasury = address(_treasury);
    }

    _subnameToOrgId[_subnameHash] = _orgId;

    emit OrganizationCreated(_orgId, _subname, msg.sender);
    emit OrgComponentsDeployed(
      _orgId, address(_circleRegistry), address(_roleRegistry), address(_governanceProcess), address(_treasury)
    );
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

  /// @notice Builds a HolGovernorFactory.DeploymentConfig from an org subname and governance config.
  ///         Extracted to avoid stack-too-deep in createOrganization.
  function _buildGovDeploymentConfig(
    string calldata _subname,
    GovernanceConfig calldata _govConfig
  ) internal pure returns (HolGovernorFactory.DeploymentConfig memory _cfg) {
    _cfg = HolGovernorFactory.DeploymentConfig({
      tokenName: _govConfig.tokenName,
      tokenSymbol: _govConfig.tokenSymbol,
      initialHolders: _govConfig.initialHolders,
      initialAmounts: _govConfig.initialAmounts,
      timelockDelay: _govConfig.timelockDelay,
      governorName: _subname,
      votingDelay: _govConfig.votingDelay,
      votingPeriod: _govConfig.votingPeriod,
      proposalThreshold: _govConfig.proposalThreshold,
      quorumNumerator: _govConfig.quorumNumerator,
      subdomain: '',
      subdomainRegistrar: address(0)
    });
  }

  /// @notice Validates a subname: min 3 chars, only [a-z0-9-], no leading/trailing hyphen.
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
