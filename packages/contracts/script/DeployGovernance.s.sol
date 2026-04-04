// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {HolGovernorFactory} from 'contracts/governance/HolGovernorFactory.sol';

/// @notice Deploys a complete governance suite via HolGovernorFactory.
/// @dev Run with:
///   forge script script/DeployGovernance.s.sol --rpc-url <RPC> --broadcast --private-key <PK>
contract DeployGovernance is Script {
  function run() external {
    address deployer = vm.envOr('DEPLOYER', msg.sender);
    address registrar = vm.envOr('ENS_REGISTRAR', address(0)); // optional: set to enable ENS subdomain

    vm.startBroadcast(deployer);

    HolGovernorFactory factory = new HolGovernorFactory();

    address[] memory holders = new address[](1);
    holders[0] = deployer;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000 ether;

    HolGovernorFactory.DeploymentConfig memory config = HolGovernorFactory.DeploymentConfig({
      tokenName: vm.envOr('TOKEN_NAME', string('HolToken')),
      tokenSymbol: vm.envOr('TOKEN_SYMBOL', string('HOL')),
      initialHolders: holders,
      initialAmounts: amounts,
      timelockDelay: 2 days,
      governorName: vm.envOr('GOVERNOR_NAME', string('HolGovernor')),
      votingDelay: uint48(1 days),
      votingPeriod: uint32(1 weeks),
      proposalThreshold: 0,
      quorumNumerator: 4,
      subdomain: vm.envOr('ENS_SUBDOMAIN', string('')),
      subdomainRegistrar: registrar
    });

    HolGovernorFactory.Deployment memory d = factory.deploy(config);

    console.log('GovToken:           ', d.token);
    console.log('TimelockController: ', d.timelock);
    console.log('HolGovernor:        ', d.governor);

    vm.stopBroadcast();
  }
}
