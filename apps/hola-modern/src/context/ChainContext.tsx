import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useState } from "react";

import type { ChainConfig } from "../config/chains";
import { DEFAULT_CHAIN_ID, getChainConfig } from "../config/chains";

const STORAGE_KEY = "hollab:activeChainId";

function readPersistedChainId(): number {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return Number(raw);
    } catch {
        // SSR or storage unavailable
    }
    return DEFAULT_CHAIN_ID;
}

type ChainContextValue = {
    activeChainId: number;
    chainConfig: ChainConfig;
    setActiveChainId: (id: number) => void;
};

const ChainCtx = createContext<ChainContextValue | null>(null);

export function ChainProvider({ children }: PropsWithChildren) {
    const [activeChainId, setActiveChainIdRaw] = useState(readPersistedChainId);

    const setActiveChainId = useCallback((id: number) => {
        setActiveChainIdRaw(id);
        try {
            localStorage.setItem(STORAGE_KEY, String(id));
        } catch {
            // ignore
        }
    }, []);

    const chainConfig = getChainConfig(activeChainId);

    return (
        <ChainCtx.Provider value={{ activeChainId, chainConfig, setActiveChainId }}>
            {children}
        </ChainCtx.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChain() {
    const ctx = useContext(ChainCtx);
    if (!ctx) throw new Error("useChain must be used within <ChainProvider>");
    return ctx;
}
