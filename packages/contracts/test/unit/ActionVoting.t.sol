// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {ActionVoting, IActionVoting} from 'contracts/ActionVoting.sol';
import {TacticalMeeting, ITacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {Test} from 'forge-std/Test.sol';

contract UnitActionVoting is Test {
  RoleRegistry internal _roleRegistry;
  CircleRegistry internal _circleRegistry;
  TacticalMeeting internal _tacticalMeeting;
  ActionVoting internal _actionVoting;
  GovToken internal _govToken;

  address internal _deployer = makeAddr('deployer');
  address internal _member1 = makeAddr('member1');
  address internal _member2 = makeAddr('member2');
  address internal _facilitator = makeAddr('facilitator');
  address internal _collaborator1 = makeAddr('collaborator1');
  address internal _collaborator2 = makeAddr('collaborator2');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _anchorCircleId;
  uint256 internal _role1Id;
  uint256 internal _role2Id;

  string[] internal _domains;
  string[] internal _accountabilities;

  event VoteCreated(
    uint256 indexed _voteId,
    uint256 indexed _circleId,
    uint256 indexed _outputId,
    address _proposer,
    uint256 _deadline
  );
  event VoteCast(
    uint256 indexed _voteId, address indexed _voter, HolacracyTypes.VoteSupport _support, uint256 _weight
  );
  event CollaboratorWeightGranted(uint256 indexed _circleId, address indexed _collaborator, uint256 _weight);
  event CollaboratorWeightRevoked(uint256 indexed _circleId, address indexed _collaborator);
  event CircleQuorumSet(uint256 indexed _circleId, uint256 _quorum);
  event CircleMintCapSet(uint256 indexed _circleId, uint256 _cap);

  function setUp() external {
    // Deploy implementations and clone
    _roleRegistry = new RoleRegistry();
    _circleRegistry = new CircleRegistry();
    _tacticalMeeting = new TacticalMeeting();
    _actionVoting = new ActionVoting();

    _roleRegistry = RoleRegistry(Clones.clone(address(_roleRegistry)));
    _circleRegistry = CircleRegistry(Clones.clone(address(_circleRegistry)));
    _tacticalMeeting = TacticalMeeting(Clones.clone(address(_tacticalMeeting)));
    _actionVoting = ActionVoting(Clones.clone(address(_actionVoting)));

    // Deploy GovToken with test contract as minter
    _govToken = new GovToken('HolLab Gov', 'GOV', address(this));

    // Initialize
    _roleRegistry.initialize();
    vm.prank(_deployer);
    _circleRegistry.initialize(_roleRegistry, _deployer, address(0));
    _tacticalMeeting.initialize(_circleRegistry, _roleRegistry);
    _actionVoting.initialize(address(_circleRegistry), address(_tacticalMeeting), address(_govToken));

    _domains.push('Engineering');
    _accountabilities.push('Ship features');

    // Create anchor circle and roles
    vm.startPrank(_deployer);
    _anchorCircleId = _circleRegistry.createAnchorCircle('Build holacracy tools');
    _role1Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Dev', 'Develop', _domains, _accountabilities);
    _role2Id = _circleRegistry.createRoleInCircle(_anchorCircleId, 'Design', 'Design', _domains, _accountabilities);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role1Id, _member1);
    _circleRegistry.assignRoleLeadInCircle(_anchorCircleId, _role2Id, _member2);
    _circleRegistry.setElectedRole(_anchorCircleId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);
    _circleRegistry.addCircleLead(_anchorCircleId, _facilitator);
    vm.stopPrank();

    // Mint tokens and delegate
    _govToken.mint(_member1, 100e18);
    _govToken.mint(_member2, 50e18);
    _govToken.mint(_deployer, 200e18);

    vm.prank(_member1);
    _govToken.delegate(_member1);
    vm.prank(_member2);
    _govToken.delegate(_member2);
    vm.prank(_deployer);
    _govToken.delegate(_deployer);

    // Advance one block so getPastVotes works
    vm.roll(block.number + 1);
  }

  /*///////////////////////////////////////////////////////////////
                          HELPERS
  //////////////////////////////////////////////////////////////*/

  function _createOutput() internal returns (uint256 _outputId) {
    vm.prank(_deployer);
    uint256 _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);

    vm.prank(_member1);
    _outputId =
      _tacticalMeeting.recordOutput(_meetingId, HolacracyTypes.OutputType.NextAction, 'Build feature', _member1, _role1Id);
  }

  function _setupQuorum() internal {
    vm.prank(_deployer);
    _actionVoting.setCircleQuorum(_anchorCircleId, 50e18);
  }

  function _createVoteHelper() internal returns (uint256 _voteId, uint256 _outputId) {
    _outputId = _createOutput();
    _setupQuorum();

    vm.prank(_deployer);
    _voteId = _actionVoting.createVote(_outputId, 'Prioritize this action', 1 days);
  }

  /*///////////////////////////////////////////////////////////////
                        INITIALIZATION
  //////////////////////////////////////////////////////////////*/

  function test_initializeRevertsIfAlreadyInitialized() external {
    vm.expectRevert(IActionVoting.ActionVoting_AlreadyInitialized.selector);
    _actionVoting.initialize(address(_circleRegistry), address(_tacticalMeeting), address(_govToken));
  }

  function test_implementationCannotBeInitialized() external {
    ActionVoting _impl = new ActionVoting();

    vm.expectRevert(IActionVoting.ActionVoting_AlreadyInitialized.selector);
    _impl.initialize(address(_circleRegistry), address(_tacticalMeeting), address(_govToken));
  }

  /*///////////////////////////////////////////////////////////////
                      CIRCLE CONFIG
  //////////////////////////////////////////////////////////////*/

  function test_setCircleQuorum() external {
    vm.prank(_deployer);

    vm.expectEmit(true, false, false, true, address(_actionVoting));
    emit CircleQuorumSet(_anchorCircleId, 100e18);

    _actionVoting.setCircleQuorum(_anchorCircleId, 100e18);

    assertEq(_actionVoting.getCircleQuorum(_anchorCircleId), 100e18);
  }

  function test_setCircleQuorumRevertsWhenNotCircleLead() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IActionVoting.ActionVoting_NotCircleLeadOrFacilitator.selector, _anchorCircleId)
    );
    _actionVoting.setCircleQuorum(_anchorCircleId, 100e18);
  }

  function test_setCircleQuorumRevertsWhenZero() external {
    vm.prank(_deployer);
    vm.expectRevert(IActionVoting.ActionVoting_ZeroAmount.selector);
    _actionVoting.setCircleQuorum(_anchorCircleId, 0);
  }

  function test_setCircleMintCap() external {
    vm.prank(_deployer);

    vm.expectEmit(true, false, false, true, address(_actionVoting));
    emit CircleMintCapSet(_anchorCircleId, 500e18);

    _actionVoting.setCircleMintCap(_anchorCircleId, 500e18);

    assertEq(_actionVoting.getCircleMintCap(_anchorCircleId), 500e18);
  }

  function test_setCircleMintCapRevertsWhenNotCircleLead() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IActionVoting.ActionVoting_NotCircleLeadOrFacilitator.selector, _anchorCircleId)
    );
    _actionVoting.setCircleMintCap(_anchorCircleId, 500e18);
  }

  /*///////////////////////////////////////////////////////////////
                    COLLABORATOR WEIGHT
  //////////////////////////////////////////////////////////////*/

  function test_grantCollaboratorWeight() external {
    vm.prank(_deployer);
    _actionVoting.setCircleMintCap(_anchorCircleId, 500e18);

    vm.prank(_deployer);

    vm.expectEmit(true, true, false, true, address(_actionVoting));
    emit CollaboratorWeightGranted(_anchorCircleId, _collaborator1, 100e18);

    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 100e18);

    assertEq(_actionVoting.getCollaboratorWeight(_anchorCircleId, _collaborator1), 100e18);
    assertEq(_actionVoting.getCircleMintedTotal(_anchorCircleId), 100e18);
  }

  function test_grantCollaboratorWeightUpdate() external {
    vm.prank(_deployer);
    _actionVoting.setCircleMintCap(_anchorCircleId, 500e18);

    vm.startPrank(_deployer);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 100e18);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 150e18);
    vm.stopPrank();

    assertEq(_actionVoting.getCollaboratorWeight(_anchorCircleId, _collaborator1), 150e18);
    assertEq(_actionVoting.getCircleMintedTotal(_anchorCircleId), 150e18);
  }

  function test_grantCollaboratorWeightRevertsWhenCapExceeded() external {
    vm.startPrank(_deployer);
    _actionVoting.setCircleMintCap(_anchorCircleId, 100e18);

    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 80e18);

    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_MintCapExceeded.selector, _anchorCircleId, 30e18, 20e18));
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator2, 30e18);
    vm.stopPrank();
  }

  function test_grantCollaboratorWeightWithoutCapSet() external {
    // When cap is 0, no cap enforcement
    vm.prank(_deployer);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 100e18);

    assertEq(_actionVoting.getCollaboratorWeight(_anchorCircleId, _collaborator1), 100e18);
  }

  function test_grantCollaboratorWeightRevertsWhenNotCircleLead() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IActionVoting.ActionVoting_NotCircleLeadOrFacilitator.selector, _anchorCircleId)
    );
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 100e18);
  }

  function test_grantCollaboratorWeightRevertsWhenZeroAddress() external {
    vm.prank(_deployer);
    vm.expectRevert(IActionVoting.ActionVoting_ZeroAddress.selector);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, address(0), 100e18);
  }

  function test_grantCollaboratorWeightRevertsWhenZeroAmount() external {
    vm.prank(_deployer);
    vm.expectRevert(IActionVoting.ActionVoting_ZeroAmount.selector);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 0);
  }

  function test_revokeCollaboratorWeight() external {
    vm.startPrank(_deployer);
    _actionVoting.setCircleMintCap(_anchorCircleId, 500e18);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 100e18);
    vm.stopPrank();

    vm.prank(_deployer);

    vm.expectEmit(true, true, false, false, address(_actionVoting));
    emit CollaboratorWeightRevoked(_anchorCircleId, _collaborator1);

    _actionVoting.revokeCollaboratorWeight(_anchorCircleId, _collaborator1);

    assertEq(_actionVoting.getCollaboratorWeight(_anchorCircleId, _collaborator1), 0);
    assertEq(_actionVoting.getCircleMintedTotal(_anchorCircleId), 0);
  }

  function test_revokeCollaboratorWeightRevertsWhenNotCircleLead() external {
    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IActionVoting.ActionVoting_NotCircleLeadOrFacilitator.selector, _anchorCircleId)
    );
    _actionVoting.revokeCollaboratorWeight(_anchorCircleId, _collaborator1);
  }

  /*///////////////////////////////////////////////////////////////
                      VOTE CREATION
  //////////////////////////////////////////////////////////////*/

  function test_createVoteAsCircleLead() external {
    uint256 _outputId = _createOutput();
    _setupQuorum();

    vm.prank(_deployer);

    vm.expectEmit(true, true, true, false, address(_actionVoting));
    emit VoteCreated(1, _anchorCircleId, _outputId, _deployer, 0);

    uint256 _voteId = _actionVoting.createVote(_outputId, 'Prioritize this', 1 days);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.id, _voteId);
    assertEq(_vote.circleId, _anchorCircleId);
    assertEq(_vote.outputId, _outputId);
    assertEq(_vote.proposer, _deployer);
    assertEq(_vote.reason, 'Prioritize this');
    assertEq(_vote.snapshotBlock, block.number - 1);
    assertEq(_vote.deadline, block.timestamp + 1 days);
    assertEq(_vote.forVotes, 0);
    assertEq(_vote.againstVotes, 0);
    assertEq(_vote.abstainVotes, 0);
    assertTrue(_vote.exists);
  }

  function test_createVoteAsFacilitator() external {
    uint256 _outputId = _createOutput();
    _setupQuorum();

    vm.prank(_facilitator);
    uint256 _voteId = _actionVoting.createVote(_outputId, 'Facilitator vote', 1 days);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.proposer, _facilitator);
  }

  function test_createVoteRevertsWhenNotAuthorized() external {
    uint256 _outputId = _createOutput();
    _setupQuorum();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IActionVoting.ActionVoting_NotCircleLeadOrFacilitator.selector, _anchorCircleId)
    );
    _actionVoting.createVote(_outputId, 'Reason', 1 days);
  }

  function test_createVoteRevertsWhenEmptyReason() external {
    uint256 _outputId = _createOutput();
    _setupQuorum();

    vm.prank(_deployer);
    vm.expectRevert(IActionVoting.ActionVoting_EmptyReason.selector);
    _actionVoting.createVote(_outputId, '', 1 days);
  }

  function test_createVoteRevertsWhenInvalidDuration() external {
    uint256 _outputId = _createOutput();
    _setupQuorum();

    vm.prank(_deployer);
    vm.expectRevert(IActionVoting.ActionVoting_InvalidDuration.selector);
    _actionVoting.createVote(_outputId, 'Reason', 0);
  }

  function test_createVoteRevertsWhenQuorumNotSet() external {
    uint256 _outputId = _createOutput();

    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_QuorumNotSet.selector, _anchorCircleId));
    _actionVoting.createVote(_outputId, 'Reason', 1 days);
  }

  function test_getCircleVotes() external {
    (uint256 _voteId1,) = _createVoteHelper();

    uint256 _outputId2 = _createOutput();
    vm.prank(_deployer);
    uint256 _voteId2 = _actionVoting.createVote(_outputId2, 'Second vote', 1 days);

    uint256[] memory _voteIds = _actionVoting.getCircleVotes(_anchorCircleId);
    assertEq(_voteIds.length, 2);
    assertEq(_voteIds[0], _voteId1);
    assertEq(_voteIds[1], _voteId2);
  }

  /*///////////////////////////////////////////////////////////////
                      CASTING VOTES
  //////////////////////////////////////////////////////////////*/

  function test_castVoteFor() external {
    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_member1);

    vm.expectEmit(true, true, false, true, address(_actionVoting));
    emit VoteCast(_voteId, _member1, HolacracyTypes.VoteSupport.For, 100e18);

    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.forVotes, 100e18);
    assertTrue(_actionVoting.hasVoted(_voteId, _member1));
  }

  function test_castVoteAgainst() external {
    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_member2);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.Against);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.againstVotes, 50e18);
  }

  function test_castVoteAbstain() external {
    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.Abstain);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.abstainVotes, 100e18);
  }

  function test_castVoteCombinedWeight() external {
    // Grant collaborator weight to member1 in addition to their token weight
    vm.startPrank(_deployer);
    _actionVoting.setCircleMintCap(_anchorCircleId, 500e18);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _member1, 25e18);
    vm.stopPrank();

    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.forVotes, 125e18); // 100e18 token + 25e18 collaborator
  }

  function test_castVoteCollaboratorOnly() external {
    // Collaborator with no tokens but has collaborator weight
    vm.startPrank(_deployer);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 30e18);
    vm.stopPrank();

    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_collaborator1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.forVotes, 30e18);
  }

  function test_castVoteRevertsWhenDoubleVote() external {
    (uint256 _voteId,) = _createVoteHelper();

    vm.startPrank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_AlreadyVoted.selector, _voteId, _member1));
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.Against);
    vm.stopPrank();
  }

  function test_castVoteRevertsWhenDeadlinePassed() external {
    (uint256 _voteId,) = _createVoteHelper();

    vm.warp(block.timestamp + 1 days + 1);

    vm.prank(_member1);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_VoteNotActive.selector, _voteId));
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);
  }

  function test_castVoteRevertsWhenNoVotingPower() external {
    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_NoVotingPower.selector, _voteId, _stranger));
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);
  }

  function test_castVoteRevertsWhenVoteNotFound() external {
    vm.prank(_member1);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_VoteNotFound.selector, 999));
    _actionVoting.castVote(999, HolacracyTypes.VoteSupport.For);
  }

  function test_getVoteWeight() external {
    vm.prank(_deployer);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _member1, 25e18);

    (uint256 _voteId,) = _createVoteHelper();

    uint256 _weight = _actionVoting.getVoteWeight(_voteId, _member1);
    assertEq(_weight, 125e18); // 100e18 token + 25e18 collaborator
  }

  /*///////////////////////////////////////////////////////////////
                    STATUS COMPUTATION
  //////////////////////////////////////////////////////////////*/

  function test_statusActive() external {
    (uint256 _voteId,) = _createVoteHelper();

    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Active));
  }

  function test_statusPassed() external {
    (uint256 _voteId,) = _createVoteHelper();

    // member1 has 100e18, quorum is 50e18
    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    vm.warp(block.timestamp + 1 days + 1);

    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Passed));
  }

  function test_statusDefeated() external {
    (uint256 _voteId,) = _createVoteHelper();

    // member2 votes against (50e18), member1 votes for (100e18) but quorum is 50e18
    // Let's set up a scenario where against > for
    vm.prank(_deployer);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.Against); // 200e18 against

    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For); // 100e18 for

    vm.warp(block.timestamp + 1 days + 1);

    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Defeated));
  }

  function test_statusDefeatedWhenQuorumNotMet() external {
    // Set high quorum
    vm.prank(_deployer);
    _actionVoting.setCircleQuorum(_anchorCircleId, 500e18);

    uint256 _outputId = _createOutput();

    vm.prank(_deployer);
    uint256 _voteId = _actionVoting.createVote(_outputId, 'Reason', 1 days);

    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For); // 100e18 < 500e18 quorum

    vm.warp(block.timestamp + 1 days + 1);

    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Defeated));
  }

  function test_statusExpired() external {
    (uint256 _voteId,) = _createVoteHelper();

    // No one votes, deadline passes
    vm.warp(block.timestamp + 1 days + 1);

    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Expired));
  }

  function test_statusPassedAtExactQuorum() external {
    // Quorum is 50e18, member2 has exactly 50e18
    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_member2);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For); // exactly 50e18

    vm.warp(block.timestamp + 1 days + 1);

    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Passed));
  }

  /*///////////////////////////////////////////////////////////////
                  SNAPSHOT INTEGRITY
  //////////////////////////////////////////////////////////////*/

  function test_transferAfterVoteCreationDoesNotAffectWeight() external {
    (uint256 _voteId,) = _createVoteHelper();

    // member1 transfers all tokens to stranger after vote creation
    vm.prank(_member1);
    _govToken.transfer(_stranger, 100e18);

    vm.prank(_stranger);
    _govToken.delegate(_stranger);

    vm.roll(block.number + 1);

    // member1 still votes with snapshot weight
    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.forVotes, 100e18);

    // stranger cannot vote (had no tokens at snapshot)
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_NoVotingPower.selector, _voteId, _stranger));
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);
  }

  function test_undelegatedTokensHaveNoWeight() external {
    // Mint tokens to a new address without delegation
    address _undelegated = makeAddr('undelegated');
    _govToken.mint(_undelegated, 500e18);
    vm.roll(block.number + 1);

    (uint256 _voteId,) = _createVoteHelper();

    vm.prank(_undelegated);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_NoVotingPower.selector, _voteId, _undelegated));
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);
  }

  /*///////////////////////////////////////////////////////////////
                  FULL INTEGRATION FLOW
  //////////////////////////////////////////////////////////////*/

  function test_fullFlow() external {
    // 1. Circle lead sets quorum and mint cap
    vm.startPrank(_deployer);
    _actionVoting.setCircleQuorum(_anchorCircleId, 50e18);
    _actionVoting.setCircleMintCap(_anchorCircleId, 200e18);

    // 2. Grant collaborator weights
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator1, 30e18);
    _actionVoting.grantCollaboratorWeight(_anchorCircleId, _collaborator2, 20e18);
    vm.stopPrank();

    // 3. Hold a tactical meeting and record output
    vm.prank(_deployer);
    uint256 _meetingId = _tacticalMeeting.conveneMeeting(_anchorCircleId);

    vm.prank(_member1);
    uint256 _outputId = _tacticalMeeting.recordOutput(
      _meetingId, HolacracyTypes.OutputType.Project, 'Launch v2', _member1, _role1Id
    );

    // 4. Create a vote on the output
    vm.prank(_deployer);
    uint256 _voteId = _actionVoting.createVote(_outputId, 'Should we prioritize v2 launch?', 3 days);

    // 5. Token holders and collaborators vote
    vm.prank(_member1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For); // 100e18

    vm.prank(_member2);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For); // 50e18

    vm.prank(_collaborator1);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For); // 30e18

    vm.prank(_collaborator2);
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.Abstain); // 20e18

    // 6. Verify vote tally
    HolacracyTypes.ActionVote memory _vote = _actionVoting.getVote(_voteId);
    assertEq(_vote.forVotes, 180e18); // 100 + 50 + 30
    assertEq(_vote.abstainVotes, 20e18);
    assertEq(_vote.againstVotes, 0);

    // 7. Still active
    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Active));

    // 8. Deadline passes -> Passed
    vm.warp(block.timestamp + 3 days + 1);
    assertEq(uint8(_actionVoting.getVoteStatus(_voteId)), uint8(HolacracyTypes.VoteStatus.Passed));

    // 9. Cannot vote after deadline
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_VoteNotActive.selector, _voteId));
    _actionVoting.castVote(_voteId, HolacracyTypes.VoteSupport.For);
  }
}
