import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import DynamicWorkspaceSync from "./components/DynamicWorkspaceSync";
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

// In dev mode, add the local anvil network so Dynamic Labs allows switching to it
const evmNetworks = import.meta.env.DEV
    ? [
          {
              blockExplorerUrls: [],
              chainId: 31337,
              name: "Local (Anvil)",
              iconUrls: [],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              networkId: 31337,
              rpcUrls: ["http://127.0.0.1:8545"],
              vanityName: "Local",
          },
      ]
    : undefined;

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ? (
            <DynamicContextProvider
                settings={{
                    environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
                    networkValidationMode: "always",
                    walletConnectors: [EthereumWalletConnectors],
                    ...(evmNetworks && {
                        overrides: { evmNetworks: (networks) => [...networks, ...evmNetworks] },
                    }),
                }}
            >
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider>
                        <ChainProvider>
                            <WorkspaceProvider>
                                <DynamicWorkspaceSync />
                                <App />
                            </WorkspaceProvider>
                        </ChainProvider>
                    </ThemeProvider>
                </QueryClientProvider>
            </DynamicContextProvider>
        ) : (
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <ChainProvider>
                        <WorkspaceProvider>
                            <App />
                        </WorkspaceProvider>
                    </ChainProvider>
                </ThemeProvider>
            </QueryClientProvider>
        )}
    </StrictMode>,
);
