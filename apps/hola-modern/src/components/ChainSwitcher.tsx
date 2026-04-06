import { supportedChains } from "../config/chains";
import { useChain } from "../context/ChainContext";

const isDev = import.meta.env.DEV;

export default function ChainSwitcher() {
    const { activeChainId, setActiveChainId } = useChain();

    return (
        <div className="flex items-center gap-1 rounded-full border border-slate-200/80 dark:border-white/[0.07] bg-slate-100/80 dark:bg-white/[0.03] p-0.5">
            {supportedChains.map((cfg) => {
                const isLocal = cfg.chain.id === 31337;
                const active = cfg.chain.id === activeChainId;
                // In dev mode, always enable the local chain
                const disabled = isLocal ? !isDev && !cfg.enabled : !cfg.enabled;

                return (
                    <button
                        key={cfg.chain.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setActiveChainId(cfg.chain.id)}
                        className={`relative rounded-full px-2.5 py-1 text-[11px] font-medium transition-all
                            ${active ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-transparent" : ""}
                            ${disabled ? "cursor-not-allowed text-slate-400 dark:text-slate-600" : ""}
                            ${!active && !disabled ? "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" : ""}
                        `}
                        title={disabled ? "Coming soon" : cfg.label}
                    >
                        {cfg.chain.id === 1 ? "Mainnet" : isLocal ? "Local" : "Sepolia"}
                        {disabled && (
                            <span className="ml-1 text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-600">
                                soon
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
