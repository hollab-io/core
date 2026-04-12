// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {DeployConfig} from './DeployConfig.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {ENSSubdomainRegistrar} from 'ens/ENSSubdomainRegistrar.sol';
import {Script, console} from 'forge-std/Script.sol';

interface IENS {
  function owner(
    bytes32 node
  ) external view returns (address);
  function setApprovalForAll(
    address operator,
    bool approved
  ) external;
}

/**
 * @title DeployInfrastructure
 * @notice Deploys the complete HolLab infrastructure to any EVM chain.
 *         This is a one-time deployment per chain. Organizations are created
 *         separately via OrganizationFactory.createOrganization().
 *
 * Signing:
 *   Uses --browser to open a local page for wallet signing (MetaMask, etc.)
 *
 * Required env vars for ENS chains (Ethereum mainnet, Sepolia):
 *   ENS_PARENT_NODE   — bytes32 namehash (e.g. cast namehash hollab.eth)
 *
 * Dry-run (simulation only):
 *   forge script script/DeployInfrastructure.s.sol \
 *     --rpc-url sepolia \
 *     --browser \
 *     -vvvv
 *
 * Production broadcast (Sepolia):
 *   pnpm deploy:infra:sepolia
 *
 * Production broadcast (0G testnet):
 *   pnpm deploy:infra:0g-testnet
 *
 * Resume a failed broadcast:
 *   forge script script/DeployInfrastructure.s.sol \
 *     --rpc-url sepolia \
 *     --browser \
 *     --broadcast \
 *     --verify \
 *     --slow \
 *     --resume
 */
contract DeployInfrastructure is Script {
  struct Infrastructure {
    address ensRegistrar;
    address roleRegistryImpl;
    address meetingImpl;
    address actionVotingImpl;
    address meetingFactory;
    address orgFactory;
  }

  function run() external returns (Infrastructure memory infra) {
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
    infra.meetingImpl = address(new MeetingFactory());
    infra.actionVotingImpl = address(new ActionVoting());

    // ── 3. MeetingComponentsFactory ─────────────────────────────────────────
    infra.meetingFactory = address(new MeetingComponentsFactory(infra.meetingImpl, infra.actionVotingImpl));

    // ── 4. OrganizationFactory ──────────────────────────────────────────────
    OrganizationFactory orgFactory = new OrganizationFactory(infra.roleRegistryImpl, infra.ensRegistrar);
    infra.orgFactory = address(orgFactory);

    // Authorize factory for ENS registration
    if (DeployConfig.hasENS(chainId)) {
      ENSSubdomainRegistrar(infra.ensRegistrar).authorize(infra.orgFactory);
    }

    vm.stopBroadcast();

    // ── Persist deployment artifacts ────────────────────────────────────────
    _writeArtifacts(infra, chainId);
    _logDeployment(infra, chainId);

    return infra;
  }

  function _writeArtifacts(
    Infrastructure memory _infra,
    uint256 _chainId
  ) internal {
    string memory obj = 'infra';
    vm.serializeAddress(obj, 'ensRegistrar', _infra.ensRegistrar);
    vm.serializeAddress(obj, 'roleRegistryImpl', _infra.roleRegistryImpl);
    vm.serializeAddress(obj, 'meetingImpl', _infra.meetingImpl);
    vm.serializeAddress(obj, 'actionVotingImpl', _infra.actionVotingImpl);
    vm.serializeAddress(obj, 'meetingFactory', _infra.meetingFactory);
    vm.serializeAddress(obj, 'orgFactory', _infra.orgFactory);
    string memory json = vm.serializeUint(obj, 'chainId', _chainId);
    vm.writeJson(json, string.concat('./deployments/', vm.toString(_chainId), '-infrastructure.json'));
  }

  function _logDeployment(
    Infrastructure memory _infra,
    uint256 _chainId
  ) internal pure {
    console.log('');
    console.log('=== Infrastructure Deployed (chain ', _chainId, ') ===');
    console.log('');
    console.log('--- Factories ---');
    console.log('OrganizationFactory:    ', _infra.orgFactory);
    console.log('');
    console.log('--- Implementations (clone sources) ---');
    console.log('RoleRegistry:           ', _infra.roleRegistryImpl);
    console.log('MeetingFactory:         ', _infra.meetingImpl);
    console.log('ActionVoting:           ', _infra.actionVotingImpl);
    console.log('');
    console.log('--- Meeting factory ---');
    console.log('MeetingComponentsFactory:', _infra.meetingFactory);
    console.log('');
    console.log('--- Helpers ---');
    console.log('ENSRegistrar:           ', _infra.ensRegistrar);
    console.log('');
    console.log('Artifacts saved to: deployments/', vm.toString(_chainId), '-infrastructure.json');
  }
}

/// @notice Stub ENS registrar for chains without ENS
contract MockENSRegistrar {
  mapping(bytes32 => address) public subnameTargets;

  function registerSubnode(
    bytes32 _label,
    address _targetAddress
  ) external {
    subnameTargets[_label] = _targetAddress;
  }
}
