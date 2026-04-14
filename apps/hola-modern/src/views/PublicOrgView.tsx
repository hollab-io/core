/**
 * PublicOrgView — wallet-less, agent-readable public surface for a hollab org.
 *
 * Acceptance constraints (sprint-agent-native-mvp, WS1):
 *   - Zero wallet connection, zero wagmi reads, zero useAccount.
 *   - All data sourced from the local indexer via indexing-client.
 *   - The only action that may trigger RainbowKit is the "Propose a tension"
 *     CTA; that wiring lands in WS3 (progressive connect).
 */
import { useMemo } from "react";

import { useChain } from "../context/ChainContext";
import { useCirclesFromIndexer } from "../hooks/useCirclesFromIndexer";
import { useOrgMembersFromIndexer } from "../hooks/useOrgMembersFromIndexer";
import { usePublicOrgFromIndexer } from "../hooks/usePublicOrgFromIndexer";
import { useRolesFromIndexer } from "../hooks/useRolesFromIndexer";

type Props = {
    orgId: string;
    onBack?: () => void;
};

export default function PublicOrgView({ orgId, onBack }: Props) {
    const { chainConfig } = useChain();
    const { data: org, isLoading: orgLoading, error: orgError } = usePublicOrgFromIndexer(orgId);
    const { circles } = useCirclesFromIndexer(orgId);
    const { roles } = useRolesFromIndexer(orgId);
    const { members } = useOrgMembersFromIndexer(chainConfig.orgFactoryAddress, orgId);

    const anchor = useMemo(() => circles.find((c) => c.isAnchor) ?? circles[0] ?? null, [circles]);

    if (orgLoading) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-16 text-slate-500 dark:text-slate-400">
                Loading org…
            </main>
        );
    }

    if (!org) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {orgError ? "Failed to load org" : "Org not found"}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {orgError
                        ? `Indexer error for id ${orgId}: ${orgError instanceof Error ? orgError.message : String(orgError)}`
                        : `No organization with id ${orgId} on this chain.`}
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
            </main>
        );
    }

    return (
        <main className="relative mx-auto min-h-screen w-full max-w-4xl px-6 py-12 text-slate-900 dark:text-white">
            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <header className="mb-10">
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {org.subname}.hollab.eth
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-[-0.02em]">{org.name}</h1>
                {anchor?.purpose && (
                    <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {anchor.purpose}
                    </p>
                )}
                <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{members.length} members</span>
                    <span>·</span>
                    <span>{circles.length} circles</span>
                    <span>·</span>
                    <span>{roles.length} roles</span>
                </div>
            </header>

            {/* ── Circles ──────────────────────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Circles
                </h2>
                <ul className="space-y-2">
                    {circles.map((c) => (
                        <li
                            key={c.id}
                            className="rounded-xl border border-slate-200/70 p-4 dark:border-white/[0.06]"
                        >
                            <p className="text-sm font-semibold">{c.name}</p>
                            {c.purpose && (
                                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                                    {c.purpose}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </section>

            {/* ── Members ──────────────────────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Members
                </h2>
                <ul className="flex flex-wrap gap-2">
                    {members.map((m) => (
                        <li
                            key={m.memberAddress}
                            className="rounded-full border border-slate-200/70 px-3 py-1 font-mono text-[11px] text-slate-600 dark:border-white/[0.06] dark:text-slate-300"
                        >
                            {m.memberAddress.slice(0, 6)}…{m.memberAddress.slice(-4)}
                        </li>
                    ))}
                </ul>
            </section>

            {/* TODO(WS1 Day 2): live proposals + adopted timeline */}
            {/* TODO(WS3): progressive connect "Propose a tension" CTA */}
        </main>
    );
}
