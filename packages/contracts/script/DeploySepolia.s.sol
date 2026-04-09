// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {DeployConfig} from './DeployConfig.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {ENSSubdomainRegistrar} from 'ens/ENSSubdomainRegistrar.sol';

interface IENS {
  function owner(bytes32 node) external view returns (address);

  function setApprovalForAll(address operator, bool approved) external;
}

/**
 * @title DeploySepolia
 * @notice Deploys the full HolLab stack to Sepolia with real ENS and creates a
 *         sample organization. For infrastructure-only deployments (no sample org),
 *         use DeployInfrastructure.s.sol instead.
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
 *
 * Run:
 *   forge script script/DeploySepolia.s.sol \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify \
 *     -vvv
 */
contract DeploySepolia is Script {
  function run() external {
    uint256 deployerKey = vm.envUint('PRIVATE_KEY');
    address deployer = vm.addr(deployerKey);
    bytes32 parentNode = vm.envBytes32('ENS_PARENT_NODE');

    console.log('Deployer:            ', deployer);
    console.log('ENS parent node:      (see bytes32 below)');
    console.logBytes32(parentNode);
    console.log('');

    vm.startBroadcast(deployerKey);

    // Verify the deployer actually owns the domain before deploying anything
    require(
      IENS(DeployConfig.ENS_REGISTRY).owner(parentNode) == deployer,
      'DeploySepolia: deployer does not own ENS_PARENT_NODE'
    );

    // ── 1. ENS subdomain registrar ────────────────────────────────────────────
    ENSSubdomainRegistrar ensRegistrar = new ENSSubdomainRegistrar(DeployConfig.ENS_REGISTRY, parentNode);
    IENS(DeployConfig.ENS_REGISTRY).setApprovalForAll(address(ensRegistrar), true);

    // ── 2. Implementation contracts (clone sources, deployed once) ─────────────
    RoleRegistry roleRegistryImpl = new RoleRegistry();
    MeetingFactory meetingImpl = new MeetingFactory();
    ActionVoting actionVotingImpl = new ActionVoting();

    // ── 3. MeetingComponentsFactory ───────────────────────────────────────────
    MeetingComponentsFactory meetingFactory =
      new MeetingComponentsFactory(address(meetingImpl), address(actionVotingImpl));

    // ── 4. OrganizationFactory ────────────────────────────────────────────────
    OrganizationFactory orgFactory = new OrganizationFactory(
      address(roleRegistryImpl),
      address(ensRegistrar)
    );
    ensRegistrar.authorize(address(orgFactory));

    // ── 5. Create the first organization ──────────────────────────────────────
    string memory orgSubname = vm.envOr('ORG_NAME', string('core'));
    string memory orgPurpose = vm.envOr('ORG_PURPOSE', string('Holacracy on-chain'));
    uint256 initialSupply = vm.envOr('INITIAL_SUPPLY', DeployConfig.DEFAULT_INITIAL_SUPPLY);

    address[] memory holders = new address[](1);
    holders[0] = deployer;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = initialSupply;

    uint256 orgId = orgFactory.createOrganization(
      orgSubname,
      orgPurpose,
      IOrganizationFactory.TokenConfig({
        tokenName: vm.envOr('TOKEN_NAME', string('HolToken')),
        tokenSymbol: vm.envOr('TOKEN_SYMBOL', string('HOL')),
        initialHolders: holders,
        initialAmounts: amounts
      })
    );

    HolacracyTypes.Organization memory org = orgFactory.getOrganization(orgId);

    vm.stopBroadcast();

    // ── Persist deployment artifacts ───────────────────────────────────────────
    string memory obj = 'sepolia';
    vm.serializeAddress(obj, 'ensRegistrar', address(ensRegistrar));
    vm.serializeAddress(obj, 'roleRegistryImpl', address(roleRegistryImpl));
    vm.serializeAddress(obj, 'meetingImpl', address(meetingImpl));
    vm.serializeAddress(obj, 'actionVotingImpl', address(actionVotingImpl));
    vm.serializeAddress(obj, 'meetingFactory', address(meetingFactory));
    vm.serializeAddress(obj, 'orgFactory', address(orgFactory));
    vm.serializeUint(obj, 'chainId', block.chainid);
    string memory json = vm.serializeUint(obj, 'sampleOrgId', orgId);
    vm.writeJson(json, './deployments/11155111-sepolia.json');

    // ── Output ─────────────────────────────────────────────────────────────────
    console.log('');
    console.log('=== Deployment Complete (Sepolia) ===');
    console.log('');
    console.log('--- Factories ---');
    console.log('OrganizationFactory:      ', address(orgFactory));
    console.log('MeetingComponentsFactory: ', address(meetingFactory));
    console.log('');
    console.log('--- Implementations (clone sources) ---');
    console.log('RoleRegistry impl:        ', address(roleRegistryImpl));
    console.log('MeetingFactory impl:      ', address(meetingImpl));
    console.log('ActionVoting impl:        ', address(actionVotingImpl));
    console.log('');
    console.log('--- Helpers ---');
    console.log('ENSSubdomainRegistrar:    ', address(ensRegistrar));
    console.log('');
    console.log('--- Sample Organization (id:', orgId, ') ---');
    console.log('Subname:                  ', orgSubname);
    console.log('GovToken:                 ', org.token);
    console.log('RoleRegistry:             ', org.roleRegistry);
    console.log('AccessManager:            ', org.accessManager);
    console.log('');
    console.log('Artifact saved to: deployments/11155111-sepolia.json');
  }
}
