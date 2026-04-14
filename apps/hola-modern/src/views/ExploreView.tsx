/**
 * ExploreView — public, wallet-less org directory.
 *
 * Zero wagmi, zero useAccount, zero RPC. Data is fetched from the Ponder
 * indexer (`listOrganizations`) so this view is safe to mount above the auth
 * gate and can be opened in incognito without a wallet extension.
 */
import { useAllOrgsFromIndexer } from "../hooks/useAllOrgsFromIndexer";

type Props = {
    onOpenOrg: (orgId: string) => void;
    onBack?: () => void;
};

export default function ExploreView({ onOpenOrg, onBack }: Props) {
    const { data: orgs = [], isLoading, error } = useAllOrgsFromIndexer();

    const sorted = [...orgs].sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));

    return (
        <main className="relative mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-slate-900 dark:text-white">
            <header className="mb-10">
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    hollab · explore
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">
                    Public organizations
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                    Every hollab org is a public, agent-readable governance object. Browse the
                    directory below — no wallet required.
                </p>
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="mt-6 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
                    >
                        ← Home
                    </button>
                )}
            </header>

            {isLoading && (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">Loading orgs…</p>
            )}
            {error && (
                <p className="text-[13px] text-rose-500">
                    Failed to load orgs: {error instanceof Error ? error.message : String(error)}
                </p>
            )}
            {!isLoading && !error && sorted.length === 0 && (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    No organizations indexed yet.
                </p>
            )}

            <ul className="space-y-2">
                {sorted.map((o) => (
                    <li key={o.id}>
                        <button
                            type="button"
                            onClick={() => onOpenOrg(o.id)}
                            className="group w-full rounded-xl border border-slate-200/70 p-4 text-left transition hover:border-slate-300 dark:border-white/[0.06] dark:hover:border-white/[0.14]"
                        >
                            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                                {o.subname}.hollab.eth
                            </p>
                            <p className="mt-1 text-sm font-semibold">{o.name}</p>
                            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{o.memberCount} members</span>
                                <span>·</span>
                                <span>{o.circleCount} circles</span>
                                <span>·</span>
                                <span>{o.roleCount} roles</span>
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </main>
    );
}
