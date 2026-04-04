// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test, console} from 'forge-std/Test.sol';
import {ENSSubdomainRegistrar} from 'ens/ENSSubdomainRegistrar.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {OrganizationFactory, IOrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

interface IENS {
  function owner(bytes32 node) external view returns (address);
  function resolver(bytes32 node) external view returns (address);
  function setApprovalForAll(address operator, bool approved) external;
}

interface IAddrResolver {
  function addr(bytes32 node) external view returns (address payable);
}

/// @notice Fork test for the full Holacracy organization + ENS subdomain registration flow.
///
/// Required env vars:
///   SEPOLIA_RPC_URL          — your Sepolia RPC endpoint
///   ENS_PARENT_NODE          — namehash of your domain as a 0x-prefixed hex bytes32
///                              compute with: cast namehash <yourdomain.eth>
///   DOMAIN_OWNER_PRIVATE_KEY — private key of the account that owns the domain
///
/// Optional:
///   ENS_SUBDOMAIN            — label to register under your domain (default: "holtest")
///
/// Run:
///   forge test --match-path test/fork/HolacracyENS.fork.t.sol -vvv
contract HolacracyENSForkTest is Test {
  // ENS registry address is the same on mainnet and all testnets.
  address internal constant _ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

  IENS internal _ens = IENS(_ENS_REGISTRY);

  uint256 internal _domainOwnerPk;
  address internal _domainOwner;
  bytes32 internal _parentNode;
  string internal _subdomain;

  /// @notice Thrown when the domain owner does not own the parent node
  error HolacracyENSForkTest_DomainOwnerDoesNotOwnParentNode();

  function setUp() external {
    vm.createSelectFork(vm.envString('SEPOLIA_RPC_URL'));

    _domainOwnerPk = vm.envUint('DOMAIN_OWNER_PRIVATE_KEY');
    _domainOwner = vm.addr(_domainOwnerPk);
    _parentNode = vm.envBytes32('ENS_PARENT_NODE');
    _subdomain = vm.envOr('ENS_SUBDOMAIN', string('holtest'));

    if (_ens.owner(_parentNode) != _domainOwner) {
      revert HolacracyENSForkTest_DomainOwnerDoesNotOwnParentNode();
    }
  }

  function test_FullHolacracyENSFlow() external {
    console.log('Domain owner:  ', _domainOwner);
    console.log('Subdomain:     ', _subdomain);

    // 1. Deploy ENS registrar as the domain owner and approve it on the ENS registry.
    vm.startPrank(_domainOwner);
    ENSSubdomainRegistrar registrar = new ENSSubdomainRegistrar(_ENS_REGISTRY, _parentNode);
    _ens.setApprovalForAll(address(registrar), true);

    // 2. Deploy HolGovernorFactory and implementation contracts.
    HolGovernorFactory govFactory = new HolGovernorFactory();
    address roleRegistryImpl = address(new RoleRegistry());
    address circleRegistryImpl = address(new CircleRegistry());
    address governanceProcessImpl = address(new GovernanceProcess());

    // 3. Deploy OrganizationFactory and authorize it on the ENS registrar.
    OrganizationFactory orgFactory = new OrganizationFactory(
      roleRegistryImpl,
      circleRegistryImpl,
      governanceProcessImpl,
      address(govFactory),
      address(registrar)
    );
    registrar.authorize(address(orgFactory));
    vm.stopPrank();

    // 4. Create a Holacracy organization with ENS registration.
    address[] memory holders = new address[](1);
    holders[0] = _domainOwner;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    vm.prank(_domainOwner);
    uint256 orgId = orgFactory.createOrganization(
      _subdomain,
      'A fork-tested Holacracy organization',
      IOrganizationFactory.GovernanceConfig({
        tokenName: 'ForkToken',
        tokenSymbol: 'FORK',
        initialHolders: holders,
        initialAmounts: amounts,
        timelockDelay: 0,
        votingDelay: uint48(1),
        votingPeriod: uint32(50),
        proposalThreshold: 0,
        quorumNumerator: 4,
        treasuryTimelockDelay: 0
      })
    );

    // 5. Fetch the stored organization record.
    HolacracyTypes.Organization memory org = orgFactory.getOrganization(orgId);

    console.log('Org ID:        ', orgId);
    console.log('Governor:      ', org.governor);
    console.log('Token:         ', org.token);
    console.log('Timelock:      ', org.timelock);
    console.log('CircleRegistry:', org.circleRegistry);
    console.log('RoleRegistry:  ', org.roleRegistry);
    console.log('GovProcess:    ', org.governanceProcess);
    console.log('Anchor circle: ', org.anchorCircleId);

    // 6. Verify the ENS subdomain resolves to the governor.
    bytes32 subnode = keccak256(abi.encodePacked(_parentNode, keccak256(bytes(_subdomain))));
    address resolved = IAddrResolver(_ens.resolver(subnode)).addr(subnode);

    console.log('Resolved addr: ', resolved);

    assertEq(resolved, org.governor, 'subdomain should resolve to governor');
    assertEq(_ens.owner(subnode), address(registrar), 'registrar should own the subnode');

    // 7. Verify organization data is correctly stored.
    assertEq(orgId, 1, 'first org should have id 1');
    assertEq(org.creator, _domainOwner, 'creator should be domain owner');
    assertEq(org.anchorCircleId, 1, 'anchor circle id should be 1');
    assertTrue(org.roleRegistry != address(0), 'role registry should be deployed');
    assertTrue(org.circleRegistry != address(0), 'circle registry should be deployed');
    assertTrue(org.governanceProcess != address(0), 'governance process should be deployed');
    assertTrue(org.governor != address(0), 'governor should be deployed');
    assertTrue(org.token != address(0), 'token should be deployed');
    assertTrue(org.timelock != address(0), 'timelock should be deployed');

    // 8. Verify lookup by subname also works.
    HolacracyTypes.Organization memory orgBySubname = orgFactory.getOrganizationBySubname(_subdomain);
    assertEq(orgBySubname.id, orgId, 'getOrganizationBySubname should return same org');
    assertEq(orgFactory.organizationCount(), 1, 'org count should be 1');
  }
}
