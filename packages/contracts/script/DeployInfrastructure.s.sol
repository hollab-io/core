// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {DeployConfig} from './DeployConfig.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {TacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {GovernanceMeeting} from 'contracts/GovernanceMeeting.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';
import {HolacracyDataProvider} from 'helpers/HolacracyDataProvider.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {ENSSubdomainRegistrar} from 'ens/ENSSubdomainRegistrar.sol';

interface IENS {
  function owner(bytes32 node) external view returns (address);
  function setApprovalForAll(address operator, bool approved) external;
}

/**
 * @title DeployInfrastructure
 * @notice Deploys the complete HolLab infrastructure to any EVM chain.
 *         This is a one-time deployment per chain. Organizations are created
 *         separately via CreateOrganization.
 *
 * Secrets:
 *   Use an encrypted keystore (recommended):
 *     cast wallet import deployer --interactive
 *
 * Required env vars for ENS chains (Ethereum mainnet, Sepolia):
 *   ENS_PARENT_NODE   — bytes32 namehash (e.g. cast namehash hollab.eth)
 *
 * Dry-run (simulation only):
 *   forge script script/DeployInfrastructure.s.sol \
 *     --rpc-url sepolia \
 *     --account deployer \
 *     -vvvv
 *
 * Production broadcast:
 *   forge script script/DeployInfrastructure.s.sol \
 *     --rpc-url sepolia \
 *     --account deployer \
 *     --broadcast \
 *     --verify \
 *     --slow \
 *     -vvvv
 *
 * Resume a failed broadcast:
 *   forge script script/DeployInfrastructure.s.sol \
 *     --rpc-url sepolia \
 *     --account deployer \
 *     --broadcast \
 *     --verify \
 *     --slow \
 *     --resume
 */
contract DeployInfrastructure is Script {
  struct Infrastructure {
    address ensRegistrar;
    address roleRegistryImpl;
    address circleRegistryImpl;
    address governanceProcessImpl;
    address tacticalMeetingImpl;
    address governanceMeetingImpl;
    address actionVotingImpl;
    address meetingFactory;
    address govFactory;
    address orgFactory;
    address dataProvider;
  }

  function run() external returns (Infrastructure memory infra) {
    // Support both keystore (`--account`) and env var fallback for CI
    address deployer = msg.sender;
    uint256 chainId = block.chainid;

    console.log('=== HolLab Infrastructure Deployment ===');
    console.log('Chain ID:  ', chainId);
    console.log('Deployer:  ', deployer);
    console.log('');

    vm.startBroadcast();

    // ── 1. ENS subdomain registrar ──────────────────────────────────────────
    if (DeployConfig.hasENS(chainId)) {
      bytes32 parentNode = vm.envBytes32('ENS_PARENT_NODE');
      require(
        IENS(DeployConfig.ENS_REGISTRY).owner(parentNode) == deployer,
        'DeployInfrastructure: deployer does not own ENS_PARENT_NODE'
      );
      ENSSubdomainRegistrar ensReg = new ENSSubdomainRegistrar(DeployConfig.ENS_REGISTRY, parentNode);
      IENS(DeployConfig.ENS_REGISTRY).setApprovalForAll(address(ensReg), true);
      infra.ensRegistrar = address(ensReg);
    } else {
      MockENSRegistrar mockReg = new MockENSRegistrar();
      infra.ensRegistrar = address(mockReg);
    }

    // ── 2. Implementation contracts (clone sources) ─────────────────────────
    infra.roleRegistryImpl = address(new RoleRegistry());
    infra.circleRegistryImpl = address(new CircleRegistry());
    infra.governanceProcessImpl = address(new GovernanceProcess());
    infra.tacticalMeetingImpl = address(new TacticalMeeting());
    infra.governanceMeetingImpl = address(new GovernanceMeeting());
    infra.actionVotingImpl = address(new ActionVoting());

    // ── 3. MeetingComponentsFactory ─────────────────────────────────────────
    infra.meetingFactory = address(
      new MeetingComponentsFactory(infra.tacticalMeetingImpl, infra.governanceMeetingImpl, infra.actionVotingImpl)
    );

    // ── 4. HolGovernorFactory ───────────────────────────────────────────────
    infra.govFactory = address(new HolGovernorFactory());

    // ── 4. OrganizationFactory ──────────────────────────────────────────────
    OrganizationFactory orgFactory = new OrganizationFactory(
      infra.roleRegistryImpl,
      infra.circleRegistryImpl,
      infra.governanceProcessImpl,
      infra.govFactory,
      infra.ensRegistrar
    );
    infra.orgFactory = address(orgFactory);

    // Authorize factory for ENS registration
    if (DeployConfig.hasENS(chainId)) {
      ENSSubdomainRegistrar(infra.ensRegistrar).authorize(infra.orgFactory);
    }

    // ── 5. HolacracyDataProvider (stateless read helper) ────────────────────
    infra.dataProvider = address(new HolacracyDataProvider());

    vm.stopBroadcast();

    // ── Persist deployment artifacts ────────────────────────────────────────
    _writeArtifacts(infra, chainId);
    _logDeployment(infra, chainId);

    return infra;
  }

  function _writeArtifacts(Infrastructure memory _infra, uint256 _chainId) internal {
    string memory obj = 'infra';
    vm.serializeAddress(obj, 'ensRegistrar', _infra.ensRegistrar);
    vm.serializeAddress(obj, 'roleRegistryImpl', _infra.roleRegistryImpl);
    vm.serializeAddress(obj, 'circleRegistryImpl', _infra.circleRegistryImpl);
    vm.serializeAddress(obj, 'governanceProcessImpl', _infra.governanceProcessImpl);
    vm.serializeAddress(obj, 'tacticalMeetingImpl', _infra.tacticalMeetingImpl);
    vm.serializeAddress(obj, 'governanceMeetingImpl', _infra.governanceMeetingImpl);
    vm.serializeAddress(obj, 'actionVotingImpl', _infra.actionVotingImpl);
    vm.serializeAddress(obj, 'meetingFactory', _infra.meetingFactory);
    vm.serializeAddress(obj, 'govFactory', _infra.govFactory);
    vm.serializeAddress(obj, 'orgFactory', _infra.orgFactory);
    vm.serializeUint(obj, 'chainId', _chainId);
    string memory json = vm.serializeAddress(obj, 'dataProvider', _infra.dataProvider);
    vm.writeJson(json, string.concat('./deployments/', vm.toString(_chainId), '-infrastructure.json'));
  }

  function _logDeployment(Infrastructure memory _infra, uint256 _chainId) internal pure {
    console.log('');
    console.log('=== Infrastructure Deployed (chain ', _chainId, ') ===');
    console.log('');
    console.log('--- Factories ---');
    console.log('OrganizationFactory:    ', _infra.orgFactory);
    console.log('HolGovernorFactory:     ', _infra.govFactory);
    console.log('');
    console.log('--- Implementations (clone sources) ---');
    console.log('RoleRegistry:           ', _infra.roleRegistryImpl);
    console.log('CircleRegistry:         ', _infra.circleRegistryImpl);
    console.log('GovernanceProcess:      ', _infra.governanceProcessImpl);
    console.log('TacticalMeeting:        ', _infra.tacticalMeetingImpl);
    console.log('GovernanceMeeting:      ', _infra.governanceMeetingImpl);
    console.log('ActionVoting:           ', _infra.actionVotingImpl);
    console.log('');
    console.log('--- Meeting factory ---');
    console.log('MeetingComponentsFactory:', _infra.meetingFactory);
    console.log('');
    console.log('--- Helpers ---');
    console.log('HolacracyDataProvider:  ', _infra.dataProvider);
    console.log('ENSRegistrar:           ', _infra.ensRegistrar);
    console.log('');
    console.log('Artifacts saved to: deployments/', vm.toString(_chainId), '-infrastructure.json');
  }
}

/// @notice Stub ENS registrar for chains without ENS
contract MockENSRegistrar {
  mapping(bytes32 => address) public subnameTargets;

  function registerSubnode(bytes32 _label, address _targetAddress) external {
    subnameTargets[_label] = _targetAddress;
  }
}
