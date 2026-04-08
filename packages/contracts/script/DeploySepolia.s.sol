// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {HolacracyTypes} from "libraries/HolacracyTypes.sol";
import {IOrganizationFactory} from "interfaces/IOrganizationFactory.sol";
import {OrganizationFactory} from "contracts/OrganizationFactory.sol";
import {RoleRegistry} from "contracts/RoleRegistry.sol";
import {HolGovernorFactory} from "contracts/governance/HolGovernorFactory.sol";
import {ENSSubdomainRegistrar} from "ens/ENSSubdomainRegistrar.sol";

interface IENS {
    function owner(bytes32 node) external view returns (address);

    function setApprovalForAll(address operator, bool approved) external;
}

/**
 * @title DeploySepolia
 * @notice Deploys the full HolLab stack to Sepolia with real ENS.
 *
 * Required env vars:
 *   PRIVATE_KEY              — deployer private key (must own ENS_PARENT_NODE)
 *   ENS_PARENT_NODE          — bytes32 namehash of your domain (e.g. cast namehash hollab.eth)
 *
 * Optional env vars:
 *   ORG_NAME                 — first org subname under your domain   (default: "core")
 *   ORG_PURPOSE              — org purpose string                    (default: "Holacracy on-chain")
 *   TOKEN_NAME               — governance token name                 (default: "HolToken")
 *   TOKEN_SYMBOL             — governance token symbol               (default: "HOL")
 *   INITIAL_SUPPLY           — token supply minted to deployer       (default: 1_000_000e18)
 *   TIMELOCK_DELAY           — timelock min delay in seconds         (default: 2 days)
 *   VOTING_DELAY             — voting delay in seconds               (default: 1 day)
 *   VOTING_PERIOD            — voting period in seconds              (default: 1 week)
 *   QUORUM_NUMERATOR         — quorum % numerator out of 100         (default: 4)
 *
 * Run:
 *   forge script script/DeploySepolia.s.sol \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvv
 */
contract DeploySepolia is Script {
    // ENS registry address is identical on all networks
    address internal constant _ENS_REGISTRY = 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        bytes32 parentNode = vm.envBytes32("ENS_PARENT_NODE");

        console.log("Deployer:            ", deployer);
        console.log("ENS parent node:      (see bytes32 below)");
        console.logBytes32(parentNode);
        console.log("");

        vm.startBroadcast(deployerKey);

        // Verify the deployer actually owns the domain before deploying anything
        // require(
        //     IENS(_ENS_REGISTRY).owner(parentNode) == deployer,
        //     "DeploySepolia: deployer does not own ENS_PARENT_NODE"
        // );

        // ── 1. ENS subdomain registrar ────────────────────────────────────────────
        ENSSubdomainRegistrar ensRegistrar = new ENSSubdomainRegistrar(_ENS_REGISTRY, parentNode);
        // Grant the registrar operator rights over all nodes owned by deployer.
        // This is required for setSubnodeOwner to succeed.
        IENS(_ENS_REGISTRY).setApprovalForAll(address(ensRegistrar), true);

        // ── 2. Implementation contracts (logic, deployed once) ────────────────────
        RoleRegistry roleRegistryImpl = new RoleRegistry();

        // ── 3. HolGovernorFactory ─────────────────────────────────────────────────
        HolGovernorFactory govFactory = new HolGovernorFactory();

        // ── 4. OrganizationFactory ────────────────────────────────────────────────
        OrganizationFactory orgFactory = new OrganizationFactory(
            address(roleRegistryImpl),
            address(govFactory),
            address(ensRegistrar)
        );
        // Authorize the factory to register subdomains on behalf of the deployer
        ensRegistrar.authorize(address(orgFactory));

        // ── 5. Create the first organization ──────────────────────────────────────
        string memory orgSubname = vm.envOr("ORG_NAME", string("core"));
        string memory orgPurpose = vm.envOr("ORG_PURPOSE", string("Holacracy on-chain"));
        uint256 initialSupply = vm.envOr("INITIAL_SUPPLY", uint256(1_000_000e18));

        address[] memory holders = new address[](1);
        holders[0] = deployer;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = initialSupply;

        uint256 orgId = orgFactory.createOrganization(
            orgSubname,
            orgPurpose,
            IOrganizationFactory.GovernanceConfig({
                tokenName: vm.envOr("TOKEN_NAME", string("HolToken")),
                tokenSymbol: vm.envOr("TOKEN_SYMBOL", string("HOL")),
                initialHolders: holders,
                initialAmounts: amounts,
                timelockDelay: vm.envOr("TIMELOCK_DELAY", uint256(2 days)),
                votingDelay: uint48(vm.envOr("VOTING_DELAY", uint256(1 days))),
                votingPeriod: uint32(vm.envOr("VOTING_PERIOD", uint256(1 weeks))),
                proposalThreshold: 0,
                quorumNumerator: vm.envOr("QUORUM_NUMERATOR", uint256(4))
            })
        );

        // ── 7. Fetch org addresses ─────────────────────────────────────────────────
        HolacracyTypes.Organization memory org = orgFactory.getOrganization(orgId);

        vm.stopBroadcast();

        // ── Output ─────────────────────────────────────────────────────────────────
        console.log("");
        console.log("=== .env.local (copy into apps/hollab-indexing/.env.local) ===");
        console.log("");
        console.log("PONDER_RPC_URL_11155111=<your-sepolia-rpc>");
        console.log("START_BLOCK=<this-block-number>");
        console.log("");
        console.log("ORGANIZATION_FACTORY_ADDRESS=   ", address(orgFactory));
        console.log("HOL_GOVERNOR_FACTORY_ADDRESS=   ", address(govFactory));
        console.log("");
        console.log("# RoleRegistry / GovernanceProcess are");
        console.log("# auto-discovered via OrgComponentsDeployed -- no addresses needed.");
        console.log("");
        console.log("=== All deployed addresses ===");
        console.log("");
        console.log("--- Infrastructure ---");
        console.log("ENSSubdomainRegistrar:  ", address(ensRegistrar));
        console.log("HolGovernorFactory:     ", address(govFactory));
        console.log("OrganizationFactory:    ", address(orgFactory));
        console.log("");
        console.log("--- Implementations (not indexed) ---");
        console.log("RoleRegistry impl:      ", address(roleRegistryImpl));
        console.log("");
        console.log("--- Organization ---");
        console.log("ID:                    ", orgId);
        console.log("Subname:               ", orgSubname);
        console.log("Governor:               ", org.governor);
        console.log("GovToken:               ", org.token);
        console.log("Timelock:               ", org.timelock);
        console.log("CircleRegistry:         ", org.circleRegistry);
        console.log("RoleRegistry:           ", org.roleRegistry);
        console.log("GovernanceProcess:      ", org.governanceProcess);
        console.log("Anchor circle ID:       ", org.anchorCircleId);
    }
}
