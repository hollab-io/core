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
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';

/// @notice Stub ENS subdomain registrar for local development — records calls without ENS logic
contract MockENSSubdomainRegistrar is IENSSubdomainRegistrar {
  mapping(bytes32 => address) public subnameTargets;

  function registerSubnode(bytes32 _label, address _targetAddress) external {
    subnameTargets[_label] = _targetAddress;
  }
}

/**
 * @title DeployLocal
 * @notice Deploys the full HolLab stack to a local anvil node
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

    // 1. Deploy mock ENS registrar
    MockENSSubdomainRegistrar ensRegistrar = new MockENSSubdomainRegistrar();

    // 2. Deploy implementation contracts
    RoleRegistry roleRegistryImpl = new RoleRegistry();
    CircleRegistry circleRegistryImpl = new CircleRegistry();
    GovernanceProcess governanceProcessImpl = new GovernanceProcess();

    // 3. Deploy HolGovernorFactory
    HolGovernorFactory govFactory = new HolGovernorFactory();

    // 4. Deploy OrganizationFactory
    OrganizationFactory factory = new OrganizationFactory(
      address(roleRegistryImpl),
      address(circleRegistryImpl),
      address(governanceProcessImpl),
      address(govFactory),
      address(ensRegistrar)
    );

    // 5. Create a sample organization with default governance parameters
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

    // Log addresses
    console.log('--- Infrastructure ---');
    console.log('MockENSRegistrar:     ', address(ensRegistrar));
    console.log('HolGovernorFactory:   ', address(govFactory));
    console.log('OrganizationFactory:  ', address(factory));
    console.log('');
    console.log('--- Implementations ---');
    console.log('RoleRegistry impl:    ', address(roleRegistryImpl));
    console.log('CircleRegistry impl:  ', address(circleRegistryImpl));
    console.log('GovernanceProcess impl:', address(governanceProcessImpl));
    console.log('');
    console.log('--- Sample Organization (id:', orgId, ') ---');

    HolacracyTypes.Organization memory org = factory.getOrganization(orgId);
    console.log('Subname:              ', org.subname);
    console.log('Creator:              ', org.creator);
    console.log('RoleRegistry:         ', org.roleRegistry);
    console.log('CircleRegistry:       ', org.circleRegistry);
    console.log('GovernanceProcess:    ', org.governanceProcess);
    console.log('AccessManager:        ', org.accessManager);
    console.log('Anchor Circle ID:     ', org.anchorCircleId);
    console.log('');
    console.log('--- On-chain Governance ---');
    console.log('Governor:             ', org.governor);
    console.log('GovToken:             ', org.token);
    console.log('Timelock:             ', org.timelock);
    console.log('');
    console.log('--- Anchor Circle Treasury ---');
    console.log('CircleTreasury:       ', org.treasury);
  }
}
