// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {JoinRequest} from 'contracts/JoinRequest.sol';

/**
 * @title DeployJoinRequest
 * @notice Deploys the JoinRequest contract for a given OrganizationFactory.
 *
 * Required env vars:
 *   ORGANIZATION_FACTORY — address of the deployed OrganizationFactory
 *
 * Reads from deployments/<chainId>-infrastructure.json when available.
 *
 * Dry-run:
 *   forge script script/DeployJoinRequest.s.sol \
 *     --rpc-url sepolia \
 *     --private-key $DOMAIN_OWNER_PRIVATE_KEY \
 *     -vvvv
 *
 * Broadcast:
 *   forge script script/DeployJoinRequest.s.sol \
 *     --rpc-url sepolia \
 *     --private-key $DOMAIN_OWNER_PRIVATE_KEY \
 *     --broadcast \
 *     --verify \
 *     -vvvv
 */
contract DeployJoinRequest is Script {
  function run() external returns (address joinRequest) {
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
    console.log('=== Deploy JoinRequest ===');
    console.log('Chain ID:  ', chainId);
    console.log('Deployer:  ', deployer);
    console.log('Factory:   ', orgFactory);

    vm.startBroadcast();
    joinRequest = address(new JoinRequest(orgFactory));
    vm.stopBroadcast();

    console.log('JoinRequest:', joinRequest);

    // Persist to artifact
    string memory obj = 'joinRequest';
    vm.serializeAddress(obj, 'orgFactory', orgFactory);
    vm.serializeUint(obj, 'chainId', chainId);
    string memory json = vm.serializeAddress(obj, 'joinRequest', joinRequest);
    vm.writeJson(json, string.concat('./deployments/', vm.toString(chainId), '-join-request.json'));

    console.log('Artifact saved to: deployments/', vm.toString(chainId), '-join-request.json');
  }
}
