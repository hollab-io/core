/**
 * propose-tension.ts — end-to-end "agent submits a structural change" demo.
 *
 * Reads an org's `agent.json` manifest from the local indexer, then uses the
 * agent's wallet to call `MeetingFactory.executeGovernance(CreateRole, …)` —
 * the closest thing to "submit a tension" that the current contracts expose.
 * Polls the indexer until the new role appears, then prints its public
 * permalink on the hola-modern SPA.
 *
 * Naming note: the file is named `propose-tension.ts` to match the sprint
 * spec (docs/sprint-agent-native-mvp.md, WS2). The current `GovernanceProcess`
 * contract does not yet emit a "tension" / proposal lifecycle, so the demo
 * uses `createRole`. Once the proposal lifecycle ships, this example becomes
 * a one-liner change to call `agent.governance.proposeTension(...)`.
 *
 * Usage (against ./scripts/dev-local.sh):
 *
 *   AGENT_PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 \
 *     pnpm --filter @hollab-io/agent-sdk tsx examples/propose-tension.ts 1
 *
 * The default key above is anvil account #9 — the same address listed in
 * `apps/hola-modern/src/config/agents.ts`, so the resulting role lead will
 * render with the 🤖 chip on `#/o/<orgId>`.
 */
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

import { HollabAgent } from "../src/index.js";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://localhost:42069";
const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
// Anvil account #9 — deterministic local key. NOT a secret.
const DEFAULT_KEY = "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";
const PRIVATE_KEY = (process.env.AGENT_PRIVATE_KEY ?? DEFAULT_KEY) as `0x${string}`;

type Manifest = {
    version: number;
    chainId: number;
    org: { id: string; ensName: string; name: string; mission: string };
    contracts: {
        circleRegistry: `0x${string}`;
        roleRegistry: `0x${string}`;
        governanceProcess: `0x${string}`;
        meetingFactory: `0x${string}` | null;
    };
    circles: Array<{ id: string; name: string; isAnchor: boolean }>;
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
    if (!orgId) {
        console.error("usage: tsx examples/propose-tension.ts <orgId>");
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
        throw new Error(`org ${orgId} has no circles in the manifest — indexer not synced yet?`);
    }

    console.log(`  org:            ${manifest.org.name} (${manifest.org.ensName})`);
    console.log(`  meetingFactory: ${manifest.contracts.meetingFactory}`);
    console.log(`  anchor circle:  ${anchorCircle.name} (id=${anchorCircle.id})`);

    const account = privateKeyToAccount(PRIVATE_KEY);
    const transport = http(RPC_URL);
    const walletClient = createWalletClient({ account, chain: foundry, transport });
    const publicClient = createPublicClient({ chain: foundry, transport });

    const agent = new HollabAgent({
        walletClient,
        publicClient,
        indexerUrl: `${INDEXER_URL}/graphql`,
        // orgFactoryAddress isn't used by the createRole path; pass zero for now.
        orgFactoryAddress: "0x0000000000000000000000000000000000000000",
    });
    console.log(`→ agent address: ${agent.address}`);

    const roleName = `Agent Proposal ${new Date().toISOString().slice(11, 19)}`;
    console.log(
        `→ submitting CreateRole "${roleName}" against ${manifest.contracts.meetingFactory}`,
    );

    const { txHash, resultId } = await agent.governance.createRole(
        manifest.contracts.meetingFactory,
        BigInt(manifest.org.id),
        {
            circleId: BigInt(anchorCircle.id),
            name: roleName,
            purpose: "Demonstrate that a non-human caller can mutate org structure end-to-end.",
            accountabilities: ["Show the 🤖 chip on hola-modern", "Prove the agent loop closes"],
        },
    );
    console.log(`✓ tx ${txHash} mined, resultId=${resultId}`);

    // Poll the manifest until the indexer catches up.
    const deadline = Date.now() + 30_000;
    let found = false;
    while (Date.now() < deadline) {
        const fresh = await fetchManifest(orgId);
        const present = fresh.circles.find((c) => c.id === anchorCircle.id);
        if (present) {
            // Cheap signal: roleCount changed via the manifest metadata (we don't get role list here)
            // — use the raw indexer to confirm.
            const rolesRes = await fetch(`${INDEXER_URL}/agents/${orgId}.json`).then((r) =>
                r.json(),
            );
            const roles = (rolesRes as { roles: Array<{ id: string; name: string }> }).roles ?? [];
            if (roles.some((r) => r.id === resultId.toString() || r.name === roleName)) {
                found = true;
                break;
            }
        }
        await new Promise((r) => setTimeout(r, 500));
    }

    if (!found) {
        console.warn("⚠ role didn't appear in manifest within 30s — indexer lag?");
    } else {
        console.log("✓ indexer caught up — role visible in manifest");
    }

    const permalink = `http://localhost:5173/#/o/${orgId}`;
    console.log(`\nview the org on hola-modern:  ${permalink}`);
    console.log(`view raw manifest:            ${INDEXER_URL}/agents/${orgId}.json`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
