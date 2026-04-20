// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Initializable} from '@openzeppelin/contracts/proxy/utils/Initializable.sol';
import {IOrganizationFactory, OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {OrganizationInstance} from 'contracts/OrganizationInstance.sol';
import {IRoleRegistry, RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {IOrganizationInstance} from 'interfaces/IOrganizationInstance.sol';
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

  event OrganizationCreated(
    uint256 indexed _orgId,
    string _subname,
    address indexed _creator,
    address indexed _instance,
    address _roleRegistry
  );

  function setUp() external {
    _mockRegistrar = new MockENSSubdomainRegistrar();
    address roleRegistryImpl = address(new RoleRegistry());
    address orgInstanceImpl = address(new OrganizationInstance());
    _factory = new OrganizationFactory(roleRegistryImpl, orgInstanceImpl, address(_mockRegistrar), address(0));
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

    (uint256 _orgId, address _instance) =
      _factory.createOrganization('myorg', 'Build great things', _defaultTokenConfig());

    assertEq(_factory.organizationCount(), 1);
    assertEq(_orgId, 1);
    assertTrue(_instance != address(0));
    assertEq(_factory.getOrganization(_orgId), _instance);

    IOrganizationInstance _org = IOrganizationInstance(_instance);
    assertEq(_org.id(), 1);
    assertEq(_org.subname(), 'myorg');
    assertEq(_org.creator(), _creator1);
    assertGt(_org.createdAt(), 0);
    assertTrue(_org.roleRegistry() != address(0));
    assertEq(_org.meetingFactory(), address(0));
    // Anchor circle is auto-created at org init (§1.3.3)
    assertEq(_org.anchorCircleId(), 1);
    assertTrue(_org.token() != address(0));
    // Creator is seeded as first admin + member
    assertTrue(_org.isAdmin(_creator1));
    assertTrue(_org.isMember(_creator1));
    assertEq(_org.adminCount(), 1);
  }

  function test_CreateOrganizationClonesAreIsolated() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.prank(_creator1);
    (, address _inst1) = _factory.createOrganization('orgone', 'Purpose one', _cfg);

    vm.prank(_creator2);
    (, address _inst2) = _factory.createOrganization('orgtwo', 'Purpose two', _cfg);

    IOrganizationInstance _org1 = IOrganizationInstance(_inst1);
    IOrganizationInstance _org2 = IOrganizationInstance(_inst2);

    assertTrue(_org1.roleRegistry() != _org2.roleRegistry());
    assertTrue(_org1.token() != _org2.token());
    // Each org has its own anchor circle; both happen to be id 1 in their respective clones
    assertEq(_org1.anchorCircleId(), 1);
    assertEq(_org2.anchorCircleId(), 1);
  }

  function test_CreateOrganizationAnchorCircle() external {
    vm.prank(_creator1);
    (, address _instance) = _factory.createOrganization('myorg', 'Build great things', _defaultTokenConfig());

    IOrganizationInstance _org = IOrganizationInstance(_instance);
    assertEq(_org.anchorCircleId(), 1);

    RoleRegistry _rr = RoleRegistry(_org.roleRegistry());
    assertEq(_rr.anchorCircleId(), 1);
    HolacracyTypes.Circle memory _anchor = _rr.getCircle(1);
    assertTrue(_anchor.isAnchor);
    assertEq(_anchor.parentCircleId, 0);
    assertEq(_anchor.roleId, 1);
    assertTrue(_rr.isRoleLead(1, _creator1));
  }

  function test_CreateOrganizationRegistersENSSubname() external {
    vm.prank(_creator1);
    _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());

    assertEq(_mockRegistrar.callCount(), 1);
    MockENSSubdomainRegistrar.SubnodeCall memory _call = _mockRegistrar.getCall(0);
    assertEq(_call.label, keccak256(bytes('myorg')));
  }

  function test_CreateOrganizationDeploysToken() external {
    vm.prank(_creator1);
    (, address _instance) = _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());
    assertTrue(IOrganizationInstance(_instance).token() != address(0));
  }

  function test_CreateOrganizationMultipleOrgs() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.prank(_creator1);
    _factory.createOrganization('alpha', 'Alpha org', _cfg);

    vm.prank(_creator2);
    _factory.createOrganization('beta', 'Beta org', _cfg);

    assertEq(_factory.organizationCount(), 2);
    assertEq(IOrganizationInstance(_factory.getOrganization(1)).subname(), 'alpha');
    assertEq(IOrganizationInstance(_factory.getOrganization(2)).subname(), 'beta');
  }

  /*///////////////////////////////////////////////////////////////
                    SUBNAME VALIDATION
  //////////////////////////////////////////////////////////////*/

  function test_CreateOrganizationWhenSubnameTooShort() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.startPrank(_creator1);
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameTooShort.selector, 'ab'));
    _factory.createOrganization('ab', 'Purpose', _cfg);

    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameTooShort.selector, 'a'));
    _factory.createOrganization('a', 'Purpose', _cfg);

    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameTooShort.selector, ''));
    _factory.createOrganization('', 'Purpose', _cfg);
    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameHasInvalidChars() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.startPrank(_creator1);
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'MyOrg'));
    _factory.createOrganization('MyOrg', 'Purpose', _cfg);

    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my org'));
    _factory.createOrganization('my org', 'Purpose', _cfg);

    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my_org'));
    _factory.createOrganization('my_org', 'Purpose', _cfg);

    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'my.org'));
    _factory.createOrganization('my.org', 'Purpose', _cfg);
    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameStartsOrEndsWithHyphen() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.startPrank(_creator1);
    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, '-myorg'));
    _factory.createOrganization('-myorg', 'Purpose', _cfg);

    vm.expectRevert(abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_InvalidSubname.selector, 'myorg-'));
    _factory.createOrganization('myorg-', 'Purpose', _cfg);
    vm.stopPrank();
  }

  function test_CreateOrganizationWhenSubnameAlreadyTaken() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.prank(_creator1);
    _factory.createOrganization('taken', 'Purpose', _cfg);

    vm.prank(_creator2);
    vm.expectRevert(
      abi.encodeWithSelector(IOrganizationFactory.OrganizationFactory_SubnameAlreadyTaken.selector, 'taken')
    );
    _factory.createOrganization('taken', 'Different purpose', _cfg);
  }

  function test_CreateOrganizationWhenSubnameHasValidChars() external {
    IOrganizationFactory.TokenConfig memory _cfg = _defaultTokenConfig();

    vm.startPrank(_creator1);
    _factory.createOrganization('abc', 'Purpose', _cfg);
    _factory.createOrganization('org123', 'Purpose', _cfg);
    _factory.createOrganization('my-org', 'Purpose', _cfg);
    _factory.createOrganization('org-42-test', 'Purpose', _cfg);
    vm.stopPrank();

    assertEq(_factory.organizationCount(), 4);
  }

  /*///////////////////////////////////////////////////////////////
                    DIRECTORY (READ-ONLY)
  //////////////////////////////////////////////////////////////*/

  function test_GetOrganizationBySubname() external {
    vm.prank(_creator1);
    (uint256 _orgId, address _instance) =
      _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());

    address _bySub = _factory.getOrganizationBySubname('myorg');
    assertEq(_bySub, _instance);
    assertEq(IOrganizationInstance(_bySub).id(), _orgId);
  }

  function test_GetOrganizationBySubnameWhenNotFound() external view {
    assertEq(_factory.getOrganizationBySubname('nonexistent'), address(0));
  }

  function test_GetOrganizationWhenNotFound() external view {
    assertEq(_factory.getOrganization(999), address(0));
  }

  function test_ImplementationAddresses() external view {
    assertTrue(_factory.roleRegistryImplementation() != address(0));
    assertTrue(_factory.organizationInstanceImplementation() != address(0));
  }

  /*///////////////////////////////////////////////////////////////
                    CLONE INITIALIZATION GUARD
  //////////////////////////////////////////////////////////////*/

  function test_CloneInitializationGuard() external {
    vm.prank(_creator1);
    (, address _instance) = _factory.createOrganization('myorg', 'Purpose', _defaultTokenConfig());
    RoleRegistry _rr = RoleRegistry(IOrganizationInstance(_instance).roleRegistry());

    vm.expectRevert(Initializable.InvalidInitialization.selector);
    _rr.initialize(address(_factory));
  }

  /*///////////////////////////////////////////////////////////////
                    ARRAY LENGTH MISMATCH
  //////////////////////////////////////////////////////////////*/

  function test_CreateOrganization_ArrayLengthMismatch_Reverts() external {
    address[] memory holders = new address[](2);
    holders[0] = _creator1;
    holders[1] = _creator2;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    IOrganizationFactory.TokenConfig memory cfg = IOrganizationFactory.TokenConfig({
      tokenName: 'BadToken', tokenSymbol: 'BAD', initialHolders: holders, initialAmounts: amounts
    });

    vm.prank(_creator1);
    vm.expectRevert(IOrganizationFactory.OrganizationFactory_ArrayLengthMismatch.selector);
    _factory.createOrganization('badorg', 'Purpose', cfg);
  }
}
