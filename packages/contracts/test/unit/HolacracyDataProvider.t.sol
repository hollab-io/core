// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {HolacracyDataProvider, IHolacracyDataProvider} from 'helpers/HolacracyDataProvider.sol';
import {OrganizationFactory, IOrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Test} from 'forge-std/Test.sol';

/// @notice Stub ENS registrar so the factory works without real ENS
contract StubENSRegistrar is IENSSubdomainRegistrar {
  // solhint-disable-next-line no-empty-blocks
  function registerSubnode(bytes32, address) external {}
}

contract UnitHolacracyDataProvider is Test {
  HolacracyDataProvider internal _provider;
  OrganizationFactory internal _factory;

  address internal _creator = makeAddr('creator');
  address internal _member1 = makeAddr('member1');
  address internal _member2 = makeAddr('member2');
  address internal _facilitator = makeAddr('facilitator');

  string[] internal _domains;
  string[] internal _accountabilities;

  function setUp() external {
    _domains.push('Engineering');
    _accountabilities.push('Ship product');

    _provider = new HolacracyDataProvider();

    HolGovernorFactory _govFactory = new HolGovernorFactory();
    address _rImpl = address(new RoleRegistry());
    address _crImpl = address(new CircleRegistry());
    address _gpImpl = address(new GovernanceProcess());

    _factory = new OrganizationFactory(_rImpl, _crImpl, _gpImpl, address(_govFactory), address(new StubENSRegistrar()));
  }

  /*///////////////////////////////////////////////////////////////
                    HELPERS
  //////////////////////////////////////////////////////////////*/

  function _defaultGovConfig() internal view returns (IOrganizationFactory.GovernanceConfig memory _cfg) {
    address[] memory _holders = new address[](1);
    _holders[0] = _creator;
    uint256[] memory _amounts = new uint256[](1);
    _amounts[0] = 1_000_000e18;

    _cfg = IOrganizationFactory.GovernanceConfig({
      tokenName: 'OrgToken',
      tokenSymbol: 'ORG',
      initialHolders: _holders,
      initialAmounts: _amounts,
      timelockDelay: 0,
      votingDelay: 1,
      votingPeriod: 50,
      proposalThreshold: 0,
      quorumNumerator: 4,
      treasuryTimelockDelay: 0,
      daoVoteRequired: false
    });
  }

  function _createOrg() internal returns (uint256 _orgId) {
    vm.prank(_creator);
    _orgId = _factory.createOrganization('myorg', 'Build great things', _defaultGovConfig());
  }

  function _createFullOrg()
    internal
    returns (
      uint256 _orgId,
      CircleRegistry _cr,
      RoleRegistry _rr,
      GovernanceProcess _gp,
      uint256 _anchorId,
      uint256 _roleId1,
      uint256 _roleId2
    )
  {
    _orgId = _createOrg();
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);
    _cr = CircleRegistry(_org.circleRegistry);
    _rr = RoleRegistry(_org.roleRegistry);
    _gp = GovernanceProcess(_org.governanceProcess);
    _anchorId = _org.anchorCircleId;

    vm.startPrank(_creator);
    _roleId1 = _cr.createRoleInCircle(_anchorId, 'Developer', 'Build features', _domains, _accountabilities);
    _roleId2 = _cr.createRoleInCircle(_anchorId, 'Designer', 'Design UI', _domains, _accountabilities);
    _cr.assignRoleLeadInCircle(_anchorId, _roleId1, _member1);
    _cr.assignRoleLeadInCircle(_anchorId, _roleId2, _member2);
    _cr.setElectedRole(_anchorId, HolacracyTypes.ElectedRole.Facilitator, _facilitator);
    vm.stopPrank();
  }

  /*///////////////////////////////////////////////////////////////
                    GET ORGANIZATION OVERVIEW
  //////////////////////////////////////////////////////////////*/

  function test_GetOrganizationOverviewIdentity() external {
    uint256 _orgId = _createOrg();
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    IHolacracyDataProvider.OrganizationOverview memory _ov =
      _provider.getOrganizationOverview(address(_factory), _orgId);

    // it returns correct org metadata
    assertEq(_ov.id, _orgId);
    assertEq(_ov.name, 'myorg');
    assertEq(_ov.subname, 'myorg');
    assertEq(_ov.creator, _creator);
    assertGt(_ov.createdAt, 0);

    // it returns correct contract addresses
    assertEq(_ov.governor, _org.governor);
    assertEq(_ov.token, _org.token);
    assertEq(_ov.timelock, _org.timelock);
    assertEq(_ov.circleRegistry, _org.circleRegistry);
  }

  function test_GetOrganizationOverviewTokenData() external {
    uint256 _orgId = _createOrg();

    IHolacracyDataProvider.OrganizationOverview memory _ov =
      _provider.getOrganizationOverview(address(_factory), _orgId);

    // it returns token metadata
    assertEq(_ov.tokenName, 'OrgToken');
    assertEq(_ov.tokenSymbol, 'ORG');
    assertEq(_ov.tokenTotalSupply, 1_000_000e18);
  }

  function test_GetOrganizationOverviewGovernorParams() external {
    uint256 _orgId = _createOrg();

    IHolacracyDataProvider.OrganizationOverview memory _ov =
      _provider.getOrganizationOverview(address(_factory), _orgId);

    // it returns governor parameters
    assertEq(_ov.votingDelay, 1);
    assertEq(_ov.votingPeriod, 50);
    assertEq(_ov.proposalThreshold, 0);
    assertEq(_ov.quorumNumerator, 4);
  }

  function test_GetOrganizationOverviewCounts() external {
    (uint256 _orgId, CircleRegistry _cr,, GovernanceProcess _gp, uint256 _anchorId,,) = _createFullOrg();

    // Add a sub-circle: create a role and expand it
    vm.startPrank(_creator);
    string[] memory _d = new string[](1);
    _d[0] = 'Engineering';
    string[] memory _a = new string[](1);
    _a[0] = 'Build';
    uint256 _subRoleId = _cr.createRoleInCircle(_anchorId, 'SubTeam', 'Sub purpose', _d, _a);
    _cr.assignRoleLeadInCircle(_anchorId, _subRoleId, _creator);
    _cr.createSubCircle(_subRoleId);
    vm.stopPrank();

    // Submit a proposal
    vm.prank(_member1);
    _gp.submitProposal(
      _anchorId,
      1,
      'Need a new role',
      'Example',
      'Explanation',
      HolacracyTypes.GovernanceChange({
        changeType: HolacracyTypes.ChangeType.CreateRole,
        targetId: 0,
        encodedData: abi.encode('NewRole', 'Purpose', new string[](0), new string[](0))
      })
    );

    IHolacracyDataProvider.OrganizationOverview memory _ov =
      _provider.getOrganizationOverview(address(_factory), _orgId);

    // it reports the correct circle count (anchor + 1 sub-circle)
    assertEq(_ov.circleCount, 2);
    // it reports the correct total proposal count
    assertEq(_ov.proposalCount, 1);
    // it reports all roles (including the sub-team role)
    assertGt(_ov.roleCount, 0);
  }

  /*///////////////////////////////////////////////////////////////
                    GET ORGANIZATION FULL DATA
  //////////////////////////////////////////////////////////////*/

  function test_GetOrganizationFullDataCircles() external {
    (uint256 _orgId,,,, uint256 _anchorId,,) = _createFullOrg();

    (
      ,
      IHolacracyDataProvider.CircleSnapshot[] memory _circles,
      ,
    ) = _provider.getOrganizationFullData(address(_factory), _orgId);

    // it returns the anchor circle
    assertEq(_circles.length, 1);
    assertEq(_circles[0].id, _anchorId);
    assertEq(_circles[0].name, 'myorg');
    assertEq(_circles[0].purpose, 'Build great things');
    assertTrue(_circles[0].isAnchor);

    // it includes elected facilitator
    assertEq(_circles[0].facilitator, _facilitator);
    assertEq(_circles[0].secretary, address(0));
  }

  function test_GetOrganizationFullDataRoles() external {
    (uint256 _orgId,,,, uint256 _anchorId, uint256 _roleId1, uint256 _roleId2) = _createFullOrg();

    (,, IHolacracyDataProvider.RoleSnapshot[] memory _roles,) =
      _provider.getOrganizationFullData(address(_factory), _orgId);

    // it returns both roles
    assertEq(_roles.length, 2);

    // Find each role by ID (order matches getCircleRoleIds)
    bool _foundDev;
    bool _foundDesign;
    for (uint256 _i; _i < _roles.length; ++_i) {
      if (_roles[_i].id == _roleId1) {
        assertEq(_roles[_i].name, 'Developer');
        assertEq(_roles[_i].circleId, _anchorId);
        assertEq(_roles[_i].leads.length, 1);
        assertEq(_roles[_i].leads[0], _member1);
        assertFalse(_roles[_i].isExpandedToCircle);
        _foundDev = true;
      }
      if (_roles[_i].id == _roleId2) {
        assertEq(_roles[_i].name, 'Designer');
        assertEq(_roles[_i].leads[0], _member2);
        _foundDesign = true;
      }
    }
    assertTrue(_foundDev);
    assertTrue(_foundDesign);
  }

  function test_GetOrganizationFullDataPolicies() external {
    (uint256 _orgId, CircleRegistry _cr,,,  uint256 _anchorId,,) = _createFullOrg();

    vm.prank(_creator);
    _cr.addPolicy(_anchorId, 'Hiring Policy', 'All hires must be voted on.');

    (,,, IHolacracyDataProvider.PolicySnapshot[] memory _policies) =
      _provider.getOrganizationFullData(address(_factory), _orgId);

    assertEq(_policies.length, 1);
    assertEq(_policies[0].name, 'Hiring Policy');
    assertEq(_policies[0].body, 'All hires must be voted on.');
    assertEq(_policies[0].circleId, _anchorId);
  }

  function test_GetOrganizationFullDataSubCircle() external {
    (uint256 _orgId, CircleRegistry _cr,,,  uint256 _anchorId,,) = _createFullOrg();

    // Create a new role and expand it to a sub-circle
    vm.startPrank(_creator);
    string[] memory _d = new string[](1);
    _d[0] = 'D';
    string[] memory _a = new string[](1);
    _a[0] = 'A';
    uint256 _subRoleId = _cr.createRoleInCircle(_anchorId, 'ProductCircle', 'Own product', _d, _a);
    _cr.assignRoleLeadInCircle(_anchorId, _subRoleId, _creator);
    uint256 _subCircleId = _cr.createSubCircle(_subRoleId);
    vm.stopPrank();

    (
      ,
      IHolacracyDataProvider.CircleSnapshot[] memory _circles,
      IHolacracyDataProvider.RoleSnapshot[] memory _roles,
    ) = _provider.getOrganizationFullData(address(_factory), _orgId);

    // it returns both circles
    assertEq(_circles.length, 2);
    bool _foundSub;
    for (uint256 _i; _i < _circles.length; ++_i) {
      if (_circles[_i].id == _subCircleId) {
        assertEq(_circles[_i].parentCircleId, _anchorId);
        assertFalse(_circles[_i].isAnchor);
        _foundSub = true;
      }
    }
    assertTrue(_foundSub);

    // it marks the expanded role
    bool _foundExpanded;
    for (uint256 _i; _i < _roles.length; ++_i) {
      if (_roles[_i].id == _subRoleId) {
        assertTrue(_roles[_i].isExpandedToCircle);
        assertEq(_roles[_i].expandedCircleId, _subCircleId);
        _foundExpanded = true;
      }
    }
    assertTrue(_foundExpanded);
  }

  function test_GetOrganizationFullDataProposalCounts() external {
    (uint256 _orgId,,, GovernanceProcess _gp, uint256 _anchorId,,) = _createFullOrg();

    // Submit and activate a proposal
    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('X', 'Y', new string[](0), new string[](0))
    });
    vm.prank(_member1);
    uint256 _pId = _gp.submitProposal(_anchorId, 1, 'Tension', 'Ex', 'Expl', _change);
    vm.prank(_member1);
    _gp.activateProposal(_pId);

    (,  IHolacracyDataProvider.CircleSnapshot[] memory _circles,,) =
      _provider.getOrganizationFullData(address(_factory), _orgId);

    assertEq(_circles[0].totalProposalCount, 1);
    assertEq(_circles[0].openProposalCount, 1);
  }

  /*///////////////////////////////////////////////////////////////
                    GET USER ORG DATA
  //////////////////////////////////////////////////////////////*/

  function test_GetUserOrgDataTokenBalance() external {
    uint256 _orgId = _createOrg();

    IHolacracyDataProvider.UserOrgData memory _data =
      _provider.getUserOrgData(address(_factory), _orgId, _creator);

    // creator received 1M tokens at org creation
    assertEq(_data.tokenBalance, 1_000_000e18);
    assertEq(_data.user, _creator);
  }

  function test_GetUserOrgDataRolesAndMemberships() external {
    (uint256 _orgId,,,, uint256 _anchorId, uint256 _roleId1,) = _createFullOrg();

    IHolacracyDataProvider.UserOrgData memory _data =
      _provider.getUserOrgData(address(_factory), _orgId, _member1);

    // it lists the role they lead
    assertEq(_data.ledRoleIds.length, 1);
    assertEq(_data.ledRoleIds[0], _roleId1);

    // it lists the circle they are a member of (via role lead)
    assertEq(_data.memberCircleIds.length, 1);
    assertEq(_data.memberCircleIds[0], _anchorId);

    // member1 is not a circle lead, only a role lead
    assertEq(_data.leadCircleIds.length, 0);
  }

  function test_GetUserOrgDataCircleLead() external {
    (uint256 _orgId,,,, uint256 _anchorId,,) = _createFullOrg();

    IHolacracyDataProvider.UserOrgData memory _data =
      _provider.getUserOrgData(address(_factory), _orgId, _creator);

    // creator is the deployer/circle lead of the anchor circle
    assertEq(_data.leadCircleIds.length, 1);
    assertEq(_data.leadCircleIds[0], _anchorId);
    assertEq(_data.memberCircleIds.length, 1);
  }

  function test_GetUserOrgDataElectedPositions() external {
    (uint256 _orgId,,,, uint256 _anchorId,,) = _createFullOrg();

    IHolacracyDataProvider.UserOrgData memory _data =
      _provider.getUserOrgData(address(_factory), _orgId, _facilitator);

    // facilitator was elected for anchor circle
    assertEq(_data.facilitatorOfCircleIds.length, 1);
    assertEq(_data.facilitatorOfCircleIds[0], _anchorId);
    assertEq(_data.secretaryOfCircleIds.length, 0);
    assertEq(_data.circleRepOfCircleIds.length, 0);
  }

  function test_GetUserOrgDataStrangerIsEmpty() external {
    uint256 _orgId = _createOrg();
    address _stranger = makeAddr('stranger');

    IHolacracyDataProvider.UserOrgData memory _data =
      _provider.getUserOrgData(address(_factory), _orgId, _stranger);

    assertEq(_data.tokenBalance, 0);
    assertEq(_data.votingPower, 0);
    assertEq(_data.ledRoleIds.length, 0);
    assertEq(_data.leadCircleIds.length, 0);
    assertEq(_data.memberCircleIds.length, 0);
  }

  /*///////////////////////////////////////////////////////////////
                    GET CIRCLE PROPOSALS
  //////////////////////////////////////////////////////////////*/

  function test_GetCircleProposalsWhenNone() external {
    (uint256 _orgId,,,, uint256 _anchorId,,) = _createFullOrg();
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    IHolacracyDataProvider.ProposalSnapshot[] memory _proposals =
      _provider.getCircleProposals(_org.governanceProcess, _anchorId);

    assertEq(_proposals.length, 0);
  }

  function test_GetCircleProposalsWithActiveProposal() external {
    (uint256 _orgId,,, GovernanceProcess _gp, uint256 _anchorId, uint256 _roleId1,) = _createFullOrg();
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('Ops', 'Run operations', new string[](0), new string[](0))
    });

    vm.prank(_member1);
    uint256 _pId = _gp.submitProposal(_anchorId, _roleId1, 'Need Ops role', 'Example', 'Explanation', _change);
    vm.prank(_member1);
    _gp.activateProposal(_pId);

    IHolacracyDataProvider.ProposalSnapshot[] memory _proposals =
      _provider.getCircleProposals(_org.governanceProcess, _anchorId);

    assertEq(_proposals.length, 1);
    assertEq(_proposals[0].id, _pId);
    assertEq(_proposals[0].proposer, _member1);
    assertEq(_proposals[0].tension, 'Need Ops role');
    assertEq(uint256(_proposals[0].status), uint256(HolacracyTypes.ProposalStatus.Active));
    assertEq(_proposals[0].objectionCount, 0);
    assertEq(_proposals[0].unresolvedObjectionCount, 0);
  }

  function test_GetCircleProposalsObjectionCounts() external {
    (uint256 _orgId,,, GovernanceProcess _gp, uint256 _anchorId, uint256 _roleId1, uint256 _roleId2) =
      _createFullOrg();
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    HolacracyTypes.GovernanceChange memory _change = HolacracyTypes.GovernanceChange({
      changeType: HolacracyTypes.ChangeType.CreateRole,
      targetId: 0,
      encodedData: abi.encode('X', 'Y', new string[](0), new string[](0))
    });

    vm.prank(_member1);
    uint256 _pId = _gp.submitProposal(_anchorId, _roleId1, 'Tension', 'Ex', 'Expl', _change);
    vm.prank(_member1);
    _gp.activateProposal(_pId);

    // Raise objection
    vm.prank(_member2);
    _gp.raiseObjection(_pId, _roleId2, 'I object', false);

    IHolacracyDataProvider.ProposalSnapshot[] memory _proposals =
      _provider.getCircleProposals(_org.governanceProcess, _anchorId);

    assertEq(_proposals[0].objectionCount, 1);
    assertEq(_proposals[0].unresolvedObjectionCount, 1);
    assertEq(uint256(_proposals[0].status), uint256(HolacracyTypes.ProposalStatus.Integrating));
  }
}
