// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {Script, console} from 'forge-std/Script.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/// @notice Stub ENS subdomain registrar for local development — records calls without ENS logic
contract MockENSSubdomainRegistrar is IENSSubdomainRegistrar {
  mapping(bytes32 => address) public subnameTargets;

  function registerSubnode(
    bytes32 _label,
    address _targetAddress
  ) external {
    subnameTargets[_label] = _targetAddress;
  }
}

/**
 * @title DeployLocal
 * @notice Deploys the full HolLab stack to a local anvil node.
 *         Mirrors DeployInfrastructure but adds a sample org and writes
 *         a JSON artifact to deployments/31337-local.json for tooling.
 *
 * Usage:
 *   anvil                                           # terminal 1
 *   forge script script/DeployLocal.s.sol \          # terminal 2
 *     --tc DeployLocal \
 *     --rpc-url http://127.0.0.1:8545 \
 *     --broadcast -vvv
 */
contract DeployLocal is Script {
  function run() external {
    uint256 deployerKey =
      vm.envOr('PRIVATE_KEY', uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
    address deployer = vm.addr(deployerKey);

    console.log('Deployer:', deployer);
    console.log('');

    vm.startBroadcast(deployerKey);

    // ── 1. Mock ENS registrar ───────────────────────────────────────────────
    MockENSSubdomainRegistrar ensRegistrar = new MockENSSubdomainRegistrar();

    // ── 2. Implementation contracts (clone sources) ─────────────────────────
    RoleRegistry roleRegistryImpl = new RoleRegistry();
    MeetingFactory meetingImpl = new MeetingFactory();
    ActionVoting actionVotingImpl = new ActionVoting();

    // ── 3. MeetingComponentsFactory ─────────────────────────────────────────
    MeetingComponentsFactory meetingFactory =
      new MeetingComponentsFactory(address(meetingImpl), address(actionVotingImpl));

    // ── 4. OrganizationFactory ──────────────────────────────────────────────
    OrganizationFactory factory =
      new OrganizationFactory(address(roleRegistryImpl), address(ensRegistrar), address(meetingFactory));

    // ── 5. Create a sample organization ─────────────────────────────────────
    address[] memory holders = new address[](1);
    holders[0] = deployer;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    uint256 orgId = factory.createOrganization(
      'demo',
      'A demo Holacracy organization',
      IOrganizationFactory.TokenConfig({
        tokenName: 'Demo Token', tokenSymbol: 'DEMO', initialHolders: holders, initialAmounts: amounts
      })
    );

    vm.stopBroadcast();

    // ── Log everything ──────────────────────────────────────────────────────
    console.log('=== Local Deployment Complete ===');
    console.log('');
    console.log('--- Factories ---');
    console.log('OrganizationFactory:      ', address(factory));
    console.log('MeetingComponentsFactory: ', address(meetingFactory));
    console.log('');
    console.log('--- Standalone Contracts ---');
    console.log('MockENSRegistrar:         ', address(ensRegistrar));
    console.log('');

    HolacracyTypes.Organization memory org = factory.getOrganization(orgId);
    console.log('--- Sample Organization (id:', orgId, ') ---');
    console.log('Subname:              ', org.subname);
    console.log('Creator:              ', org.creator);
    console.log('RoleRegistry:         ', org.roleRegistry);
    console.log('GovToken:             ', org.token);

    // ── Write JSON artifact for tooling ──────────────────────────────────────
    string memory obj = 'local';
    vm.serializeAddress(obj, 'orgFactory', address(factory));
    vm.serializeAddress(obj, 'meetingFactory', address(meetingFactory));
    vm.serializeAddress(obj, 'ensRegistrar', address(ensRegistrar));
    vm.serializeUint(obj, 'chainId', block.chainid);
    string memory json = vm.serializeUint(obj, 'sampleOrgId', orgId);
    vm.writeJson(json, './deployments/31337-local.json');
    console.log('');
    console.log('Artifact saved to: deployments/31337-local.json');
  }
}
