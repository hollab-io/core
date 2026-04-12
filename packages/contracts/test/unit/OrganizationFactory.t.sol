// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {IRoleRegistry, RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Test} from 'forge-std/Test.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/// @notice Mock ENS subdomain registrar that records calls without ENS logic
contract MockENSSubdomainRegistrar is IENSSubdomainRegistrar {
  struct SubnodeCall {
    bytes32 label;
    address targetAddress;
  }

  SubnodeCall[] public calls;

  function registerSubnode(
    bytes32 _label,
    address _targetAddress
  ) external {
    calls.push(SubnodeCall(_label, _targetAddress));
  }

  function callCount() external view returns (uint256) {
    return calls.length;
  }

  function getCall(
    uint256 _idx
  ) external view returns (SubnodeCall memory) {
    return calls[_idx];
  }
}

contract UnitOrganizationFactory is Test {
  OrganizationFactory internal _factory;
  MockENSSubdomainRegistrar internal _mockRegistrar;

  address internal _creator1 = makeAddr('creator1');
  address internal _creator2 = makeAddr('creator2');

  event OrganizationCreated(uint256 indexed _orgId, string _subname, address indexed _creator);

  function setUp() external {
    _mockRegistrar = new MockENSSubdomainRegistrar();

    address roleRegistryImpl = address(new RoleRegistry());

    _factory = new OrganizationFactory(roleRegistryImpl, address(_mockRegistrar));
  }

  /*///////////////////////////////////////////////////////////////
                    HELPERS
  //////////////////////////////////////////////////////////////*/

  function _defaultTokenConfig() internal view returns (IOrganizationFactory.TokenConfig memory) {
    address[] memory holders = new address[](1);
    holders[0] = _creator1;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    return IOrganizationFactory.TokenConfig({
      tokenName: 'OrgToken', tokenSymbol: 'ORG', initialHolders: holders, initialAmounts: amounts
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

    uint256 _orgId = _factory.createOrganization('myorg', 'Build great things', _defaultTokenConfig());

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
    assertEq(_org.circleRegistry, address(0));
    assertEq(_org.governanceProcess, address(0));
    assertEq(_org.anchorCircleId, 0);
    assertTrue(_org.token != address(0));
  }

  function test_CreateOrganizationClonesAreIsolated() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.prank(_creator1);
    uint256 _orgId1 = _factory.createOrganization('orgone', 'Purpose one', _cfg);

    vm.prank(_creator2);
    uint256 _orgId2 = _factory.createOrganization('orgtwo', 'Purpose two', _cfg);

    HolacracyTypes.Organization memory _org1 = _factory.getOrganization(_orgId1);
    HolacracyTypes.Organization memory _org2 = _factory.getOrganization(_orgId2);

    // it deploys separate contract instances
    assertTrue(_org1.roleRegistry != _org2.roleRegistry);
    assertEq(_org1.circleRegistry, address(0));
    assertEq(_org2.circleRegistry, address(0));
    assertEq(_org1.governanceProcess, address(0));
    assertEq(_org2.governanceProcess, address(0));
    assertTrue(_org1.token != _org2.token);

    // anchor circles are removed in org-scoped architecture
    assertEq(_org1.anchorCircleId, 0);
    assertEq(_org2.anchorCircleId, 0);
  }

  function test_CreateOrganizationAnchorCircle() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Build great things', _defaultTokenConfig());

    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);
    // anchor circles are removed in org-scoped architecture
    assertEq(_org.circleRegistry, address(0));
    assertEq(_org.anchorCircleId, 0);
  }

  function test_CreateOrganizationRegistersENSSubname() external {
    vm.prank(_creator1);
    _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());

    // it calls registerSubnode with the correct label
    assertEq(_mockRegistrar.callCount(), 1);
    MockENSSubdomainRegistrar.SubnodeCall memory _call = _mockRegistrar.getCall(0);
    assertEq(_call.label, keccak256(bytes('myorg')));
  }

  function test_CreateOrganizationDeploysToken() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());

    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    // it deploys a governance token
    assertTrue(_org.token != address(0));
  }

  function test_CreateOrganizationMultipleOrgs() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

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
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

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
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.startPrank(_creator1);

    // it reverts with uppercase
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'MyOrg'));
    _factory.createOrganization('MyOrg', 'Purpose', _cfg);

    // it reverts with spaces
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my org'));
    _factory.createOrganization('my org', 'Purpose', _cfg);

    // it reverts with underscores
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my_org'));
    _factory.createOrganization('my_org', 'Purpose', _cfg);

    // it reverts with dots
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my.org'));
    _factory.createOrganization('my.org', 'Purpose', _cfg);

    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameStartsOrEndsWithHyphen() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.startPrank(_creator1);

    // it reverts with leading hyphen
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, '-myorg'));
    _factory.createOrganization('-myorg', 'Purpose', _cfg);

    // it reverts with trailing hyphen
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'myorg-'));
    _factory.createOrganization('myorg-', 'Purpose', _cfg);

    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameAlreadyTaken() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

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
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

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
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());

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

  function test_GetOrganizationsPaginated() external {
    vm.startPrank(_creator1);
    _factory.createOrganization('orgone', 'One', _defaultTokenConfig());
    _factory.createOrganization('orgtwo', 'Two', _defaultTokenConfig());
    _factory.createOrganization('orgthree', 'Three', _defaultTokenConfig());
    vm.stopPrank();

    HolacracyTypes.Organization[] memory _page = _factory.getOrganizations(0, 2);
    assertEq(_page.length, 2);
    assertEq(_page[0].id, 1);
    assertEq(_page[1].id, 2);

    HolacracyTypes.Organization[] memory _tail = _factory.getOrganizations(2, 5);
    assertEq(_tail.length, 1);
    assertEq(_tail[0].id, 3);
  }

  function test_GetOrganizationsWhenOffsetOutOfBounds() external {
    vm.prank(_creator1);
    _factory.createOrganization('myorg', 'Build my DAO', _defaultTokenConfig());

    HolacracyTypes.Organization[] memory _page = _factory.getOrganizations(5, 10);
    assertEq(_page.length, 0);
  }

  function test_ImplementationAddresses() external view {
    // it returns non-zero implementation addresses
    assertTrue(_factory.roleRegistryImplementation() != address(0));
  }

  /*///////////////////////////////////////////////////////////////
                    CLONE INITIALIZATION GUARD
  //////////////////////////////////////////////////////////////*/

  function test_CloneInitializationGuard() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    // it prevents re-initialization of RoleRegistry clone
    vm.expectRevert(IRoleRegistry.RoleRegistry_AlreadyInitialized.selector);
    RoleRegistry(_org.roleRegistry).initialize();

    // governance process is disabled in simplified architecture
    assertEq(_org.governanceProcess, address(0));
  }

  /*///////////////////////////////////////////////////////////////
                    GOVERNANCE PROCESS REMOVAL
  //////////////////////////////////////////////////////////////*/

  function test_GovernanceProcessDisabled() external {
    vm.prank(_creator1);
    uint256 _orgId = _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());
    HolacracyTypes.Organization memory _org = _factory.getOrganization(_orgId);

    // governance process is intentionally not deployed or linked
    assertEq(_org.governanceProcess, address(0));
    assertEq(_org.circleRegistry, address(0));
  }
}
