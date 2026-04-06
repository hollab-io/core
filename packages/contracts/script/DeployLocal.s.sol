// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {IENSSubdomainRegistrar} from 'ens/IENSSubdomainRegistrar.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {TacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {GovernanceMeeting} from 'contracts/GovernanceMeeting.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {HolacracyDataProvider} from 'helpers/HolacracyDataProvider.sol';
import {JoinRequest} from 'contracts/JoinRequest.sol';
import {TensionBoard} from 'contracts/TensionBoard.sol';

/// @notice Stub ENS subdomain registrar for local development — records calls without ENS logic
contract MockENSSubdomainRegistrar is IENSSubdomainRegistrar {
  mapping(bytes32 => address) public subnameTargets;

  function registerSubnode(bytes32 _label, address _targetAddress) external {
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
    CircleRegistry circleRegistryImpl = new CircleRegistry();
    GovernanceProcess governanceProcessImpl = new GovernanceProcess();
    TacticalMeeting tacticalMeetingImpl = new TacticalMeeting();
    GovernanceMeeting governanceMeetingImpl = new GovernanceMeeting();
    ActionVoting actionVotingImpl = new ActionVoting();

    // ── 3. MeetingComponentsFactory ─────────────────────────────────────────
    MeetingComponentsFactory meetingFactory = new MeetingComponentsFactory(
      address(tacticalMeetingImpl), address(governanceMeetingImpl), address(actionVotingImpl)
    );

    // ── 4. HolGovernorFactory ───────────────────────────────────────────────
    HolGovernorFactory govFactory = new HolGovernorFactory();

    // ── 5. OrganizationFactory ──────────────────────────────────────────────
    OrganizationFactory factory = new OrganizationFactory(
      address(roleRegistryImpl),
      address(circleRegistryImpl),
      address(governanceProcessImpl),
      address(govFactory),
      address(ensRegistrar)
    );

    // ── 6. JoinRequest & TensionBoard ───────────────────────────────────────
    JoinRequest joinRequest = new JoinRequest(address(factory));
    TensionBoard tensionBoard = new TensionBoard(address(factory));

    // ── 7. HolacracyDataProvider (stateless read helper) ────────────────────
    HolacracyDataProvider dataProvider = new HolacracyDataProvider();

    // ── 8. Create a sample organization with fast governance for testing ─────
    address[] memory holders = new address[](1);
    holders[0] = deployer;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    uint256 orgId = factory.createOrganization(
      'demo',
      'A demo Holacracy organization',
      IOrganizationFactory.GovernanceConfig({
        tokenName: 'Demo Token',
        tokenSymbol: 'DEMO',
        initialHolders: holders,
        initialAmounts: amounts,
        timelockDelay: 0,
        votingDelay: 1,
        votingPeriod: 50,
        proposalThreshold: 0,
        quorumNumerator: 4,
        treasuryTimelockDelay: 1 days
      })
    );

    vm.stopBroadcast();

    // ── Log everything ──────────────────────────────────────────────────────
    console.log('=== Local Deployment Complete ===');
    console.log('');
    console.log('--- Factories ---');
    console.log('OrganizationFactory:      ', address(factory));
    console.log('HolGovernorFactory:       ', address(govFactory));
    console.log('MeetingComponentsFactory: ', address(meetingFactory));
    console.log('');
    console.log('--- Standalone Contracts ---');
    console.log('JoinRequest:              ', address(joinRequest));
    console.log('TensionBoard:             ', address(tensionBoard));
    console.log('HolacracyDataProvider:    ', address(dataProvider));
    console.log('MockENSRegistrar:         ', address(ensRegistrar));
    console.log('');

    HolacracyTypes.Organization memory org = factory.getOrganization(orgId);
    console.log('--- Sample Organization (id:', orgId, ') ---');
    console.log('Subname:              ', org.subname);
    console.log('Creator:              ', org.creator);
    console.log('RoleRegistry:         ', org.roleRegistry);
    console.log('CircleRegistry:       ', org.circleRegistry);
    console.log('GovernanceProcess:    ', org.governanceProcess);
    console.log('Governor:             ', org.governor);
    console.log('GovToken:             ', org.token);
    console.log('Timelock:             ', org.timelock);
    console.log('CircleTreasury:       ', org.treasury);

    // ── Write JSON artifact for tooling ──────────────────────────────────────
    string memory obj = 'local';
    vm.serializeAddress(obj, 'orgFactory', address(factory));
    vm.serializeAddress(obj, 'govFactory', address(govFactory));
    vm.serializeAddress(obj, 'meetingFactory', address(meetingFactory));
    vm.serializeAddress(obj, 'joinRequest', address(joinRequest));
    vm.serializeAddress(obj, 'tensionBoard', address(tensionBoard));
    vm.serializeAddress(obj, 'dataProvider', address(dataProvider));
    vm.serializeAddress(obj, 'ensRegistrar', address(ensRegistrar));
    vm.serializeUint(obj, 'chainId', block.chainid);
    string memory json = vm.serializeUint(obj, 'sampleOrgId', orgId);
    vm.writeJson(json, './deployments/31337-local.json');
    console.log('');
    console.log('Artifact saved to: deployments/31337-local.json');
  }
}
