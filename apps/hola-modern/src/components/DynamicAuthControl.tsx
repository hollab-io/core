import { DynamicWidget, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ShieldAlert, Wallet2 } from "lucide-react";

const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

function formatAddress(address: string) {
    if (address.length <= 10) {
        return address;
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function ConnectedWalletMeta() {
    const { handleLogOut, primaryWallet, user } = useDynamicContext();

    if (!primaryWallet) {
        return null;
    }

    return (
        <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left xl:flex dark:border-slate-700 dark:bg-slate-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3481FF]/10 text-[#3481FF]">
                <Wallet2 size={17} aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatAddress(primaryWallet.address)}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user?.email ?? `Chain ${primaryWallet.chain}`}
                </div>
            </div>
            <button
                type="button"
                onClick={handleLogOut}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-950 dark:hover:text-white"
            >
                Disconnect
            </button>
        </div>
    );
}

export default function DynamicAuthControl() {
    if (!dynamicEnvironmentId) {
        return (
            <div className="hidden items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 lg:flex dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
                <ShieldAlert size={16} aria-hidden="true" />
                <div className="text-left">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em]">
                        Dynamic not configured
                    </div>
                    <div className="text-xs opacity-80">
                        Add `VITE_DYNAMIC_ENVIRONMENT_ID` to enable wallet auth.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-2 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <DynamicWidget />
            </div>
            <ConnectedWalletMeta />
        </div>
    );
}
