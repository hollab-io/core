import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";

import App from "./App.tsx";
import WalletWorkspaceSync from "./components/WalletWorkspaceSync";
import { config } from "./config/wagmi";
import { ChainProvider } from "./context/ChainContext";
import { ThemeProvider } from "./context/ThemeContext";
import { WorkspaceProvider } from "./hooks/useWorkspaceSnapshot";

import "./index.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10_000,
            retry: 1,
        },
    },
});

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <ThemeProvider>
                        <ChainProvider>
                            <WorkspaceProvider>
                                <WalletWorkspaceSync />
                                <App />
                            </WorkspaceProvider>
                        </ChainProvider>
                    </ThemeProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    </StrictMode>,
);
