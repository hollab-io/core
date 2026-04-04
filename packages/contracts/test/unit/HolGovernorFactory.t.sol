// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {IGovernor} from 'lib/openzeppelin-contracts/contracts/governance/IGovernor.sol';
import {TimelockController} from 'lib/openzeppelin-contracts/contracts/governance/TimelockController.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {HolGovernor} from 'contracts/governance/HolGovernor.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitHolGovernorFactory is Test {
  address internal _deployer = makeAddr('deployer');
  address internal _alice = makeAddr('alice');
  address internal _bob = makeAddr('bob');

  HolGovernorFactory internal _factory;
  HolGovernorFactory.DeploymentConfig internal _config;

  function setUp() external {
    // TimelockController uses DONE_TIMESTAMP = 1 as a sentinel; start safely.
    vm.warp(1000);

    _factory = new HolGovernorFactory();

    address[] memory holders = new address[](2);
    holders[0] = _alice;
    holders[1] = _bob;

    uint256[] memory amounts = new uint256[](2);
    amounts[0] = 600_000 ether;
    amounts[1] = 400_000 ether;

    _config = HolGovernorFactory.DeploymentConfig({
      tokenName: 'TestToken',
      tokenSymbol: 'TEST',
      initialHolders: holders,
      initialAmounts: amounts,
      timelockDelay: 0, // convenient for tests
      governorName: 'TestGovernor',
      votingDelay: uint48(1 days),
      votingPeriod: uint32(1 weeks),
      proposalThreshold: 0,
      quorumNumerator: 4,
      subdomain: '',
      subdomainRegistrar: address(0)
    });
  }

  // ─── Deployment ──────────────────────────────────────────────────────────────

  function test_DeployReturnsNonZeroAddresses() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);

    assertFalse(d.token == address(0));
    assertFalse(d.timelock == address(0));
    assertFalse(d.governor == address(0));
  }

  function test_EmitsGovernorDeployedEvent() external {
    vm.recordLogs();
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);

    // Verify the event was emitted with the right governor name by checking governor state
    HolGovernor gov = HolGovernor(payable(d.governor));
    assertEq(gov.name(), 'TestGovernor');
  }

  function test_TokenNameAndSymbol() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    GovToken token = GovToken(d.token);

    assertEq(token.name(), 'TestToken');
    assertEq(token.symbol(), 'TEST');
  }

  function test_InitialTokensDistributed() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    GovToken token = GovToken(d.token);

    assertEq(token.balanceOf(_alice), 600_000 ether);
    assertEq(token.balanceOf(_bob), 400_000 ether);
  }

  function test_GovernorParameters() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    HolGovernor gov = HolGovernor(payable(d.governor));

    assertEq(gov.name(), 'TestGovernor');
    assertEq(gov.votingDelay(), 1 days);
    assertEq(gov.votingPeriod(), 1 weeks);
    assertEq(gov.proposalThreshold(), 0);
    assertEq(gov.quorumNumerator(), 4);
  }

  function test_GovernorTokenIsDeployedToken() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    HolGovernor gov = HolGovernor(payable(d.governor));

    assertEq(address(gov.token()), d.token);
  }

  function test_GovernorTimelockIsDeployedTimelock() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    HolGovernor gov = HolGovernor(payable(d.governor));

    assertEq(gov.timelock(), d.timelock);
  }

  // ─── Role wiring ─────────────────────────────────────────────────────────────

  function test_GovernorHasProposerRole() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    TimelockController tl = TimelockController(payable(d.timelock));

    assertTrue(tl.hasRole(tl.PROPOSER_ROLE(), d.governor));
  }

  function test_GovernorHasCancellerRole() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    TimelockController tl = TimelockController(payable(d.timelock));

    assertTrue(tl.hasRole(tl.CANCELLER_ROLE(), d.governor));
  }

  function test_FactoryDoesNotRetainTimelockAdmin() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    TimelockController tl = TimelockController(payable(d.timelock));

    assertFalse(tl.hasRole(tl.DEFAULT_ADMIN_ROLE(), address(_factory)));
  }

  function test_TimelockIsItsOwnAdmin() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    TimelockController tl = TimelockController(payable(d.timelock));

    assertTrue(tl.hasRole(tl.DEFAULT_ADMIN_ROLE(), d.timelock));
  }

  function test_TokenMinterIsTimelock() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    GovToken token = GovToken(d.token);

    assertEq(token.minter(), d.timelock);
  }

  // ─── End-to-end proposal lifecycle ───────────────────────────────────────────

  function test_ProposalLifecycleThroughFactory() external {
    HolGovernorFactory.Deployment memory d = _factory.deploy(_config);
    HolGovernor gov = HolGovernor(payable(d.governor));

    // Alice self-delegates so voting power is active
    vm.prank(_alice);
    GovToken(d.token).delegate(_alice);
    vm.roll(block.number + 1);

    address[] memory targets = new address[](1);
    targets[0] = makeAddr('target');
    uint256[] memory values = new uint256[](1);
    bytes[] memory calldatas = new bytes[](1);
    string memory description = 'Proposal #1: factory test';

    // Propose
    vm.prank(_alice);
    uint256 proposalId = gov.propose(targets, values, calldatas, description);

    assertEq(uint8(gov.state(proposalId)), uint8(IGovernor.ProposalState.Pending));

    // Advance past voting delay
    vm.roll(block.number + gov.votingDelay() + 1);
    assertEq(uint8(gov.state(proposalId)), uint8(IGovernor.ProposalState.Active));

    // Vote For
    vm.prank(_alice);
    gov.castVote(proposalId, 1);

    // Advance past voting period
    vm.roll(block.number + gov.votingPeriod());
    assertEq(uint8(gov.state(proposalId)), uint8(IGovernor.ProposalState.Succeeded));

    // Queue and execute (timelockDelay = 0)
    gov.queue(targets, values, calldatas, keccak256(bytes(description)));
    assertEq(uint8(gov.state(proposalId)), uint8(IGovernor.ProposalState.Queued));

    gov.execute(targets, values, calldatas, keccak256(bytes(description)));
    assertEq(uint8(gov.state(proposalId)), uint8(IGovernor.ProposalState.Executed));
  }

  // ─── Error handling ───────────────────────────────────────────────────────────

  function test_RevertWhenArrayLengthMismatch() external {
    address[] memory holders = new address[](2);
    uint256[] memory amounts = new uint256[](1); // wrong length

    HolGovernorFactory.DeploymentConfig memory bad = _config;
    bad.initialHolders = holders;
    bad.initialAmounts = amounts;

    vm.expectRevert(HolGovernorFactory.ArrayLengthMismatch.selector);
    _factory.deploy(bad);
  }

  function test_DeployWithNoInitialMint() external {
    HolGovernorFactory.DeploymentConfig memory cfg = _config;
    cfg.initialHolders = new address[](0);
    cfg.initialAmounts = new uint256[](0);

    HolGovernorFactory.Deployment memory d = _factory.deploy(cfg);
    assertEq(GovToken(d.token).totalSupply(), 0);
  }
}
