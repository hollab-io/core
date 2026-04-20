// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import {ERC20Votes} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {Nonces} from '@openzeppelin/contracts/utils/Nonces.sol';

/// @title GovToken
/// @notice ERC20 token with voting power delegation and owner-based minting authority.
///         Only the owner can mint new tokens and can transfer ownership to another
///         address (e.g. the org creator after initial minting).
contract GovToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
  error NotMinter();
  error ZeroAddress();

  constructor(
    string memory _name,
    string memory _symbol,
    address _owner
  ) ERC20(_name, _symbol) ERC20Permit(_name) Ownable(_owner) {}

  /// @notice Mint `amount` tokens to `to`. Only callable by the owner.
  function mint(
    address to,
    uint256 amount
  ) external {
    if (msg.sender != owner()) revert NotMinter();
    _mint(to, amount);
  }

  /// @notice Alias for transferOwnership to maintain backward compatibility.
  function setMinter(
    address _newMinter
  ) external {
    if (msg.sender != owner()) revert NotMinter();
    if (_newMinter == address(0)) revert ZeroAddress();
    transferOwnership(_newMinter);
  }

  /// @notice Returns the current minter (owner). Alias for owner() to maintain backward compatibility.
  function minter() external view returns (address) {
    return owner();
  }

  // Required overrides

  function _update(
    address from,
    address to,
    uint256 value
  ) internal override(ERC20, ERC20Votes) {
    super._update(from, to, value);
  }

  function nonces(
    address owner
  ) public view override(ERC20Permit, Nonces) returns (uint256) {
    return super.nonces(owner);
  }
}
