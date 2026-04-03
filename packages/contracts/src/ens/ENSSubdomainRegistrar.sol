// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';

interface IENS {
  function owner(bytes32 node) external view returns (address);
  function resolver(bytes32 node) external view returns (address);
  function setSubnodeOwner(bytes32 node, bytes32 label, address owner) external returns (bytes32);
  function setResolver(bytes32 node, address resolver) external;
  function setApprovalForAll(address operator, bool approved) external;
}

interface IAddrResolver {
  function setAddr(bytes32 node, address addr) external;
}

/// @title ENSSubdomainRegistrar
/// @notice Registers subdomains under a parent ENS node.
///         The deployer must either own the parent node or call
///         `ens.setApprovalForAll(address(this), true)` from the node owner.
///         Only the owner and authorized callers (e.g. HolGovernorFactory) can register subdomains.
contract ENSSubdomainRegistrar is IENSSubdomainRegistrar {
  IENS public immutable ENS;
  bytes32 public immutable NODE;
  address public immutable RESOLVER;

  address public owner;
  mapping(address => bool) public authorized;

  error NotOwner();
  error NotAuthorized();
  error InvalidResolver(bytes32 node);
  error AlreadyRegistered(bytes32 subnode, address currentOwner);

  constructor(address _ens, bytes32 _node) {
    ENS = IENS(_ens);
    NODE = _node;
    address _resolver = IENS(_ens).resolver(_node);
    if (_resolver == address(0)) revert InvalidResolver(_node);
    RESOLVER = _resolver;
    owner = msg.sender;
  }

  /// @notice Grant `caller` permission to register subdomains.
  function authorize(address caller) external {
    if (msg.sender != owner) revert NotOwner();
    authorized[caller] = true;
  }

  /// @notice Revoke `caller`'s permission to register subdomains.
  function deauthorize(address caller) external {
    if (msg.sender != owner) revert NotOwner();
    authorized[caller] = false;
  }

  /// @inheritdoc IENSSubdomainRegistrar
  function registerSubnode(bytes32 _label, address _targetAddress) external {
    if (msg.sender != owner && !authorized[msg.sender]) revert NotAuthorized();

    bytes32 subnode = keccak256(abi.encodePacked(NODE, _label));
    address currentOwner = ENS.owner(subnode);
    if (currentOwner != address(0)) revert AlreadyRegistered(subnode, currentOwner);

    // Take ownership of the subnode, set resolver, then point it at the target.
    ENS.setSubnodeOwner(NODE, _label, address(this));
    ENS.setResolver(subnode, RESOLVER);
    IAddrResolver(RESOLVER).setAddr(subnode, _targetAddress);
  }
}
