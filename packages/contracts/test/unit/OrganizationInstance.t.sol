// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Test} from 'forge-std/Test.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';

/// @notice Stub ENS registrar for testing
contract StubENSForInstance is IENSSubdomainRegistrar {
  function registerSubnode(
    bytes32,
    address
  ) external {} // solhint-disable-line no-empty-blocks
}

/// @notice Minimal mock for ERC-8004 Identity Registry
contract MockERC8004Registry {
  mapping(uint256 => address) internal _owners;

  function setOwner(
    uint256 tokenId,
    address owner
  ) external {
    _owners[tokenId] = owner;
  }

  function ownerOf(
    uint256 tokenId
  ) external view returns (address) {
    return _owners[tokenId];
  }
}

contract UnitOrganizationInstance is Test {
  OrganizationFactory internal _factory;
  IOrganizationInstance internal _org;

  address internal _creator = makeAddr('creator');
  address internal _alice = makeAddr('alice');
  address internal _bob = makeAddr('bob');

  function setUp() external {
    address roleRegistryImpl = address(new RoleRegistry());
    address orgInstanceImpl = address(new OrganizationInstance());
    _factory = new OrganizationFactory(roleRegistryImpl, orgInstanceImpl, address(new StubENSForInstance()), address(0));

    address[] memory holders = new address[](1);
    holders[0] = _creator;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;
    IOrganizationFactory.TokenConfig memory cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'Tok', tokenSymbol: 'TOK', initialHolders: holders, initialAmounts: amounts
    });

    vm.prank(_creator);
    (, address _instance) = _factory.createOrganization('instance-org', 'Test instance', cfg);
    _org = IOrganizationInstance(_instance);
  }

  /*///////////////////////////////////////////////////////////////
                          ADMIN / MEMBER
  //////////////////////////////////////////////////////////////*/

  function test_CreatorSeededAsAdminAndMember() external view {
    assertTrue(_org.isAdmin(_creator));
    assertTrue(_org.isMember(_creator));
    assertEq(_org.adminCount(), 1);
  }

  function test_AddAdminIncrementsCount() external {
    vm.prank(_creator);
    _org.addAdmin(_alice);
    assertTrue(_org.isAdmin(_alice));
    assertEq(_org.adminCount(), 2);
  }

  function test_AddAdminIsIdempotent() external {
    vm.startPrank(_creator);
    _org.addAdmin(_alice);
    _org.addAdmin(_alice);
    assertEq(_org.adminCount(), 2);
    vm.stopPrank();
  }

  function test_OnlyAdminCanAddAdmin() external {
    vm.prank(_alice);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.addAdmin(_alice);
  }

  function test_RemoveAdminDecrementsCount() external {
    vm.startPrank(_creator);
    _org.addAdmin(_alice);
    _org.removeAdmin(_alice);
    vm.stopPrank();
    assertFalse(_org.isAdmin(_alice));
    assertEq(_org.adminCount(), 1);
  }

  function test_RemoveLastAdmin_Reverts() external {
    vm.prank(_creator);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_LastAdmin.selector);
    _org.removeAdmin(_creator);
  }

  function test_AddMember() external {
    vm.prank(_creator);
    _org.addMember(_alice);
    assertTrue(_org.isMember(_alice));
  }

  function test_RemoveMember() external {
    vm.startPrank(_creator);
    _org.addMember(_alice);
    _org.removeMember(_alice);
    vm.stopPrank();
    assertFalse(_org.isMember(_alice));
  }

  /*///////////////////////////////////////////////////////////////
                          JOIN REQUESTS
  //////////////////////////////////////////////////////////////*/

  function test_RequestToJoinEmitsEvent() external {
    vm.prank(_alice);
    vm.expectEmit(true, true, true, true);
    emit IOrganizationInstance.JoinRequested(1, _alice, 'Please');
    uint256 reqId = _org.requestToJoin('Please');
    assertEq(reqId, 1);
    assertTrue(_org.hasPendingRequest(_alice));
  }

  function test_DuplicateRequestReverts() external {
    vm.startPrank(_alice);
    _org.requestToJoin('First');
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationInstance.OrganizationInstance_JoinRequestAlreadyPending.selector, _alice)
    );
    _org.requestToJoin('Second');
    vm.stopPrank();
  }

  function test_ApproveJoinRequestAddsMember() external {
    vm.prank(_alice);
    _org.requestToJoin('Hi');

    vm.prank(_creator);
    _org.approveJoinRequest(_alice);

    assertTrue(_org.isMember(_alice));
    assertFalse(_org.hasPendingRequest(_alice));
  }

  function test_RejectJoinRequestClearsPending() external {
    vm.prank(_alice);
    _org.requestToJoin('Hi');

    vm.prank(_creator);
    _org.rejectJoinRequest(_alice);

    assertFalse(_org.isMember(_alice));
    assertFalse(_org.hasPendingRequest(_alice));
  }

  function test_OnlyAdminCanApproveOrReject() external {
    vm.prank(_alice);
    _org.requestToJoin('Hi');

    vm.prank(_bob);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.approveJoinRequest(_alice);

    vm.prank(_bob);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.rejectJoinRequest(_alice);
  }

  function test_RejectedCanReapply() external {
    vm.prank(_alice);
    _org.requestToJoin('First');
    vm.prank(_creator);
    _org.rejectJoinRequest(_alice);

    vm.prank(_alice);
    uint256 newId = _org.requestToJoin('Second');
    assertEq(newId, 2);
    assertTrue(_org.hasPendingRequest(_alice));
  }

  /*///////////////////////////////////////////////////////////////
                       ERC-8004 AGENT IDENTITY
  //////////////////////////////////////////////////////////////*/

  function test_LinkAgentIdentity_EmitsEvent() external {
    MockERC8004Registry registry = new MockERC8004Registry();
    registry.setOwner(42, _creator);

    vm.prank(_creator);
    vm.expectEmit(true, true, true, true);
    emit IOrganizationInstance.AgentIdentityLinked(_creator, address(registry), 42);
    _org.linkAgentIdentity(address(registry), 42);

    (address reg, uint256 agentId) = _org.getAgentIdentity(_creator);
    assertEq(reg, address(registry));
    assertEq(agentId, 42);
  }

  function test_LinkAgentIdentity_RevertsIfNotOwner() external {
    MockERC8004Registry registry = new MockERC8004Registry();
    registry.setOwner(42, _alice);

    vm.prank(_creator); // _creator is member, but not the NFT owner
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationInstance.OrganizationInstance_AgentNotOwner.selector, 42, _creator)
    );
    _org.linkAgentIdentity(address(registry), 42);
  }

  function test_LinkAgentIdentity_RevertsIfNotMember() external {
    MockERC8004Registry registry = new MockERC8004Registry();
    registry.setOwner(42, _alice);

    vm.prank(_alice); // not a member
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.linkAgentIdentity(address(registry), 42);
  }

  /*///////////////////////////////////////////////////////////////
                          INITIALIZATION
  //////////////////////////////////////////////////////////////*/

  function test_ReinitReverts() external {
    IOrganizationInstance.InitParams memory p = IOrganizationInstance.InitParams({
      id: 99,
      subname: 'evil',
      purpose: '',
      creator: _alice,
      roleRegistry: address(0),
      accessManager: address(0),
      token: address(0),
      anchorCircleId: 0,
      meetingComponentsFactory: address(0)
    });
    vm.expectRevert(Initializable.InvalidInitialization.selector);
    _org.initialize(p);
  }

  function test_SetMeetingFactoryGatedToMCF() external {
    // meetingComponentsFactory was set to address(0) in this test rig, so any caller is rejected.
    vm.prank(_creator);
    vm.expectRevert(IOrganizationInstance.OrganizationInstance_Unauthorized.selector);
    _org.setMeetingFactory(makeAddr('impostor'));
  }
}
