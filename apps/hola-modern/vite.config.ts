import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@hollab/viem-extension": path.resolve(
                __dirname,
                "../../packages/viem-extension/src/index.ts",
            ),
        },
    },
});
