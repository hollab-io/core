// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {GovToken} from './GovToken.sol';

/// @title GovTokenDeployer
/// @notice Deploys GovToken instances on behalf of OrganizationFactory.
///         Extracted to keep OrganizationFactory under the contract size limit.
contract GovTokenDeployer {
  function deploy(
    string calldata _name,
    string calldata _symbol,
    address _minter
  ) external returns (address) {
    return address(new GovToken(_name, _symbol, _minter));
  }
}
