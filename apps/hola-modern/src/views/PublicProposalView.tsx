/**
 * PublicProposalView — wallet-less permalink for a single governance proposal.
 *
 * Reads the proposal from the indexer's `proposal` table (populated by
 * MeetingFactory:ProposalCreated) and the objection trail from `objection`.
 * Pure read surface — zero wagmi, zero useAccount. Admin actions
 * (adopt/discard) live in the authed workspace view, not here.
 *
 * The permalink carries `orgId` + `proposalId`, but the indexer keys
 * proposals by `<processAddress>-<proposalId>`. We resolve the org's
 * MeetingFactory address via the manifest endpoint and combine them.
 */
import { useMemo } from "react";

import { isAgentAddress } from "../config/agents";
import {
    useObjectionsByProposal,
    useOpenProposalsByOrg,
    useProposalFromIndexer,
} from "../hooks/useProposalsFromIndexer";
import { usePublicOrgFromIndexer } from "../hooks/usePublicOrgFromIndexer";

type Props = {
    orgId: string;
    proposalId: string;
    onBackToOrg: () => void;
};

const CHANGE_TYPE_LABELS: Record<number, string> = {
    0: "Create role",
    1: "Amend role",
    2: "Remove role",
    3: "Create policy",
    4: "Amend policy",
    5: "Remove policy",
    6: "Move role",
    7: "Election",
    8: "Create role (with refs)",
    9: "Amend role (with refs)",
    10: "Create policy (with refs)",
    11: "Amend policy (with refs)",
};

const STATUS_LABELS: Record<number, { label: string; tone: "draft" | "adopted" | "discarded" }> = {
    0: { label: "Draft", tone: "draft" },
    3: { label: "Adopted", tone: "adopted" },
    5: { label: "Discarded", tone: "discarded" },
};

const TONE_CLASSES: Record<"draft" | "adopted" | "discarded", string> = {
    draft: "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]",
    adopted: "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-500 dark:text-emerald-400",
    discarded:
        "border-slate-300/60 bg-slate-200/60 text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-slate-400",
};

export default function PublicProposalView({ orgId, proposalId, onBackToOrg }: Props) {
    const { data: org } = usePublicOrgFromIndexer(orgId);

    // We need the MeetingFactory (processAddress) to build the composite id.
    // The public org fetch doesn't surface it directly — but the indexer's
    // listOpenProposalsByOrg gives us proposal rows with processAddress.
    // For non-draft proposals this won't match; fall back to the manifest
    // endpoint path later. For MVP: list all proposals and pick the one we
    // want by proposalId. Cheap (org typically has <100 proposals) and
    // keeps the component self-contained.
    const { data: openProposals = [] } = useOpenProposalsByOrg(orgId);

    // Fast-path: proposal might already be in the open list.
    const fromOpen = useMemo(
        () => openProposals.find((p) => p.proposalId === proposalId) ?? null,
        [openProposals, proposalId],
    );

    // Slow-path: fetch by composite id once we know processAddress.
    // If fromOpen has it, we're done. Otherwise pick the first proposal's
    // processAddress (org has at most one MeetingFactory clone).
    const processAddress = fromOpen?.processAddress ?? openProposals[0]?.processAddress ?? null;
    const compositeId = processAddress ? `${processAddress}-${proposalId}` : null;
    const { data: fetched, isLoading, error } = useProposalFromIndexer(compositeId);
    const proposal = fromOpen ?? fetched ?? null;

    const { data: objections = [] } = useObjectionsByProposal(
        proposal?.processAddress,
        proposal?.proposalId,
    );

    if (isLoading) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-16 text-slate-500 dark:text-slate-400">
                Loading proposal…
            </main>
        );
    }

    if (!proposal) {
        return (
            <main className="mx-auto max-w-3xl px-6 py-16">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {error ? "Failed to load proposal" : "Proposal not found"}
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {error
                        ? `Indexer error: ${error instanceof Error ? error.message : String(error)}`
                        : `No proposal with id ${proposalId} on this org.`}
                </p>
                <button
                    type="button"
                    onClick={onBackToOrg}
                    className="mt-6 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
                >
                    ← Back to org
                </button>
            </main>
        );
    }

    const status = STATUS_LABELS[proposal.status] ?? { label: "Unknown", tone: "draft" as const };
    const changeLabel =
        CHANGE_TYPE_LABELS[proposal.changeType] ?? `ChangeType ${proposal.changeType}`;
    const proposerIsAgent = isAgentAddress(proposal.proposer);

    return (
        <main className="relative mx-auto min-h-screen w-full max-w-3xl px-6 py-12 text-slate-900 dark:text-white">
            <button
                type="button"
                onClick={onBackToOrg}
                className="mb-8 rounded-full border border-slate-200 px-4 py-1.5 text-[12px] font-medium text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300"
            >
                ← {org ? org.name : "Back to org"}
            </button>

            <header className="mb-10">
                <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    {org
                        ? `${org.subname}.hollab.eth · proposal ${proposal.proposalId}`
                        : `proposal ${proposal.proposalId}`}
                </p>
                <div className="mt-3 flex items-center gap-2">
                    <span
                        className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[status.tone]}`}
                    >
                        {status.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {changeLabel}
                    </span>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">Tension</h1>
                <p className="mt-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {proposal.tensionHash}
                </p>
            </header>

            <section className="mb-10">
                <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Proposer
                </h2>
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] ${
                        proposerIsAgent
                            ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                            : "border-slate-200/70 text-slate-600 dark:border-white/[0.06] dark:text-slate-300"
                    }`}
                >
                    {proposerIsAgent && <span aria-label="agent">🤖</span>}
                    {proposal.proposer.slice(0, 6)}…{proposal.proposer.slice(-4)}
                </span>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Submitted {new Date(Number(proposal.submittedAt) * 1000).toLocaleString()}
                </p>
            </section>

            <section className="mb-10">
                <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Objections ({objections.length})
                </h2>
                {objections.length === 0 ? (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">
                        No objections raised.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {objections.map((o) => {
                            const objectorIsAgent = isAgentAddress(o.objector);
                            const resolved = o.status === 4;
                            return (
                                <li
                                    key={o.id}
                                    className="rounded-xl border border-slate-200/70 p-4 dark:border-white/[0.06]"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
                                                objectorIsAgent
                                                    ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                                                    : "border-slate-200/70 text-slate-500 dark:border-white/[0.06] dark:text-slate-400"
                                            }`}
                                        >
                                            {objectorIsAgent && <span>🤖</span>}
                                            {o.objector.slice(0, 6)}…{o.objector.slice(-4)}
                                        </span>
                                        <span
                                            className={`text-[10px] uppercase tracking-widest ${
                                                resolved
                                                    ? "text-emerald-500 dark:text-emerald-400"
                                                    : "text-amber-500 dark:text-amber-400"
                                            }`}
                                        >
                                            {resolved ? "resolved" : "raised"}
                                        </span>
                                    </div>
                                    <p className="mt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                        concern: {o.concernHash}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="mb-10">
                <h2 className="mb-3 text-[11px] font-mono uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                    Change payload
                </h2>
                <pre className="overflow-x-auto rounded-xl border border-slate-200/70 p-4 font-mono text-[10px] text-slate-600 dark:border-white/[0.06] dark:text-slate-300">
                    {proposal.changeData}
                </pre>
                {proposal.changeResultId !== null && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Applied as id {proposal.changeResultId}
                    </p>
                )}
            </section>
        </main>
    );
}
