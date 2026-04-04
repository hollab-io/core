// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title INameWrapper
 * @notice Minimal interface for ENS NameWrapper subname registration
 */
interface INameWrapper {
  /// @notice Sets a subnode record under a parent node
  /// @param _parentNode The namehash of the parent node
  /// @param _label The label of the subnode (e.g. "myorg" for myorg.hollab.eth)
  /// @param _owner The owner of the subnode
  /// @param _resolver The resolver for the subnode
  /// @param _ttl The TTL for the subnode
  /// @param _fuses The fuses to burn on the subnode
  /// @param _expiry The expiry of the subnode
  /// @return _node The namehash of the created subnode
  function setSubnodeRecord(
    bytes32 _parentNode,
    string calldata _label,
    address _owner,
    address _resolver,
    uint64 _ttl,
    uint32 _fuses,
    uint64 _expiry
  ) external returns (bytes32 _node);
}
