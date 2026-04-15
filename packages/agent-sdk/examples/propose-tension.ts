/**
 * propose-tension.ts — end-to-end "agent submits a tension" demo.
 *
 * Fetches an org's `agent.json` manifest from the local indexer, then uses
 * the agent's wallet to call the full proposal lifecycle:
 *
 *   1. `MeetingFactory.createProposal(CreateRole, …)` — commits the tension
 *      hash + the change payload. Returns a proposalId.
 *   2. `MeetingFactory.adoptProposal(proposalId)` — applies the change
 *      through the shared `_applyChange` helper. The role appears in
 *      `RoleRegistry` and the public permalink renders the 🤖 chip on the
 *      proposer.
 *   3. Polls the indexer until the new role + the adopted proposal appear
 *      in the manifest, then prints both the role list URL and the proposal
 *      permalink on the hola-modern SPA.
 *
 * The tension text stays off-chain. Only its keccak256 hash is committed
 * on-chain — matching the commitments-only stance in
 * specs/05-governance-process.md "On-chain Commitments Surface".
 *
 * Usage (against ./scripts/dev-local.sh):
 *
 *   AGENT_PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 \
 *     pnpm --filter @hollab-io/agent-sdk tsx examples/propose-tension.ts 2
 *
 * The default key above is anvil account #9 — the same address listed in
 * `apps/hola-modern/src/config/agents.ts`, so the proposer chip on the
 * resulting permalink renders as 🤖.
 *
 * Note: the deployer (anvil #0) is the org admin. `createProposal` can be
 * called by any member, but `adoptProposal` is admin-gated, so this script
 * performs step 1 as the agent and step 2 as the deployer. If you want the
 * Draft-only flavour, pass --draft-only.
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

import { encodeCreateRole } from "../src/encoding.js";
import { HollabAgent } from "../src/index.js";
import { ChangeType } from "../src/types.js";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://localhost:42069";
const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
// Anvil account #9 — deterministic local key. NOT a secret.
const AGENT_DEFAULT_KEY = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
// Anvil account #0 — the deployer/admin in the DeployLocal + SeedDemoOrgs stack.
const ADMIN_DEFAULT_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const AGENT_KEY = (process.env.AGENT_PRIVATE_KEY ?? AGENT_DEFAULT_KEY) as `0x${string}`;
const ADMIN_KEY = (process.env.ADMIN_PRIVATE_KEY ?? ADMIN_DEFAULT_KEY) as `0x${string}`;

type Manifest = {
    version: number;
    chainId: number;
    org: { id: string; ensName: string; name: string; mission: string; roleCount: number };
    contracts: {
        circleRegistry: `0x${string}`;
        roleRegistry: `0x${string}`;
        governanceProcess: `0x${string}`;
        meetingFactory: `0x${string}` | null;
    };
    circles: Array<{ id: string; name: string; isAnchor: boolean }>;
    roles: Array<{ id: string; name: string }>;
    openProposals: Array<{ id: string; permalink: string }>;
};

async function fetchManifest(orgId: string): Promise<Manifest> {
    const url = `${INDEXER_URL}/agents/${orgId}.json`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`manifest fetch ${url} → ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as Manifest;
}

async function main() {
    const orgId = process.argv[2];
    const draftOnly = process.argv.includes("--draft-only");
    if (!orgId) {
        console.error("usage: tsx examples/propose-tension.ts <orgId> [--draft-only]");
        process.exit(1);
    }

    console.log(`→ fetching manifest for org ${orgId} from ${INDEXER_URL}`);
    const manifest = await fetchManifest(orgId);

    if (!manifest.contracts.meetingFactory) {
        throw new Error(
            `org ${orgId} has no meetingFactory in its manifest — has the indexer caught up to MeetingComponentsFactory.deploy?`,
        );
    }

    const anchorCircle = manifest.circles.find((c) => c.isAnchor) ?? manifest.circles[0];
    if (!anchorCircle) {
        // Orgs without any circles can still receive proposals on circleId=0
        // (the anchor convention in this contract set). Fall through.
        console.log("  no circles indexed — proposing against circleId=0");
    }
    const circleId = anchorCircle ? BigInt(anchorCircle.id) : 0n;

    console.log(`  org:            ${manifest.org.name} (${manifest.org.ensName})`);
    console.log(`  meetingFactory: ${manifest.contracts.meetingFactory}`);
    console.log(`  roles today:    ${manifest.org.roleCount}`);

    const transport = http(RPC_URL);
    const publicClient = createPublicClient({ chain: foundry, transport });

    // Agent signs createProposal.
    const agentAccount = privateKeyToAccount(AGENT_KEY);
    const agentWallet = createWalletClient({ account: agentAccount, chain: foundry, transport });
    const agent = new HollabAgent({
        walletClient: agentWallet,
        publicClient,
        indexerUrl: `${INDEXER_URL}/graphql`,
        orgFactoryAddress: "0x0000000000000000000000000000000000000000",
    });
    console.log(`→ agent address: ${agent.address}`);

    const timestamp = new Date().toISOString().slice(11, 19);
    const roleName = `Agent Proposal ${timestamp}`;
    const tensionText = `Agent ${agent.address} proposes "${roleName}" at ${timestamp}`;
    const changeData = encodeCreateRole({
        circleId,
        name: roleName,
        purpose: "Demonstrate that a non-human caller can mutate org structure end-to-end.",
        domains: [],
        accountabilities: [
            "Show the 🤖 chip on hola-modern",
            "Prove the proposal lifecycle closes",
        ],
    });

    console.log(`→ createProposal against ${manifest.contracts.meetingFactory}`);
    const { txHash: createTx, proposalId } = await agent.governance.createProposal(
        manifest.contracts.meetingFactory,
        {
            orgId: BigInt(manifest.org.id),
            circleId,
            tensionText,
            changeType: ChangeType.CreateRole,
            changeData,
        },
    );
    console.log(`✓ proposal #${proposalId} created in tx ${createTx}`);

    const proposalPermalink = `http://localhost:5173/#/o/${orgId}/p/${proposalId}`;

    if (draftOnly) {
        console.log("\n-- draft-only mode — skipping adopt --");
        console.log(`view the draft proposal:  ${proposalPermalink}`);
        console.log(`view raw manifest:        ${INDEXER_URL}/agents/${orgId}.json`);
        return;
    }

    // Admin (deployer) signs adoptProposal — matches the SeedDemoOrgs seed
    // flow where the deployer is the org admin.
    const adminAccount = privateKeyToAccount(ADMIN_KEY);
    const adminWallet = createWalletClient({ account: adminAccount, chain: foundry, transport });
    const adminAgent = new HollabAgent({
        walletClient: adminWallet,
        publicClient,
        indexerUrl: `${INDEXER_URL}/graphql`,
        orgFactoryAddress: "0x0000000000000000000000000000000000000000",
    });
    console.log(`→ adoptProposal as admin ${adminAgent.address}`);
    const { txHash: adoptTx, resultId } = await adminAgent.governance.adoptProposal(
        manifest.contracts.meetingFactory,
        proposalId,
    );
    console.log(`✓ proposal adopted in tx ${adoptTx}, new roleId=${resultId}`);

    // Poll the manifest until the indexer picks up both the new role and
    // the adopted-proposal state flip.
    const deadline = Date.now() + 30_000;
    let caughtUp = false;
    while (Date.now() < deadline) {
        const fresh = await fetchManifest(orgId);
        const hasRole = fresh.roles.some((r) => r.id === resultId.toString());
        if (hasRole) {
            caughtUp = true;
            break;
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    console.log(caughtUp ? "✓ indexer caught up" : "⚠ indexer lag — role not visible within 30s");

    console.log(`\nview the proposal:       ${proposalPermalink}`);
    console.log(`view the role:           http://localhost:5173/#/o/${orgId}`);
    console.log(`view raw manifest:       ${INDEXER_URL}/agents/${orgId}.json`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
