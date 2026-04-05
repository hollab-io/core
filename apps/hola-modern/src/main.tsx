import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectorsWithConfig } from "@dynamic-labs/ethereum-aa";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import DynamicWorkspaceSync from "./components/DynamicWorkspaceSync";
import { WorkspaceProvider } from "./hooks/useWorkspaceSnapshot";

import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ? (
            <DynamicContextProvider
                settings={{
                    environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
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
                <WorkspaceProvider>
                    <DynamicWorkspaceSync />
                    <App />
                </WorkspaceProvider>
            </DynamicContextProvider>
        ) : (
            <WorkspaceProvider>
                <App />
            </WorkspaceProvider>
        )}
    </StrictMode>,
);
