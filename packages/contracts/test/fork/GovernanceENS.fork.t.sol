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
  address internal constant _ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

  IENS internal _ens = IENS(_ENS_REGISTRY);

  uint256 internal _domainOwnerPk;
  address internal _domainOwner;
  bytes32 internal _parentNode;
  string internal _subdomain;

  /// @notice Thrown when the domain owner does not own the parent node
  error GovernanceENSForkTest_DomainOwnerDoesNotOwnParentNode();

  function setUp() external {
    vm.createSelectFork(vm.envString('SEPOLIA_RPC_URL'));

    _domainOwnerPk = vm.envUint('DOMAIN_OWNER_PRIVATE_KEY');
    _domainOwner = vm.addr(_domainOwnerPk);
    _parentNode = vm.envBytes32('ENS_PARENT_NODE');
    _subdomain = vm.envOr('ENS_SUBDOMAIN', string('governor'));

    if (_ens.owner(_parentNode) != _domainOwner) {
      revert GovernanceENSForkTest_DomainOwnerDoesNotOwnParentNode();
    }
  }

  function test_FullGovernanceENSFlow() external {
    console.log('Domain owner:  ', _domainOwner);
    console.log('Subdomain:     ', _subdomain);

    // 1. Deploy registrar as the domain owner and approve it to manage the node.
    vm.startPrank(_domainOwner);
    ENSSubdomainRegistrar registrar = new ENSSubdomainRegistrar(_ENS_REGISTRY, _parentNode);
    _ens.setApprovalForAll(address(registrar), true);

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
        subdomain: _subdomain,
        subdomainRegistrar: address(registrar)
      })
    );

    console.log('Governor:      ', d.governor);
    console.log('Token:         ', d.token);
    console.log('Timelock:      ', d.timelock);

    // 4. Verify the subdomain resolves to the governor.
    bytes32 subnode = keccak256(abi.encodePacked(_parentNode, keccak256(bytes(_subdomain))));
    address resolved = IAddrResolver(_ens.resolver(subnode)).addr(subnode);

    console.log('Resolved addr: ', resolved);

    assertEq(resolved, d.governor, 'subdomain should resolve to governor');
    assertEq(_ens.owner(subnode), address(registrar), 'registrar should own the subnode');
  }
}
