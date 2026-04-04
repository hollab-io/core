// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CircleTreasury} from 'contracts/CircleTreasury.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';

/// @title TreasuryDeployer
/// @notice Deploys CircleTreasury on behalf of OrganizationFactory.
///         Splitting this into a separate contract keeps OrganizationFactory under
///         the 24 576-byte EIP-170 contract size limit.
contract TreasuryDeployer {
  function deployTreasury(
    CircleRegistry _circleRegistry,
    uint256 _circleId,
    uint256 _minDelay
  ) external returns (address) {
    return address(new CircleTreasury(_circleRegistry, _circleId, _minDelay));
  }
}
