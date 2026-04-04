import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { WorkspaceProvider } from "./hooks/useWorkspaceSnapshot";

import "./index.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <WorkspaceProvider>
            <App />
        </WorkspaceProvider>
    </StrictMode>,
);
