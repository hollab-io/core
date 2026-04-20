// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IMeetingFactory, MeetingFactory} from 'contracts/MeetingFactory.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {IRoleRegistry, RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Test} from 'forge-std/Test.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

contract StubENSRegistrarForProposals is IENSSubdomainRegistrar {
  function registerSubnode(
    bytes32,
    address
  ) external {} // solhint-disable-line no-empty-blocks
}

contract UnitMeetingFactoryProposals is Test {
  OrganizationFactory internal _orgFactory;
  IOrganizationInstance internal _org;
  MeetingFactory internal _meetingFactory;
  RoleRegistry internal _roleRegistry;

  address internal _deployer = makeAddr('deployer');
  address internal _member = makeAddr('member');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _orgId;
  uint256 internal _anchorCircleId;
  uint256 internal _anchorRoleId;

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
    _orgFactory = new OrganizationFactory(
      address(new RoleRegistry()),
      address(new OrganizationInstance()),
      address(new StubENSRegistrarForProposals()),
      address(0)
    );
    _meetingFactory = MeetingFactory(Clones.clone(address(new MeetingFactory())));

    vm.prank(_deployer);
    (uint256 _newOrgId, address _instance) =
      _orgFactory.createOrganization('proposal-org', 'Test proposals', _defaultTokenConfig());
    _orgId = _newOrgId;
    _org = IOrganizationInstance(_instance);

    _roleRegistry = RoleRegistry(_org.roleRegistry());
    _anchorCircleId = _roleRegistry.anchorCircleId();
    _anchorRoleId = _roleRegistry.getCircle(_anchorCircleId).roleId;
    assertTrue(_roleRegistry.isRoleLead(_anchorRoleId, _deployer), 'deployer should be anchor role lead');

    // Instance is now the RoleRegistry factory (after transferFactory in createOrganization).
    vm.prank(_instance);
    _roleRegistry.setGovernanceProcess(address(_meetingFactory));

    _meetingFactory.initialize(_orgId, _instance, address(_roleRegistry));

    vm.prank(_deployer);
    _org.addMember(_member);

    _electAsAnchorRoleLead(_member);
  }

  /*//////////////////////////////////////////////////////////////
                         HELPERS
  //////////////////////////////////////////////////////////////*/

  function _encodeCreateRole(
    string memory name
  ) internal view returns (bytes memory) {
    string[] memory domains = new string[](1);
    domains[0] = 'curation';
    string[] memory accts = new string[](1);
    accts[0] = 'publish weekly';
    return abi.encode(_anchorCircleId, name, 'keep the feed sharp', domains, accts);
  }

  function _createCuratorProposal() internal returns (uint256) {
    vm.prank(_deployer);
    return _meetingFactory.createProposal(
      _orgId,
      _anchorCircleId,
      _anchorRoleId,
      TENSION,
      HolacracyTypes.ChangeType.CreateRole,
      _encodeCreateRole('Curator')
    );
  }

  function _electAsAnchorRoleLead(
    address _candidate
  ) internal {
    bytes memory data = abi.encode(_anchorRoleId, _candidate, address(0));
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.Election, data
    );
    _meetingFactory.adoptProposal(pid);
  }

  function _buildSubCircleWithStrangerAsLead() internal returns (uint256 subRoleId) {
    uint256 createPid = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 curatorRoleId = _meetingFactory.adoptProposal(createPid);
    bytes memory electCuratorData = abi.encode(curatorRoleId, _deployer, address(0));
    vm.prank(_deployer);
    uint256 electCuratorPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.Election, electCuratorData
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(electCuratorPid);

    bytes memory expandData = abi.encode(curatorRoleId);
    vm.prank(_deployer);
    uint256 expandPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData
    );
    vm.prank(_deployer);
    uint256 subCircleId = _meetingFactory.adoptProposal(expandPid);

    string[] memory domains = new string[](0);
    string[] memory accts = new string[](1);
    accts[0] = 'review inbound';
    bytes memory subRoleData = abi.encode(subCircleId, 'SubHelper', 'help', domains, accts);
    vm.prank(_deployer);
    uint256 subPid = _meetingFactory.createProposal(
      _orgId, subCircleId, curatorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRole, subRoleData
    );
    vm.prank(_deployer);
    subRoleId = _meetingFactory.adoptProposal(subPid);

    vm.prank(_deployer);
    _org.addMember(_stranger);
    bytes memory electStrangerData = abi.encode(subRoleId, _stranger, address(0));
    vm.prank(_deployer);
    uint256 electStrangerPid = _meetingFactory.createProposal(
      _orgId, subCircleId, curatorRoleId, TENSION, HolacracyTypes.ChangeType.Election, electStrangerData
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(electStrangerPid);
  }

  /*//////////////////////////////////////////////////////////////
                         HAPPY PATHS
  //////////////////////////////////////////////////////////////*/

  function test_CreateProposal_StoresRecordAndIncrementsCounter() external {
    uint256 rolesBefore = _roleRegistry.roleCount();
    uint256 proposalId = _createCuratorProposal();
    assertEq(proposalId, _meetingFactory.proposalCount());

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(p.id, proposalId);
    assertEq(p.orgId, _orgId);
    assertEq(p.circleId, _anchorCircleId);
    assertEq(p.proposer, _deployer);
    assertEq(p.proposerRoleId, _anchorRoleId);
    assertEq(p.tensionHash, TENSION);
    assertEq(uint8(p.changeType), uint8(HolacracyTypes.ChangeType.CreateRole));
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Draft));
    assertGt(p.submittedAt, 0);
    assertEq(p.resolvedAt, 0);
    assertEq(_roleRegistry.roleCount(), rolesBefore);
  }

  function test_AdoptProposal_AppliesChangeAndUpdatesStatus() external {
    uint256 proposalId = _createCuratorProposal();
    uint256 rolesBefore = _roleRegistry.roleCount();

    vm.prank(_member);
    uint256 resultId = _meetingFactory.adoptProposal(proposalId);

    assertEq(resultId, rolesBefore + 1);
    assertEq(_roleRegistry.roleCount(), rolesBefore + 1);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
    assertGt(p.resolvedAt, 0);
  }

  function test_DiscardProposal_ByProposer_NoRoleMutation() external {
    uint256 proposalId = _createCuratorProposal();
    uint256 rolesBefore = _roleRegistry.roleCount();

    vm.prank(_deployer);
    _meetingFactory.discardProposal(proposalId);

    assertEq(_roleRegistry.roleCount(), rolesBefore);
    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Discarded));
    assertGt(p.resolvedAt, 0);
  }

  function test_DiscardProposal_ByFacilitator_NoRoleMutation() external {
    address facilitator = makeAddr('facilitator');
    vm.prank(_deployer);
    _meetingFactory.setCircleFacilitator(_anchorCircleId, facilitator);

    uint256 proposalId = _createCuratorProposal();
    uint256 rolesBefore = _roleRegistry.roleCount();

    vm.prank(facilitator);
    _meetingFactory.discardProposal(proposalId);

    assertEq(_roleRegistry.roleCount(), rolesBefore);
    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Discarded));
  }

  function test_RaiseObjection_StoresRecord() external {
    uint256 proposalId = _createCuratorProposal();

    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);
    assertEq(objectionId, 1);
    assertEq(_meetingFactory.objectionCount(), 1);

    IMeetingFactory.ObjectionRecord memory o = _meetingFactory.getObjection(objectionId);
    assertEq(o.proposalId, proposalId);
    assertEq(o.objector, _member);
    assertEq(o.objectorRoleId, _anchorRoleId);
    assertEq(o.concernHash, CONCERN);
    assertEq(uint8(o.status), uint8(HolacracyTypes.ObjectionStatus.Raised));
    assertGt(o.raisedAt, 0);
    assertEq(o.resolvedAt, 0);
  }

  function test_ResolveObjection_ByObjector() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(_member);
    _meetingFactory.resolveObjection(objectionId);

    IMeetingFactory.ObjectionRecord memory o = _meetingFactory.getObjection(objectionId);
    assertEq(uint8(o.status), uint8(HolacracyTypes.ObjectionStatus.Resolved));
    assertGt(o.resolvedAt, 0);
  }

  function test_ResolveObjection_ByFacilitator() external {
    address facilitator = makeAddr('facilitator');
    vm.prank(_deployer);
    _org.addMember(facilitator);
    vm.prank(_deployer);
    _meetingFactory.setCircleFacilitator(_anchorCircleId, facilitator);

    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(facilitator);
    _meetingFactory.resolveObjection(objectionId);

    IMeetingFactory.ObjectionRecord memory o = _meetingFactory.getObjection(objectionId);
    assertEq(uint8(o.status), uint8(HolacracyTypes.ObjectionStatus.Resolved));
  }

  function test_ResolveObjection_AdminCannotResolve() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotObjectorOrFacilitator.selector, objectionId, _deployer)
    );
    _meetingFactory.resolveObjection(objectionId);
  }

  function test_AdoptWithUnresolvedObjections_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_UnresolvedObjections.selector, proposalId, 1));
    _meetingFactory.adoptProposal(proposalId);
  }

  function test_AdoptAfterResolvingObjections_Succeeds() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(_member);
    _meetingFactory.resolveObjection(objectionId);

    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
  }

  function test_AdoptProposal_ExpandsRoleToCircle() external {
    uint256 createProposalId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createProposalId);

    bytes memory expandData = abi.encode(roleId);
    vm.prank(_deployer);
    uint256 expandProposalId = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData
    );

    uint256 circlesBefore = _roleRegistry.circleCount();
    vm.prank(_deployer);
    uint256 newCircleId = _meetingFactory.adoptProposal(expandProposalId);

    assertEq(newCircleId, circlesBefore + 1);
    HolacracyTypes.Role memory role = _roleRegistry.getRole(roleId);
    assertTrue(role.isCircle);
    HolacracyTypes.Circle memory subCircle = _roleRegistry.getCircle(newCircleId);
    assertEq(subCircle.parentCircleId, _anchorCircleId);
    assertEq(subCircle.roleId, roleId);
    assertFalse(subCircle.isAnchor);
  }

  function test_ExpandRoleToCircle_RevertsIfAlreadyCircle() external {
    uint256 createProposalId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createProposalId);

    bytes memory expandData = abi.encode(roleId);
    vm.prank(_deployer);
    uint256 p1 = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(p1);

    vm.prank(_deployer);
    uint256 p2 = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData
    );
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_AlreadyCircle.selector, roleId));
    _meetingFactory.adoptProposal(p2);
  }

  /*//////////////////////////////////////////////////////////////
                    REPRESENTATION RULE (§5.3)
  //////////////////////////////////////////////////////////////*/

  function test_CreateProposal_RevertsIfProposerIsNotRoleLead() external {
    address ghost = makeAddr('ghost');
    vm.prank(_deployer);
    _org.addMember(ghost);

    vm.prank(ghost);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotRoleLead.selector, _anchorRoleId, ghost));
    _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRole, _encodeCreateRole('Ghost')
    );
  }

  function test_RaiseObjection_RevertsIfObjectorIsNotRoleLead() external {
    address ghost = makeAddr('ghost');
    vm.prank(_deployer);
    _org.addMember(ghost);

    uint256 proposalId = _createCuratorProposal();

    vm.prank(ghost);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotRoleLead.selector, _anchorRoleId, ghost));
    _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);
  }

  function test_RaiseObjection_ByFacilitator_BypassesRepRule() external {
    address facilitator = makeAddr('facilitator');
    vm.prank(_deployer);
    _org.addMember(facilitator);
    vm.prank(_deployer);
    _meetingFactory.setCircleFacilitator(_anchorCircleId, facilitator);

    uint256 proposalId = _createCuratorProposal();

    vm.prank(facilitator);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, 0, CONCERN);
    assertEq(_meetingFactory.getObjection(objectionId).objector, facilitator);
  }

  function test_RaiseObjection_RevertsIfObjectorRoleInOtherCircle() external {
    uint256 subRoleId = _buildSubCircleWithStrangerAsLead();
    uint256 anchorProposalId = _createCuratorProposal();

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_ObjectorRoleNotInCircle.selector, subRoleId, _anchorCircleId
      )
    );
    _meetingFactory.raiseObjection(anchorProposalId, subRoleId, CONCERN);
  }

  /*//////////////////////////////////////////////////////////////
                         AUTH FAILURES
  //////////////////////////////////////////////////////////////*/

  function test_CreateProposal_RevertsNonMember() external {
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgMember.selector, _orgId, _stranger));
    _meetingFactory.createProposal(
      _orgId,
      _anchorCircleId,
      _anchorRoleId,
      TENSION,
      HolacracyTypes.ChangeType.CreateRole,
      _encodeCreateRole('Curator')
    );
  }

  function test_AdoptProposal_Permissionless() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    _meetingFactory.adoptProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
  }

  function test_DiscardProposal_RevertsIfNeitherProposerNorFacilitator() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotProposerOrFacilitator.selector, proposalId, _member)
    );
    _meetingFactory.discardProposal(proposalId);
  }

  function test_RaiseObjection_RevertsNonMember() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgMember.selector, _orgId, _stranger));
    _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);
  }

  function test_ResolveObjection_RevertsNonObjectorNonFacilitator() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotObjectorOrFacilitator.selector, objectionId, _stranger)
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
    _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);
  }

  function test_ResolveObjectionTwice_Reverts() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_member);
    uint256 objectionId = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);
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
    uint256 createId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createId);

    string[] memory domains = new string[](0);
    string[] memory accts = new string[](1);
    accts[0] = 'publish daily';
    bytes memory amendData = abi.encode(roleId, 'Curator v2', 'go faster', domains, accts);

    vm.prank(_deployer);
    uint256 amendId = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, bytes32(0), HolacracyTypes.ChangeType.AmendRole, amendData
    );
    vm.prank(_deployer);
    uint256 result = _meetingFactory.adoptProposal(amendId);
    assertEq(result, roleId);
  }

  function test_ApplyChange_RevertsIfAmendTargetInOtherCircle() external {
    uint256 subRoleId = _buildSubCircleWithStrangerAsLead();
    uint256 subCircleId = _roleRegistry.getRoleCircleId(subRoleId);

    string[] memory domains = new string[](0);
    string[] memory accts = new string[](1);
    accts[0] = 'renamed';
    bytes memory amendData = abi.encode(subRoleId, 'Renamed', 'different', domains, accts);
    vm.prank(_deployer);
    uint256 crossPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.AmendRole, amendData
    );
    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_ChangeCircleMismatch.selector, _anchorCircleId, subCircleId)
    );
    _meetingFactory.adoptProposal(crossPid);
  }

  /*//////////////////////////////////////////////////////////////
                       PROPOSAL EXPIRY
  //////////////////////////////////////////////////////////////*/

  function test_AdoptExpiredProposal_Reverts() external {
    uint256 proposalId = _createCuratorProposal();

    vm.warp(block.timestamp + 14 days + 1);

    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_ProposalExpired.selector, proposalId));
    _meetingFactory.adoptProposal(proposalId);
  }

  function test_AdoptProposalJustBeforeExpiry_Succeeds() external {
    uint256 proposalId = _createCuratorProposal();

    vm.warp(block.timestamp + 14 days);

    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
  }

  function test_DiscardExpiredProposal_Permissionless() external {
    uint256 proposalId = _createCuratorProposal();

    vm.warp(block.timestamp + 14 days + 1);

    vm.prank(_stranger);
    _meetingFactory.discardExpiredProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Discarded));
    assertGt(p.resolvedAt, 0);
  }

  function test_DiscardExpiredProposal_RevertsIfNotExpired() external {
    uint256 proposalId = _createCuratorProposal();

    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_ProposalNotExpired.selector, proposalId));
    _meetingFactory.discardExpiredProposal(proposalId);
  }

  function test_DiscardExpiredProposal_RevertsIfAlreadyAdopted() external {
    uint256 proposalId = _createCuratorProposal();
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    vm.warp(block.timestamp + 14 days + 1);

    vm.prank(_stranger);
    vm.expectRevert(
      abi.encodeWithSelector(
        IMeetingFactory.MeetingFactory_InvalidProposalStatus.selector, proposalId, HolacracyTypes.ProposalStatus.Adopted
      )
    );
    _meetingFactory.discardExpiredProposal(proposalId);
  }

  /*//////////////////////////////////////////////////////////////
                     FACILITATOR MANAGEMENT
  //////////////////////////////////////////////////////////////*/

  function test_SetCircleFacilitator_EmitsEvent() external {
    address facilitator = makeAddr('facilitator');

    vm.prank(_deployer);
    vm.expectEmit(true, true, true, true);
    emit IMeetingFactory.CircleFacilitatorSet(_anchorCircleId, facilitator);
    _meetingFactory.setCircleFacilitator(_anchorCircleId, facilitator);
  }

  function test_SetCircleFacilitator_RevertsNonAdmin() external {
    vm.prank(_member);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgAdmin.selector, _orgId, _member));
    _meetingFactory.setCircleFacilitator(_anchorCircleId, makeAddr('facilitator'));
  }

  function test_ResolveObjection_FacilitatorCanResolveMultipleObjections() external {
    address facilitator = makeAddr('facilitator');
    vm.prank(_deployer);
    _meetingFactory.setCircleFacilitator(_anchorCircleId, facilitator);

    uint256 proposalId = _createCuratorProposal();

    vm.prank(_member);
    uint256 obj1 = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, CONCERN);

    vm.prank(_deployer);
    uint256 obj2 = _meetingFactory.raiseObjection(proposalId, _anchorRoleId, keccak256('different concern'));

    vm.startPrank(facilitator);
    _meetingFactory.resolveObjection(obj1);
    _meetingFactory.resolveObjection(obj2);
    vm.stopPrank();

    vm.prank(_deployer);
    _meetingFactory.adoptProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Adopted));
  }

  /*//////////////////////////////////////////////////////////////
                  FACILITATOR / SECRETARY ELECTION
  //////////////////////////////////////////////////////////////*/

  function test_FacilitatorElection_AdoptionLocksAdminSetter() external {
    address elected = makeAddr('electedFacilitator');
    bytes memory data = abi.encode(_anchorCircleId, elected, address(0));
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.FacilitatorElection, data
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(pid);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_FacilitatorAlreadyElected.selector, _anchorCircleId)
    );
    _meetingFactory.setCircleFacilitator(_anchorCircleId, makeAddr('other'));
  }

  function test_SecretaryElection_AdoptionLocksAdminSetter() external {
    address elected = makeAddr('electedSecretary');
    bytes memory data = abi.encode(_anchorCircleId, elected, address(0));
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.SecretaryElection, data
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(pid);

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_SecretaryAlreadyElected.selector, _anchorCircleId)
    );
    _meetingFactory.setCircleSecretary(_anchorCircleId, makeAddr('other'));
  }

  function test_SetCircleSecretary_RevertsNonAdmin() external {
    vm.prank(_member);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgAdmin.selector, _orgId, _member));
    _meetingFactory.setCircleSecretary(_anchorCircleId, makeAddr('secretary'));
  }

  /*//////////////////////////////////////////////////////////////
                     SECRETARY STRIKE (§4.2.2)
  //////////////////////////////////////////////////////////////*/

  function test_StrikeProposal_BySecretary() external {
    address secretary = makeAddr('secretary');
    vm.prank(_deployer);
    _meetingFactory.setCircleSecretary(_anchorCircleId, secretary);

    uint256 proposalId = _createCuratorProposal();

    vm.prank(secretary);
    vm.expectEmit(true, true, true, true);
    emit IMeetingFactory.ProposalStruck(proposalId, _anchorCircleId, secretary);
    _meetingFactory.strikeProposal(proposalId);

    IMeetingFactory.ProposalRecord memory p = _meetingFactory.getProposal(proposalId);
    assertEq(uint8(p.status), uint8(HolacracyTypes.ProposalStatus.Discarded));
    assertGt(p.resolvedAt, 0);
  }

  function test_StrikeProposal_RevertsByNonSecretary() external {
    uint256 proposalId = _createCuratorProposal();

    vm.prank(_deployer);
    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotSecretary.selector, _anchorCircleId, _deployer)
    );
    _meetingFactory.strikeProposal(proposalId);
  }

  /*//////////////////////////////////////////////////////////////
                     ORG ID VALIDATION
  //////////////////////////////////////////////////////////////*/

  function test_CreateProposal_WrongOrgId_Reverts() external {
    uint256 wrongOrgId = 999;
    vm.prank(_member);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_OrgIdMismatch.selector, _orgId, wrongOrgId));
    _meetingFactory.createProposal(
      wrongOrgId,
      _anchorCircleId,
      _anchorRoleId,
      TENSION,
      HolacracyTypes.ChangeType.CreateRole,
      _encodeCreateRole('Curator')
    );
  }

  function test_StartMeeting_WrongOrgId_Reverts() external {
    uint256 wrongOrgId = 999;
    vm.prank(_deployer);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_OrgIdMismatch.selector, _orgId, wrongOrgId));
    _meetingFactory.startMeeting(wrongOrgId, IMeetingFactory.MeetingKind.Governance);
  }

  /*//////////////////////////////////////////////////////////////
                   ELECTION WITH PREVIOUS LEAD
  //////////////////////////////////////////////////////////////*/

  function test_AdoptElection_UnassignsPreviousLead() external {
    uint256 createId = _createCuratorProposal();
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createId);

    address lead1 = makeAddr('lead1');
    bytes memory electData1 = abi.encode(roleId, lead1, address(0));
    vm.prank(_deployer);
    uint256 e1 = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.Election, electData1
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(e1);
    assertTrue(_roleRegistry.isRoleLead(roleId, lead1));

    address lead2 = makeAddr('lead2');
    bytes memory electData2 = abi.encode(roleId, lead2, lead1);
    vm.prank(_deployer);
    uint256 e2 = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.Election, electData2
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(e2);

    assertTrue(_roleRegistry.isRoleLead(roleId, lead2));
    assertFalse(_roleRegistry.isRoleLead(roleId, lead1));
  }

  /*//////////////////////////////////////////////////////////////
                        POLICY CHANGE TYPES
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposal_CreatesPolicy() external {
    bytes memory data = abi.encode(_anchorCircleId, 'No Friday releases', 'Releases only Mon-Thu');
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreatePolicy, data
    );
    vm.prank(_deployer);
    uint256 policyId = _meetingFactory.adoptProposal(pid);

    HolacracyTypes.Policy memory p = _roleRegistry.getPolicy(policyId);
    assertEq(p.circleId, _anchorCircleId);
    assertEq(p.name, 'No Friday releases');
    assertEq(p.body, 'Releases only Mon-Thu');
    assertTrue(p.exists);
  }

  function test_AdoptProposal_AmendsPolicy() external {
    bytes memory createData = abi.encode(_anchorCircleId, 'Name', 'Body');
    vm.prank(_deployer);
    uint256 createPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreatePolicy, createData
    );
    vm.prank(_deployer);
    uint256 policyId = _meetingFactory.adoptProposal(createPid);

    bytes memory amendData = abi.encode(policyId, 'NewName', 'NewBody');
    vm.prank(_deployer);
    uint256 amendPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.AmendPolicy, amendData
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(amendPid);

    HolacracyTypes.Policy memory p = _roleRegistry.getPolicy(policyId);
    assertEq(p.name, 'NewName');
    assertEq(p.body, 'NewBody');
  }

  function test_AdoptProposal_RemovesPolicy() external {
    bytes memory createData = abi.encode(_anchorCircleId, 'Name', 'Body');
    vm.prank(_deployer);
    uint256 createPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreatePolicy, createData
    );
    vm.prank(_deployer);
    uint256 policyId = _meetingFactory.adoptProposal(createPid);

    bytes memory removeData = abi.encode(policyId);
    vm.prank(_deployer);
    uint256 removePid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.RemovePolicy, removeData
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(removePid);

    vm.expectRevert(abi.encodeWithSelector(IRoleRegistry.RoleRegistry_PolicyNotFound.selector, policyId));
    _roleRegistry.getPolicy(policyId);
  }

  function test_AdoptProposal_PolicyCircleScopeMismatchReverts() external {
    // Expand a role into a sub-circle so we have a second circle id to target.
    bytes memory createRoleData = _encodeCreateRole('Expander');
    vm.prank(_deployer);
    uint256 createPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRole, createRoleData
    );
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(createPid);

    bytes memory expandData = abi.encode(roleId);
    vm.prank(_deployer);
    uint256 expandPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData
    );
    vm.prank(_deployer);
    uint256 subCircleId = _meetingFactory.adoptProposal(expandPid);

    // Proposal raised in the anchor circle tries to create a policy in the sub-circle -> reverts.
    bytes memory policyData = abi.encode(subCircleId, 'Name', 'Body');
    vm.prank(_deployer);
    uint256 policyPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreatePolicy, policyData
    );

    vm.expectRevert(
      abi.encodeWithSelector(IMeetingFactory.MeetingFactory_ChangeCircleMismatch.selector, _anchorCircleId, subCircleId)
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(policyPid);
  }

  /*//////////////////////////////////////////////////////////////
                        WITHREFS CONTENT-REF CAP
  //////////////////////////////////////////////////////////////*/

  function _buildRefs(
    uint256 _n
  ) internal pure returns (bytes32[] memory _fieldNames, HolacracyTypes.ContentRef[] memory _refs) {
    _fieldNames = new bytes32[](_n);
    _refs = new HolacracyTypes.ContentRef[](_n);
    for (uint256 i = 0; i < _n; i++) {
      _fieldNames[i] = bytes32(uint256(0x6600 + i));
      _refs[i] = HolacracyTypes.ContentRef({
        contentHash: keccak256(abi.encodePacked('ref', i)), visibility: HolacracyTypes.DataVisibility.Public
      });
    }
  }

  function _encodeCreateRoleWithRefs(
    string memory _name,
    uint256 _refCount
  ) internal view returns (bytes memory) {
    string[] memory domains = new string[](1);
    domains[0] = 'curation';
    string[] memory accts = new string[](1);
    accts[0] = 'publish weekly';
    (bytes32[] memory fieldNames, HolacracyTypes.ContentRef[] memory refs) = _buildRefs(_refCount);
    return abi.encode(_anchorCircleId, _name, 'keep the feed sharp', domains, accts, fieldNames, refs);
  }

  function _encodeCreatePolicyWithRefs(
    string memory _name,
    uint256 _refCount
  ) internal view returns (bytes memory) {
    (bytes32[] memory fieldNames, HolacracyTypes.ContentRef[] memory refs) = _buildRefs(_refCount);
    return abi.encode(_anchorCircleId, _name, 'Body', fieldNames, refs);
  }

  function test_AdoptProposal_CreateRoleWithRefs_AtCap() external {
    bytes memory data = _encodeCreateRoleWithRefs('CuratorAtCap', _meetingFactory.MAX_CONTENT_REFS());
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRoleWithRefs, data
    );
    vm.prank(_deployer);
    uint256 roleId = _meetingFactory.adoptProposal(pid);
    assertEq(_roleRegistry.getRoleCircleId(roleId), _anchorCircleId);
  }

  function test_AdoptProposal_CreateRoleWithRefs_OverCap_Reverts() external {
    uint256 cap = _meetingFactory.MAX_CONTENT_REFS();
    bytes memory data = _encodeCreateRoleWithRefs('CuratorOverCap', cap + 1);
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRoleWithRefs, data
    );
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_TooManyContentRefs.selector, cap + 1, cap));
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(pid);
  }

  function test_AdoptProposal_CreatePolicyWithRefs_AtCap() external {
    bytes memory data = _encodeCreatePolicyWithRefs('PolicyAtCap', _meetingFactory.MAX_CONTENT_REFS());
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreatePolicyWithRefs, data
    );
    vm.prank(_deployer);
    uint256 policyId = _meetingFactory.adoptProposal(pid);
    assertEq(_roleRegistry.getPolicy(policyId).name, 'PolicyAtCap');
  }

  function test_AdoptProposal_CreatePolicyWithRefs_OverCap_Reverts() external {
    uint256 cap = _meetingFactory.MAX_CONTENT_REFS();
    bytes memory data = _encodeCreatePolicyWithRefs('PolicyOverCap', cap + 1);
    vm.prank(_deployer);
    uint256 pid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreatePolicyWithRefs, data
    );
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_TooManyContentRefs.selector, cap + 1, cap));
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(pid);
  }

  /*//////////////////////////////////////////////////////////////
                        MOVE ROLE CHANGE TYPE
  //////////////////////////////////////////////////////////////*/

  function test_AdoptProposal_MovesRole() external {
    // Create a sub-circle parent role, expand it, then move a leaf role into it.
    vm.prank(_deployer);
    uint256 expanderPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRole, _encodeCreateRole('Parent')
    );
    vm.prank(_deployer);
    uint256 expanderRoleId = _meetingFactory.adoptProposal(expanderPid);

    bytes memory expandData = abi.encode(expanderRoleId);
    vm.prank(_deployer);
    uint256 expandPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.ExpandRoleToCircle, expandData
    );
    vm.prank(_deployer);
    uint256 subCircleId = _meetingFactory.adoptProposal(expandPid);

    // Create a leaf role in the anchor circle.
    vm.prank(_deployer);
    uint256 leafPid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.CreateRole, _encodeCreateRole('Leaf')
    );
    vm.prank(_deployer);
    uint256 leafRoleId = _meetingFactory.adoptProposal(leafPid);

    // Move the leaf into the sub-circle — proposal must be raised in the source (anchor) circle.
    bytes memory moveData = abi.encode(leafRoleId, subCircleId);
    vm.prank(_deployer);
    uint256 movePid = _meetingFactory.createProposal(
      _orgId, _anchorCircleId, _anchorRoleId, TENSION, HolacracyTypes.ChangeType.MoveRole, moveData
    );
    vm.prank(_deployer);
    _meetingFactory.adoptProposal(movePid);

    assertEq(_roleRegistry.getRoleCircleId(leafRoleId), subCircleId);
  }
}
