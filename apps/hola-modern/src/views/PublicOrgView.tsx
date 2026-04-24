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

import { isAgentAddress } from "../config/agents";
import { useCirclesFromIndexer } from "../hooks/useCirclesFromIndexer";
import { useOrgMembersFromIndexer } from "../hooks/useOrgMembersFromIndexer";
import { useOpenProposalsByOrg } from "../hooks/useProposalsFromIndexer";
import { usePublicOrgFromIndexer } from "../hooks/usePublicOrgFromIndexer";
import { useRolesFromIndexer } from "../hooks/useRolesFromIndexer";

type Props = {
    orgId: string;
    onBack?: () => void;
    onOpenRole?: (roleId: string) => void;
    onOpenProposal?: (proposalId: string) => void;
    onJoin?: () => void;
};

const CHANGE_TYPE_SHORT: Record<number, string> = {
    0: "create role",
    1: "amend role",
    2: "remove role",
    3: "create policy",
    4: "amend policy",
    5: "remove policy",
    6: "move role",
    7: "election",
    8: "create role +refs",
    9: "amend role +refs",
    10: "create policy +refs",
    11: "amend policy +refs",
};

export default function PublicOrgView({
    orgId,
    onBack,
    onOpenRole,
    onOpenProposal,
    onJoin,
}: Props) {
    const { data: org, isLoading: orgLoading, error: orgError } = usePublicOrgFromIndexer(orgId);
    const { circles } = useCirclesFromIndexer(orgId);
    const { roles } = useRolesFromIndexer(orgId);
    const { members } = useOrgMembersFromIndexer(org?.instanceAddress, orgId);
    const { data: openProposals = [] } = useOpenProposalsByOrg(orgId);

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
                <div className="mt-6 flex flex-wrap items-center gap-2">
                    {onJoin && (
                        <button
                            type="button"
                            onClick={onJoin}
                            className="rounded-full border border-[#3481FF]/30 bg-[#3481FF]/[0.08] px-4 py-1.5 text-[12px] font-semibold text-[#3481FF] transition hover:bg-[#3481FF]/[0.14]"
                        >
                            Join community
                        </button>
                    )}
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
                        >
                            ← Explore
                        </button>
                    )}
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
                    {members.map((m) => {
                        const isAgent = isAgentAddress(m.memberAddress);
                        return (
                            <li
                                key={m.memberAddress}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] ${
                                    isAgent
                                        ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                                        : "border-slate-200/70 text-slate-600 dark:border-white/[0.06] dark:text-slate-300"
                                }`}
                            >
                                {isAgent && <span aria-label="agent">🤖</span>}
                                {m.memberAddress.slice(0, 6)}…{m.memberAddress.slice(-4)}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* ── Open proposals ──────────────────────────────────────────── */}
            {openProposals.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        Open proposals ({openProposals.length})
                    </h2>
                    <ul className="space-y-2">
                        {openProposals.map((p) => {
                            const proposerIsAgent = isAgentAddress(p.proposer);
                            return (
                                <li
                                    key={p.id}
                                    className="rounded-xl border border-slate-200/70 p-4 transition hover:border-slate-300 dark:border-white/[0.06] dark:hover:border-white/[0.14]"
                                >
                                    <div className="flex items-baseline justify-between gap-3">
                                        {onOpenProposal ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpenProposal(p.proposalId)}
                                                className="text-left text-sm font-semibold hover:text-[#3481FF]"
                                            >
                                                Proposal #{p.proposalId} ·{" "}
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    {CHANGE_TYPE_SHORT[p.changeType] ?? "change"}
                                                </span>
                                            </button>
                                        ) : (
                                            <p className="text-sm font-semibold">
                                                Proposal #{p.proposalId}
                                            </p>
                                        )}
                                        <span
                                            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                                                proposerIsAgent
                                                    ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                                                    : "border-slate-200/70 text-slate-500 dark:border-white/[0.06] dark:text-slate-400"
                                            }`}
                                        >
                                            {proposerIsAgent && <span>🤖</span>}
                                            {p.proposer.slice(0, 6)}…{p.proposer.slice(-4)}
                                        </span>
                                    </div>
                                    {p.tensionText ? (
                                        <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-slate-700 dark:text-slate-200">
                                            {p.tensionText}
                                        </p>
                                    ) : (
                                        <p className="mt-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                            {p.tensionHash}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {/* ── Roles ────────────────────────────────────────────────────── */}
            <section className="mb-10">
                <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Roles
                </h2>
                {roles.length === 0 ? (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">
                        No roles defined yet.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {roles.map((r) => {
                            const leads = (r.leads ?? []) as string[];
                            return (
                                <li
                                    key={r.id}
                                    className="rounded-xl border border-slate-200/70 p-4 transition hover:border-slate-300 dark:border-white/[0.06] dark:hover:border-white/[0.14]"
                                >
                                    <div className="flex items-baseline justify-between gap-3">
                                        {onOpenRole ? (
                                            <button
                                                type="button"
                                                onClick={() => onOpenRole(r.id)}
                                                className="text-left text-sm font-semibold hover:text-[#3481FF]"
                                            >
                                                {r.name}
                                            </button>
                                        ) : (
                                            <p className="text-sm font-semibold">{r.name}</p>
                                        )}
                                        {leads.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-1">
                                                {leads.map((lead) => {
                                                    const isAgent = isAgentAddress(lead);
                                                    return (
                                                        <span
                                                            key={lead}
                                                            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
                                                                isAgent
                                                                    ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                                                                    : "border-slate-200/70 text-slate-500 dark:border-white/[0.06] dark:text-slate-400"
                                                            }`}
                                                        >
                                                            {isAgent && <span>🤖</span>}
                                                            {lead.slice(0, 6)}…{lead.slice(-4)}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {r.purpose && (
                                        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                                            {r.purpose}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </main>
    );
}
