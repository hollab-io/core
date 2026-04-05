import { motion } from "framer-motion";
import { ArrowRight, Clock3, Loader2, Scale, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { useGovernanceMeeting } from "../hooks/useGovernanceMeeting";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { type: "spring", stiffness: 340, damping: 28 } as const;

const IDM_STEPS = [
    {
        step: "a",
        label: "Present proposal",
        desc: "Proposer describes the Tension and shares a Proposal",
    },
    {
        step: "b",
        label: "Clarifying questions",
        desc: "Others ask questions to understand — no reactions",
    },
    {
        step: "c",
        label: "Reaction round",
        desc: "Each participant shares reactions, one at a time",
    },
    { step: "d", label: "Option to clarify", desc: "Proposer may amend the Proposal" },
    {
        step: "e",
        label: "Objection round",
        desc: "Each participant raises concerns; Facilitator captures Objections",
    },
    {
        step: "f",
        label: "Integration",
        desc: "Resolve each Objection until the Proposal is adopted",
    },
] as const;

type Props = {
    governanceMeetingAddress?: `0x${string}`;
    indexedGovernanceMeetings?: import("../hooks/useGovernanceMeetingsFromIndexer").GovernanceMeeting[];
    pollForNewGovernanceMeeting?: (
        prevCount: number,
    ) => Promise<import("../hooks/useGovernanceMeetingsFromIndexer").GovernanceMeeting[]>;
    refetchMeetingComponents?: () => Promise<void>;
};

export default function GovernanceView({
    governanceMeetingAddress,
    indexedGovernanceMeetings = [],
    pollForNewGovernanceMeeting,
    refetchMeetingComponents,
}: Props) {
    const { conveneGovernanceMeeting, authenticatedWalletAddress } =
        useWorkspaceSnapshot();
    const { conveneMeeting } = useGovernanceMeeting();
    const [isConvening, setIsConvening] = useState(false);
    const [conveneError, setConveneError] = useState<string | null>(null);

    // Only show on-chain meetings as resumable if they were convened
    // recently (within the last hour) and not yet completed.
    // Older uncompleted meetings are stale — likely abandoned.
    const ONE_HOUR_SECS = 3600;
    const nowSecs = Math.floor(Date.now() / 1000);
    const indexedInProgress = indexedGovernanceMeetings.filter(
        (m) => !m.completedAt && nowSecs - Number(m.createdAt) < ONE_HOUR_SECS,
    );

    const handleConveneNewMeeting = async () => {
        if (!authenticatedWalletAddress) return;

        setIsConvening(true);
        setConveneError(null);

        // If the governance address isn't available yet, try refetching
        // the meeting components — the contract may already be deployed.
        let address = governanceMeetingAddress;
        if (!address && refetchMeetingComponents) {
            try {
                await refetchMeetingComponents();
            } catch {
                // indexer unavailable
            }
            // Address will be available on next render; bail for now
            // and let the user click again.
            setIsConvening(false);
            if (!governanceMeetingAddress) {
                setConveneError(
                    "Governance contracts not deployed yet. Set up huddles on the Tactical tab first.",
                );
            }
            return;
        }

        if (!address) {
            setConveneError(
                "Governance contracts not deployed yet. Set up huddles on the Tactical tab first.",
            );
            setIsConvening(false);
            return;
        }

        // Use the org's anchor circle (circleId 1) by default
        const circleId = 1n;

        try {
            await conveneMeeting({
                governanceMeetingAddress: address,
                circleId,
                walletAddress: authenticatedWalletAddress as `0x${string}`,
            });

            // Poll indexer for the new meeting
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
        // Create a local record and open the drawer
        conveneGovernanceMeeting({
            meetingId: m.id,
            circleId: m.circleId,
            convenedBy: m.convenedBy,
            onChainMeetingId: m.meetingId,
        });
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
                        Governance
                    </p>
                    <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-white">
                        Integrative decisions
                    </h1>
                    <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-slate-400">
                        Change Roles, Policies, and structure through consent-based decision-making.
                        Proposals require a Tension, an example, and an explanation.
                    </p>
                </motion.div>

                {/* Governance meeting CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.08, ease: EXPO }}
                    className="mb-8"
                >
                    <div className="flex flex-col gap-2">
                        {/* Resume indexed in-progress meeting */}
                        {indexedInProgress.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => handleResumeIndexedMeeting(m)}
                                className="group flex w-full items-center justify-between gap-4
                                    rounded-[1.5rem]
                                    border border-[#3481FF]/20
                                    bg-[linear-gradient(135deg,rgba(52,129,255,0.1),rgba(52,129,255,0.05))]
                                    p-5
                                    transition-all duration-500
                                    hover:border-[#3481FF]/35
                                    hover:shadow-[0_0_40px_rgba(52,129,255,0.1)]
                                    active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#3481FF]/25 bg-[#3481FF]/12">
                                        <Scale
                                            size={18}
                                            className="text-[#6aabff]"
                                            strokeWidth={1.75}
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[15px] font-semibold text-white">
                                            Resume governance meeting
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Meeting #{m.meetingId} · In progress
                                        </p>
                                    </div>
                                </div>
                                <motion.div
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3481FF]/25 bg-[#3481FF]/10 text-[#6aabff]"
                                    whileHover={{ x: 3 }}
                                    transition={SPRING}
                                >
                                    <ArrowRight size={15} strokeWidth={2} />
                                </motion.div>
                            </button>
                        ))}

                        {/* Convene new meeting on-chain */}
                        {indexedInProgress.length === 0 && (
                            <button
                                type="button"
                                disabled={isConvening}
                                onClick={handleConveneNewMeeting}
                                className="group flex w-full items-center justify-between gap-4
                                    rounded-[1.5rem]
                                    border border-emerald-500/20
                                    bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(16,185,129,0.03))]
                                    p-5
                                    transition-all duration-500
                                    hover:border-emerald-500/35
                                    hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]
                                    active:scale-[0.99]
                                    disabled:opacity-60 disabled:pointer-events-none"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/12">
                                        {isConvening ? (
                                            <Loader2
                                                size={18}
                                                className="text-emerald-400 animate-spin"
                                                strokeWidth={1.75}
                                            />
                                        ) : (
                                            <Scale
                                                size={18}
                                                className="text-emerald-400"
                                                strokeWidth={1.75}
                                            />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[15px] font-semibold text-white">
                                            {isConvening
                                                ? "Convening meeting on-chain..."
                                                : "Convene governance meeting"}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Start a new on-chain governance session
                                        </p>
                                    </div>
                                </div>
                                <motion.div
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                                    whileHover={{ x: 3 }}
                                    transition={SPRING}
                                >
                                    <ArrowRight size={15} strokeWidth={2} />
                                </motion.div>
                            </button>
                        )}

                        {conveneError && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-[12px] text-rose-400">
                                {conveneError}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Two-column: active proposals + recent meetings */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.14, ease: EXPO }}
                    className="mb-8 grid gap-4 sm:grid-cols-[1.1fr_1fr]"
                >
                    {/* Stats */}
                    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Scale size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                On-chain governance
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-center">
                                <p className="text-[22px] font-bold tabular-nums text-white">
                                    {indexedGovernanceMeetings.length}
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    Meetings
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-center">
                                <p className="text-[22px] font-bold tabular-nums text-emerald-400">
                                    {indexedGovernanceMeetings.filter((m) => m.completedAt).length}
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    Completed
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-center">
                                <p className="text-[22px] font-bold tabular-nums text-[#6aabff]">
                                    {indexedInProgress.length}
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    In progress
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Recent indexed meetings */}
                    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Clock3 size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Meeting history
                            </p>
                        </div>
                        {indexedGovernanceMeetings.length > 0 ? (
                            <ul className="space-y-2">
                                {indexedGovernanceMeetings.slice(0, 5).map((m) => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleResumeIndexedMeeting(m)}
                                            className="group flex w-full items-center justify-between
                                                rounded-xl border border-white/[0.05] bg-white/[0.02]
                                                px-3.5 py-2.5 text-left
                                                transition-colors hover:border-white/[0.1] hover:bg-white/[0.05]"
                                        >
                                            <div>
                                                <p className="text-[13px] font-medium text-slate-200">
                                                    Meeting #{m.meetingId}
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-600">
                                                    Circle {m.circleId} ·{" "}
                                                    {m.completedAt ? "Completed" : "In progress"}
                                                </p>
                                            </div>
                                            <ArrowRight
                                                size={13}
                                                className="text-slate-600 transition-transform group-hover:translate-x-0.5"
                                            />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-slate-600">
                                No governance meetings recorded on-chain yet.
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* IDM process reference */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.22, ease: EXPO }}
                >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        Integrative decision-making
                    </p>
                    <div
                        className="grid grid-cols-1 gap-px rounded-[1.5rem] overflow-hidden
                        border border-white/[0.06] bg-white/[0.04]"
                    >
                        {IDM_STEPS.map((s) => (
                            <div
                                key={s.step}
                                className="flex items-center gap-4 bg-[#0a0a0f] px-5 py-3.5
                                    first:rounded-t-[calc(1.5rem-1px)]
                                    last:rounded-b-[calc(1.5rem-1px)]"
                            >
                                <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center
                                    rounded-full bg-white/[0.05] text-[11px] font-semibold uppercase text-slate-500"
                                >
                                    {s.step}
                                </span>
                                <span className="text-sm font-medium text-slate-200">
                                    {s.label}
                                </span>
                                <span className="ml-auto text-xs text-slate-600 text-right max-w-[22ch] hidden sm:block">
                                    {s.desc}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Proposal requirements note */}
                    <div
                        className="mt-4 flex items-start gap-3 rounded-2xl
                        border border-amber-400/15 bg-amber-500/[0.06] px-4 py-3.5"
                    >
                        <ShieldAlert
                            size={15}
                            className="mt-0.5 shrink-0 text-amber-400"
                            strokeWidth={1.75}
                        />
                        <p className="text-xs leading-relaxed text-slate-400">
                            A valid proposal requires: a{" "}
                            <span className="text-slate-300 font-medium">Tension</span> it would
                            address, an <span className="text-slate-300 font-medium">example</span>{" "}
                            of an actual past or present situation, and a{" "}
                            <span className="text-slate-300 font-medium">
                                reasonable explanation
                            </span>{" "}
                            of how it would reduce the Tension.
                        </p>
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
