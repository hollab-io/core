import type { Organization } from "@hollab-io/indexing-client";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    Check,
    ChevronDown,
    Clock3,
    FileText,
    Loader2,
    Radio,
    SlidersHorizontal,
    X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useGovernanceMeeting } from "../hooks/useGovernanceMeeting";
import { useDeployMeetingComponents } from "../hooks/useMeetingComponentsFactory";
import {
    isProposalExpired,
    MAX_PROPOSAL_MAX_AGE_SECONDS,
    MIN_PROPOSAL_MAX_AGE_SECONDS,
    secondsUntilExpiry,
    useProposalMaxAge,
    useSetProposalMaxAge,
} from "../hooks/useProposalLifecycle";
import { useOpenProposalsByOrg } from "../hooks/useProposalsFromIndexer";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";
import FacilitatorsCard from "./FacilitatorsCard";
import OpenProposalsPanel from "./OpenProposalsPanel";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const REVIEW_STEPS = [
    { step: "a", label: "Present proposal", desc: "Proposer frames the tension and proposal" },
    { step: "b", label: "Clarifying questions", desc: "Others ask to understand — no reactions" },
    {
        step: "c",
        label: "Reaction round",
        desc: "Each participant shares reactions, one at a time",
    },
    { step: "d", label: "Option to clarify", desc: "Proposer may amend the proposal" },
    {
        step: "e",
        label: "Challenge round",
        desc: "Circle role-leads raise concerns; facilitator captures objections",
    },
    { step: "f", label: "Integration", desc: "Resolve each objection until the proposal adopts" },
] as const;

type Props = {
    governanceMeetingAddress?: `0x${string}`;
    indexedGovernanceMeetings?: import("../hooks/useGovernanceMeetingsFromIndexer").GovernanceMeeting[];
    pollForNewGovernanceMeeting?: (
        prevCount: number,
    ) => Promise<import("../hooks/useGovernanceMeetingsFromIndexer").GovernanceMeeting[]>;
    activeOrg: Organization | null;
};

export default function GovernanceView({
    governanceMeetingAddress,
    indexedGovernanceMeetings = [],
    pollForNewGovernanceMeeting,
    activeOrg,
}: Props) {
    const { conveneGovernanceMeeting, authenticatedWalletAddress } = useWorkspaceSnapshot();
    const { conveneMeeting } = useGovernanceMeeting();
    const deploy = useDeployMeetingComponents();
    const [isConvening, setIsConvening] = useState(false);
    const [conveneError, setConveneError] = useState<string | null>(null);
    const [ritualOpen, setRitualOpen] = useState(false);

    // Only show on-chain meetings as resumable if they were convened
    // recently (within the last hour) and not yet completed.
    const ONE_HOUR_SECS = 3600;
    const nowSecs = Math.floor(Date.now() / 1000);
    const indexedInProgress = indexedGovernanceMeetings.filter(
        (m) => !m.completedAt && nowSecs - Number(m.createdAt) < ONE_HOUR_SECS,
    );

    // Proposal-centric stats — meetings become a secondary signal.
    const { data: openProposals = [] } = useOpenProposalsByOrg(activeOrg?.id ?? null);
    const { maxAgeSeconds } = useProposalMaxAge(governanceMeetingAddress);
    const proposalStats = useMemo(() => {
        const expired = openProposals.filter((p) =>
            isProposalExpired(p.submittedAt, maxAgeSeconds),
        );
        const TWO_DAYS = 2 * 24 * 60 * 60;
        const expiringSoon = openProposals.filter((p) => {
            if (isProposalExpired(p.submittedAt, maxAgeSeconds)) return false;
            return secondsUntilExpiry(p.submittedAt, maxAgeSeconds) < TWO_DAYS;
        });
        return {
            open: openProposals.length,
            expiringSoon: expiringSoon.length,
            expired: expired.length,
        };
    }, [openProposals, maxAgeSeconds]);

    const handleConveneNewMeeting = async () => {
        if (!authenticatedWalletAddress) return;

        setIsConvening(true);
        setConveneError(null);

        if (!governanceMeetingAddress) {
            if (!activeOrg || !deploy.factoryConfigured) {
                setConveneError("Meeting components factory not configured for this chain.");
                setIsConvening(false);
                return;
            }
            deploy.mutate(
                {
                    orgId: activeOrg.id,
                    subname: activeOrg.subname,
                    walletAddress: authenticatedWalletAddress as `0x${string}`,
                },
                {
                    onError: (err) => {
                        setConveneError(err.message);
                        setIsConvening(false);
                    },
                },
            );
            setIsConvening(false);
            return;
        }

        const address = governanceMeetingAddress;

        try {
            await conveneMeeting({
                governanceMeetingAddress: address,
                orgId: BigInt(activeOrg!.id),
                walletAddress: authenticatedWalletAddress as `0x${string}`,
            });

            if (pollForNewGovernanceMeeting) {
                const prevCount = indexedGovernanceMeetings.length;
                const updated = await pollForNewGovernanceMeeting(prevCount);
                const newest = updated[0];
                if (newest) {
                    conveneGovernanceMeeting({
                        meetingId: newest.id,
                        circleId: newest.circleId,
                        convenedBy: newest.convenedBy,
                        onChainMeetingId: newest.meetingId,
                    });
                }
            }
        } catch (err) {
            setConveneError(err instanceof Error ? err.message : "Failed to convene meeting");
        } finally {
            setIsConvening(false);
        }
    };

    const handleResumeIndexedMeeting = (
        m: import("../hooks/useGovernanceMeetingsFromIndexer").GovernanceMeeting,
    ) => {
        conveneGovernanceMeeting({
            meetingId: m.id,
            circleId: m.circleId,
            convenedBy: m.convenedBy,
            onChainMeetingId: m.meetingId,
        });
    };

    return (
        <div className="min-h-[calc(100dvh-60px)] pb-32 pt-8">
            <div className="mx-auto max-w-[920px] px-5 sm:px-8">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: EXPO }}
                    className="mb-10"
                >
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Governance · async by default
                    </p>
                    <h1 className="text-[2.15rem] font-bold leading-[1.05] tracking-[-0.035em] text-slate-900 dark:text-white">
                        Proposals
                    </h1>
                    <p className="mt-4 max-w-[54ch] text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                        Any member can file a tension. Adoption requires zero open objections —
                        meetings are optional audit wrappers, not a gate.
                    </p>
                    <div className="mt-4">
                        <ExpiryWindowControl
                            meetingFactoryAddress={governanceMeetingAddress}
                            currentSeconds={maxAgeSeconds}
                        />
                    </div>
                </motion.header>

                {/* Primary surface — proposals */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.06, ease: EXPO }}
                >
                    <OpenProposalsPanel
                        orgId={activeOrg?.id ?? null}
                        onOpenComposer={handleConveneNewMeeting}
                        composerPending={isConvening}
                    />
                </motion.div>

                {conveneError && (
                    <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-[12px] text-rose-500 dark:text-rose-300">
                        {conveneError}
                    </div>
                )}

                {/* Proposal-centric stats */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.12, ease: EXPO }}
                    className="mb-8 grid gap-3 sm:grid-cols-3"
                >
                    <StatCard
                        icon={<FileText size={12} strokeWidth={1.9} />}
                        label="Open"
                        value={proposalStats.open}
                        tone="neutral"
                    />
                    <StatCard
                        icon={<Clock3 size={12} strokeWidth={1.9} />}
                        label="Expiring < 48h"
                        value={proposalStats.expiringSoon}
                        tone={proposalStats.expiringSoon > 0 ? "warning" : "neutral"}
                    />
                    <StatCard
                        icon={<AlertTriangle size={12} strokeWidth={1.9} />}
                        label="Expired"
                        value={proposalStats.expired}
                        tone={proposalStats.expired > 0 ? "danger" : "neutral"}
                    />
                </motion.div>

                {/* Optional: reporting session */}
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.18, ease: EXPO }}
                    className="mb-8 rounded-[1.5rem] border border-slate-200/80 bg-white/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]"
                >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="max-w-[48ch]">
                            <div className="mb-1 flex items-center gap-2">
                                <Radio size={12} className="text-slate-500" strokeWidth={1.9} />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Optional · reporting session
                                </p>
                            </div>
                            <p className="text-[13.5px] font-medium text-slate-900 dark:text-white">
                                Convene an on-chain audit marker for a live governance session.
                            </p>
                            <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                                Emits <span className="font-mono text-[11px]">startMeeting</span> /{" "}
                                <span className="font-mono text-[11px]">endMeeting</span> so
                                indexers can attribute a proposal batch to a specific window.
                                Governance writes do <em>not</em> require an open session.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {indexedInProgress.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => handleResumeIndexedMeeting(m)}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[#3481FF]/30 bg-[#3481FF]/[0.08] px-3.5 py-1.5 text-[11px] font-semibold text-[#3481FF] transition hover:border-[#3481FF]/55 hover:bg-[#3481FF]/[0.16]"
                                >
                                    <span className="relative inline-flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3481FF]/50" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3481FF]" />
                                    </span>
                                    Resume #{m.meetingId}
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={isConvening}
                                onClick={handleConveneNewMeeting}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300/70 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:border-white/25 dark:hover:bg-white/[0.04]"
                            >
                                {isConvening && (
                                    <Loader2 size={11} className="animate-spin" strokeWidth={2} />
                                )}
                                Convene session
                            </button>
                        </div>
                    </div>

                    {indexedGovernanceMeetings.length > 0 && (
                        <details className="mt-4 border-t border-slate-200/60 pt-4 dark:border-white/[0.06]">
                            <summary className="flex cursor-pointer select-none items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                                Session history ({indexedGovernanceMeetings.length})
                            </summary>
                            <ul className="mt-3 space-y-1.5">
                                {indexedGovernanceMeetings.slice(0, 5).map((m) => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleResumeIndexedMeeting(m)}
                                            className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.03]"
                                        >
                                            <span className="text-[12px] text-slate-700 dark:text-slate-200">
                                                Session #{m.meetingId} · Circle {m.circleId}
                                            </span>
                                            <span
                                                className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
                                                    m.completedAt
                                                        ? "text-emerald-500 dark:text-emerald-400"
                                                        : "text-[#3481FF]"
                                                }`}
                                            >
                                                {m.completedAt ? "ended" : "open"}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </motion.section>

                {/* Optional: facilitator / secretary bootstrap */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.22, ease: EXPO }}
                >
                    <FacilitatorsCard
                        orgId={activeOrg?.id ?? null}
                        meetingFactoryAddress={governanceMeetingAddress}
                    />
                </motion.div>

                {/* Optional: live review ritual (collapsed) */}
                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.24, ease: EXPO }}
                >
                    <button
                        type="button"
                        onClick={() => setRitualOpen((v) => !v)}
                        className="group mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 transition hover:text-slate-700 dark:hover:text-slate-300"
                        aria-expanded={ritualOpen}
                    >
                        If you run a live review · IDM
                        <ChevronDown
                            size={13}
                            strokeWidth={2}
                            className={`transition-transform duration-300 ${ritualOpen ? "rotate-180" : ""}`}
                        />
                    </button>
                    <motion.div
                        initial={false}
                        animate={{
                            height: ritualOpen ? "auto" : 0,
                            opacity: ritualOpen ? 1 : 0,
                        }}
                        transition={{ duration: 0.35, ease: EXPO }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-slate-100 dark:border-white/[0.06] dark:bg-white/[0.04]">
                            {REVIEW_STEPS.map((s) => (
                                <div
                                    key={s.step}
                                    className="flex items-center gap-4 bg-white px-5 py-3 first:rounded-t-[calc(1.25rem-1px)] last:rounded-b-[calc(1.25rem-1px)] dark:bg-[#0a0a0f]"
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold uppercase text-slate-500 dark:bg-white/[0.05]">
                                        {s.step}
                                    </span>
                                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                                        {s.label}
                                    </span>
                                    <span className="ml-auto hidden max-w-[24ch] text-right text-[11.5px] text-slate-500 dark:text-slate-500 sm:block">
                                        {s.desc}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-500">
                            This is the Holacracy v5.0 Integrative Decision Making protocol.
                            It&apos;s a useful ritual for humans-in-a-room, but nothing in the
                            contract requires it — agents and async-first teams skip it entirely.
                        </p>
                    </motion.div>
                </motion.section>
            </div>
        </div>
    );
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone: "neutral" | "warning" | "danger";
}) {
    const valueClass =
        tone === "warning"
            ? "text-amber-500 dark:text-amber-400"
            : tone === "danger"
              ? "text-rose-500 dark:text-rose-400"
              : "text-slate-900 dark:text-white";

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-5 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <div className="mb-2 flex items-center gap-1.5 text-slate-500">
                {icon}
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">{label}</p>
            </div>
            <p className={`text-[26px] font-semibold tabular-nums leading-none ${valueClass}`}>
                {value}
            </p>
        </div>
    );
}

// ── Expiry window setter ────────────────────────────────────────────────────

/**
 * Compact pill showing the current per-org proposal expiry window, with a
 * popover for admins to change it. Contract enforces org-admin; we surface
 * the control to everyone and let reverts communicate the rule (same pattern
 * as the objection/adopt buttons in OpenProposalsPanel).
 */
const EXPIRY_PRESETS: { label: string; seconds: number }[] = [
    { label: "1 hour", seconds: 60 * 60 },
    { label: "1 day", seconds: 24 * 60 * 60 },
    { label: "3 days", seconds: 3 * 24 * 60 * 60 },
    { label: "7 days", seconds: 7 * 24 * 60 * 60 },
    { label: "14 days", seconds: 14 * 24 * 60 * 60 },
    { label: "30 days", seconds: 30 * 24 * 60 * 60 },
];

function formatWindow(seconds: number): string {
    if (seconds < 24 * 60 * 60) {
        const hours = Math.round(seconds / 3600);
        return `${hours} hour${hours === 1 ? "" : "s"}`;
    }
    const days = Math.round(seconds / 86_400);
    return `${days} day${days === 1 ? "" : "s"}`;
}

function ExpiryWindowControl({
    meetingFactoryAddress,
    currentSeconds,
}: {
    meetingFactoryAddress: `0x${string}` | undefined;
    currentSeconds: number;
}) {
    const [open, setOpen] = useState(false);
    const mutation = useSetProposalMaxAge();

    // Reset local form error when re-opening.
    const handleToggle = () => {
        setOpen((v) => !v);
        mutation.reset();
    };

    const handlePreset = (seconds: number) => {
        if (!meetingFactoryAddress) return;
        mutation.mutate(
            { meetingFactoryAddress, maxAgeSeconds: seconds },
            { onSuccess: () => setOpen(false) },
        );
    };

    const disabled = !meetingFactoryAddress || mutation.isPending;

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={handleToggle}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-medium transition-colors ${
                    open
                        ? "border-[#3481FF]/40 bg-[#3481FF]/[0.08] text-[#3481FF]"
                        : "border-slate-200/80 bg-white/60 text-slate-600 hover:border-slate-300 hover:text-slate-800 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/[0.16] dark:hover:text-white"
                }`}
                aria-expanded={open}
                title="Per-org proposal expiry window (admin only)"
            >
                <Clock3 size={11} strokeWidth={1.9} />
                Expiry window
                <span className="font-mono text-[10.5px] tabular-nums opacity-80">
                    {formatWindow(currentSeconds)}
                </span>
                <ChevronDown
                    size={11}
                    strokeWidth={2}
                    className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, ease: EXPO }}
                    className="absolute left-0 top-[calc(100%+8px)] z-20 w-[320px] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_12px_48px_-12px_rgba(15,23,42,0.2)] dark:border-white/[0.08] dark:bg-[#0c0c12] dark:shadow-[0_12px_48px_-12px_rgba(0,0,0,0.7)]"
                >
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <SlidersHorizontal
                                    size={11}
                                    strokeWidth={1.9}
                                    className="text-slate-500"
                                />
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    Proposal expiry
                                </p>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                                Admin-only. Contract clamps to [1 hour, 30 days]. Changes apply
                                immediately to all open drafts.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="-mr-1 -mt-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
                            aria-label="Close"
                        >
                            <X size={12} strokeWidth={2.2} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                        {EXPIRY_PRESETS.map((p) => {
                            const active = p.seconds === currentSeconds;
                            return (
                                <button
                                    key={p.seconds}
                                    type="button"
                                    disabled={disabled || active}
                                    onClick={() => handlePreset(p.seconds)}
                                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                        active
                                            ? "border-emerald-400/40 bg-emerald-500/[0.1] text-emerald-600 dark:text-emerald-300"
                                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:border-white/[0.2] dark:hover:bg-white/[0.04]"
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                    {active && <Check size={10} strokeWidth={2.4} />}
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>

                    {mutation.isPending && (
                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Loader2 size={10} className="animate-spin" strokeWidth={2} />
                            Submitting transaction…
                        </div>
                    )}
                    {mutation.isError && (
                        <p className="mt-3 text-[11px] text-rose-500 dark:text-rose-400">
                            {mutation.error instanceof Error
                                ? mutation.error.message
                                : "Transaction failed"}
                        </p>
                    )}
                    {!meetingFactoryAddress && (
                        <p className="mt-3 text-[11px] text-slate-500">
                            Deploy meeting components first to configure the window.
                        </p>
                    )}

                    <p className="mt-3 text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500">
                        Contract range {Math.round(MIN_PROPOSAL_MAX_AGE_SECONDS / 3600)}h —{" "}
                        {Math.round(MAX_PROPOSAL_MAX_AGE_SECONDS / 86_400)}d. Default 7 days.
                    </p>
                </motion.div>
            )}
        </div>
    );
}
