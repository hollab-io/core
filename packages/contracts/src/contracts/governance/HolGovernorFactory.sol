// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TimelockController} from 'lib/openzeppelin-contracts/contracts/governance/TimelockController.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {GovComponentDeployer} from 'contracts/governance/GovComponentDeployer.sol';
import {HolGovernor} from 'contracts/governance/HolGovernor.sol';

/// @title HolGovernorFactory
/// @notice Deploys a complete governance suite (GovToken + TimelockController + HolGovernor)
///         in a single transaction, wires all roles, and optionally mints initial token allocations.
///         ENS subdomain registration is opt-in per deployment via DeploymentConfig.
///
/// @dev GovToken and TimelockController are deployed via GovComponentDeployer to keep this
///      contract's initcode under the 24 576-byte EIP-170 limit.
contract HolGovernorFactory {
  // ─── Types ───────────────────────────────────────────────────────────────────

  struct DeploymentConfig {
    // Token
    string tokenName;
    string tokenSymbol;
    // Initial token distribution (parallel arrays, may be empty)
    address[] initialHolders;
    uint256[] initialAmounts;
    // Timelock
    uint256 timelockDelay;
    // Governor
    string governorName;
    uint48 votingDelay;
    uint32 votingPeriod;
    uint256 proposalThreshold;
    uint256 quorumNumerator;
    // ENS (both must be set to register a subdomain; leave subdomain empty to skip)
    string subdomain;
    address subdomainRegistrar;
  }

  struct Deployment {
    address token;
    address timelock;
    address governor;
  }

  // ─── Events ──────────────────────────────────────────────────────────────────

  event GovernorDeployed(
    address indexed governor,
    address indexed token,
    address indexed timelock,
    string governorName
  );

  // ─── Errors ──────────────────────────────────────────────────────────────────

  error ArrayLengthMismatch();
  /// @notice Thrown when a subdomain is provided without a registrar address.
  error MissingENSRegistrar();
  /// @notice Thrown when the subdomain contains characters outside [0-9a-z-].
  error InvalidSubdomain(string subdomain);

  // ─── State ───────────────────────────────────────────────────────────────────

  GovComponentDeployer public immutable COMPONENT_DEPLOYER;

  // ─── Constructor ─────────────────────────────────────────────────────────────

  constructor() {
    COMPONENT_DEPLOYER = new GovComponentDeployer();
  }

  // ─── External ────────────────────────────────────────────────────────────────

  /// @notice Deploy a complete governance suite from `config`.
  /// @return deployment Addresses of the deployed token, timelock, and governor.
  function deploy(DeploymentConfig calldata config) external returns (Deployment memory deployment) {
    if (config.initialHolders.length != config.initialAmounts.length) revert ArrayLengthMismatch();

    // 1. Deploy token with this factory as the initial minter so we can mint below.
    GovToken token = GovToken(COMPONENT_DEPLOYER.deployToken(config.tokenName, config.tokenSymbol, address(this)));

    // 2. Mint initial allocations.
    for (uint256 i = 0; i < config.initialHolders.length; i++) {
      token.mint(config.initialHolders[i], config.initialAmounts[i]);
    }

    // 3. Deploy TimelockController.
    //    - proposers: empty (governor will be granted this role below)
    //    - executors: address(0) means anyone can execute
    //    - admin: this factory (role will be renounced at the end)
    address[] memory proposers = new address[](0);
    address[] memory executors = new address[](1);
    executors[0] = address(0);
    TimelockController timelock =
      TimelockController(payable(COMPONENT_DEPLOYER.deployTimelock(config.timelockDelay, proposers, executors, address(this))));

    // 4. Deploy governor.
    HolGovernor governor = new HolGovernor(
      config.governorName,
      token,
      timelock,
      config.votingDelay,
      config.votingPeriod,
      config.proposalThreshold,
      config.quorumNumerator
    );

    // 5. Wire timelock roles:
    //    - Governor is the only proposer/canceller.
    //    - Timelock becomes its own admin (factory renounces).
    timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
    timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));
    timelock.grantRole(timelock.DEFAULT_ADMIN_ROLE(), address(timelock));
    timelock.revokeRole(timelock.DEFAULT_ADMIN_ROLE(), address(this));

    // 6. Transfer token minter role to timelock so governance can mint via proposals.
    token.setMinter(address(timelock));

    // 7. Register ENS subdomain pointing to the governor, if requested.
    if (bytes(config.subdomain).length > 0) {
      if (config.subdomainRegistrar == address(0)) revert MissingENSRegistrar();
      if (!_isSubdomainValid(config.subdomain)) revert InvalidSubdomain(config.subdomain);
      IENSSubdomainRegistrar(config.subdomainRegistrar).registerSubnode(
        keccak256(bytes(config.subdomain)), address(governor)
      );
    }

    deployment = Deployment({token: address(token), timelock: address(timelock), governor: address(governor)});

    emit GovernorDeployed(address(governor), address(token), address(timelock), config.governorName);
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  /// @notice Validates that every character in `subdomain` is in [0-9a-z-].
  function _isSubdomainValid(string calldata subdomain) internal pure returns (bool) {
    bytes memory b = bytes(subdomain);
    for (uint256 i = 0; i < b.length; i++) {
      bytes1 c = b[i];
      bool valid = (c >= 0x30 && c <= 0x39) // 0-9
        || (c >= 0x61 && c <= 0x7a) // a-z
        || c == 0x2d; // -
      if (!valid) return false;
    }
    return true;
  }
}
