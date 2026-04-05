// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {TensionBoard} from 'contracts/TensionBoard.sol';

/**
 * @title DeployTensionBoard
 * @notice Deploys the TensionBoard contract for a given OrganizationFactory.
 *
 * Required env vars:
 *   ORGANIZATION_FACTORY — address of the deployed OrganizationFactory
 *
 * Reads from deployments/<chainId>-infrastructure.json when available.
 *
 * Dry-run:
 *   forge script script/DeployTensionBoard.s.sol \
 *     --rpc-url sepolia \
 *     --private-key $DOMAIN_OWNER_PRIVATE_KEY \
 *     -vvvv
 *
 * Broadcast:
 *   forge script script/DeployTensionBoard.s.sol \
 *     --rpc-url sepolia \
 *     --private-key $DOMAIN_OWNER_PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract DeployTensionBoard is Script {
  function run() external returns (address tensionBoard) {
    uint256 chainId = block.chainid;
    address deployer = msg.sender;

    // Load OrganizationFactory address
    address orgFactory;
    string memory artifactPath = string.concat('./deployments/', vm.toString(chainId), '-infrastructure.json');
    if (vm.isFile(artifactPath)) {
      string memory json = vm.readFile(artifactPath);
      orgFactory = vm.parseJsonAddress(json, '.orgFactory');
      console.log('Loaded OrganizationFactory from artifact:', orgFactory);
    } else {
      orgFactory = vm.envAddress('ORGANIZATION_FACTORY');
      console.log('Loaded OrganizationFactory from env:', orgFactory);
    }

    console.log('');
    console.log('=== Deploy TensionBoard ===');
    console.log('Chain ID:  ', chainId);
    console.log('Deployer:  ', deployer);
    console.log('Factory:   ', orgFactory);

    vm.startBroadcast();
    tensionBoard = address(new TensionBoard(orgFactory));
    vm.stopBroadcast();

    console.log('TensionBoard:', tensionBoard);

    // Persist to artifact
    string memory obj = 'tensionBoard';
    vm.serializeAddress(obj, 'orgFactory', orgFactory);
    vm.serializeUint(obj, 'chainId', chainId);
    string memory json = vm.serializeAddress(obj, 'tensionBoard', tensionBoard);
    vm.writeJson(json, string.concat('./deployments/', vm.toString(chainId), '-tension-board.json'));

    console.log('Artifact saved to: deployments/', vm.toString(chainId), '-tension-board.json');
  }
}
