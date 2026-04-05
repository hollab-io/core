import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
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
                    walletConnectors: [EthereumWalletConnectors],
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
