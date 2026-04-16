// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IERC8004
/// @notice Minimal interface for the ERC-8004 Identity Registry.
///         Full spec: https://eips.ethereum.org/EIPS/eip-8004
/// @dev Deployed at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 on 20+ chains.
interface IERC8004 {
  /// @notice Returns the owner of a registered agent identity (ERC-721 ownerOf).
  function ownerOf(
    uint256 tokenId
  ) external view returns (address owner);

  /// @notice Returns the agentURI (registration JSON) for a given agent ID.
  function tokenURI(
    uint256 tokenId
  ) external view returns (string memory);
}
