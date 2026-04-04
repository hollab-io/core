// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {TimelockController} from '@openzeppelin/contracts/governance/TimelockController.sol';

/**
 * @title ICircleTreasury
 * @notice Circle-level treasury backed by a TimelockController
 * @dev Circle leads can schedule spending, facilitator can cancel,
 *      anyone can execute after the delay expires.
 */
interface ICircleTreasury {
  /*///////////////////////////////////////////////////////////////
                            EVENTS
  //////////////////////////////////////////////////////////////*/

  /// @notice Emitted when ETH is deposited into the treasury
  /// @param _sender The depositor
  /// @param _amount The amount deposited
  event Deposited(address indexed _sender, uint256 _amount);

  /// @notice Emitted when an ERC20 token is deposited into the treasury
  /// @param _sender The depositor
  /// @param _token The token address
  /// @param _amount The amount deposited
  event TokenDeposited(address indexed _sender, address indexed _token, uint256 _amount);

  /*///////////////////////////////////////////////////////////////
                            ERRORS
  //////////////////////////////////////////////////////////////*/

  /// @notice Thrown when the caller is not a circle lead
  error CircleTreasury_NotCircleLead();

  /// @notice Thrown when the caller is not the facilitator or circle lead (when no facilitator)
  error CircleTreasury_NotFacilitator();

  /// @notice Thrown when an ETH transfer fails
  error CircleTreasury_ETHTransferFailed();

  /*///////////////////////////////////////////////////////////////
                            VARIABLES
  //////////////////////////////////////////////////////////////*/

  /// @notice The circle ID this treasury belongs to
  function CIRCLE_ID() external view returns (uint256);

  /// @notice The CircleRegistry for auth checks
  function CIRCLE_REGISTRY() external view returns (CircleRegistry);

  /// @notice The underlying TimelockController
  function TIMELOCK() external view returns (TimelockController);
}
