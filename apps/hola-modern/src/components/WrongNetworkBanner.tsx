import { AlertTriangle, Loader2 } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";

import { getChainConfig } from "../config/chains";
import { useChain } from "../context/ChainContext";

export default function WrongNetworkBanner() {
    const { address, chainId } = useAccount();
    const { activeChainId, chainConfig } = useChain();
    const { switchChain, isPending } = useSwitchChain();

    if (!address || !chainId || chainId === activeChainId) return null;

    let connectedLabel = `Chain ${chainId}`;
    try {
        connectedLabel = getChainConfig(chainId).label;
    } catch {
        // Unknown chain — leave the numeric fallback.
    }

    return (
        <div
            role="status"
            className="relative z-10 flex items-center justify-between gap-4
                border-b border-amber-400/30 bg-amber-400/[0.08]
                px-5 py-2.5"
        >
            <div className="flex items-center gap-2 text-[12px] text-amber-900 dark:text-amber-200">
                <AlertTriangle size={12} strokeWidth={2} />
                <span>
                    Wallet is on <b>{connectedLabel}</b>. hollab is on <b>{chainConfig.label}</b>.
                </span>
            </div>
            <button
                type="button"
                disabled={isPending}
                onClick={() => switchChain?.({ chainId: activeChainId })}
                className="flex items-center gap-1.5 rounded-full
                    border border-amber-400/40 bg-amber-400/[0.14]
                    px-3.5 py-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-100
                    transition-all duration-300
                    hover:bg-amber-400/[0.22] hover:border-amber-400/60
                    disabled:cursor-not-allowed disabled:opacity-60"
            >
                {isPending && <Loader2 size={11} strokeWidth={2} className="animate-spin" />}
                Switch to {chainConfig.label}
            </button>
        </div>
    );
}
