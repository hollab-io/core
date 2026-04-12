// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {ActionVoting, IActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Test} from 'forge-std/Test.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

contract StubENSRegistrarForActionVoting is IENSSubdomainRegistrar {
  function registerSubnode(bytes32, address) external {} // solhint-disable-line no-empty-blocks
}

contract UnitActionVoting is Test {
  OrganizationFactory internal _orgFactory;
  MeetingFactory internal _meetingFactory;
  ActionVoting internal _actionVoting;
  GovToken internal _govToken;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _member2 = makeAddr('member2');
  address internal _collaborator = makeAddr('collaborator');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _orgId;

  function _defaultTokenConfig() internal view returns (IOrganizationFactory.TokenConfig memory _cfg) {
    address[] memory _holders = new address[](1);
    _holders[0] = _deployer;
    uint256[] memory _amounts = new uint256[](1);
    _amounts[0] = 1_000_000e18;
    _cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'HolLab Gov', tokenSymbol: 'GOV', initialHolders: _holders, initialAmounts: _amounts
    });
  }

  function setUp() external {
    _orgFactory = new OrganizationFactory(address(new RoleRegistry()), address(new StubENSRegistrarForActionVoting()));
    _meetingFactory = MeetingFactory(Clones.clone(address(new MeetingFactory())));
    _actionVoting = ActionVoting(Clones.clone(address(new ActionVoting())));
    _govToken = new GovToken('HolLab Gov', 'GOV', address(this));

    vm.prank(_deployer);
    _orgId = _orgFactory.createOrganization('action-org', 'Build holacracy tools', _defaultTokenConfig());

    vm.startPrank(_deployer);
    _orgFactory.addOrgAdmin(_orgId, _member1);
    _orgFactory.addOrgMember(_orgId, _member1);
    _orgFactory.addOrgMember(_orgId, _member2);
    _meetingFactory.initialize(address(_orgFactory), address(0));
    _actionVoting.initialize(address(_orgFactory), address(_meetingFactory), address(_govToken));
    vm.stopPrank();

    _govToken.mint(_member1, 100e18);
    _govToken.mint(_member2, 50e18);
    _govToken.mint(_deployer, 200e18);

    vm.prank(_member1);
    _govToken.delegate(_member1);
    vm.prank(_member2);
    _govToken.delegate(_member2);
    vm.prank(_deployer);
    _govToken.delegate(_deployer);

    vm.roll(block.number + 1);
    vm.prank(_deployer);
    _actionVoting.setCircleQuorum(_orgId, 50e18);
  }

  function test_createVoteEmitsEvent() external {
    vm.prank(_deployer);
    vm.expectEmit(true, true, true, false);
    emit IActionVoting.VoteCreated(1, _orgId, 1, _deployer, 0, '', 0);
    _actionVoting.createVote(_orgId, 1, 'Prioritize this', 1 days);
  }

  function test_createVoteRevertsWhenNotAuthorized() external {
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_NotCircleLeadOrFacilitator.selector, _orgId));
    _actionVoting.createVote(_orgId, 1, 'Reason', 1 days);
  }

  function test_castVoteEmitsWeight() external {
    vm.prank(_deployer);
    uint256 voteId = _actionVoting.createVote(_orgId, 2, 'Ship now', 1 days);
    vm.prank(_member1);
    vm.expectEmit(true, true, false, true);
    emit IActionVoting.VoteCast(voteId, _member1, HolacracyTypes.VoteSupport.For, 100e18);
    _actionVoting.castVote(voteId, HolacracyTypes.VoteSupport.For);
  }

  function test_collaboratorWeightIncluded() external {
    vm.startPrank(_deployer);
    _actionVoting.setCircleMintCap(_orgId, 500e18);
    _actionVoting.grantCollaboratorWeight(_orgId, _collaborator, 30e18);
    uint256 voteId = _actionVoting.createVote(_orgId, 3, 'Reason', 1 days);
    vm.stopPrank();

    assertEq(_actionVoting.getVoteWeight(voteId, _collaborator), 30e18);

    vm.prank(_collaborator);
    vm.expectEmit(true, true, false, true);
    emit IActionVoting.VoteCast(voteId, _collaborator, HolacracyTypes.VoteSupport.For, 30e18);
    _actionVoting.castVote(voteId, HolacracyTypes.VoteSupport.For);
  }

  function test_doubleVoteReverts() external {
    vm.prank(_deployer);
    uint256 voteId = _actionVoting.createVote(_orgId, 4, 'Reason', 1 days);
    vm.startPrank(_member1);
    _actionVoting.castVote(voteId, HolacracyTypes.VoteSupport.For);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_AlreadyVoted.selector, voteId, _member1));
    _actionVoting.castVote(voteId, HolacracyTypes.VoteSupport.For);
    vm.stopPrank();
  }

  function test_voteAfterDeadlineReverts() external {
    vm.prank(_deployer);
    uint256 voteId = _actionVoting.createVote(_orgId, 5, 'Reason', 1 days);
    vm.warp(block.timestamp + 1 days + 1);
    vm.prank(_member1);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_VoteNotActive.selector, voteId));
    _actionVoting.castVote(voteId, HolacracyTypes.VoteSupport.For);
  }

  function test_initializeRevertsIfAlreadyInitialized() external {
    vm.expectRevert(IActionVoting.ActionVoting_AlreadyInitialized.selector);
    _actionVoting.initialize(address(_orgFactory), address(_meetingFactory), address(_govToken));
  }
}
