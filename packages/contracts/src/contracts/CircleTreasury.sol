// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {TimelockController} from '@openzeppelin/contracts/governance/TimelockController.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {ICircleTreasury} from 'interfaces/ICircleTreasury.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';

/**
 * @title CircleTreasury
 * @notice Per-circle treasury with timelocked spending
 * @dev Wraps a TimelockController. Circle leads schedule operations,
 *      facilitator can cancel, anyone can execute after the delay.
 *
 *      Role mapping:
 *        PROPOSER  → circle leads (can schedule)
 *        CANCELLER → facilitator (can cancel pending ops)
 *        EXECUTOR  → open (anyone can execute after delay)
 *        ADMIN     → this contract (manages role grants)
 */
contract CircleTreasury is ICircleTreasury {
  using SafeERC20 for IERC20;

  /*///////////////////////////////////////////////////////////////
                            STATE
  //////////////////////////////////////////////////////////////*/

  /// @notice The circle this treasury belongs to
  uint256 public immutable CIRCLE_ID;

  /// @notice The CircleRegistry for auth checks
  CircleRegistry public immutable CIRCLE_REGISTRY;

  /// @notice The underlying TimelockController that holds funds and executes operations
  TimelockController public immutable TIMELOCK;

  /// @notice Facilitator address last granted `CANCELLER_ROLE` (constructor or `syncFacilitator`)
  /// @dev Used to revoke from the previous facilitator when the role rotates in `CircleRegistry`
  address public syncedFacilitator;

  /*///////////////////////////////////////////////////////////////
                            CONSTRUCTOR
  //////////////////////////////////////////////////////////////*/

  /// @notice Deploys a treasury for a specific circle
  /// @param _circleRegistry The CircleRegistry contract
  /// @param _circleId The circle this treasury belongs to
  /// @param _minDelay Minimum delay in seconds before operations can be executed
  constructor(CircleRegistry _circleRegistry, uint256 _circleId, uint256 _minDelay) {
    CIRCLE_REGISTRY = _circleRegistry;
    CIRCLE_ID = _circleId;

    // Get current circle leads as initial proposers
    address[] memory _leads = _circleRegistry.getCircleLeads(_circleId);

    // Open executor — anyone can execute after delay
    address[] memory _executors = new address[](1);
    _executors[0] = address(0);

    // This contract is admin so it can grant/revoke roles later
    TIMELOCK = new TimelockController(_minDelay, _leads, _executors, address(this));

    // Grant CANCELLER to facilitator if one exists
    address _facilitator = _circleRegistry.getElectedRole(_circleId, HolacracyTypes.ElectedRole.Facilitator);
    if (_facilitator != address(0)) {
      TIMELOCK.grantRole(TIMELOCK.CANCELLER_ROLE(), _facilitator);
    }
    syncedFacilitator = _facilitator;
  }

  /*///////////////////////////////////////////////////////////////
                            RECEIVE
  //////////////////////////////////////////////////////////////*/

  /// @notice Accept ETH deposits — forwards to the timelock
  receive() external payable {
    (bool _ok,) = payable(address(TIMELOCK)).call{value: msg.value}('');
    if (!_ok) revert CircleTreasury_ETHTransferFailed();
    emit Deposited(msg.sender, msg.value);
  }

  /*///////////////////////////////////////////////////////////////
                            DEPOSIT
  //////////////////////////////////////////////////////////////*/

  /// @notice Deposit ERC20 tokens into the treasury
  /// @param _token The ERC20 token address
  /// @param _amount The amount to deposit
  function depositToken(IERC20 _token, uint256 _amount) external {
    _token.safeTransferFrom(msg.sender, address(TIMELOCK), _amount);
    emit TokenDeposited(msg.sender, address(_token), _amount);
  }

  /*///////////////////////////////////////////////////////////////
                        ROLE MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  /// @notice Grants PROPOSER role to an address (only callable by circle leads)
  /// @param _account The address to grant proposer role to
  function grantProposer(address _account) external {
    if (!CIRCLE_REGISTRY.isCircleLead(CIRCLE_ID, msg.sender)) revert CircleTreasury_NotCircleLead();
    TIMELOCK.grantRole(TIMELOCK.PROPOSER_ROLE(), _account);
  }

  /// @notice Revokes PROPOSER role from an address (only callable by circle leads)
  /// @param _account The address to revoke proposer role from
  function revokeProposer(address _account) external {
    if (!CIRCLE_REGISTRY.isCircleLead(CIRCLE_ID, msg.sender)) revert CircleTreasury_NotCircleLead();
    TIMELOCK.revokeRole(TIMELOCK.PROPOSER_ROLE(), _account);
  }

  /// @notice Aligns timelock `CANCELLER_ROLE` with the current facilitator in `CircleRegistry`
  function syncFacilitator() external {
    address _current = CIRCLE_REGISTRY.getElectedRole(CIRCLE_ID, HolacracyTypes.ElectedRole.Facilitator);
    address _prev = syncedFacilitator;

    if (_prev != address(0) && _prev != _current) {
      TIMELOCK.revokeRole(TIMELOCK.CANCELLER_ROLE(), _prev);
    }
    if (_current != address(0)) {
      TIMELOCK.grantRole(TIMELOCK.CANCELLER_ROLE(), _current);
    }
    syncedFacilitator = _current;
  }

  /// @notice Revokes CANCELLER role from an address (only callable by circle leads)
  /// @param _account The address to revoke canceller role from
  function revokeCanceller(address _account) external {
    if (!CIRCLE_REGISTRY.isCircleLead(CIRCLE_ID, msg.sender)) revert CircleTreasury_NotCircleLead();
    TIMELOCK.revokeRole(TIMELOCK.CANCELLER_ROLE(), _account);
  }
}
