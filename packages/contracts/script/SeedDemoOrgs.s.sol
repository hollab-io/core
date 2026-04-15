// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {MeetingComponentsFactory} from 'contracts/MeetingComponentsFactory.sol';
import {MeetingFactory} from 'contracts/MeetingFactory.sol';
import {OrganizationFactory} from 'contracts/OrganizationFactory.sol';
import {RoleRegistry} from 'contracts/RoleRegistry.sol';
import {Script, console} from 'forge-std/Script.sol';
import {IMeetingComponentsFactory} from 'interfaces/IMeetingComponentsFactory.sol';
import {IOrganizationFactory} from 'interfaces/IOrganizationFactory.sol';
import {HolacracyTypes} from 'libraries/HolacracyTypes.sol';

/**
 * @title SeedDemoOrgs
 * @notice Seeds a fresh local stack with two fully-wired demo organizations:
 *
 *           1. "lantern" — public brand org, agent leads one role
 *           2. "solarpunk" — climate collective, deployer leads everything
 *
 *         Each org gets:
 *           - core contracts (RoleRegistry + ENS subname via OrganizationFactory)
 *           - meeting components (MeetingFactory + ActionVoting)
 *           - the anvil agent account added as a member (so it can call
 *             createProposal for the Day 2 propose-tension.ts demo)
 *           - baseline roles created via createProposal + adoptProposal
 *             (roles live on the anchor circle with id 0 — no circle
 *             registry exists in this contract set)
 *           - one agent election (Election change type → role lead) on the
 *             first role of the lantern org via createProposal + adoptProposal,
 *             so the public role permalink can render a 🤖 chip end-to-end.
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
  uint256 internal constant ANVIL_KEY_0 = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
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
    OrganizationFactory orgFactory = OrganizationFactory(vm.parseJsonAddress(artifact, '.orgFactory'));
    MeetingComponentsFactory meetingComponentsFactory =
      MeetingComponentsFactory(vm.parseJsonAddress(artifact, '.meetingFactory'));

    console.log('Deployer:', deployer);
    console.log('Agent:   ', agent);
    console.log('OrgFactory:', address(orgFactory));
    console.log('');

    vm.startBroadcast(deployerKey);

    uint256 lanternId = _seedOrg(
      orgFactory,
      meetingComponentsFactory,
      'lantern',
      'Lantern OS',
      agent,
      _lanternRoles(),
      /*electAgentOnFirstRole*/
      true
    );

    uint256 solarpunkId = _seedOrg(
      orgFactory,
      meetingComponentsFactory,
      'solarpunk',
      'Solarpunk Collective',
      agent,
      _solarpunkRoles(),
      /*electAgentOnFirstRole*/
      false
    );

    // ── Seed the three proposal statuses on lantern ──────────────────────
    //
    // Gives the public #/o/:orgId/p/:proposalId permalink real data to render
    // across all three terminal states (Draft / Adopted / Discarded) plus one
    // unresolved objection so the objection trail UI has something to show.
    HolacracyTypes.Organization memory lanternOrg = orgFactory.getOrganization(lanternId);
    // The MeetingFactory clone for lantern is the one the _seedOrg helper
    // deployed above; we need its address to call the new proposal API.
    // MeetingComponentsFactory emits MeetingComponentsDeployed which we
    // could parse, but simpler: look it up via the indexer-compatible path —
    // the RoleRegistry knows its governance process (= the MeetingFactory).
    address lanternMeetingFactory = address(RoleRegistry(lanternOrg.roleRegistry).governanceProcess());
    _seedProposals(lanternId, MeetingFactory(lanternMeetingFactory), agent);

    vm.stopBroadcast();

    console.log('=== Seed complete ===');
    console.log('lantern orgId:', lanternId);
    console.log('solarpunk orgId:', solarpunkId);
    console.log('');
    console.log('Public URLs (assuming vite on :5173):');
    console.log(string.concat('  http://localhost:5173/#/o/', vm.toString(lanternId)));
    console.log(string.concat('  http://localhost:5173/#/o/', vm.toString(solarpunkId)));

    // Append seed info to the deployment artifact for tooling.
    string memory obj = 'seed';
    vm.serializeUint(obj, 'lanternOrgId', lanternId);
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
    //       process on RoleRegistry so adoptProposal can mutate roles) ────
    IMeetingComponentsFactory.Deployment memory deployment =
      meetingComponentsFactory.deploy(orgId, address(orgFactory), org.roleRegistry, org.token);
    MeetingFactory meetingFactory = MeetingFactory(deployment.meetingFactory);

    // ── 3. Add agent as org member so it can call createProposal itself ───
    orgFactory.addOrgMember(orgId, agent);

    // ── 4. Create baseline roles via createProposal + adoptProposal.
    //       Deployer is both member and admin so one signer covers both. ────
    uint256 firstRoleId;
    for (uint256 i; i < roles.length; ++i) {
      RoleSpec memory r = roles[i];
      bytes memory data = abi.encode(uint256(0), r.name, r.purpose, r.domains, r.accountabilities);
      uint256 proposalId = meetingFactory.createProposal(
        orgId,
        /*circleId*/ 0,
        /*proposerRoleId*/ 0,
        /*tensionHash*/ bytes32(0),
        HolacracyTypes.ChangeType.CreateRole,
        data
      );
      uint256 roleId = meetingFactory.adoptProposal(proposalId);
      if (i == 0) firstRoleId = roleId;
    }

    // ── 5. Elect agent on the first role (gives the permalink a 🤖 chip) ──
    if (electAgentOnFirstRole && firstRoleId != 0) {
      bytes memory electionData = abi.encode(firstRoleId, agent);
      uint256 electionProposalId = meetingFactory.createProposal(
        orgId,
        /*circleId*/ 0,
        /*proposerRoleId*/ 0,
        /*tensionHash*/ bytes32(0),
        HolacracyTypes.ChangeType.Election,
        electionData
      );
      meetingFactory.adoptProposal(electionProposalId);
    }
  }

  /// @notice Seed one proposal in each terminal state plus one unresolved
  ///         objection, so PublicProposalView has real data across all
  ///         rendering branches from a clean seed.
  /// @dev    All proposals run under the existing deployer broadcast — no
  ///         signer switcheroo. The "agent as proposer" flavour is covered
  ///         end-to-end by the propose-tension.ts example, which signs with
  ///         the agent key and hits the same entry points from off-chain.
  function _seedProposals(
    uint256 orgId,
    MeetingFactory meetingFactory,
    address /*agent*/
  ) internal {
    // ── Adopted: "QA Inspector" role. Deployer proposes and adopts. ────────
    {
      string[] memory domains = new string[](1);
      domains[0] = 'inbound submissions queue';
      string[] memory accts = new string[](1);
      accts[0] = 'Reject spam within 24h';
      bytes memory data = abi.encode(uint256(0), 'QA Inspector', 'Keep the submissions queue clean', domains, accts);
      uint256 pid = meetingFactory.createProposal(
        orgId,
        /*circleId*/
        0,
        /*proposerRoleId*/
        0,
        keccak256('Spam submissions are overwhelming the curator'),
        HolacracyTypes.ChangeType.CreateRole,
        data
      );
      meetingFactory.adoptProposal(pid);
    }

    // ── Draft with an unresolved objection ─────────────────────────────────
    {
      string[] memory noDomains = new string[](0);
      string[] memory accts = new string[](1);
      accts[0] = 'Publish a behind-the-scenes note monthly';
      bytes memory data =
        abi.encode(uint256(0), 'Storyteller', 'Make the inside legible from the outside', noDomains, accts);
      uint256 draftPid = meetingFactory.createProposal(
        orgId,
        /*circleId*/
        0,
        /*proposerRoleId*/
        0,
        keccak256('Outsiders want a peek behind the curtain'),
        HolacracyTypes.ChangeType.CreateRole,
        data
      );
      meetingFactory.raiseObjection(draftPid, keccak256('Scope overlaps with Curator role'));
    }

    // ── Discarded ──────────────────────────────────────────────────────────
    {
      string[] memory noDomains = new string[](0);
      string[] memory accts = new string[](1);
      accts[0] = 'Host a weekly dinner party';
      bytes memory data = abi.encode(uint256(0), 'Party Planner', 'Maintain team chemistry', noDomains, accts);
      uint256 discardPid = meetingFactory.createProposal(
        orgId,
        /*circleId*/
        0,
        /*proposerRoleId*/
        0,
        keccak256('Team is feeling disconnected'),
        HolacracyTypes.ChangeType.CreateRole,
        data
      );
      meetingFactory.discardProposal(discardPid);
    }
  }

  /*///////////////////////////////////////////////////////////////
                          ROLE FIXTURES
  //////////////////////////////////////////////////////////////*/

  function _lanternRoles() internal pure returns (RoleSpec[] memory out) {
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
    out[2] = RoleSpec({name: 'Ops', purpose: 'Keep the lights on', domains: opsDomains, accountabilities: opsAccts});
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
