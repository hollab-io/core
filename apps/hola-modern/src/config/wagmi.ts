import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { foundry, sepolia } from "wagmi/chains";

const chains = import.meta.env.DEV ? ([sepolia, foundry] as const) : ([sepolia] as const);

export const config = getDefaultConfig({
    appName: "hollab.eth",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "",
    chains,
    transports: {
        [sepolia.id]: http(),
        [foundry.id]: http("http://127.0.0.1:8545"),
    },
});
