import { readFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
    const pidFile = resolve(__dirname, ".anvil-pid");
    try {
        const pid = Number(readFileSync(pidFile, "utf-8").trim());
        process.kill(pid, "SIGTERM");
        console.log(`Stopped Anvil (PID ${pid})`);
    } catch {
        // already stopped
    }
    try {
        unlinkSync(pidFile);
    } catch {
        // ignore
    }
}
