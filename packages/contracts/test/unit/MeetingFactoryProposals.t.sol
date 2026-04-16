// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IMeetingFactory, MeetingFactory} from 'contracts/MeetingFactory.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {IRoleRegistry, RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Test} from 'forge-std/Test.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

contract StubENSRegistrarForProposals is IENSSubdomainRegistrar {
  function registerSubnode(
    bytes32,
    address
  ) external {} // solhint-disable-line no-empty-blocks
}

contract UnitMeetingFactoryProposals is Test {
  OrganizationFactory internal _orgFactory;
  MeetingFactory internal _meetingFactory;
  RoleRegistry internal _roleRegistry;

  address internal _deployer = makeAddr('deployer');
  address internal _member = makeAddr('member');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _orgId;

  bytes32 internal constant TENSION = keccak256('we need a curator');
  bytes32 internal constant CONCERN = keccak256('not yet, no budget');

  function _defaultTokenConfig() internal view returns (IOrganizationFactory.TokenConfig memory _cfg) {
    address[] memory _holders = new address[](1);
    _holders[0] = _deployer;
    uint256[] memory _amounts = new uint256[](1);
    _amounts[0] = 1_000_000e18;
    _cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'Proposal Token', tokenSymbol: 'PROP', initialHolders: _holders, initialAmounts: _amounts
    });
  }

  function setUp() external {
    _orgFactory = new OrganizationFactory(address(new RoleRegistry()), address(new StubENSRegistrarForProposals()));
    _meetingFactory = MeetingFactory(Clones.clone(address(new MeetingFactory())));

    vm.prank(_deployer);
    _orgId = _orgFactory.createOrganization('proposal-org', 'Test proposals', _defaultTokenConfig());

    // Pull the cloned RoleRegistry the org was assigned and wire our
    // MeetingFactory clone as its governance process so role mutations work.
    _roleRegistry = RoleRegistry(_orgFactory.getOrganization(_orgId).roleRegistry);
    _roleRegistry.setGovernanceProcess(address(_meetingFactory));

    _meetingFactory.initialize(address(_orgFactory), address(_roleRegistry));

    vm.prank(_deployer);
    _orgFactory.addOrgMember(_orgId, _member);
  }

  /*//////////////////////////////////////////////////////////////
                         HELPERS
  //////////////////////////////////////////////////////////////*/

  function _encodeCreateRole(
    string memory name
  ) internal pure returns (bytes memory) {
    string[] memory domains = new string[](1);
    domains[0] = 'curation';
    string[] memory accts = new string[](1);
    accts[0] = 'publish weekly';
    return abi.encode(uint256(0), name, 'keep the feed sharp', domains, accts);
  }

  function _createCuratorProposal() internal returns (uint256) {
    vm.prank(_member);
    return _meetingFactory.createProposal(
      _orgId, 0, 0, TENSION, HolacracyTypes.ChangeType.CreateRole, _encodeCreateRole('Curator')
    );
  }

  /*//////////////////////////////////////////////////////////////
                         HAPPY PATHS
  //////////////////////////////////////////////////////////////*/

  function test_CreateProposal_StoresRecordAndIncrementsCounter() external {
    uint256 proposalId = _createCuratorProposal();
    assertEq(proposalId, 1);
    assertEq(_meetingFactory.proposalCount(), 1);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(p.id, 1);
    assertEq(p.orgId, _orgId);
    assertEq(p.circleId, 0);
    assertEq(p.proposer, _member);
    assertEq(p.tensionHash, TENSION);
    assertEq(uint8(p.changeType), uint8(HolacracyTypes.ChangeType.CreateRole));
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Draft));
    assertGt(p.submittedAt, 0);
    assertEq(p.resolvedAt, 0);
  }

  function test_AdoptProposal_AppliesChangeAndUpdatesStatus() external {
    uint256 proposalId = _createCuratorProposal();
    uint256 rolesBefore = _roleRegistry.roleCount();

    vm.prank(_deployer); // admin
    uint256 resultId = _meetingFactory.adoptProposal(proposalId);

    assertEq(resultId, rolesBefore + 1);
    assertEq(_roleRegistry.roleCount(), rolesBefore + 1);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
    assertGt(p.resolvedAt, 0);
  }

  function test_DiscardProposal_NoRoleMutation() external {
    uint256 proposalId = _createCuratorProposal();
    uint256 rolesBefore = _roleRegistry.roleCount();

    vm.prank(_deployer);
    _meetingFactory.discardProposal(proposalId);

    assertEq(_roleRegistry.roleCount(), rolesBefore);
    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Discarded));
    assertGt(p.resolvedAt, 0);
  }

  function test_RaiseObjection_StoresRecord() external {
    uint256 proposalId = _createCuratorProposal();

    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, CONCERN);
    assertEq(objectionId, 1);
    assertEq(_meetingFactory.objectionCount(), 1);

    IMeetingFactory.ObjectionRecord memory o = _meetingFactory.getObjection(objectionId);
    assertEq(o.proposalId, proposalId);
    assertEq(o.objector, _member);
    assertEq(o.concernHash, CONCERN);
    assertEq(uint8(o.status), uint8(HolacracyTypes.ObjectionStatus.Raised));
    assertGt(o.raisedAt, 0);
    assertEq(o.resolvedAt, 0);
  }

  function test_ResolveObjection_ByObjector() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, CONCERN);

    vm.prank(_member);
    _meetingFactory.resolveObjection(objectionId);

    IMeetingFactory.ObjectionRecord memory o = _meetingFactory.getObjection(objectionId);
    assertEq(uint8(o.status), uint8(HolacracyTypes.ObjectionStatus.Resolved));
    assertGt(o.resolvedAt, 0);
  }

  function test_ResolveObjection_ByAdmin() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, CONCERN);

    vm.prank(_deployer); // admin, not the objector
    _meetingFactory.resolveObjection(objectionId);

    IMeetingFactory.ObjectionRecord memory o = _meetingFactory.getObjection(objectionId);
    assertEq(uint8(o.status), uint8(HolacracyTypes.ObjectionStatus.Resolved));
  }

  function test_AdoptWithUnresolvedObjections_Succeeds() external {
    // Documents the intentional non-enforcement: contract trusts the
    // coordinator. Event log + objection records still reflect the
    // unresolved state for off-chain audit.
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    _meetingFactory.raiseObjection(proposalId, CONCERN);

    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
  }

  function test_AdoptProposal_ExpandsRoleToCircle() external {
    // 1. Create a role first
    uint256 createProposalId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createProposalId);

    // 2. Propose expanding it to a circle
    bytes memory expandData = abi.encode(roleId);
    vm.prank(_member);
    uint256 expandProposalId =
      _meetingFactory.createProposal(_orgId, 0, 0, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData);

    // 3. Adopt
    vm.prank(_deployer);
    uint256 resultId = _meetingFactory.adoptProposal(expandProposalId);
    assertEq(resultId, roleId);

    // 4. Verify flag
    HolacracyTypes.Role memory role = _roleRegistry.getRole(roleId);
    assertTrue(role.isCircle);
  }

  function test_ExpandRoleToCircle_RevertsIfAlreadyCircle() external {
    uint256 createProposalId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createProposalId);

    // Expand once
    bytes memory expandData = abi.encode(roleId);
    vm.prank(_member);
    uint256 p1 =
      _meetingFactory.createProposal(_orgId, 0, 0, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData);
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(p1);

    // Expand again — should revert
    vm.prank(_member);
    uint256 p2 =
      _meetingFactory.createProposal(_orgId, 0, 0, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData);
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_AlreadyCircle.selector, roleId));
    _meetingFactory.adoptProposal(p2);
  }

  /*//////////////////////////////////////////////////////////////
                         AUTH FAILURES
  //////////////////////////////////////////////////////////////*/

  function test_CreateProposal_RevertsNonMember() external {
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgMember.selector, _orgId, _stranger));
    _meetingFactory.createProposal(
      _orgId, 0, 0, TENSION, HolacracyTypes.ChangeType.CreateRole, _encodeCreateRole('Curator')
    );
  }

  function test_AdoptProposal_RevertsNonAdmin() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member); // member but not admin
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgAdmin.selector, _orgId, _member));
    _meetingFactory.adoptProposal(proposalId);
  }

  function test_DiscardProposal_RevertsNonAdmin() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgAdmin.selector, _orgId, _member));
    _meetingFactory.discardProposal(proposalId);
  }

  function test_RaiseObjection_RevertsNonMember() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgMember.selector, _orgId, _stranger));
    _meetingFactory.raiseObjection(proposalId, CONCERN);
  }

  function test_ResolveObjection_RevertsNonObjectorNonAdmin() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, CONCERN);

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotObjectorOrAdmin.selector, objectionId, _stranger)
    );
    _meetingFactory.resolveObjection(objectionId);
  }

  /*//////////////////////////////////////////////////////////////
                       STATE MACHINE EDGES
  //////////////////////////////////////////////////////////////*/

  function test_AdoptTwice_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_InvalidProposalStatus.selector, proposalId, HolacracyTypes.ProposalStatus.Adopted
      )
    );
    _meetingFactory.adoptProposal(proposalId);
  }

  function test_AdoptAfterDiscard_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_deployer);
    _meetingFactory.discardProposal(proposalId);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_InvalidProposalStatus.selector,
        proposalId,
        HolacracyTypes.ProposalStatus.Discarded
      )
    );
    _meetingFactory.adoptProposal(proposalId);
  }

  function test_DiscardAfterAdopt_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_InvalidProposalStatus.selector, proposalId, HolacracyTypes.ProposalStatus.Adopted
      )
    );
    _meetingFactory.discardProposal(proposalId);
  }

  function test_RaiseObjection_OnNonDraftProposal_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    vm.prank(_member);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_InvalidProposalStatus.selector, proposalId, HolacracyTypes.ProposalStatus.Adopted
      )
    );
    _meetingFactory.raiseObjection(proposalId, CONCERN);
  }

  function test_ResolveObjectionTwice_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, CONCERN);
    vm.prank(_member);
    _meetingFactory.resolveObjection(objectionId);

    vm.prank(_member);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_InvalidObjectionStatus.selector,
        objectionId,
        HolacracyTypes.ObjectionStatus.Resolved
      )
    );
    _meetingFactory.resolveObjection(objectionId);
  }

  function test_NonexistentProposal_Reverts() external {
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_ProposalNotFound.selector, uint256(999)));
    _meetingFactory.adoptProposal(999);
  }

  function test_NonexistentObjection_Reverts() external {
    vm.prank(_member);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_ObjectionNotFound.selector, uint256(999)));
    _meetingFactory.resolveObjection(999);
  }

  /*//////////////////////////////////////////////////////////////
                       CHANGE-TYPE COVERAGE
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposal_AmendRoleChangeType() external {
    // First create a role through the proposal path.
    uint256 createId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createId);

    // Then amend it through a second proposal — proves AmendRole flows
    // through the shared _applyChange helper identically.
    string[] memory domains = new string[](0);
    string[] memory accts = new string[](1);
    accts[0] = 'publish daily';
    bytes memory amendData = abi.encode(roleId, 'Curator v2', 'go faster', domains, accts);

    vm.prank(_member);
    uint256 amendId =
      _meetingFactory.createProposal(_orgId, 0, 0, bytes32(0), HolacracyTypes.ChangeType.AmendRole, amendData);
    vm.prank(_deployer);
    uint256 result = _meetingFactory.adoptProposal(amendId);
    assertEq(result, roleId);
  }
}
