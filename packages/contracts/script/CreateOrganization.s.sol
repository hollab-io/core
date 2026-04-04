// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from 'forge-std/Script.sol';
import {Clones} from '@openzeppelin/contracts/proxy/Clones.sol';
import {DeployConfig} from './DeployConfig.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {TacticalMeeting} from 'contracts/TacticalMeeting.sol';
import {GovernanceMeeting} from 'contracts/GovernanceMeeting.sol';
import {ActionVoting} from 'contracts/ActionVoting.sol';
import {CircleRegistry} from 'contracts/CircleRegistry.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {GovernanceProcess} from 'contracts/GovernanceProcess.sol';

/**
 * @title CreateOrganization
 * @notice Creates a new organization via an existing OrganizationFactory,
 *         then deploys and initializes TacticalMeeting, GovernanceMeeting,
 *         and ActionVoting clones wired to the org.
 *
 *         Reads infrastructure addresses from the JSON artifact produced by
 *         DeployInfrastructure, or from env vars as fallback.
 *
 * Required env vars:
 *   ORG_SUBNAME                   — ENS subname (e.g. "core")
 *
 * Optional env vars (all have defaults):
 *   ORG_PURPOSE, TOKEN_NAME, TOKEN_SYMBOL, INITIAL_SUPPLY,
 *   TIMELOCK_DELAY, VOTING_DELAY, VOTING_PERIOD, QUORUM_NUMERATOR,
 *   TREASURY_DELAY
 *
 * Infrastructure addresses (auto-loaded from deployments/<chainId>-infrastructure.json,
 * or override via env):
 *   ORGANIZATION_FACTORY, TACTICAL_MEETING_IMPL,
 *   GOVERNANCE_MEETING_IMPL, ACTION_VOTING_IMPL
 *
 * Dry-run:
 *   forge script script/CreateOrganization.s.sol \
 *     --rpc-url sepolia \
 *     --account deployer \
 *     -vvvv
 *
 * Production broadcast:
 *   forge script script/CreateOrganization.s.sol \
 *     --rpc-url sepolia \
 *     --account deployer \
 *     --broadcast \
 *     --verify \
 *     --slow \
 *     -vvvv
 */
contract CreateOrganization is Script {
  function run() external {
    address deployer = msg.sender;
    uint256 chainId = block.chainid;

    // ── Load infrastructure addresses ───────────────────────────────────────
    string memory artifactPath = string.concat('./deployments/', vm.toString(chainId), '-infrastructure.json');
    address orgFactoryAddr;
    address tacticalMeetingImpl;
    address governanceMeetingImpl;
    address actionVotingImpl;

    if (vm.isFile(artifactPath)) {
      string memory json = vm.readFile(artifactPath);
      orgFactoryAddr = vm.parseJsonAddress(json, '.orgFactory');
      tacticalMeetingImpl = vm.parseJsonAddress(json, '.tacticalMeetingImpl');
      governanceMeetingImpl = vm.parseJsonAddress(json, '.governanceMeetingImpl');
      actionVotingImpl = vm.parseJsonAddress(json, '.actionVotingImpl');
      console.log('Loaded infrastructure from:', artifactPath);
    } else {
      orgFactoryAddr = vm.envAddress('ORGANIZATION_FACTORY');
      tacticalMeetingImpl = vm.envAddress('TACTICAL_MEETING_IMPL');
      governanceMeetingImpl = vm.envAddress('GOVERNANCE_MEETING_IMPL');
      actionVotingImpl = vm.envAddress('ACTION_VOTING_IMPL');
      console.log('Loaded infrastructure from env vars');
    }

    OrganizationFactory orgFactory = OrganizationFactory(orgFactoryAddr);
    string memory subname = vm.envOr('ORG_SUBNAME', string('core'));
    string memory purpose = vm.envOr('ORG_PURPOSE', string('Holacracy on-chain'));
    uint256 initialSupply = vm.envOr('INITIAL_SUPPLY', DeployConfig.DEFAULT_INITIAL_SUPPLY);

    console.log('');
    console.log('=== Create Organization ===');
    console.log('Chain ID:              ', chainId);
    console.log('Deployer:              ', deployer);
    console.log('OrganizationFactory:   ', orgFactoryAddr);
    console.log('Subname:               ', subname);
    console.log('');

    address[] memory holders = new address[](1);
    holders[0] = deployer;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = initialSupply;

    vm.startBroadcast();

    // ── 1. Create organization via factory ──────────────────────────────────
    uint256 orgId = orgFactory.createOrganization(
      subname,
      purpose,
      IOrganizationFactory.GovernanceConfig({
        tokenName: vm.envOr('TOKEN_NAME', string('HolToken')),
        tokenSymbol: vm.envOr('TOKEN_SYMBOL', string('HOL')),
        initialHolders: holders,
        initialAmounts: amounts,
        timelockDelay: vm.envOr('TIMELOCK_DELAY', DeployConfig.DEFAULT_TIMELOCK_DELAY),
        votingDelay: uint48(vm.envOr('VOTING_DELAY', uint256(DeployConfig.DEFAULT_VOTING_DELAY))),
        votingPeriod: uint32(vm.envOr('VOTING_PERIOD', uint256(DeployConfig.DEFAULT_VOTING_PERIOD))),
        proposalThreshold: vm.envOr('PROPOSAL_THRESHOLD', DeployConfig.DEFAULT_PROPOSAL_THRESHOLD),
        quorumNumerator: vm.envOr('QUORUM_NUMERATOR', DeployConfig.DEFAULT_QUORUM_NUMERATOR),
        treasuryTimelockDelay: vm.envOr('TREASURY_DELAY', DeployConfig.DEFAULT_TREASURY_DELAY)
      })
    );

    // ── 2. Fetch org data ───────────────────────────────────────────────────
    HolacracyTypes.Organization memory org = orgFactory.getOrganization(orgId);

    // ── 3. Deploy TacticalMeeting clone ─────────────────────────────────────
    TacticalMeeting tacticalMeeting = TacticalMeeting(Clones.clone(tacticalMeetingImpl));
    tacticalMeeting.initialize(CircleRegistry(org.circleRegistry), RoleRegistry(org.roleRegistry));

    // ── 4. Deploy GovernanceMeeting clone ───────────────────────────────────
    GovernanceMeeting governanceMeeting = GovernanceMeeting(Clones.clone(governanceMeetingImpl));
    governanceMeeting.initialize(CircleRegistry(org.circleRegistry), GovernanceProcess(org.governanceProcess));

    // ── 5. Deploy ActionVoting clone ────────────────────────────────────────
    ActionVoting actionVoting = ActionVoting(Clones.clone(actionVotingImpl));
    actionVoting.initialize(org.circleRegistry, address(tacticalMeeting), org.token);

    vm.stopBroadcast();

    // ── Persist deployment artifacts ────────────────────────────────────────
    _writeArtifacts(org, orgId, chainId, address(tacticalMeeting), address(governanceMeeting), address(actionVoting));
    _logDeployment(org, orgId, address(tacticalMeeting), address(governanceMeeting), address(actionVoting));
  }

  function _writeArtifacts(
    HolacracyTypes.Organization memory _org,
    uint256 _orgId,
    uint256 _chainId,
    address _tacticalMeeting,
    address _governanceMeeting,
    address _actionVoting
  ) internal {
    string memory obj = 'org';
    vm.serializeUint(obj, 'orgId', _orgId);
    vm.serializeString(obj, 'subname', _org.subname);
    vm.serializeAddress(obj, 'circleRegistry', _org.circleRegistry);
    vm.serializeAddress(obj, 'roleRegistry', _org.roleRegistry);
    vm.serializeAddress(obj, 'governanceProcess', _org.governanceProcess);
    vm.serializeUint(obj, 'anchorCircleId', _org.anchorCircleId);
    vm.serializeAddress(obj, 'governor', _org.governor);
    vm.serializeAddress(obj, 'token', _org.token);
    vm.serializeAddress(obj, 'timelock', _org.timelock);
    vm.serializeAddress(obj, 'treasury', _org.treasury);
    vm.serializeAddress(obj, 'tacticalMeeting', _tacticalMeeting);
    vm.serializeAddress(obj, 'governanceMeeting', _governanceMeeting);
    vm.serializeUint(obj, 'chainId', _chainId);
    string memory json = vm.serializeAddress(obj, 'actionVoting', _actionVoting);
    vm.writeJson(json, string.concat('./deployments/', vm.toString(_chainId), '-org-', _org.subname, '.json'));
  }

  function _logDeployment(
    HolacracyTypes.Organization memory _org,
    uint256 _orgId,
    address _tacticalMeeting,
    address _governanceMeeting,
    address _actionVoting
  ) internal pure {
    console.log('');
    console.log('=== Organization Created ===');
    console.log('');
    console.log('Org ID:                ', _orgId);
    console.log('Subname:               ', _org.subname);
    console.log('');
    console.log('--- Core (cloned by factory) ---');
    console.log('CircleRegistry:        ', _org.circleRegistry);
    console.log('RoleRegistry:          ', _org.roleRegistry);
    console.log('GovernanceProcess:     ', _org.governanceProcess);
    console.log('Anchor Circle ID:      ', _org.anchorCircleId);
    console.log('');
    console.log('--- Governance ---');
    console.log('Governor:              ', _org.governor);
    console.log('GovToken:              ', _org.token);
    console.log('Timelock:              ', _org.timelock);
    console.log('CircleTreasury:        ', _org.treasury);
    console.log('');
    console.log('--- Meeting & Voting ---');
    console.log('TacticalMeeting:       ', _tacticalMeeting);
    console.log('GovernanceMeeting:     ', _governanceMeeting);
    console.log('ActionVoting:          ', _actionVoting);
  }
}
