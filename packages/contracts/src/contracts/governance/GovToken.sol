// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import {ERC20Votes} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';
import {Nonces} from '@openzeppelin/contracts/utils/Nonces.sol';

/// @title GovToken
/// @notice ERC20 token with voting power delegation, used as the governance token.
///         A designated minter address can mint new tokens and transfer the minter
///         role to another address (e.g. the org creator after initial minting).
contract GovToken is ERC20, ERC20Permit, ERC20Votes {
  address public minter;

  error NotMinter();
  error ZeroAddress();

  event MinterChanged(address indexed previousMinter, address indexed newMinter);

  constructor(
    string memory _name,
    string memory _symbol,
    address _minter
  ) ERC20(_name, _symbol) ERC20Permit(_name) {
    minter = _minter;
  }

  /// @notice Mint `amount` tokens to `to`. Only callable by the current minter.
  function mint(
    address to,
    uint256 amount
  ) external {
    if (msg.sender != minter) revert NotMinter();
    _mint(to, amount);
  }

  /// @notice Transfer the minter role to `_newMinter`. Only callable by the current minter.
  function setMinter(
    address _newMinter
  ) external {
    if (msg.sender != minter) revert NotMinter();
    if (_newMinter == address(0)) revert ZeroAddress();
    emit MinterChanged(minter, _newMinter);
    minter = _newMinter;
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
