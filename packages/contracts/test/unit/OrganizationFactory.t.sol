// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {OrganizationFactory, IOrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {CircleRegistry, ICircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry, IRoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess, IGovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {Test} from 'forge-std/Test.sol';

/// @notice Mock ENS subdomain registrar that records calls without ENS logic
contract MockENSSubdomainRegistrar is IENSSubdomainRegistrar {
  struct SubnodeCall {
    bytes32 label;
    address targetAddress;
  }

  SubnodeCall[] public calls;

  function registerSubnode(bytes32 _label, address _targetAddress) external {
    calls.push(SubnodeCall(_label, _targetAddress));
  }

  function callCount() external view returns (uint256) {
    return calls.length;
  }

  function getCall(uint256 _idx) external view returns (SubnodeCall memory) {
    return calls[_idx];
  }
}

contract UnitOrganizationFactory is Test {
  OrganizationFactory internal _factory;
  MockENSSubdomainRegistrar internal _mockRegistrar;
  HolGovernorFactory internal _govFactory;

  address internal _creator1 = makeAddr('creator1');
  address internal _creator2 = makeAddr('creator2');

  event OrganizationCreated(uint256 indexed _orgId, string _subname, address indexed _creator);

  function setUp() external {
    _mockRegistrar = new MockENSSubdomainRegistrar();
    _govFactory = new HolGovernorFactory();

    address roleRegistryImpl = address(new RoleRegistry());
    address circleRegistryImpl = address(new CircleRegistry());
    address governanceProcessImpl = address(new GovernanceProcess());

    _factory = new OrganizationFactory(
      roleRegistryImpl,
      circleRegistryImpl,
      governanceProcessImpl,
      address(_govFactory),
      address(_mockRegistrar)
    );
  }

  /*///////////////////////////////////////////////////////////////
                    HELPERS
  //////////////////////////////////////////////////////////////*/

  function _defaultGovConfig() internal view returns (IOrganizationFactory.GovernanceConfig memory) {
    address[] memory holders = new address[](1);
    holders[0] = _creator1;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    return IOrganizationFactory.GovernanceConfig({
      tokenName: 'OrgToken',
      tokenSymbol: 'ORG',
      initialHolders: holders,
      initialAmounts: amounts,
      timelockDelay: 0,
      votingDelay: 1,
      votingPeriod: 50,
      proposalThreshold: 0,
      quorumNumerator: 4
    });
  }

  /*///////////////////////////////////////////////////////////////
                    CREATE ORGANIZATION
  //////////////////////////////////////////////////////////////*/

  function test_CreateOrganizationWhenValid() external {
    vm.prank(_creator1);

    // it emits OrganizationCreated
    vm.expectEmit(true, true, true, true, address(_factory));
    emit OrganizationCreated(1, 'myorg', _creator1);

    uint256 _orgId = _factory.createOrganization('myorg', 'Build great things', _defaultGovConfig());

    // it increments organization count
    assertEq(_factory.organizationCount(), 1);
    assertEq(_orgId, 1);

    // it stores organization data
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);
    assertEq(_org.id, 1);
    assertEq(_org.name, 'myorg');
    assertEq(_org.subname, 'myorg');
    assertEq(_org.creator, _creator1);
    assertGt(_org.createdAt, 0);
    assertTrue(_org.roleRegistry != address(0));
    assertTrue(_org.circleRegistry != address(0));
    assertTrue(_org.governanceProcess != address(0));
    assertEq(_org.anchorCircleId, 1);
  }

  function test_CreateOrganizationClonesAreIsolated() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.prank(_creator1);
    uint256 _orgId1 = _factory.createOrganization('orgone', 'Purpose one', _cfg);

    vm.prank(_creator2);
    uint256 _orgId2 = _factory.createOrganization('orgtwo', 'Purpose two', _cfg);

    HolacracyTypes.Organization memory _org1 = _factory.getOrganization(_orgId1);
    HolacracyTypes.Organization memory _org2 = _factory.getOrganization(_orgId2);

    // it deploys separate contract instances
    assertTrue(_org1.roleRegistry != _org2.roleRegistry);
    assertTrue(_org1.circleRegistry != _org2.circleRegistry);
    assertTrue(_org1.governanceProcess != _org2.governanceProcess);
    assertTrue(_org1.governor != _org2.governor);
    assertTrue(_org1.token != _org2.token);
    assertTrue(_org1.timelock != _org2.timelock);

    // it gives each org its own anchor circle
    CircleRegistry _cr1 = CircleRegistry(_org1.circleRegistry);
    CircleRegistry _cr2 = CircleRegistry(_org2.circleRegistry);

    HolacracyTypes.Circle memory _circle1 = _cr1.getCircle(_org1.anchorCircleId);
    HolacracyTypes.Circle memory _circle2 = _cr2.getCircle(_org2.anchorCircleId);

    assertEq(_circle1.name, 'orgone');
    assertEq(_circle1.purpose, 'Purpose one');
    assertEq(_circle2.name, 'orgtwo');
    assertEq(_circle2.purpose, 'Purpose two');
  }

  function test_CreateOrganizationAnchorCircle() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Build great things', _defaultGovConfig());

    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);
    CircleRegistry _cr = CircleRegistry(_org.circleRegistry);

    // it creates an anchor circle with correct data
    HolacracyTypes.Circle memory _circle = _cr.getCircle(_org.anchorCircleId);
    assertEq(_circle.name, 'myorg');
    assertEq(_circle.purpose, 'Build great things');
    assertTrue(_circle.isAnchor);
    assertTrue(_circle.exists);

    // it makes the creator the circle lead
    assertTrue(_cr.isCircleLead(_org.anchorCircleId, _creator1));
    address[] memory _leads = _cr.getCircleLeads(_org.anchorCircleId);
    assertEq(_leads.length, 1);
    assertEq(_leads[0], _creator1);
  }

  function test_CreateOrganizationRegistersENSSubname() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultGovConfig());

    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    // it calls registerSubnode with the correct label and governor address
    assertEq(_mockRegistrar.callCount(), 1);
    MockENSSubdomainRegistrar.SubnodeCall memory _call = _mockRegistrar.getCall(0);
    assertEq(_call.label, keccak256(bytes('myorg')));
    assertEq(_call.targetAddress, _org.governor);
  }

  function test_CreateOrganizationDeploysGovernance() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultGovConfig());

    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    // it deploys all three governance contracts
    assertTrue(_org.governor != address(0));
    assertTrue(_org.token != address(0));
    assertTrue(_org.timelock != address(0));
  }

  function test_CreateOrganizationMultipleOrgs() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.prank(_creator1);
    _factory.createOrganization('alpha', 'Alpha org', _cfg);

    vm.prank(_creator2);
    _factory.createOrganization('beta', 'Beta org', _cfg);

    // it tracks correct count
    assertEq(_factory.organizationCount(), 2);

    // it stores both organizations
    HolacracyTypes.Organization memory _org1 = _factory.getOrganization(1);
    HolacracyTypes.Organization memory _org2 = _factory.getOrganization(2);

    assertEq(_org1.subname, 'alpha');
    assertEq(_org1.creator, _creator1);
    assertEq(_org2.subname, 'beta');
    assertEq(_org2.creator, _creator2);
  }

  /*///////////////////////////////////////////////////////////////
                    SUBNAME VALIDATION
  //////////////////////////////////////////////////////////////*/

  function test_CreateOrganizationWhenSubnameTooShort() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.startPrank(_creator1);

    // it reverts with 2 chars
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameTooShort.selector, 'ab'));
    _factory.createOrganization('ab', 'Purpose', _cfg);

    // it reverts with 1 char
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameTooShort.selector, 'a'));
    _factory.createOrganization('a', 'Purpose', _cfg);

    // it reverts with empty string
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameTooShort.selector, ''));
    _factory.createOrganization('', 'Purpose', _cfg);

    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameHasInvalidChars() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.startPrank(_creator1);

    // it reverts with uppercase
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'MyOrg')
    );
    _factory.createOrganization('MyOrg', 'Purpose', _cfg);

    // it reverts with spaces
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my org')
    );
    _factory.createOrganization('my org', 'Purpose', _cfg);

    // it reverts with underscores
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my_org')
    );
    _factory.createOrganization('my_org', 'Purpose', _cfg);

    // it reverts with dots
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my.org')
    );
    _factory.createOrganization('my.org', 'Purpose', _cfg);

    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameStartsOrEndsWithHyphen() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.startPrank(_creator1);

    // it reverts with leading hyphen
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, '-myorg')
    );
    _factory.createOrganization('-myorg', 'Purpose', _cfg);

    // it reverts with trailing hyphen
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'myorg-')
    );
    _factory.createOrganization('myorg-', 'Purpose', _cfg);

    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameAlreadyTaken() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.prank(_creator1);
    _factory.createOrganization('taken', 'Purpose', _cfg);

    vm.prank(_creator2);
    // it reverts
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameAlreadyTaken.selector, 'taken')
    );
    _factory.createOrganization('taken', 'Different purpose', _cfg);
  }

  function test_CreateOrganizationWhenSubnameHasValidChars() external {
    IOrganizationFactory.GovernanceConfig memory _cfg = _defaultGovConfig();

    vm.startPrank(_creator1);

    // it allows lowercase letters
    _factory.createOrganization('abc', 'Purpose', _cfg);

    // it allows digits
    _factory.createOrganization('org123', 'Purpose', _cfg);

    // it allows hyphens in the middle
    _factory.createOrganization('my-org', 'Purpose', _cfg);

    // it allows mixed alphanumeric with hyphens
    _factory.createOrganization('org-42-test', 'Purpose', _cfg);

    vm.stopPrank();

    assertEq(_factory.organizationCount(), 4);
  }

  /*///////////////////////////////////////////////////////////////
                    VIEW FUNCTIONS
  //////////////////////////////////////////////////////////////*/

  function test_GetOrganizationBySubname() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultGovConfig());

    // it returns the correct organization
    HolacracyTypes.Organization memory _org = _factory.getOrganizationBySubname('myorg');
    assertEq(_org.id, _orgId);
    assertEq(_org.subname, 'myorg');
    assertEq(_org.creator, _creator1);
  }

  function test_GetOrganizationBySubnameWhenNotFound() external view {
    // it returns empty organization (id == 0)
    HolacracyTypes.Organization memory _org = _factory.getOrganizationBySubname('nonexistent');
    assertEq(_org.id, 0);
  }

  function test_GetOrganizationWhenNotFound() external view {
    // it returns empty organization (id == 0)
    HolacracyTypes.Organization memory _org = _factory.getOrganization(999);
    assertEq(_org.id, 0);
  }

  function test_ImplementationAddresses() external view {
    // it returns non-zero implementation addresses
    assertTrue(_factory.roleRegistryImplementation() != address(0));
    assertTrue(_factory.circleRegistryImplementation() != address(0));
    assertTrue(_factory.governanceProcessImplementation() != address(0));
  }

  /*///////////////////////////////////////////////////////////////
                    CLONE INITIALIZATION GUARD
  //////////////////////////////////////////////////////////////*/

  function test_CloneInitializationGuard() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultGovConfig());
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    // it prevents re-initialization of RoleRegistry clone
    vm.expectRevert(IRoleRegistry.RoleRegistry_AlreadyInitialized.selector);
    RoleRegistry(_org.roleRegistry).initialize();

    // it prevents re-initialization of CircleRegistry clone
    vm.expectRevert(ICircleRegistry.CircleRegistry_AlreadyInitialized.selector);
    CircleRegistry(_org.circleRegistry).initialize(RoleRegistry(address(0)), address(0), address(0));

    // it prevents re-initialization of GovernanceProcess clone
    vm.expectRevert(IGovernanceProcess.GovernanceProcess_AlreadyInitialized.selector);
    GovernanceProcess(_org.governanceProcess).initialize(CircleRegistry(address(0)), RoleRegistry(address(0)));
  }

  /*///////////////////////////////////////////////////////////////
                    GOVERNANCE PROCESS INTEGRATION
  //////////////////////////////////////////////////////////////*/

  function test_GovernanceProcessLinkedCorrectly() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultGovConfig());
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    CircleRegistry _cr = CircleRegistry(_org.circleRegistry);
    GovernanceProcess _gp = GovernanceProcess(_org.governanceProcess);

    // it links governance process to circle registry
    assertEq(_cr.governanceProcess(), address(_gp));

    // it links circle registry to governance process
    assertEq(address(_gp.circleRegistry()), address(_cr));

    // it links role registry to governance process
    assertEq(address(_gp.roleRegistry()), _org.roleRegistry);

    // it links role registry to circle registry
    assertEq(address(_cr.roleRegistry()), _org.roleRegistry);

    // it sets deployer correctly
    assertEq(_cr.deployer(), _creator1);
  }

  function test_GovernanceProcessDAOLinkedCorrectly() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultGovConfig());
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    GovernanceProcess _gp = GovernanceProcess(_org.governanceProcess);

    // it links daoGovernor on the governance process to the deployed governor
    assertEq(_gp.daoGovernor(), _org.governor);

    // it links timelockController on the governance process to the deployed timelock
    assertEq(_gp.timelockController(), _org.timelock);
  }
}
