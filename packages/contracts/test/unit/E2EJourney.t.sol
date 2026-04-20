// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test} from 'forge-std/Test.sol';
import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';

import {ActionVoting, IActionVoting} from 'contracts/ActionVoting.sol';
import {IMeetingComponentsFactory, MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {IMeetingFactory, MeetingFactory} from 'contracts/MeetingFactory.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {RoleDataRegistry} from 'contracts/RoleDataRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovToken} from 'contracts/governance/GovToken.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/// @notice Stub ENS registrar for testing
contract StubENSRegistrar is IENSSubdomainRegistrar {
  function registerSubnode(
    bytes32,
    address
  ) external {} // solhint-disable-line no-empty-blocks
}

/**
 * @title E2EJourney
 * @notice End-to-end tests covering the core user journey.
 */
contract E2EJourney is Test {
  OrganizationFactory internal _orgFactory;
  MeetingComponentsFactory internal _mcFactory;

  MeetingFactory internal _mf;
  ActionVoting internal _av;

  address internal _founder = makeAddr('founder');
  address internal _alice = makeAddr('alice');
  address internal _bob = makeAddr('bob');
  address internal _carol = makeAddr('carol');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _orgId;
  IOrganizationInstance internal _org;

  function setUp() external {
    StubENSRegistrar _ensReg = new StubENSRegistrar();
    RoleRegistry _rrImpl = new RoleRegistry();
    OrganizationInstance _oiImpl = new OrganizationInstance();
    MeetingFactory _mfImpl = new MeetingFactory();
    ActionVoting _avImpl = new ActionVoting();
    RoleDataRegistry _rdrImpl = new RoleDataRegistry();
    _mcFactory = new MeetingComponentsFactory(address(_mfImpl), address(_avImpl), address(_rdrImpl));

    _orgFactory =
      new OrganizationFactory(address(_rrImpl), address(_oiImpl), address(_ensReg), address(_mcFactory));
  }

  function _tokenConfig() internal view returns (IOrganizationFactory.TokenConfig memory _cfg) {
    address[] memory _holders = new address[](1);
    _holders[0] = _founder;
    uint256[] memory _amounts = new uint256[](1);
    _amounts[0] = 1_000_000e18;

    _cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'Journey Token', tokenSymbol: 'JRN', initialHolders: _holders, initialAmounts: _amounts
    });
  }

  function _createOrg() internal {
    vm.prank(_founder);
    (uint256 _newOrgId, address _instance) =
      _orgFactory.createOrganization('acme-dao', 'Build the future', _tokenConfig());
    _orgId = _newOrgId;
    _org = IOrganizationInstance(_instance);
  }

  function _deployMeetingComponents() internal {
    string memory _subname = _org.subname();
    vm.prank(_founder);
    IMeetingComponentsFactory.Deployment memory _dep = _mcFactory.deploy(_subname, address(_orgFactory));
    _mf = MeetingFactory(_dep.meetingFactory);
    _av = ActionVoting(_dep.actionVoting);
  }

  // ── Journey 1: Org creation + membership ────────────────────────────────

  function test_Journey_CreateOrgAndMembership() external {
    _createOrg();

    assertTrue(_org.isAdmin(_founder));
    assertTrue(_org.isMember(_founder));
    assertFalse(_org.isAdmin(_stranger));
    assertFalse(_org.isMember(_stranger));

    assertEq(_org.subname(), 'acme-dao');
    assertEq(_org.creator(), _founder);
    assertTrue(_org.token() != address(0));
    assertTrue(_org.roleRegistry() != address(0));

    GovToken _token = GovToken(_org.token());
    assertEq(_token.balanceOf(_founder), 1_000_000e18);
  }

  // ── Journey 2: Join request flow ────────────────────────────────────────

  function test_Journey_JoinRequestApprove() external {
    _createOrg();

    vm.prank(_alice);
    vm.expectEmit(true, true, true, true);
    emit IOrganizationInstance.JoinRequested(1, _alice, 'I want to contribute');
    uint256 _requestId = _org.requestToJoin('I want to contribute');
    assertEq(_requestId, 1);

    assertTrue(_org.hasPendingRequest(_alice));
    assertFalse(_org.isMember(_alice));

    vm.prank(_founder);
    _org.approveJoinRequest(_alice);

    assertTrue(_org.isMember(_alice));
    assertFalse(_org.hasPendingRequest(_alice));
  }

  function test_Journey_JoinRequestReject() external {
    _createOrg();

    vm.prank(_bob);
    _org.requestToJoin('Let me in');

    vm.prank(_founder);
    _org.rejectJoinRequest(_bob);

    assertFalse(_org.isMember(_bob));
    assertFalse(_org.hasPendingRequest(_bob));
  }

  function test_Journey_JoinRequestCannotDuplicate() external {
    _createOrg();

    vm.startPrank(_alice);
    _org.requestToJoin('First attempt');

    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationInstance.OrganizationInstance_JoinRequestAlreadyPending.selector, _alice)
    );
    _org.requestToJoin('Second attempt');
    vm.stopPrank();
  }

  function test_Journey_JoinRequestCanReapplyAfterRejection() external {
    _createOrg();

    vm.prank(_alice);
    _org.requestToJoin('First try');
    vm.prank(_founder);
    _org.rejectJoinRequest(_alice);

    vm.prank(_alice);
    uint256 _newId = _org.requestToJoin('Second try');
    assertEq(_newId, 2);
    assertTrue(_org.hasPendingRequest(_alice));
  }

  function test_Journey_OnlyAdminCanApproveOrReject() external {
    _createOrg();

    vm.prank(_alice);
    _org.requestToJoin('Hello');

    vm.prank(_bob);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.approveJoinRequest(_alice);

    vm.prank(_bob);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.rejectJoinRequest(_alice);
  }

  // ── Journey 3: Admin management ─────────────────────────────────────────

  function test_Journey_AdminCanPromoteAndDemote() external {
    _createOrg();

    vm.startPrank(_founder);
    _org.addMember(_alice);
    _org.addAdmin(_alice);
    vm.stopPrank();

    assertTrue(_org.isAdmin(_alice));

    vm.prank(_bob);
    _org.requestToJoin('Bob here');
    vm.prank(_alice);
    _org.approveJoinRequest(_bob);
    assertTrue(_org.isMember(_bob));

    vm.prank(_founder);
    _org.removeAdmin(_alice);
    assertFalse(_org.isAdmin(_alice));
    assertTrue(_org.isMember(_alice));
  }

  function test_Journey_RemoveMember() external {
    _createOrg();

    vm.prank(_founder);
    _org.addMember(_alice);
    assertTrue(_org.isMember(_alice));

    vm.prank(_founder);
    _org.removeMember(_alice);
    assertFalse(_org.isMember(_alice));
  }

  // ── Journey 4: Meeting lifecycle ────────────────────────────────────────

  function test_Journey_TacticalMeetingWithOutputs() external {
    _createOrg();
    _deployMeetingComponents();

    vm.prank(_founder);
    _org.addMember(_alice);

    vm.prank(_founder);
    uint256 _meetingId = _mf.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
    assertEq(_meetingId, 1);

    vm.prank(_alice);
    uint256 _itemId1 =
      _mf.recordOutput(_meetingId, _orgId, HolacracyTypes.OutputType.NextAction, 'Set up project board', _alice, 0);
    assertEq(_itemId1, 1);

    vm.prank(_founder);
    uint256 _itemId2 =
      _mf.recordOutput(_meetingId, _orgId, HolacracyTypes.OutputType.Project, 'Launch website', _founder, 0);
    assertEq(_itemId2, 2);

    vm.prank(_founder);
    _mf.endMeeting(_meetingId, _orgId, IMeetingFactory.MeetingKind.Tactical);
  }

  function test_Journey_StrangerCannotStartMeeting() external {
    _createOrg();
    _deployMeetingComponents();

    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgMember.selector, _orgId, _stranger));
    _mf.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
  }

  // ── Journey 5: Action voting ────────────────────────────────────────────

  function test_Journey_VoteOnMeetingOutput() external {
    _createOrg();
    _deployMeetingComponents();

    GovToken _token = GovToken(_org.token());
    vm.startPrank(_founder);
    _org.addMember(_alice);
    _org.addAdmin(_alice);
    _org.addMember(_bob);
    _token.transfer(_alice, 200_000e18);
    _token.transfer(_bob, 100_000e18);
    vm.stopPrank();

    vm.prank(_founder);
    _token.delegate(_founder);
    vm.prank(_alice);
    _token.delegate(_alice);
    vm.prank(_bob);
    _token.delegate(_bob);

    vm.roll(block.number + 1);

    vm.prank(_founder);
    _av.setCircleQuorum(_orgId, 100_000e18);

    vm.prank(_founder);
    _mf.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
    vm.prank(_alice);
    _mf.recordOutput(1, _orgId, HolacracyTypes.OutputType.NextAction, 'Ship MVP', _alice, 0);

    vm.prank(_founder);
    uint256 _voteId = _av.createVote(_orgId, 1, 'Should we prioritize this?', 3 days);
    assertEq(_voteId, 1);

    assertEq(_av.getVoteWeight(_voteId, _alice), 200_000e18);
    assertEq(_av.getVoteWeight(_voteId, _bob), 100_000e18);

    vm.prank(_alice);
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.For);
    vm.prank(_bob);
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.Against);

    assertTrue(_av.hasVoted(_voteId, _alice));
    assertTrue(_av.hasVoted(_voteId, _bob));
    assertFalse(_av.hasVoted(_voteId, _founder));

    vm.prank(_alice);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_AlreadyVoted.selector, _voteId, _alice));
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    vm.warp(block.timestamp + 3 days + 1);
    vm.prank(_founder);
    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_VoteNotActive.selector, _voteId));
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.For);
  }

  // ── Journey 6: Collaborator weight ──────────────────────────────────────

  function test_Journey_CollaboratorVotesWithGrantedWeight() external {
    _createOrg();
    _deployMeetingComponents();

    GovToken _token = GovToken(_org.token());
    vm.prank(_founder);
    _token.delegate(_founder);
    vm.roll(block.number + 1);

    vm.startPrank(_founder);
    _av.setCircleQuorum(_orgId, 10e18);
    _av.setCircleMintCap(_orgId, 500e18);
    _av.grantCollaboratorWeight(_orgId, _carol, 50e18);
    vm.stopPrank();

    assertEq(_av.getCollaboratorWeight(_orgId, _carol), 50e18);
    assertEq(_av.getCircleMintedTotal(_orgId), 50e18);
    assertEq(_token.balanceOf(_carol), 0);

    vm.prank(_founder);
    uint256 _voteId = _av.createVote(_orgId, 1, 'Community input needed', 1 days);

    assertEq(_av.getVoteWeight(_voteId, _carol), 50e18);
    vm.prank(_carol);
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.For);

    vm.prank(_founder);
    _av.revokeCollaboratorWeight(_orgId, _carol);
    assertEq(_av.getCollaboratorWeight(_orgId, _carol), 0);
    assertEq(_av.getCircleMintedTotal(_orgId), 0);
  }

  function test_Journey_MintCapEnforced() external {
    _createOrg();
    _deployMeetingComponents();

    vm.startPrank(_founder);
    _av.setCircleMintCap(_orgId, 100e18);
    _av.grantCollaboratorWeight(_orgId, _alice, 80e18);

    vm.expectRevert(abi.encodeWithSelector(IActionVoting.ActionVoting_MintCapExceeded.selector, _orgId, 30e18, 20e18));
    _av.grantCollaboratorWeight(_orgId, _bob, 30e18);

    _av.grantCollaboratorWeight(_orgId, _bob, 20e18);
    assertEq(_av.getCircleMintedTotal(_orgId), 100e18);
    vm.stopPrank();
  }

  // ── Journey 7: Full lifecycle ───────────────────────────────────────────

  function test_Journey_FullLifecycle() external {
    _createOrg();
    _deployMeetingComponents();

    GovToken _token = GovToken(_org.token());

    vm.prank(_alice);
    _org.requestToJoin('Alice here, ready to build');
    vm.prank(_bob);
    _org.requestToJoin('Bob reporting for duty');

    vm.startPrank(_founder);
    _org.approveJoinRequest(_alice);
    _org.approveJoinRequest(_bob);
    _token.transfer(_alice, 100_000e18);
    _token.transfer(_bob, 50_000e18);
    vm.stopPrank();

    vm.prank(_founder);
    _org.addAdmin(_alice);

    vm.prank(_founder);
    _token.delegate(_founder);
    vm.prank(_alice);
    _token.delegate(_alice);
    vm.prank(_bob);
    _token.delegate(_bob);
    vm.roll(block.number + 1);

    vm.startPrank(_founder);
    _av.setCircleQuorum(_orgId, 50_000e18);
    _av.setCircleMintCap(_orgId, 200_000e18);
    vm.stopPrank();

    vm.prank(_founder);
    _av.grantCollaboratorWeight(_orgId, _carol, 25_000e18);

    vm.prank(_alice);
    uint256 _meetingId = _mf.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);

    vm.prank(_alice);
    _mf.recordOutput(_meetingId, _orgId, HolacracyTypes.OutputType.NextAction, 'Design landing page', _alice, 0);
    vm.prank(_bob);
    _mf.recordOutput(_meetingId, _orgId, HolacracyTypes.OutputType.Project, 'Token distribution plan', _bob, 0);

    vm.prank(_alice);
    _mf.endMeeting(_meetingId, _orgId, IMeetingFactory.MeetingKind.Tactical);

    vm.prank(_alice);
    uint256 _voteId = _av.createVote(_orgId, 1, 'Prioritize landing page?', 2 days);

    vm.prank(_alice);
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.For);
    vm.prank(_bob);
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.For);
    vm.prank(_carol);
    _av.castVote(_voteId, HolacracyTypes.VoteSupport.Abstain);

    assertTrue(_av.hasVoted(_voteId, _alice));
    assertTrue(_av.hasVoted(_voteId, _bob));
    assertTrue(_av.hasVoted(_voteId, _carol));
    assertFalse(_av.hasVoted(_voteId, _founder));
  }

  // ── Journey 8: Multi-org isolation ──────────────────────────────────────

  function test_Journey_MultiOrgIsolation() external {
    _createOrg();
    uint256 _org1Id = _orgId;
    IOrganizationInstance _org1 = _org;

    vm.prank(_alice);
    (uint256 _org2Id, address _org2Addr) =
      _orgFactory.createOrganization('beta-dao', 'Another DAO', _tokenConfig());
    IOrganizationInstance _org2 = IOrganizationInstance(_org2Addr);

    assertTrue(_org1.isAdmin(_founder));
    assertFalse(_org2.isAdmin(_founder));
    assertFalse(_org1.isAdmin(_alice));
    assertTrue(_org2.isAdmin(_alice));

    vm.prank(_bob);
    _org2.requestToJoin('Join org2');
    vm.prank(_founder);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org2.approveJoinRequest(_bob);

    vm.prank(_alice);
    _org2.approveJoinRequest(_bob);
    assertTrue(_org2.isMember(_bob));
    assertFalse(_org1.isMember(_bob));

    _org1Id; // silence unused warning (kept for test narrative clarity)
    _org2Id;
  }

  // ── Journey 9: MeetingComponentsFactory ─────────────────────────────────

  function test_Journey_MeetingComponentsFactoryDeploy() external {
    _createOrg();

    string memory _subname = _org.subname();
    vm.prank(_founder);
    IMeetingComponentsFactory.Deployment memory _dep = _mcFactory.deploy(_subname, address(_orgFactory));

    assertTrue(_dep.meetingFactory != address(0));
    assertTrue(_dep.actionVoting != address(0));

    MeetingFactory _mfClone = MeetingFactory(_dep.meetingFactory);
    ActionVoting _avClone = ActionVoting(_dep.actionVoting);

    vm.prank(_founder);
    uint256 _meetingId = _mfClone.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
    assertEq(_meetingId, 1);

    address _instance = address(_org);
    address _tokenAddr = _org.token();

    vm.expectRevert(Initializable.InvalidInitialization.selector);
    _mfClone.initialize(_orgId, _instance, address(0));

    vm.expectRevert(Initializable.InvalidInitialization.selector);
    _avClone.initialize(_orgId, _instance, address(0), _tokenAddr);
  }
}
