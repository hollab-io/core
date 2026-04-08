/**
 * Playwright global setup — starts Anvil and deploys contracts.
 *
 * Writes deployed addresses to e2e/.addresses.json so tests can read them.
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const CONTRACTS = resolve(ROOT, "packages/contracts");
const ARTIFACT = resolve(CONTRACTS, "deployments/31337-local.json");
const ADDRESSES_FILE = resolve(__dirname, ".addresses.json");
const ANVIL_PORT = 8545;

export default async function globalSetup() {
    // ── 1. Start Anvil ──────────────────────────────────────────────────────
    const anvil = spawn("anvil", ["--port", String(ANVIL_PORT), "--silent"], {
        stdio: "ignore",
        detached: true,
    });
    anvil.unref();

    // Store PID for teardown
    writeFileSync(resolve(__dirname, ".anvil-pid"), String(anvil.pid));

    // Wait for Anvil to be ready
    for (let i = 0; i < 30; i++) {
        try {
            execSync(`cast chain-id --rpc-url http://127.0.0.1:${ANVIL_PORT}`, {
                stdio: "ignore",
            });
            break;
        } catch {
            if (i === 29) throw new Error("Anvil failed to start");
            await new Promise((r) => setTimeout(r, 200));
        }
    }

    console.log(`Anvil running on port ${ANVIL_PORT} (PID ${anvil.pid})`);

    // ── 2. Deploy contracts ─────────────────────────────────────────────────
    console.log("Deploying contracts...");
    execSync(
        `forge script script/DeployLocal.s.sol --tc DeployLocal --rpc-url http://127.0.0.1:${ANVIL_PORT} --broadcast`,
        { cwd: CONTRACTS, stdio: "pipe" },
    );

    if (!existsSync(ARTIFACT)) {
        throw new Error(`Deployment artifact not found: ${ARTIFACT}`);
    }

    const deployment = JSON.parse(readFileSync(ARTIFACT, "utf-8"));
    writeFileSync(ADDRESSES_FILE, JSON.stringify(deployment, null, 2));
    console.log("Contracts deployed:", deployment);
}
