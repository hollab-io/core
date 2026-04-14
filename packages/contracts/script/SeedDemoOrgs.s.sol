// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {Script, console} from 'forge-std/Script.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title SeedDemoOrgs
 * @notice Seeds a fresh local stack with two fully-wired demo organizations:
 *
 *           1. "paperclip" — public brand org, agent leads one role
 *           2. "solarpunk" — climate collective, deployer leads everything
 *
 *         Each org gets:
 *           - core contracts (RoleRegistry + ENS subname via OrganizationFactory)
 *           - meeting components (MeetingFactory + ActionVoting)
 *           - the anvil agent account added as a member (so it can call
 *             executeGovernance for the Day 2 propose-tension.ts demo)
 *           - three roles created via MeetingFactory.executeGovernance
 *             (CreateRole is the only path; roles live on the anchor circle
 *             with id 0 — no circle registry exists in this contract set)
 *           - one agent election (Election change type → role lead) on the
 *             first role of the paperclip org, so the public role permalink
 *             can render a 🤖 chip end-to-end from a clean seed.
 *
 *         Load-bearing for the sprint smoke test: fresh anvil →
 *         DeployLocal.s.sol → SeedDemoOrgs.s.sol → open #/explore in
 *         incognito → walk the flywheel without a wallet.
 *
 * Usage:
 *   anvil                                                        # terminal 1
 *   forge script script/DeployLocal.s.sol --tc DeployLocal \      # terminal 2
 *     --rpc-url http://127.0.0.1:8545 --broadcast
 *   forge script script/SeedDemoOrgs.s.sol --tc SeedDemoOrgs \
 *     --rpc-url http://127.0.0.1:8545 --broadcast
 *
 * Env:
 *   PRIVATE_KEY       — deployer / org creator (defaults to anvil account #0)
 *   AGENT_ADDRESS     — agent allowlist address (defaults to anvil account #9,
 *                       matching apps/hola-modern/src/config/agents.ts and
 *                       packages/agent-sdk/examples/propose-tension.ts)
 */
contract SeedDemoOrgs is Script {
  // Anvil accounts — deterministic, not secrets.
  uint256 internal constant ANVIL_KEY_0 =
    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
  address internal constant DEFAULT_AGENT = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720;

  struct RoleSpec {
    string name;
    string purpose;
    string[] domains;
    string[] accountabilities;
  }

  function run() external {
    uint256 deployerKey = vm.envOr('PRIVATE_KEY', ANVIL_KEY_0);
    address deployer = vm.addr(deployerKey);
    address agent = vm.envOr('AGENT_ADDRESS', DEFAULT_AGENT);

    // Read infra addresses from the DeployLocal artifact.
    string memory artifact = vm.readFile('./deployments/31337-local.json');
    OrganizationFactory orgFactory =
      OrganizationFactory(vm.parseJsonAddress(artifact, '.orgFactory'));
    MeetingComponentsFactory meetingComponentsFactory =
      MeetingComponentsFactory(vm.parseJsonAddress(artifact, '.meetingFactory'));

    console.log('Deployer:', deployer);
    console.log('Agent:   ', agent);
    console.log('OrgFactory:', address(orgFactory));
    console.log('');

    vm.startBroadcast(deployerKey);

    uint256 paperclipId = _seedOrg(
      orgFactory,
      meetingComponentsFactory,
      'paperclip',
      'Paperclip OS',
      agent,
      _paperclipRoles(),
      /*electAgentOnFirstRole*/ true
    );

    uint256 solarpunkId = _seedOrg(
      orgFactory,
      meetingComponentsFactory,
      'solarpunk',
      'Solarpunk Collective',
      agent,
      _solarpunkRoles(),
      /*electAgentOnFirstRole*/ false
    );

    vm.stopBroadcast();

    console.log('=== Seed complete ===');
    console.log('paperclip orgId:', paperclipId);
    console.log('solarpunk orgId:', solarpunkId);
    console.log('');
    console.log('Public URLs (assuming vite on :5173):');
    console.log(string.concat('  http://localhost:5173/#/o/', vm.toString(paperclipId)));
    console.log(string.concat('  http://localhost:5173/#/o/', vm.toString(solarpunkId)));

    // Append seed info to the deployment artifact for tooling.
    string memory obj = 'seed';
    vm.serializeUint(obj, 'paperclipOrgId', paperclipId);
    string memory json = vm.serializeUint(obj, 'solarpunkOrgId', solarpunkId);
    vm.writeJson(json, './deployments/31337-seed.json');
  }

  /*///////////////////////////////////////////////////////////////
                              INTERNAL
  //////////////////////////////////////////////////////////////*/

  function _seedOrg(
    OrganizationFactory orgFactory,
    MeetingComponentsFactory meetingComponentsFactory,
    string memory subname,
    string memory tokenSymbol,
    address agent,
    RoleSpec[] memory roles,
    bool electAgentOnFirstRole
  ) internal returns (uint256 orgId) {
    // ── 1. Create org (deployer becomes creator/admin/member) ──────────────
    address[] memory holders = new address[](1);
    holders[0] = msg.sender;
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = 1_000_000e18;

    orgId = orgFactory.createOrganization(
      subname,
      string.concat('Demo org: ', subname),
      IOrganizationFactory.TokenConfig({
        tokenName: string.concat(tokenSymbol, ' Token'),
        tokenSymbol: tokenSymbol,
        initialHolders: holders,
        initialAmounts: amounts
      })
    );

    HolacracyTypes.Organization memory org = orgFactory.getOrganization(orgId);

    // ── 2. Deploy meeting components (wires MeetingFactory as governance
    //       process on RoleRegistry so executeGovernance can mutate roles) ─
    IMeetingComponentsFactory.Deployment memory deployment =
      meetingComponentsFactory.deploy(orgId, address(orgFactory), org.roleRegistry, org.token);
    MeetingFactory meetingFactory = MeetingFactory(deployment.meetingFactory);

    // ── 3. Add agent as org member so it can call executeGovernance itself ─
    orgFactory.addOrgMember(orgId, agent);

    // ── 4. Create roles via executeGovernance (circleId=0, the anchor) ────
    uint256 firstRoleId;
    for (uint256 i; i < roles.length; ++i) {
      RoleSpec memory r = roles[i];
      bytes memory data = abi.encode(uint256(0), r.name, r.purpose, r.domains, r.accountabilities);
      uint256 roleId =
        meetingFactory.executeGovernance(orgId, HolacracyTypes.ChangeType.CreateRole, data);
      if (i == 0) firstRoleId = roleId;
    }

    // ── 5. Elect agent on the first role (gives the permalink a 🤖 chip) ──
    if (electAgentOnFirstRole && firstRoleId != 0) {
      bytes memory electionData = abi.encode(firstRoleId, agent);
      meetingFactory.executeGovernance(orgId, HolacracyTypes.ChangeType.Election, electionData);
    }
  }

  /*///////////////////////////////////////////////////////////////
                          ROLE FIXTURES
  //////////////////////////////////////////////////////////////*/

  function _paperclipRoles() internal pure returns (RoleSpec[] memory out) {
    out = new RoleSpec[](3);

    string[] memory curatorDomains = new string[](1);
    curatorDomains[0] = 'Brand voice and editorial calendar';
    string[] memory curatorAccts = new string[](2);
    curatorAccts[0] = 'Publish one story per week';
    curatorAccts[1] = 'Review inbound submissions within 48h';
    out[0] = RoleSpec({
      name: 'Curator',
      purpose: 'Keep the feed sharp and worth sharing',
      domains: curatorDomains,
      accountabilities: curatorAccts
    });

    string[] memory modDomains = new string[](0);
    string[] memory modAccts = new string[](1);
    modAccts[0] = 'Respond to trust-and-safety flags';
    out[1] = RoleSpec({
      name: 'Community Moderator',
      purpose: 'Protect the commons from drift',
      domains: modDomains,
      accountabilities: modAccts
    });

    string[] memory opsDomains = new string[](1);
    opsDomains[0] = 'Treasury and runway';
    string[] memory opsAccts = new string[](1);
    opsAccts[0] = 'Publish a monthly burn report';
    out[2] = RoleSpec({
      name: 'Ops',
      purpose: 'Keep the lights on',
      domains: opsDomains,
      accountabilities: opsAccts
    });
  }

  function _solarpunkRoles() internal pure returns (RoleSpec[] memory out) {
    out = new RoleSpec[](2);

    string[] memory energyDomains = new string[](1);
    energyDomains[0] = 'Grid interconnect proposals';
    string[] memory energyAccts = new string[](1);
    energyAccts[0] = 'Track net-positive generation monthly';
    out[0] = RoleSpec({
      name: 'Energy Lead',
      purpose: 'Make the collective net-positive on its own power',
      domains: energyDomains,
      accountabilities: energyAccts
    });

    string[] memory gardenDomains = new string[](0);
    string[] memory gardenAccts = new string[](2);
    gardenAccts[0] = 'Maintain the food forest plan';
    gardenAccts[1] = 'Host one open garden day per quarter';
    out[1] = RoleSpec({
      name: 'Garden Steward',
      purpose: 'Grow food for the neighbourhood',
      domains: gardenDomains,
      accountabilities: gardenAccts
    });
  }
}
