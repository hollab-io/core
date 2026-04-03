// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';
import {INameWrapper} from 'interfaces/IENS.sol';

/// @notice Stub NameWrapper for local development — records subnames but has no ENS logic
contract MockNameWrapper is INameWrapper {
  mapping(bytes32 => address) public subnameOwners;

  function setSubnodeRecord(
    bytes32 _parentNode,
    string calldata _label,
    address _owner,
    address,
    uint64,
    uint32,
    uint64
  ) external returns (bytes32 _node) {
    _node = keccak256(abi.encodePacked(_parentNode, keccak256(bytes(_label))));
    subnameOwners[_node] = _owner;
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
  /// @dev namehash("hollab.eth") — precomputed
  bytes32 constant PARENT_NODE = 0x0e75a0b793d552e1513d498a13a8a6493c297768e25e0be29ddaeca9a1e156ac;

  function run() external {
    uint256 deployerKey =
      vm.envOr('PRIVATE_KEY', uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
    address deployer = vm.addr(deployerKey);

    console.log('Deployer:', deployer);
    console.log('');

    vm.startBroadcast(deployerKey);

    // 1. Deploy mock ENS infrastructure
    MockNameWrapper nameWrapper = new MockNameWrapper();

    // 2. Deploy implementation contracts individually
    RoleRegistry roleRegistryImpl = new RoleRegistry();
    CircleRegistry circleRegistryImpl = new CircleRegistry();
    GovernanceProcess governanceProcessImpl = new GovernanceProcess();

    // 3. Deploy OrganizationFactory with pre-deployed implementations
    OrganizationFactory factory = new OrganizationFactory(
      address(roleRegistryImpl),
      address(circleRegistryImpl),
      address(governanceProcessImpl),
      address(nameWrapper),
      PARENT_NODE,
      address(0) // resolver not needed locally
    );

    // 4. Create a sample organization
    uint256 orgId = factory.createOrganization('demo', 'A demo Holacracy organization');

    vm.stopBroadcast();

    // Log addresses
    console.log('--- Deployed Contracts ---');
    console.log('MockNameWrapper:      ', address(nameWrapper));
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
    console.log('Anchor Circle ID:     ', org.anchorCircleId);
  }
}
