import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { ZeroDevSmartWalletConnectors } from "@dynamic-labs/ethereum-aa";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { WorkspaceProvider } from "./hooks/useWorkspaceSnapshot";

import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID ? (
            <DynamicContextProvider
                settings={{
                    environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
                    walletConnectors: [EthereumWalletConnectors, ZeroDevSmartWalletConnectors],
                }}
            >
                <WorkspaceProvider>
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
