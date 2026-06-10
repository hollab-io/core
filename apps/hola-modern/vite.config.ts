import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ["crypto", "stream", "util", "buffer", "process"],
            globals: { Buffer: true, global: true, process: true },
        }),
    ],
    // Use relative paths so the build works on IPFS (hollab.eth.limo)
    // where there's no server to rewrite absolute /assets/ paths.
    base: "./",
    define: {
        "process.env": {},
        global: "globalThis",
    },
});
