// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TimelockController} from 'lib/openzeppelin-contracts/contracts/governance/TimelockController.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';

/// @title GovComponentDeployer
/// @notice Deploys GovToken and TimelockController on behalf of HolGovernorFactory.
///         Splitting these into a separate contract keeps HolGovernorFactory under
///         the 24 576-byte EIP-170 contract size limit.
contract GovComponentDeployer {
  function deployToken(
    string calldata _name,
    string calldata _symbol,
    address _minter
  ) external returns (address) {
    return address(new GovToken(_name, _symbol, _minter));
  }

  function deployTimelock(
    uint256 _minDelay,
    address[] calldata _proposers,
    address[] calldata _executors,
    address _admin
  ) external returns (address) {
    return address(new TimelockController(_minDelay, _proposers, _executors, _admin));
  }
}
