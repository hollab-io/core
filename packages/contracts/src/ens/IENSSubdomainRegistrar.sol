// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal interface for an ENS subdomain registrar.
///         Compatible with Aragon's ENSSubdomainRegistrar.
interface IENSSubdomainRegistrar {
  function registerSubnode(bytes32 _label, address _targetAddress) external;
}
