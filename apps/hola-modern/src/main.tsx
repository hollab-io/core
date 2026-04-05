import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectorsWithConfig } from "@dynamic-labs/ethereum-aa";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import DynamicWorkspaceSync from "./components/DynamicWorkspaceSync";
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
        {import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ? (
            <DynamicContextProvider
                settings={{
                    environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
                    networkValidationMode: "always",
                    walletConnectors: [
                        EthereumWalletConnectors,
                        // ZeroDev smart accounts — enables gas sponsorship and tx batching.
                        // Project ID: 3ad52124-6301-4f9b-8944-a06eda378b33 (Sepolia)
                        ZeroDevSmartWalletConnectorsWithConfig({
                            bundlerRpc:
                                "https://rpc.zerodev.app/api/v3/3ad52124-6301-4f9b-8944-a06eda378b33/chain/11155111",
                            paymasterRpc:
                                "https://rpc.zerodev.app/api/v3/3ad52124-6301-4f9b-8944-a06eda378b33/chain/11155111",
                        }),
                    ],
                }}
            >
                <QueryClientProvider client={queryClient}>
                    <WorkspaceProvider>
                        <DynamicWorkspaceSync />
                        <App />
                    </WorkspaceProvider>
                </QueryClientProvider>
            </DynamicContextProvider>
        ) : (
            <QueryClientProvider client={queryClient}>
                <WorkspaceProvider>
                    <App />
                </WorkspaceProvider>
            </QueryClientProvider>
        )}
    </StrictMode>,
);
