import { CheckCircle2, ExternalLink, Sparkles, WalletCards } from "lucide-react";

import { useZeroDevSmartWallet } from "../hooks/useZeroDevSmartWallet";

const dynamicEnvironmentId = import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID;

export default function DynamicGasSponsorshipCard() {
    const { isEvmWallet, isZeroDevSmartWallet, primaryWallet } = useZeroDevSmartWallet();

    const readinessLabel = !dynamicEnvironmentId
        ? "Dynamic environment missing"
        : !primaryWallet
          ? "SDK configured, wallet not connected"
          : isZeroDevSmartWallet
            ? "ZeroDev smart wallet active"
            : isEvmWallet
              ? "EVM wallet connected without smart-wallet sponsorship"
              : "Non-EVM wallet connected";

    return (
        <article className="rounded-3xl border border-[#DCE7FF] bg-gradient-to-br from-white via-[#F6F9FF] to-[#EEF4FF] p-6 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3481FF]/10 text-[#3481FF]">
                            <Sparkles size={20} aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3481FF]">
                                Dynamic x ZeroDev
                            </p>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                                Gas sponsorship
                            </h3>
                        </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        The React app is now wired for ZeroDev smart-wallet sponsorship. Any
                        eligible EVM user operation can use the shared sponsorship helper instead of
                        asking members to preload native gas.
                    </p>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Readiness
                    </div>
                    <div className="mt-2 font-semibold text-slate-900 dark:text-slate-100">
                        {readinessLabel}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {primaryWallet?.address ??
                            "Connect a wallet to validate the active connector."}
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {isZeroDevSmartWallet ? (
                            <CheckCircle2
                                size={16}
                                className="text-emerald-500"
                                aria-hidden="true"
                            />
                        ) : (
                            <WalletCards size={16} className="text-slate-400" aria-hidden="true" />
                        )}
                        Active connector
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {isZeroDevSmartWallet
                            ? "Sponsored smart-wallet flow is active for the connected EVM wallet."
                            : "A standard wallet is connected. Gas sponsorship will only apply once the ZeroDev smart wallet path is used."}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <CheckCircle2 size={16} className="text-[#3481FF]" aria-hidden="true" />
                        SDK wiring
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        `@dynamic-labs/ethereum-aa` is installed and the shared provider now loads
                        the ZeroDev smart-wallet connector beside the regular EVM connectors.
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        <ExternalLink size={16} className="text-[#3481FF]" aria-hidden="true" />
                        Dashboard prerequisites
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Enable Sponsor Gas → Zerodev in the Dynamic dashboard and attach the ZeroDev
                        project IDs and gas policy for each network you plan to support.
                    </p>
                </div>
            </div>
        </article>
    );
}
