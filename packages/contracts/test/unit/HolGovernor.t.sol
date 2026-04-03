// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {IGovernor} from 'lib/openzeppelin-contracts/contracts/governance/IGovernor.sol';
import {TimelockController} from 'lib/openzeppelin-contracts/contracts/governance/TimelockController.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {HolGovernor} from 'contracts/governance/HolGovernor.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitHolGovernor is Test {
  address internal _deployer = makeAddr('deployer');
  address internal _voter = makeAddr('voter');
  address internal _target = makeAddr('target');

  GovToken internal _token;
  TimelockController internal _timelock;
  HolGovernor internal _governor;

  uint256 internal _proposalId;
  address[] internal _targets;
  uint256[] internal _values;
  bytes[] internal _calldatas;
  string internal _description = 'Proposal #1: test';

  function setUp() external {
    // TimelockController uses DONE_TIMESTAMP = 1 as a sentinel value for executed ops.
    // Foundry's default block.timestamp is 1, so a scheduled op with delay=0 would
    // collide with that sentinel. Start at a safe timestamp.
    vm.warp(1000);

    // Deploy token (deployer is temporary minter) and mint to voter
    vm.prank(_deployer);
    _token = new GovToken('GovToken', 'GOV', _deployer);
    vm.prank(_deployer);
    _token.mint(_voter, 1_000_000 ether);

    // Voter self-delegates so voting power is active
    vm.prank(_voter);
    _token.delegate(_voter);

    // Mine one block so the delegation checkpoint is recorded
    vm.roll(block.number + 1);

    vm.startPrank(_deployer);

    // Timelock with 0 min delay for test convenience
    address[] memory proposers = new address[](0);
    address[] memory executors = new address[](1);
    executors[0] = address(0); // anyone can execute
    _timelock = new TimelockController(0, proposers, executors, _deployer);

    _governor = new HolGovernor(
      'HolGovernor',
      _token,
      _timelock,
      uint48(1 days),
      uint32(1 weeks),
      0,
      4
    );

    // Wire roles and renounce admin
    _timelock.grantRole(_timelock.PROPOSER_ROLE(), address(_governor));
    _timelock.grantRole(_timelock.CANCELLER_ROLE(), address(_governor));
    _timelock.revokeRole(_timelock.DEFAULT_ADMIN_ROLE(), _deployer);

    vm.stopPrank();

    // No-op proposal arrays (empty calldata to _target)
    _targets = new address[](1);
    _targets[0] = _target;
    _values = new uint256[](1);
    _calldatas = new bytes[](1);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /// Advance past votingDelay so the proposal becomes Active
  function _rollToActive() internal {
    vm.roll(block.number + _governor.votingDelay() + 1);
  }

  /// Advance past votingPeriod (called while already Active)
  function _rollPastVoting() internal {
    vm.roll(block.number + _governor.votingPeriod());
  }

  // ─── Deployment ──────────────────────────────────────────────────────────────

  function test_NameIsSet() external view {
    assertEq(_governor.name(), 'HolGovernor');
  }

  function test_VotingDelayIsOneDay() external view {
    assertEq(_governor.votingDelay(), 1 days);
  }

  function test_VotingPeriodIsOneWeek() external view {
    assertEq(_governor.votingPeriod(), 1 weeks);
  }

  function test_QuorumNumeratorIs4() external view {
    assertEq(_governor.quorumNumerator(), 4);
  }

  function test_TokenIsSet() external view {
    assertEq(address(_governor.token()), address(_token));
  }

  // ─── Proposal lifecycle ───────────────────────────────────────────────────────

  function test_ProposeCreatesActiveProposalAfterDelay() external {
    vm.prank(_voter);
    _proposalId = _governor.propose(_targets, _values, _calldatas, _description);

    // Still Pending before voting delay passes
    assertEq(uint8(_governor.state(_proposalId)), uint8(IGovernor.ProposalState.Pending));

    _rollToActive();

    assertEq(uint8(_governor.state(_proposalId)), uint8(IGovernor.ProposalState.Active));
  }

  function test_VoterCanCastVoteForProposal() external {
    vm.prank(_voter);
    _proposalId = _governor.propose(_targets, _values, _calldatas, _description);

    _rollToActive();

    vm.prank(_voter);
    _governor.castVote(_proposalId, 1); // 1 = For

    (uint256 againstVotes, uint256 forVotes,) = _governor.proposalVotes(_proposalId);
    assertGt(forVotes, 0);
    assertEq(againstVotes, 0);
  }

  function test_ProposalSucceedsAfterVotingPeriod() external {
    vm.prank(_voter);
    _proposalId = _governor.propose(_targets, _values, _calldatas, _description);

    _rollToActive();

    vm.prank(_voter);
    _governor.castVote(_proposalId, 1);

    _rollPastVoting();

    assertEq(uint8(_governor.state(_proposalId)), uint8(IGovernor.ProposalState.Succeeded));
  }

  function test_ProposalCanBeQueuedAndExecuted() external {
    vm.prank(_voter);
    _proposalId = _governor.propose(_targets, _values, _calldatas, _description);

    _rollToActive();

    vm.prank(_voter);
    _governor.castVote(_proposalId, 1);

    _rollPastVoting();

    // Queue — timelock delay is 0 so no extra warp needed
    _governor.queue(_targets, _values, _calldatas, keccak256(bytes(_description)));
    assertEq(uint8(_governor.state(_proposalId)), uint8(IGovernor.ProposalState.Queued));

    _governor.execute(_targets, _values, _calldatas, keccak256(bytes(_description)));
    assertEq(uint8(_governor.state(_proposalId)), uint8(IGovernor.ProposalState.Executed));
  }

  function test_ProposalDefeatedWhenAgainstVotesWin() external {
    // Transfer half the supply to deployer so they can vote against
    uint256 half = _token.balanceOf(_voter) / 2;
    vm.startPrank(_voter);
    _token.transfer(_deployer, half);
    vm.stopPrank();

    vm.prank(_deployer);
    _token.delegate(_deployer);

    // Mine one block so the new delegation checkpoint is recorded
    vm.roll(block.number + 1);

    vm.prank(_voter);
    _proposalId = _governor.propose(_targets, _values, _calldatas, _description);

    _rollToActive();

    // Both vote Against
    vm.prank(_voter);
    _governor.castVote(_proposalId, 0);
    vm.prank(_deployer);
    _governor.castVote(_proposalId, 0);

    _rollPastVoting();

    assertEq(uint8(_governor.state(_proposalId)), uint8(IGovernor.ProposalState.Defeated));
  }
}
