// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {IMeetingFactory, MeetingFactory} from 'contracts/MeetingFactory.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Test} from 'forge-std/Test.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

contract StubENSRegistrarForMeetingFactory is IENSSubdomainRegistrar {
  function registerSubnode(
    bytes32,
    address
  ) external {} // solhint-disable-line no-empty-blocks
}

contract UnitMeetingFactory is Test {
  OrganizationFactory internal _orgFactory;
  MeetingFactory internal _meetingFactory;

  address internal _deployer = makeAddr('deployer');
  address internal _member = makeAddr('member');
  address internal _stranger = makeAddr('stranger');

  uint256 internal _orgId;

  function _defaultTokenConfig() internal view returns (IOrganizationFactory.TokenConfig memory _cfg) {
    address[] memory _holders = new address[](1);
    _holders[0] = _deployer;
    uint256[] memory _amounts = new uint256[](1);
    _amounts[0] = 1_000_000e18;
    _cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'Meeting Token', tokenSymbol: 'MFG', initialHolders: _holders, initialAmounts: _amounts
    });
  }

  function setUp() external {
    _orgFactory = new OrganizationFactory(
      address(new RoleRegistry()),
      address(new OrganizationInstance()),
      address(new StubENSRegistrarForMeetingFactory()),
      address(0)
    );
    _meetingFactory = MeetingFactory(Clones.clone(address(new MeetingFactory())));

    vm.prank(_deployer);
    (uint256 _newOrgId, address _instance) =
      _orgFactory.createOrganization('meeting-org', 'Build holacracy tools', _defaultTokenConfig());
    _orgId = _newOrgId;

    vm.prank(_deployer);
    IOrganizationInstance(_instance).addMember(_member);

    vm.prank(_deployer);
    _meetingFactory.initialize(_orgId, _instance, address(0));
  }

  function test_startMeeting() external {
    vm.prank(_deployer);
    uint256 meetingId = _meetingFactory.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
    assertEq(meetingId, 1);
  }

  function test_startMeetingRevertsWhenNotOrgMember() external {
    vm.prank(_stranger);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgMember.selector, _orgId, _stranger));
    _meetingFactory.startMeeting(_orgId, IMeetingFactory.MeetingKind.Governance);
  }

  function test_recordOutput() external {
    vm.prank(_deployer);
    uint256 meetingId = _meetingFactory.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
    vm.prank(_member);
    uint256 itemId =
      _meetingFactory.recordOutput(meetingId, _orgId, HolacracyTypes.OutputType.NextAction, 'Do thing', _member, 0);
    assertEq(itemId, 1);
  }

  function test_linkProposal() external {
    vm.prank(_deployer);
    uint256 meetingId = _meetingFactory.startMeeting(_orgId, IMeetingFactory.MeetingKind.Governance);
    vm.prank(_deployer);
    uint256 itemId = _meetingFactory.linkProposal(meetingId, _orgId, 1);
    assertEq(itemId, 1);
  }

  function test_endMeetingByAdmin() external {
    vm.prank(_deployer);
    uint256 meetingId = _meetingFactory.startMeeting(_orgId, IMeetingFactory.MeetingKind.Governance);
    vm.prank(_deployer);
    _meetingFactory.endMeeting(meetingId, _orgId, IMeetingFactory.MeetingKind.Governance);
  }

  function test_endMeetingRevertsForNonAdmin() external {
    vm.prank(_deployer);
    uint256 meetingId = _meetingFactory.startMeeting(_orgId, IMeetingFactory.MeetingKind.Tactical);
    vm.prank(_member);
    vm.expectRevert(abi.encodeWithSelector(IMeetingFactory.MeetingFactory_NotOrgAdmin.selector, _orgId, _member));
    _meetingFactory.endMeeting(meetingId, _orgId, IMeetingFactory.MeetingKind.Tactical);
  }
}
