import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // Use relative paths so the build works on IPFS (hollab.eth.limo)
    // where there's no server to rewrite absolute /assets/ paths.
    base: "./",
    define: {
        "process.env": {},
        global: "globalThis",
    },
});
