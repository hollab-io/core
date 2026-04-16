import type { Organization, TacticalMeeting } from "@hollab-io/indexing-client";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Loader2, Play, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { useDeployMeetingComponents } from "../hooks/useMeetingComponentsFactory";
import { useConveneTacticalMeeting } from "../hooks/useTacticalMeeting";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PHASES = [
    { label: "Check-in", desc: "Each member shares current state" },
    { label: "Checklist", desc: "Verify recurring actions" },
    { label: "Metrics", desc: "Share reported metrics" },
    { label: "Progress", desc: "Highlight project updates" },
    { label: "Build agenda", desc: "Collect items to process" },
    { label: "Triage", desc: "Process agenda items" },
    { label: "Closing", desc: "Closing reflections" },
] as const;

type Props = {
    tacticalMeetingAddress?: `0x${string}`;
    indexedMeetings: TacticalMeeting[];
    activeOrg: Organization | null;
};

export default function TacticalView({
    tacticalMeetingAddress,
    indexedMeetings,
    activeOrg,
}: Props) {
    const { openMeeting, authenticatedWalletAddress } = useWorkspaceSnapshot();
    const convene = useConveneTacticalMeeting();
    const deploy = useDeployMeetingComponents();
    const [conveneError, setConveneError] = useState<string | null>(null);
    const isConvening = convene.isPending;
    const isDeploying = deploy.isPending;

    const inProgress = useMemo(
        () => indexedMeetings.filter((m) => !m.completedAt),
        [indexedMeetings],
    );
    const completed = useMemo(
        () => indexedMeetings.filter((m) => m.completedAt),
        [indexedMeetings],
    );

    const hasActiveHuddle = inProgress.length > 0;

    const handleStartHuddle = () => {
        if (!tacticalMeetingAddress || !authenticatedWalletAddress || hasActiveHuddle) return;

        setConveneError(null);
        convene.mutate(
            {
                tacticalMeetingAddress,
                orgId: BigInt(activeOrg!.id),
                walletAddress: authenticatedWalletAddress as `0x${string}`,
            },
            {
                onSuccess: ({ meeting }) => {
                    openMeeting(meeting.id);
                },
                onError: (err) => {
                    setConveneError(err.message);
                },
            },
        );
    };

    return (
        <div className="min-h-[calc(100dvh-60px)] pb-32 pt-8">
            <div className="mx-auto max-w-[900px] px-5 sm:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EXPO }}
                    className="mb-10"
                >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Team sync
                    </p>
                    <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-slate-900 dark:text-white">
                        Operational sync
                    </h1>
                    <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-400">
                        A structured sync to surface issues, capture next actions, and advance
                        projects — in seven phases.
                    </p>
                </motion.div>

                {/* In-progress huddle banner */}
                {hasActiveHuddle && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.06, ease: EXPO }}
                        className="mb-4"
                    >
                        {inProgress.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => openMeeting(m.id)}
                                className="group mb-2 flex w-full items-center justify-between gap-4
                                    rounded-[1.5rem]
                                    border border-[#3481FF]/30
                                    bg-[linear-gradient(135deg,rgba(52,129,255,0.14),rgba(52,129,255,0.06))]
                                    p-5
                                    transition-all duration-500
                                    hover:border-[#3481FF]/50
                                    hover:shadow-[0_0_40px_rgba(52,129,255,0.15)]
                                    active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="flex h-11 w-11 items-center justify-center rounded-2xl
                                            border border-[#3481FF]/30 bg-[#3481FF]/20"
                                    >
                                        <Play
                                            size={16}
                                            className="text-[#3481FF]"
                                            fill="currentColor"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                                            Huddle in progress
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Started{" "}
                                            {new Date(Number(m.createdAt) * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-2 rounded-full
                                        border border-[#3481FF]/25 bg-[#3481FF]/10
                                        px-4 py-2 text-[12px] font-semibold text-[#6aabff]"
                                >
                                    Resume
                                    <ArrowRight size={13} />
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}

                {/* Start huddle CTA — hidden when one is already running */}
                {!hasActiveHuddle && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.08, ease: EXPO }}
                        className="mb-8"
                    >
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={isConvening || isDeploying}
                                onClick={async () => {
                                    if (!authenticatedWalletAddress) return;

                                    if (!tacticalMeetingAddress) {
                                        if (!activeOrg || !deploy.factoryConfigured) return;
                                        setConveneError(null);
                                        deploy.mutate(
                                            {
                                                orgId: activeOrg.id,
                                                subname: activeOrg.subname,
                                                walletAddress:
                                                    authenticatedWalletAddress as `0x${string}`,
                                            },
                                            {
                                                onError: (err) => {
                                                    const msg = err.message;
                                                    if (
                                                        !msg.includes("already") &&
                                                        !msg.includes("revert")
                                                    ) {
                                                        setConveneError(msg);
                                                    }
                                                },
                                            },
                                        );
                                        return;
                                    }

                                    await handleStartHuddle();
                                }}
                                className="group flex w-full items-center justify-between gap-4
                                    rounded-[1.5rem]
                                    border border-slate-200 dark:border-white/[0.08]
                                    bg-white dark:bg-white/[0.03]
                                    p-5
                                    transition-all duration-500
                                    hover:border-slate-300 dark:hover:border-white/[0.14]
                                    hover:bg-slate-50 dark:hover:bg-white/[0.05]
                                    active:scale-[0.99]
                                    disabled:opacity-60 disabled:pointer-events-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="flex h-11 w-11 items-center justify-center rounded-2xl
                                            border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.05]"
                                    >
                                        {isConvening || isDeploying ? (
                                            <Loader2
                                                size={18}
                                                className="text-[#3481FF] animate-spin"
                                                strokeWidth={1.75}
                                            />
                                        ) : (
                                            <Users
                                                size={18}
                                                className="text-slate-400"
                                                strokeWidth={1.75}
                                            />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                                            {isDeploying
                                                ? "Deploying huddle contracts..."
                                                : isConvening
                                                  ? "Starting huddle..."
                                                  : !tacticalMeetingAddress
                                                    ? "Set up huddles"
                                                    : "Start a new huddle"}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {!tacticalMeetingAddress
                                                ? "Deploy huddle contracts for this workspace"
                                                : "7-phase team sync"}
                                        </p>
                                    </div>
                                </div>
                                <motion.div
                                    className="flex h-8 w-8 items-center justify-center rounded-full
                                        border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.05] text-slate-400"
                                    whileHover={{ x: 3 }}
                                >
                                    <ArrowRight size={15} strokeWidth={2} />
                                </motion.div>
                            </button>
                            {conveneError && (
                                <div
                                    className="rounded-xl border border-rose-500/20 bg-rose-500/[0.08]
                                        px-4 py-2.5 text-[12px] text-rose-400"
                                >
                                    {conveneError}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Huddle phases reference */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.14, ease: EXPO }}
                    className="mb-8"
                >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        Sync phases
                    </p>
                    <div
                        className="grid grid-cols-1 gap-px rounded-[1.5rem] overflow-hidden
                            border border-slate-200 dark:border-white/[0.06] bg-slate-100 dark:bg-white/[0.04]"
                    >
                        {PHASES.map((phase, i) => (
                            <div
                                key={phase.label}
                                className="flex items-center gap-4 bg-white dark:bg-[#0a0a0f] px-5 py-3.5
                                    first:rounded-t-[calc(1.5rem-1px)]
                                    last:rounded-b-[calc(1.5rem-1px)]"
                            >
                                <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center
                                        rounded-full bg-slate-100 dark:bg-white/[0.05] text-[11px] font-semibold text-slate-500"
                                >
                                    {i + 1}
                                </span>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    {phase.label}
                                </span>
                                <span className="ml-auto text-xs text-slate-500 dark:text-slate-600">
                                    {phase.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Past huddles */}
                {completed.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.65, delay: 0.2, ease: EXPO }}
                    >
                        <div className="rounded-[1.5rem] border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-5">
                            <div className="mb-4 flex items-center gap-2">
                                <FileText size={14} className="text-slate-500" strokeWidth={1.75} />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Past huddles
                                </p>
                                <span className="ml-auto text-[11px] text-slate-700">
                                    {completed.length}
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {completed.slice(0, 5).map((m) => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            onClick={() => openMeeting(m.id)}
                                            className="group flex w-full items-center justify-between rounded-xl
                                                border border-slate-200 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02]
                                                px-3.5 py-2.5 text-left
                                                transition-colors hover:border-slate-300 dark:hover:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                                        >
                                            <div>
                                                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                                                    Huddle #{m.meetingId}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-600">
                                                    {new Date(
                                                        Number(m.createdAt) * 1000,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span
                                                className="rounded-full border border-emerald-400/20
                                                    bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
                                            >
                                                Completed
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
