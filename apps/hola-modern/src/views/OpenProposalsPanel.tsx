/**
 * OpenProposalsPanel — authenticated workspace view of the per-org Draft
 * proposal queue with the full objection lifecycle as write surfaces.
 *
 * Closes the gap flagged by UX-C-1: the frontend needs a surface where
 * members can `raiseObjection`, objectors/facilitators can `resolveObjection`,
 * admins can `adopt` / `discard`, and anyone can `discardExpiredProposal`
 * after the org's proposal expiry window. The public PublicProposalView remains read-only.
 *
 * Permission gating is delegated to the contract — reverts surface as
 * human-readable error text. Showing gated buttons always makes the state
 * machine legible instead of hiding it.
 */
import { AlertTriangle, CheckCircle2, FileText, Loader2, MessageSquarePlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";

import type { Objection, Proposal } from "../hooks/useProposalsFromIndexer";
import { isAgentAddress } from "../config/agents";
import {
    isProposalExpired,
    secondsUntilExpiry,
    useAdoptProposal,
    useDiscardExpiredProposal,
    useDiscardProposal,
    useProposalMaxAge,
    useRaiseObjection,
    useResolveObjection,
} from "../hooks/useProposalLifecycle";
import { useObjectionsByProposal, useOpenProposalsByOrg } from "../hooks/useProposalsFromIndexer";

const CHANGE_TYPE_LABELS: Record<number, string> = {
    0: "Create role",
    1: "Amend role",
    2: "Remove role",
    3: "Create policy",
    4: "Amend policy",
    5: "Remove policy",
    6: "Move role",
    7: "Election",
    8: "Create role (refs)",
    9: "Amend role (refs)",
    10: "Create policy (refs)",
    11: "Amend policy (refs)",
};

type Props = { orgId: string | null };

export default function OpenProposalsPanel({ orgId }: Props) {
    const { data: openProposals = [], isLoading } = useOpenProposalsByOrg(orgId);

    if (!orgId) return null;
    if (isLoading) {
        return (
            <div className="mb-8 flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] px-5 py-4 text-[13px] text-slate-500">
                <Loader2 size={13} className="animate-spin" strokeWidth={1.75} />
                Loading open proposals…
            </div>
        );
    }
    if (openProposals.length === 0) return null;

    return (
        <section className="mb-8">
            <div className="mb-3 flex items-baseline justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Open proposals
                </p>
                <p className="text-[11px] text-slate-500">
                    {openProposals.length} draft{openProposals.length === 1 ? "" : "s"}
                </p>
            </div>
            <ul className="space-y-3">
                {openProposals.map((p) => (
                    <ProposalRow key={p.id} proposal={p} />
                ))}
            </ul>
        </section>
    );
}

// ── Proposal row ────────────────────────────────────────────────────────────

function ProposalRow({ proposal }: { proposal: Proposal }) {
    const { data: objections = [] } = useObjectionsByProposal(
        proposal.processAddress,
        proposal.proposalId,
    );
    const openObjections = useMemo(() => objections.filter((o) => o.status === 0), [objections]);
    const openObjectionCount = openObjections.length;
    const proposerIsAgent = isAgentAddress(proposal.proposer);

    const { maxAgeSeconds } = useProposalMaxAge(proposal.processAddress as `0x${string}`);
    const expired = isProposalExpired(proposal.submittedAt, maxAgeSeconds);
    const secondsLeft = secondsUntilExpiry(proposal.submittedAt, maxAgeSeconds);

    // Expiry signal: red if expired; amber within 48h.
    const expiryTone = expired
        ? "text-red-500 dark:text-red-400"
        : secondsLeft < 2 * 24 * 60 * 60
          ? "text-amber-500 dark:text-amber-400"
          : "text-slate-500 dark:text-slate-400";

    const changeLabel =
        CHANGE_TYPE_LABELS[proposal.changeType] ?? `ChangeType ${proposal.changeType}`;

    const meeting = {
        governanceMeetingAddress: proposal.processAddress as `0x${string}`,
        processAddress: proposal.processAddress as `0x${string}`,
    };

    return (
        <li className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-5">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-3">
                <FileText size={14} className="shrink-0 text-slate-500" strokeWidth={1.75} />
                <p className="font-mono text-[11px] text-slate-500">#{proposal.proposalId}</p>
                <span className="rounded-full border border-[#3481FF]/25 bg-[#3481FF]/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-[#3481FF]">
                    {changeLabel}
                </span>
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
                        proposerIsAgent
                            ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                            : "border-slate-200 text-slate-600 dark:border-white/[0.07] dark:text-slate-300"
                    }`}
                >
                    {proposerIsAgent && <span>🤖</span>}
                    {proposal.proposer.slice(0, 6)}…{proposal.proposer.slice(-4)}
                </span>
                <span className={`ml-auto text-[11px] ${expiryTone}`}>
                    {expired ? "Expired" : formatCountdown(secondsLeft)}
                </span>
            </div>

            {/* Tension hash — lets agents resolve off-chain content */}
            <p className="mt-2 truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">
                tension: {proposal.tensionHash}
            </p>

            {/* Objection list */}
            {openObjectionCount > 0 && (
                <ul className="mt-4 space-y-2">
                    {openObjections.map((o) => (
                        <ObjectionRow
                            key={o.id}
                            objection={o}
                            proposalId={BigInt(proposal.proposalId)}
                            meeting={meeting}
                        />
                    ))}
                </ul>
            )}

            {/* Action row */}
            <ProposalActions
                proposal={proposal}
                meeting={meeting}
                openObjectionCount={openObjectionCount}
                expired={expired}
            />
        </li>
    );
}

// ── Objection row ────────────────────────────────────────────────────────────

function ObjectionRow({
    objection,
    proposalId,
    meeting,
}: {
    objection: Objection;
    proposalId: bigint;
    meeting: { governanceMeetingAddress: `0x${string}`; processAddress: `0x${string}` };
}) {
    const { address } = useAccount();
    const resolve = useResolveObjection();
    const isObjector = Boolean(
        address && address.toLowerCase() === objection.objector.toLowerCase(),
    );
    const objectorIsAgent = isAgentAddress(objection.objector);

    return (
        <li className="rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <AlertTriangle
                        size={12}
                        className="text-amber-500 dark:text-amber-400"
                        strokeWidth={2}
                    />
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${
                            objectorIsAgent
                                ? "border-[#3481FF]/30 bg-[#3481FF]/[0.08] text-[#3481FF]"
                                : "border-slate-200 text-slate-600 dark:border-white/[0.07] dark:text-slate-300"
                        }`}
                    >
                        {objectorIsAgent && <span>🤖</span>}
                        {objection.objector.slice(0, 6)}…{objection.objector.slice(-4)}
                    </span>
                </div>
                <button
                    type="button"
                    disabled={resolve.isPending}
                    onClick={() =>
                        resolve.mutate({
                            meeting,
                            proposalId,
                            objectionId: BigInt(objection.objectionId),
                        })
                    }
                    title={
                        isObjector
                            ? "Withdraw your objection"
                            : "Only the objector or the circle facilitator can resolve"
                    }
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/[0.14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {resolve.isPending ? (
                        <Loader2 size={10} className="animate-spin" />
                    ) : (
                        <CheckCircle2 size={10} strokeWidth={2} />
                    )}
                    {isObjector ? "Withdraw" : "Resolve"}
                </button>
            </div>
            <p className="mt-1.5 truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                concern: {objection.concernHash}
            </p>
            {resolve.isError && (
                <p className="mt-1.5 text-[10px] text-red-500 dark:text-red-400">
                    {resolve.error instanceof Error ? resolve.error.message : "Could not resolve"}
                </p>
            )}
        </li>
    );
}

// ── Action buttons (raise / adopt / discard / discard-expired) ──────────────

function ProposalActions({
    proposal,
    meeting,
    openObjectionCount,
    expired,
}: {
    proposal: Proposal;
    meeting: { governanceMeetingAddress: `0x${string}`; processAddress: `0x${string}` };
    openObjectionCount: number;
    expired: boolean;
}) {
    const { address } = useAccount();
    const proposalIdBig = useMemo(() => BigInt(proposal.proposalId), [proposal.proposalId]);

    const adopt = useAdoptProposal();
    const discard = useDiscardProposal();
    const discardExpired = useDiscardExpiredProposal();
    const raise = useRaiseObjection();

    const [showConcernInput, setShowConcernInput] = useState(false);
    const [concernText, setConcernText] = useState("");

    const anyPending =
        adopt.isPending || discard.isPending || discardExpired.isPending || raise.isPending;
    const error = adopt.error ?? discard.error ?? discardExpired.error ?? raise.error;

    const handleRaise = () => {
        if (!address) return;
        // §5.3 Representation Rule: objector must lead a role in the proposal's circle.
        // For now we default to the proposer's role — if the caller co-leads it, the
        // objection is accepted; if not, the contract reverts with NotRoleLead and the
        // user is told to object from a role they actually hold. A role-selector UI
        // will replace this default once per-user role-lead queries land.
        const objectorRoleId = BigInt(proposal.proposerRoleId ?? "0");
        raise.mutate(
            { meeting, proposalId: proposalIdBig, objectorRoleId, concernText },
            {
                onSuccess: () => {
                    setConcernText("");
                    setShowConcernInput(false);
                },
            },
        );
    };

    return (
        <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Raise objection — any member */}
            {!expired && !showConcernInput && (
                <button
                    type="button"
                    onClick={() => setShowConcernInput(true)}
                    disabled={!address || anyPending}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 transition-colors hover:border-amber-400/60 hover:bg-amber-400/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                    title={address ? "Raise an objection" : "Connect wallet to raise an objection"}
                >
                    <MessageSquarePlus size={11} strokeWidth={2} />
                    Raise objection
                </button>
            )}

            {/* Adopt — admin only; contract enforces + rejects if objections open */}
            {!expired && (
                <button
                    type="button"
                    disabled={!address || anyPending || openObjectionCount > 0}
                    onClick={() => adopt.mutate({ meeting, proposalId: proposalIdBig })}
                    title={
                        openObjectionCount > 0
                            ? "Resolve all open objections before adopting"
                            : "Admin only — adopt and apply the change on-chain"
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/[0.1] px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/[0.18] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {adopt.isPending && <Loader2 size={11} className="animate-spin" />}
                    Adopt
                </button>
            )}

            {/* Discard — admin only */}
            {!expired && (
                <button
                    type="button"
                    disabled={!address || anyPending}
                    onClick={() => discard.mutate({ meeting, proposalId: proposalIdBig })}
                    title="Admin only — discard the proposal without applying it"
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-white/[0.16] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {discard.isPending && <Loader2 size={11} className="animate-spin" />}
                    Discard
                </button>
            )}

            {/* Discard expired — permissionless */}
            {expired && (
                <button
                    type="button"
                    disabled={!address || anyPending}
                    onClick={() => discardExpired.mutate({ meeting, proposalId: proposalIdBig })}
                    title="Permissionless — anyone can discard a proposal past its per-org expiry window"
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-500/[0.08] px-3 py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 transition-colors hover:border-red-400/60 hover:bg-red-500/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {discardExpired.isPending && <Loader2 size={11} className="animate-spin" />}
                    Discard (expired)
                </button>
            )}

            {showConcernInput && (
                <div className="mt-3 flex w-full flex-wrap items-stretch gap-2">
                    <textarea
                        value={concernText}
                        onChange={(e) => setConcernText(e.target.value)}
                        placeholder="Describe your concern. Kept off-chain; only its hash is committed."
                        rows={2}
                        autoFocus
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0c10] px-3 py-2 text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-[#3481FF]/50"
                    />
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleRaise}
                            disabled={raise.isPending || concernText.trim().length === 0}
                            className="rounded-full bg-amber-500 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_4px_14px_rgba(245,158,11,0.25)] transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {raise.isPending ? "Submitting…" : "Submit"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowConcernInput(false);
                                setConcernText("");
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            <X size={11} strokeWidth={2} />
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-2 w-full text-[11px] text-red-500 dark:text-red-400">
                    {error instanceof Error ? error.message : "Transaction failed"}
                </p>
            )}
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
    if (seconds <= 0) return "Expired";
    const days = Math.floor(seconds / (24 * 60 * 60));
    if (days > 0) return `${days}d left`;
    const hours = Math.floor(seconds / (60 * 60));
    if (hours > 0) return `${hours}h left`;
    const minutes = Math.max(1, Math.floor(seconds / 60));
    return `${minutes}m left`;
}
