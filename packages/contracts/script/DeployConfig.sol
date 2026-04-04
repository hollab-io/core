// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title DeployConfig
/// @notice Shared constants and chain configuration for multi-chain deployments
library DeployConfig {
  /// @notice ENS registry address — identical on all Ethereum L1 chains
  address internal constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

  /// @notice Chains where ENS is natively available
  function hasENS(uint256 _chainId) internal pure returns (bool) {
    return _chainId == 1 || _chainId == 11_155_111;
  }

  // ── Default governance parameters ─────────────────────────────────────────

  uint256 internal constant DEFAULT_TIMELOCK_DELAY = 2 days;
  uint48 internal constant DEFAULT_VOTING_DELAY = uint48(1 days);
  uint32 internal constant DEFAULT_VOTING_PERIOD = uint32(1 weeks);
  uint256 internal constant DEFAULT_PROPOSAL_THRESHOLD = 0;
  uint256 internal constant DEFAULT_QUORUM_NUMERATOR = 4;
  uint256 internal constant DEFAULT_INITIAL_SUPPLY = 1_000_000e18;
  uint256 internal constant DEFAULT_TREASURY_DELAY = 1 days;
}
