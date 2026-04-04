// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {CircleTreasury, ICircleTreasury} from 'contracts/CircleTreasury.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {TimelockController} from '@openzeppelin/contracts/governance/TimelockController.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/// @notice Minimal ERC20 for testing
contract MockERC20 is IERC20 {
  string public name = 'Mock';
  string public symbol = 'MCK';
  uint8 public decimals = 18;
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  function mint(address _to, uint256 _amount) external {
    balanceOf[_to] += _amount;
    totalSupply += _amount;
  }

  function transfer(address _to, uint256 _amount) external returns (bool) {
    balanceOf[msg.sender] -= _amount;
    balanceOf[_to] += _amount;
    emit Transfer(msg.sender, _to, _amount);
    return true;
  }

  function approve(address _spender, uint256 _amount) external returns (bool) {
    allowance[msg.sender][_spender] = _amount;
    emit Approval(msg.sender, _spender, _amount);
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
    allowance[_from][msg.sender] -= _amount;
    balanceOf[_from] -= _amount;
    balanceOf[_to] += _amount;
    emit Transfer(_from, _to, _amount);
    return true;
  }
}

contract UnitCircleTreasury is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  GovernanceProcess internal _governance;
  CircleTreasury internal _treasury;
  MockERC20 internal _token;

  address internal _deployer = makeAddr('deployer');
  address internal _facilitator = makeAddr('facilitator');
  address internal _recipient = makeAddr('recipient');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _anchorCircleId;
  uint256 internal constant _MIN_DELAY = 1 days;

  function setUp() external {
    // Deploy org contracts
    RoleRegistry _rrImpl = new RoleRegistry();
    CircleRegistry _crImpl = new CircleRegistry();
    GovernanceProcess _govImpl = new GovernanceProcess();

    _roleRegistry = RoleRegistry(Clones.clone(address(_rrImpl)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_crImpl)));
    _governance = GovernanceProcess(Clones.clone(address(_govImpl)));

    _roleRegistry.initialize();
    _governance.initialize(_circleRegistry, _roleRegistry);
    vm.prank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(_governance));

    // Create anchor circle — deployer becomes circle lead
    vm.prank(_deployer);
    _anchorCircleId = _circleRegistry.createAnchorCircle('TestOrg', 'Test purpose');

    // Set facilitator
    vm.prank(_deployer);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);

    // Deploy treasury for anchor circle
    _treasury = new CircleTreasury(_circleRegistry, _anchorCircleId, _MIN_DELAY);

    // Deploy mock token
    _token = new MockERC20();
  }

  /*///////////////////////////////////////////////////////////////
                        DEPLOYMENT
  //////////////////////////////////////////////////////////////*/

  function test_DeploymentSetsCorrectState() external view {
    assertEq(_treasury.CIRCLE_ID(), _anchorCircleId);
    assertEq(address(_treasury.CIRCLE_REGISTRY()), address(_circleRegistry));
    assertTrue(address(_treasury.TIMELOCK()) != address(0));
  }

  function test_DeploymentGrantsProposerToCircleLeads() external view {
    TimelockController _tl = _treasury.TIMELOCK();
    // deployer is the circle lead — should have PROPOSER_ROLE
    assertTrue(_tl.hasRole(_tl.PROPOSER_ROLE(), _deployer));
  }

  function test_DeploymentGrantsCancellerToFacilitator() external view {
    TimelockController _tl = _treasury.TIMELOCK();
    assertTrue(_tl.hasRole(_tl.CANCELLER_ROLE(), _facilitator));
  }

  function test_DeploymentSetsOpenExecutor() external view {
    TimelockController _tl = _treasury.TIMELOCK();
    // address(0) having EXECUTOR_ROLE means anyone can execute
    assertTrue(_tl.hasRole(_tl.EXECUTOR_ROLE(), address(0)));
  }

  /*///////////////////////////////////////////////////////////////
                        ETH DEPOSITS
  //////////////////////////////////////////////////////////////*/

  function test_DepositETH() external {
    vm.deal(_deployer, 10 ether);
    vm.prank(_deployer);

    vm.expectEmit(true, true, true, true, address(_treasury));
    emit ICircleTreasury.Deposited(_deployer, 1 ether);

    (bool _ok,) = address(_treasury).call{value: 1 ether}('');
    assertTrue(_ok);

    // ETH goes to the timelock
    assertEq(address(_treasury.TIMELOCK()).balance, 1 ether);
  }

  /*///////////////////////////////////////////////////////////////
                      ERC20 DEPOSITS
  //////////////////////////////////////////////////////////////*/

  function test_DepositToken() external {
    _token.mint(_deployer, 1000e18);
    vm.startPrank(_deployer);
    _token.approve(address(_treasury), 500e18);

    vm.expectEmit(true, true, true, true, address(_treasury));
    emit ICircleTreasury.TokenDeposited(_deployer, address(_token), 500e18);

    _treasury.depositToken(IERC20(address(_token)), 500e18);
    vm.stopPrank();

    // Tokens go to the timelock
    assertEq(_token.balanceOf(address(_treasury.TIMELOCK())), 500e18);
  }

  /*///////////////////////////////////////////////////////////////
                    TIMELOCK OPERATIONS
  //////////////////////////////////////////////////////////////*/

  function test_CircleLeadCanScheduleAndExecute() external {
    // Fund the timelock with ETH
    vm.deal(address(_treasury.TIMELOCK()), 5 ether);

    TimelockController _tl = _treasury.TIMELOCK();

    // Circle lead schedules an ETH transfer
    vm.prank(_deployer);
    _tl.schedule(
      _recipient,
      1 ether,
      '', // no calldata — just ETH transfer
      bytes32(0), // no predecessor
      bytes32(uint256(1)), // salt
      _MIN_DELAY
    );

    // Can't execute before delay
    vm.expectRevert();
    _tl.execute(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)));

    // Warp past delay
    vm.warp(block.timestamp + _MIN_DELAY + 1);

    // Anyone can execute after delay
    vm.prank(_stranger);
    _tl.execute(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)));

    assertEq(_recipient.balance, 1 ether);
  }

  function test_StrangerCannotSchedule() external {
    TimelockController _tl = _treasury.TIMELOCK();

    vm.prank(_stranger);
    vm.expectRevert();
    _tl.schedule(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)), _MIN_DELAY);
  }

  function test_FacilitatorCanCancel() external {
    vm.deal(address(_treasury.TIMELOCK()), 5 ether);
    TimelockController _tl = _treasury.TIMELOCK();

    bytes32 _id = _tl.hashOperation(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)));

    // Schedule as circle lead
    vm.prank(_deployer);
    _tl.schedule(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)), _MIN_DELAY);

    assertTrue(_tl.isOperationPending(_id));

    // Facilitator cancels
    vm.prank(_facilitator);
    _tl.cancel(_id);

    assertFalse(_tl.isOperationPending(_id));
  }

  function test_StrangerCannotCancel() external {
    vm.deal(address(_treasury.TIMELOCK()), 5 ether);
    TimelockController _tl = _treasury.TIMELOCK();

    bytes32 _id = _tl.hashOperation(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)));

    // Schedule as circle lead
    vm.prank(_deployer);
    _tl.schedule(_recipient, 1 ether, '', bytes32(0), bytes32(uint256(1)), _MIN_DELAY);

    vm.prank(_stranger);
    vm.expectRevert();
    _tl.cancel(_id);

    // Verify still pending
    assertTrue(_tl.isOperationPending(_id));
  }

  function test_ScheduleERC20Transfer() external {
    TimelockController _tl = _treasury.TIMELOCK();

    // Fund timelock with tokens
    _token.mint(address(_tl), 1000e18);

    // Encode ERC20 transfer call
    bytes memory _data = abi.encodeCall(IERC20.transfer, (_recipient, 500e18));

    // Schedule
    vm.prank(_deployer);
    _tl.schedule(address(_token), 0, _data, bytes32(0), bytes32(uint256(2)), _MIN_DELAY);

    // Execute after delay
    vm.warp(block.timestamp + _MIN_DELAY + 1);
    _tl.execute(address(_token), 0, _data, bytes32(0), bytes32(uint256(2)));

    assertEq(_token.balanceOf(_recipient), 500e18);
  }

  /*///////////////////////////////////////////////////////////////
                    ROLE MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  function test_GrantProposerByCircleLead() external {
    address _newProposer = makeAddr('newProposer');
    TimelockController _tl = _treasury.TIMELOCK();

    assertFalse(_tl.hasRole(_tl.PROPOSER_ROLE(), _newProposer));

    vm.prank(_deployer);
    _treasury.grantProposer(_newProposer);

    assertTrue(_tl.hasRole(_tl.PROPOSER_ROLE(), _newProposer));
  }

  function test_GrantProposerByNonLeadReverts() external {
    vm.prank(_stranger);
    vm.expectRevert(ICircleTreasury.CircleTreasury_NotCircleLead.selector);
    _treasury.grantProposer(makeAddr('someone'));
  }

  function test_RevokeProposerByCircleLead() external {
    address _toRevoke = makeAddr('toRevoke');
    TimelockController _tl = _treasury.TIMELOCK();

    // First grant
    vm.prank(_deployer);
    _treasury.grantProposer(_toRevoke);
    assertTrue(_tl.hasRole(_tl.PROPOSER_ROLE(), _toRevoke));

    // Then revoke
    vm.prank(_deployer);
    _treasury.revokeProposer(_toRevoke);
    assertFalse(_tl.hasRole(_tl.PROPOSER_ROLE(), _toRevoke));
  }

  function test_SyncFacilitator() external {
    TimelockController _tl = _treasury.TIMELOCK();
    address _newFacilitator = makeAddr('newFacilitator');

    // Change facilitator in CircleRegistry
    vm.prank(_deployer);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _newFacilitator);

    // Sync
    _treasury.syncFacilitator();

    assertTrue(_tl.hasRole(_tl.CANCELLER_ROLE(), _newFacilitator));
  }

  function test_RevokeCancellerByCircleLead() external {
    TimelockController _tl = _treasury.TIMELOCK();

    // Facilitator currently has CANCELLER
    assertTrue(_tl.hasRole(_tl.CANCELLER_ROLE(), _facilitator));

    vm.prank(_deployer);
    _treasury.revokeCanceller(_facilitator);

    assertFalse(_tl.hasRole(_tl.CANCELLER_ROLE(), _facilitator));
  }

  function test_RevokeCancellerByNonLeadReverts() external {
    vm.prank(_stranger);
    vm.expectRevert(ICircleTreasury.CircleTreasury_NotCircleLead.selector);
    _treasury.revokeCanceller(_facilitator);
  }
}
