import { Sparkles, WalletCards } from "lucide-react";

import { useZeroDevSmartWallet } from "../hooks/useZeroDevSmartWallet";

export default function DynamicGasSponsorshipBadge() {
    const { isEvmWallet, isZeroDevSmartWallet, primaryWallet } = useZeroDevSmartWallet();

    if (!primaryWallet || !isEvmWallet) {
        return null;
    }

    if (isZeroDevSmartWallet) {
        return (
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 lg:flex dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <Sparkles size={14} aria-hidden="true" />
                Gasless ready
            </div>
        );
    }

    return (
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 lg:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <WalletCards size={14} aria-hidden="true" />
            Standard wallet
        </div>
    );
}
