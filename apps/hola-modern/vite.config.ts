import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const nodeFsPromisesStub = fileURLToPath(
    new URL("./src/shims/node-fs-promises.ts", import.meta.url),
);

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ["crypto", "stream", "util", "buffer", "process"],
            globals: { Buffer: true, global: true, process: true },
        }),
    ],
    resolve: {
        alias: [
            // @0gfoundation/0g-ts-sdk's browser bundle still references
            // node:fs/promises via ZgFile (unused in our browser code paths:
            // useZgStorage only touches MemData + ZgBlob). Alias to a stub
            // so Rollup can resolve the specifier without pulling Node APIs.
            { find: "node:fs/promises", replacement: nodeFsPromisesStub },
            { find: /^fs\/promises$/, replacement: nodeFsPromisesStub },
        ],
    },
    // Use relative paths so the build works on IPFS (hollab.eth.limo)
    // where there's no server to rewrite absolute /assets/ paths.
    base: "./",
    define: {
        "process.env": {},
        global: "globalThis",
    },
});
