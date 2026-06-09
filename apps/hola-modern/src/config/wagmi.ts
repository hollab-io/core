import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { foundry, sepolia } from "wagmi/chains";

import { zgTestnet } from "./chains";

const chains = import.meta.env.DEV
    ? ([sepolia, zgTestnet, foundry] as const)
    : ([sepolia, zgTestnet] as const);

export const config = getDefaultConfig({
    appName: "hollab.eth",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
    chains,
    transports: {
        [sepolia.id]: http(),
        [zgTestnet.id]: http("https://evmrpc-testnet.0g.ai"),
        [foundry.id]: http("http://127.0.0.1:8545"),
    },
});
