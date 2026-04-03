// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {Test, console} from 'forge-std/Test.sol';
import {ENSSubdomainRegistrar} from 'ens/ENSSubdomainRegistrar.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';

interface IENS {
  function owner(bytes32 node) external view returns (address);
  function resolver(bytes32 node) external view returns (address);
  function setApprovalForAll(address operator, bool approved) external;
}

interface IAddrResolver {
  function addr(bytes32 node) external view returns (address payable);
}

/// @notice Fork test for the full governance + ENS subdomain registration flow.
///
/// Required env vars:
///   SEPOLIA_RPC_URL          — your Sepolia RPC endpoint
///   ENS_PARENT_NODE          — namehash of your domain as a 0x-prefixed hex bytes32
///                              compute with: cast namehash <yourdomain.eth>
///   DOMAIN_OWNER_PRIVATE_KEY — private key of the account that owns the domain
///
/// Optional:
///   ENS_SUBDOMAIN            — label to register under your domain (default: "governor")
///
/// Run:
///   forge test --match-path test/fork/GovernanceENS.fork.t.sol -vvv
contract GovernanceENSForkTest is Test {
  // ENS registry address is the same on mainnet and all testnets.
  address constant ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

  IENS ens = IENS(ENS_REGISTRY);

  uint256 domainOwnerPk;
  address domainOwner;
  bytes32 parentNode;
  string subdomain;

  function setUp() external {
    vm.createSelectFork(vm.envString('SEPOLIA_RPC_URL'));

    domainOwnerPk = vm.envUint('DOMAIN_OWNER_PRIVATE_KEY');
    domainOwner = vm.addr(domainOwnerPk);
    parentNode = vm.envBytes32('ENS_PARENT_NODE');
    subdomain = vm.envOr('ENS_SUBDOMAIN', string('governor'));

    require(ens.owner(parentNode) == domainOwner, 'DOMAIN_OWNER_PRIVATE_KEY does not own ENS_PARENT_NODE on Sepolia');
  }

  function test_FullGovernanceENSFlow() external {
    console.log('Domain owner:  ', domainOwner);
    console.log('Subdomain:     ', subdomain);

    // 1. Deploy registrar as the domain owner and approve it to manage the node.
    vm.startPrank(domainOwner);
    ENSSubdomainRegistrar registrar = new ENSSubdomainRegistrar(ENS_REGISTRY, parentNode);
    ens.setApprovalForAll(address(registrar), true);

    // 2. Deploy factory and authorize it on the registrar — all in one prank block
    //    so the factory address is known before we stop impersonating the owner.
    HolGovernorFactory factory = new HolGovernorFactory();
    registrar.authorize(address(factory));
    vm.stopPrank();

    // 3. Deploy governance suite with ENS subdomain.
    address[] memory holders = new address[](0);
    uint256[] memory amounts = new uint256[](0);

    HolGovernorFactory.Deployment memory d = factory.deploy(
      HolGovernorFactory.DeploymentConfig({
        tokenName: 'ForkToken',
        tokenSymbol: 'FORK',
        initialHolders: holders,
        initialAmounts: amounts,
        timelockDelay: 0,
        governorName: 'ForkGovernor',
        votingDelay: uint48(1),
        votingPeriod: uint32(50),
        proposalThreshold: 0,
        quorumNumerator: 4,
        subdomain: subdomain,
        subdomainRegistrar: address(registrar)
      })
    );

    console.log('Governor:      ', d.governor);
    console.log('Token:         ', d.token);
    console.log('Timelock:      ', d.timelock);

    // 4. Verify the subdomain resolves to the governor.
    bytes32 subnode = keccak256(abi.encodePacked(parentNode, keccak256(bytes(subdomain))));
    address resolved = IAddrResolver(ens.resolver(subnode)).addr(subnode);

    console.log('Resolved addr: ', resolved);

    assertEq(resolved, d.governor, 'subdomain should resolve to governor');
    assertEq(ens.owner(subnode), address(registrar), 'registrar should own the subnode');
  }
}
