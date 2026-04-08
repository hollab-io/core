import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    timeout: 60_000,
    retries: 0,
    workers: 1, // sequential — shared anvil state
    use: {
        baseURL: "http://127.0.0.1:8545", // anvil RPC
        headless: true,
    },
    globalSetup: "./e2e/global-setup.ts",
    globalTeardown: "./e2e/global-teardown.ts",
});
