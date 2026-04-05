import type { MeetingOutput, TacticalMeeting } from "@hollab-io/indexing-client";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { tacticalMeetingAbi } from "@hollab-io/contracts/actions";
import { AnimatePresence, motion } from "framer-motion";
import {
    Bot,
    Check,
    CheckSquare,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Loader2,
    Plus,
    Sparkles,
    Users,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";

import type { AppTabId } from "../config/navigation";
import { OutputType, useTacticalMeeting } from "../hooks/useTacticalMeeting";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

type MeetingPhaseId =
    | "Check-in"
    | "Checklist review"
    | "Metrics review"
    | "Progress updates"
    | "Build agenda"
    | "Triage items"
    | "Closing round";

const MEETING_PHASES: MeetingPhaseId[] = [
    "Check-in",
    "Checklist review",
    "Metrics review",
    "Progress updates",
    "Build agenda",
    "Triage items",
    "Closing round",
];

const PHASE_DESCRIPTIONS: Record<MeetingPhaseId, string> = {
    "Check-in": "Each participant shares a brief word or phrase about how they are arriving.",
    "Checklist review": "Review recurring actions -- any checklist items to report on?",
    "Metrics review": "Review assigned metrics -- anything to flag?",
    "Progress updates": "Share brief updates on projects -- what changed since the last huddle?",
    "Build agenda": "Facilitator collects agenda items as short labels from all participants.",
    "Triage items": "Process each agenda item one at a time -- what do you need?",
    "Closing round": "Each participant shares a brief reflection on the huddle.",
};

const OUTPUT_TYPE_LABELS: Record<number, string> = {
    [OutputType.NextAction]: "Next action",
    [OutputType.Project]: "Project",
    [OutputType.Request]: "Request",
    [OutputType.Information]: "Information",
};

const SPRING = { type: "spring" as const, stiffness: 320, damping: 30 };
const EXPO = { type: "spring" as const, stiffness: 200, damping: 28 };

const panelTransition = {
    type: "spring",
    stiffness: 210,
    damping: 26,
    mass: 0.88,
} as const;

/* ─── Pending-output type ───────────────────────────────────────────────────── */

type PendingOutput = {
    id: string;
    outputType: number;
    description: string;
    assignedTo: string;
};

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function TacticalMeetingRoom({
    indexedMeetings,
    allOutputs: allIndexedOutputs,
    fetchOutputs,
    refetchMeetings,
    tacticalMeetingAddress,
    onNavigateToTab,
}: {
    indexedMeetings: TacticalMeeting[];
    allOutputs: MeetingOutput[];
    fetchOutputs: (meetingId: string) => Promise<MeetingOutput[]>;
    refetchMeetings: () => Promise<void>;
    tacticalMeetingAddress?: `0x${string}`;
    onNavigateToTab: (tabId: AppTabId) => void;
}) {
    const { primaryWallet } = useDynamicContext();
    const { activeMeetingId, closeMeeting, authenticatedWalletAddress } = useWorkspaceSnapshot();
    const { recordOutput, completeMeeting: completeMeetingOnChain } = useTacticalMeeting();

    /* ── Derive active indexed meeting ────────────────────────────────────── */
    const activeMeeting = useMemo(
        () =>
            activeMeetingId
                ? (indexedMeetings.find((m) => m.id === activeMeetingId) ?? null)
                : null,
        [activeMeetingId, indexedMeetings],
    );

    /* ── Outputs from previous huddles (for Progress updates phase) ────── */
    const previousOutputs = useMemo(() => {
        if (!activeMeeting) return [];
        return allIndexedOutputs.filter(
            (o) => String(o.meetingId) !== String(activeMeeting.meetingId),
        );
    }, [allIndexedOutputs, activeMeeting]);

    /* ── Completed outputs (persisted locally) ─────────────────────────── */
    const COMPLETED_KEY = "hola-modern:completed-outputs";
    const [completedOutputIds, setCompletedOutputIds] = useState<Set<string>>(() => {
        try {
            const raw = window.localStorage.getItem(COMPLETED_KEY);
            return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
        } catch {
            return new Set();
        }
    });

    const toggleOutputDone = useCallback((outputId: string) => {
        setCompletedOutputIds((prev) => {
            const next = new Set(prev);
            if (next.has(outputId)) {
                next.delete(outputId);
            } else {
                next.add(outputId);
            }
            window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([...next]));
            return next;
        });
    }, []);

    /* ── Tabs ─────────────────────────────────────────────────────────────── */
    const [activeTab, setActiveTab] = useState<"meeting" | "history">("meeting");

    /* ── Phase stepper ────────────────────────────────────────────────────── */
    const [phaseIndex, setPhaseIndex] = useState(0);
    const activePhase = MEETING_PHASES[phaseIndex]!;

    // Reset phase when meeting changes
    useEffect(() => {
        setPhaseIndex(0);
        setPendingOutputs([]);
        setIndexedOutputs([]);
        setCompletedScreen(false);
        setActiveTab("meeting");
    }, [activeMeetingId]);

    /* ── Indexed outputs ──────────────────────────────────────────────────── */
    const [indexedOutputs, setIndexedOutputs] = useState<MeetingOutput[]>([]);

    useEffect(() => {
        if (!activeMeeting) return;
        let cancelled = false;
        fetchOutputs(activeMeeting.meetingId).then((outputs) => {
            if (!cancelled) setIndexedOutputs(outputs);
        });
        return () => {
            cancelled = true;
        };
    }, [activeMeeting, fetchOutputs]);

    /* ── Pending (local) outputs ──────────────────────────────────────────── */
    const [pendingOutputs, setPendingOutputs] = useState<PendingOutput[]>([]);

    /* ── Record-output modal ──────────────────────────────────────────────── */
    const [showRecordOutput, setShowRecordOutput] = useState(false);
    const [outputType, setOutputType] = useState<number>(OutputType.NextAction);
    const [outputDescription, setOutputDescription] = useState("");
    const [outputAssignedTo, setOutputAssignedTo] = useState("");

    const handleAddPendingOutput = useCallback(() => {
        if (!outputDescription.trim()) return;
        const po: PendingOutput = {
            id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            outputType,
            description: outputDescription.trim(),
            assignedTo: outputAssignedTo.trim() || (authenticatedWalletAddress ?? ""),
        };
        setPendingOutputs((prev) => [...prev, po]);
        setOutputDescription("");
        setOutputAssignedTo("");
        setOutputType(OutputType.NextAction);
        setShowRecordOutput(false);
    }, [outputType, outputDescription, outputAssignedTo, authenticatedWalletAddress]);

    const removePendingOutput = useCallback((id: string) => {
        setPendingOutputs((prev) => prev.filter((p) => p.id !== id));
    }, []);

    /* ── Completion state ─────────────────────────────────────────────────── */
    const [isTxPending, setIsTxPending] = useState(false);
    const [txError, setTxError] = useState<string | null>(null);
    const [completedScreen, setCompletedScreen] = useState(false);

    const handleCompleteMeeting = useCallback(async () => {
        if (!activeMeeting || !tacticalMeetingAddress || !authenticatedWalletAddress) return;
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) return;

        setIsTxPending(true);
        setTxError(null);

        try {
            const walletAddr = authenticatedWalletAddress as `0x${string}`;
            const meetingIdBigInt = BigInt(activeMeeting.meetingId);

            // Build calls array
            const calls: { to: `0x${string}`; data: `0x${string}` }[] = [];

            for (const po of pendingOutputs) {
                calls.push({
                    to: tacticalMeetingAddress,
                    data: encodeFunctionData({
                        abi: tacticalMeetingAbi,
                        functionName: "recordOutput",
                        args: [
                            meetingIdBigInt,
                            po.outputType,
                            po.description,
                            (po.assignedTo || walletAddr) as `0x${string}`,
                            BigInt(0),
                        ],
                    }),
                });
            }

            calls.push({
                to: tacticalMeetingAddress,
                data: encodeFunctionData({
                    abi: tacticalMeetingAbi,
                    functionName: "completeMeeting",
                    args: [meetingIdBigInt],
                }),
            });

            // Try EIP-5792 batch first
            const walletClient = await primaryWallet.getWalletClient();
            let batched = false;
            try {
                await (walletClient as any).request({
                    method: "wallet_sendCalls",
                    params: [
                        {
                            version: "1",
                            from: walletAddr,
                            calls: calls.map((c) => ({ to: c.to, data: c.data })),
                        },
                    ],
                });
                batched = true;
            } catch {
                // wallet doesn't support wallet_sendCalls
            }

            if (!batched) {
                // Sequential fallback using the hook
                for (const po of pendingOutputs) {
                    await recordOutput({
                        tacticalMeetingAddress,
                        meetingId: meetingIdBigInt,
                        outputType: po.outputType as 0 | 1 | 2 | 3,
                        description: po.description,
                        assignedTo: (po.assignedTo || walletAddr) as `0x${string}`,
                        roleId: BigInt(0),
                        walletAddress: walletAddr,
                    });
                }
                await completeMeetingOnChain({
                    tacticalMeetingAddress,
                    meetingId: meetingIdBigInt,
                    walletAddress: walletAddr,
                });
            }

            // Give the indexer a moment to index the completion event
            await new Promise((r) => setTimeout(r, 3000));
            await refetchMeetings();
            setCompletedScreen(true);
        } catch (err) {
            setTxError(err instanceof Error ? err.message : "Failed to complete huddle on-chain");
        } finally {
            setIsTxPending(false);
        }
    }, [
        activeMeeting,
        authenticatedWalletAddress,
        completeMeetingOnChain,
        pendingOutputs,
        primaryWallet,
        recordOutput,
        refetchMeetings,
        tacticalMeetingAddress,
    ]);

    /* ── AI suggestions ───────────────────────────────────────────────────── */
    const aiSuggestions = useMemo(
        () => [
            {
                id: "agenda",
                label: "Draft agenda from open work",
                action: () => setPhaseIndex(MEETING_PHASES.indexOf("Build agenda")),
            },
            {
                id: "triage",
                label: "Convert tensions into outputs",
                action: () => setPhaseIndex(MEETING_PHASES.indexOf("Triage items")),
            },
            {
                id: "closing",
                label: "Prepare summary for publication",
                action: () => setPhaseIndex(MEETING_PHASES.indexOf("Closing round")),
            },
        ],
        [],
    );

    /* ── History lists ────────────────────────────────────────────────────── */
    const inProgressMeetings = useMemo(
        () => indexedMeetings.filter((m) => m.completedAt === null),
        [indexedMeetings],
    );
    const completedMeetings = useMemo(
        () => indexedMeetings.filter((m) => m.completedAt !== null),
        [indexedMeetings],
    );

    /* ── Helpers ──────────────────────────────────────────────────────────── */
    const formatTimestamp = (ts: string) => {
        const d = new Date(Number(ts) * 1000);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const truncateAddress = (addr: string) =>
        addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

    /* ── Render ───────────────────────────────────────────────────────────── */
    return (
        <AnimatePresence>
            {activeMeeting && (
                <motion.div
                    className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeMeeting}
                >
                    <motion.aside
                        className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-white/[0.06] bg-[#0a0a0f] text-slate-100 shadow-[0_0_80px_rgba(0,0,0,0.6)]"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={panelTransition}
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* ── Completed screen ─────────────────────────── */}
                        {completedScreen ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
                                <motion.div
                                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/50 bg-emerald-500/20"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={SPRING}
                                >
                                    <Check size={40} className="text-emerald-300" />
                                </motion.div>
                                <motion.h2
                                    className="text-2xl font-semibold text-white"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    Huddle completed
                                </motion.h2>
                                <motion.p
                                    className="text-center text-sm text-slate-400"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                >
                                    {pendingOutputs.length + indexedOutputs.length} output
                                    {pendingOutputs.length + indexedOutputs.length !== 1
                                        ? "s"
                                        : ""}{" "}
                                    recorded on-chain.
                                </motion.p>
                                <motion.button
                                    type="button"
                                    onClick={() => {
                                        void refetchMeetings();
                                        closeMeeting();
                                    }}
                                    className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-8 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.06]"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    Close
                                </motion.button>
                            </div>
                        ) : (
                            <>
                                {/* ── Header ───────────────────────────────── */}
                                <div className="border-b border-white/[0.06] px-6 py-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-[#3481FF]/30 bg-[#3481FF]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#6aabff]">
                                                    Tactical huddle
                                                </span>
                                                {activeMeeting.completedAt ? (
                                                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full border border-[#3481FF]/30 bg-[#3481FF]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#6aabff]">
                                                        In progress
                                                    </span>
                                                )}
                                            </div>
                                            <h2 className="mt-4 text-lg font-bold tracking-[-0.02em] text-white">
                                                Huddle #{activeMeeting.meetingId}
                                            </h2>
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                                                <span className="inline-flex items-center gap-2">
                                                    <Clock3 size={15} aria-hidden="true" />
                                                    {formatTimestamp(activeMeeting.createdAt)}
                                                </span>
                                                <span className="inline-flex items-center gap-2">
                                                    <Users size={15} aria-hidden="true" />
                                                    Convened by{" "}
                                                    {truncateAddress(activeMeeting.convenedBy)}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={closeMeeting}
                                            className="rounded-full border border-white/[0.06] p-2 text-slate-300 transition-colors hover:border-white/[0.08] hover:bg-white/[0.03]"
                                            aria-label="Close huddle room"
                                        >
                                            <X size={18} aria-hidden="true" />
                                        </button>
                                    </div>

                                    {/* Tabs — pill-style switcher */}
                                    <div className="mt-5 flex w-fit rounded-full border border-white/[0.06] bg-white/[0.03] p-[3px]">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("meeting")}
                                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                                activeTab === "meeting"
                                                    ? "bg-white/[0.08] text-white"
                                                    : "text-slate-400 hover:text-slate-200"
                                            }`}
                                        >
                                            Huddle
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab("history")}
                                            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                                                activeTab === "history"
                                                    ? "bg-white/[0.08] text-white"
                                                    : "text-slate-400 hover:text-slate-200"
                                            }`}
                                        >
                                            History
                                        </button>
                                    </div>
                                </div>

                                {/* ── Body ─────────────────────────────────── */}
                                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
                                    {activeTab === "meeting" ? (
                                        <div className="space-y-6">
                                            {/* Phase stepper */}
                                            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Huddle process
                                                        </div>
                                                        <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-white">
                                                            Tactical phases
                                                        </h3>
                                                    </div>
                                                    <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.03] px-3 py-1 text-sm text-slate-300">
                                                        <Clock3 size={14} aria-hidden="true" />
                                                        {activePhase}
                                                    </span>
                                                </div>

                                                {/* Horizontal dots with connecting lines */}
                                                <div className="mt-5 flex items-center">
                                                    {MEETING_PHASES.map((phase, index) => {
                                                        const isActive = index === phaseIndex;
                                                        const isComplete = index < phaseIndex;
                                                        return (
                                                            <div
                                                                key={phase}
                                                                className="flex items-center"
                                                                style={{
                                                                    flex:
                                                                        index <
                                                                        MEETING_PHASES.length - 1
                                                                            ? 1
                                                                            : 0,
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPhaseIndex(index)
                                                                    }
                                                                    className="group flex flex-col items-center gap-2"
                                                                    title={phase}
                                                                >
                                                                    <div
                                                                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-center text-sm leading-8 transition-colors ${
                                                                            isActive
                                                                                ? "border-[#3481FF] bg-[#3481FF] text-white shadow-[0_0_20px_rgba(52,129,255,0.4)]"
                                                                                : isComplete
                                                                                  ? "border-emerald-300 bg-emerald-300 text-slate-950"
                                                                                  : "border-white/[0.08] text-slate-400 group-hover:border-white/[0.15]"
                                                                        }`}
                                                                    >
                                                                        {isComplete ? (
                                                                            <Check size={14} />
                                                                        ) : (
                                                                            index + 1
                                                                        )}
                                                                    </div>
                                                                </button>
                                                                {index <
                                                                    MEETING_PHASES.length - 1 && (
                                                                    <div
                                                                        className={`mx-1 h-px flex-1 ${
                                                                            index < phaseIndex
                                                                                ? "bg-emerald-300/40"
                                                                                : "bg-white/[0.06]"
                                                                        }`}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Phase content */}
                                                <motion.div
                                                    key={activePhase}
                                                    className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={EXPO}
                                                >
                                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                        Phase {phaseIndex + 1}
                                                    </div>
                                                    <div className="mt-1 text-sm font-medium text-white">
                                                        {activePhase}
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                                        {PHASE_DESCRIPTIONS[activePhase]}
                                                    </p>

                                                    {/* Progress updates: show outputs from previous huddles */}
                                                    {activePhase === "Progress updates" && (
                                                        <div className="mt-4 space-y-2">
                                                            {previousOutputs.length > 0 ? (
                                                                <>
                                                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                                                        From previous huddles (
                                                                        {previousOutputs.length})
                                                                    </p>
                                                                    {previousOutputs.map((o) => {
                                                                        const isDone =
                                                                            completedOutputIds.has(
                                                                                o.id,
                                                                            );
                                                                        return (
                                                                            <button
                                                                                key={o.id}
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    !activeMeeting?.completedAt &&
                                                                                    toggleOutputDone(
                                                                                        o.id,
                                                                                    )
                                                                                }
                                                                                disabled={Boolean(
                                                                                    activeMeeting?.completedAt,
                                                                                )}
                                                                                className={`flex w-full items-start gap-3 rounded-xl
                                                                                    border px-3 py-2.5 text-left transition-colors
                                                                                    disabled:cursor-default
                                                                                    ${
                                                                                        isDone
                                                                                            ? "border-emerald-400/15 bg-emerald-500/[0.04]"
                                                                                            : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.1]"
                                                                                    }`}
                                                                            >
                                                                                {/* Checkbox */}
                                                                                <div
                                                                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center
                                                                                    rounded border transition-colors
                                                                                    ${
                                                                                        isDone
                                                                                            ? "border-emerald-400/40 bg-emerald-500/20"
                                                                                            : "border-white/[0.15] bg-white/[0.04]"
                                                                                    }`}
                                                                                >
                                                                                    {isDone && (
                                                                                        <Check
                                                                                            size={
                                                                                                11
                                                                                            }
                                                                                            className="text-emerald-400"
                                                                                            strokeWidth={
                                                                                                2.5
                                                                                            }
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span
                                                                                            className="shrink-0 rounded-full bg-[#3481FF]/15
                                                                                            px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#6aabff]"
                                                                                        >
                                                                                            {OUTPUT_TYPE_LABELS[
                                                                                                o
                                                                                                    .outputType
                                                                                            ] ??
                                                                                                "Output"}
                                                                                        </span>
                                                                                        {isDone && (
                                                                                            <span
                                                                                                className="rounded-full bg-emerald-500/15
                                                                                                px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400"
                                                                                            >
                                                                                                Done
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p
                                                                                        className={`mt-1 text-[12px] leading-relaxed
                                                                                        ${isDone ? "text-slate-500 line-through" : "text-slate-200"}`}
                                                                                    >
                                                                                        {
                                                                                            o.description
                                                                                        }
                                                                                    </p>
                                                                                    <p className="mt-0.5 font-mono text-[10px] text-slate-600">
                                                                                        {o.assignedTo.slice(
                                                                                            0,
                                                                                            6,
                                                                                        )}
                                                                                        ...
                                                                                        {o.assignedTo.slice(
                                                                                            -4,
                                                                                        )}
                                                                                    </p>
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </>
                                                            ) : (
                                                                <div
                                                                    className="rounded-xl border border-dashed border-white/[0.06]
                                                                    bg-white/[0.02] px-4 py-5 text-center text-[12px] text-slate-600"
                                                                >
                                                                    No projects or actions from
                                                                    previous huddles to review.
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Triage: inline output creation + list */}
                                                    {activePhase === "Triage items" &&
                                                        !activeMeeting?.completedAt && (
                                                            <div className="mt-4 space-y-3">
                                                                {/* Quick-add buttons */}
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {(
                                                                        [
                                                                            {
                                                                                type: OutputType.NextAction,
                                                                                label: "Action",
                                                                                icon: "arrow",
                                                                            },
                                                                            {
                                                                                type: OutputType.Project,
                                                                                label: "Project",
                                                                                icon: "kanban",
                                                                            },
                                                                            {
                                                                                type: OutputType.Information,
                                                                                label: "Share info",
                                                                                icon: "info",
                                                                            },
                                                                            {
                                                                                type: OutputType.Request,
                                                                                label: "Request info",
                                                                                icon: "question",
                                                                            },
                                                                        ] as const
                                                                    ).map((item) => (
                                                                        <button
                                                                            key={item.type}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setOutputType(
                                                                                    item.type,
                                                                                );
                                                                                setShowRecordOutput(
                                                                                    true,
                                                                                );
                                                                            }}
                                                                            className="flex items-center gap-2 rounded-xl
                                                                            border border-white/[0.06] bg-white/[0.03]
                                                                            px-3 py-2.5 text-[12px] font-medium text-slate-300
                                                                            transition-all hover:border-[#3481FF]/25 hover:bg-[#3481FF]/[0.06] hover:text-white
                                                                            active:scale-[0.98]"
                                                                        >
                                                                            <Plus
                                                                                size={13}
                                                                                strokeWidth={2}
                                                                                className="text-[#3481FF]"
                                                                            />
                                                                            {item.label}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {/* Pending outputs inline */}
                                                                {pendingOutputs.length > 0 && (
                                                                    <div className="space-y-2 pt-1">
                                                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                                                            Queued (
                                                                            {pendingOutputs.length})
                                                                        </p>
                                                                        {pendingOutputs.map(
                                                                            (po) => (
                                                                                <div
                                                                                    key={po.id}
                                                                                    className="flex items-start gap-2 rounded-xl
                                                                                border border-amber-400/15 bg-amber-500/[0.04] px-3 py-2"
                                                                                >
                                                                                    <span
                                                                                        className="mt-0.5 shrink-0 rounded-full bg-amber-500/15
                                                                                px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400"
                                                                                    >
                                                                                        {OUTPUT_TYPE_LABELS[
                                                                                            po
                                                                                                .outputType
                                                                                        ] ??
                                                                                            "Output"}
                                                                                    </span>
                                                                                    <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-slate-300">
                                                                                        {
                                                                                            po.description
                                                                                        }
                                                                                    </span>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            removePendingOutput(
                                                                                                po.id,
                                                                                            )
                                                                                        }
                                                                                        className="shrink-0 rounded-full p-0.5 text-slate-600
                                                                                    transition-colors hover:text-red-400"
                                                                                    >
                                                                                        <X
                                                                                            size={
                                                                                                12
                                                                                            }
                                                                                        />
                                                                                    </button>
                                                                                </div>
                                                                            ),
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* On-chain outputs inline */}
                                                                {indexedOutputs.length > 0 && (
                                                                    <div className="space-y-2 pt-1">
                                                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                                                            On-chain (
                                                                            {indexedOutputs.length})
                                                                        </p>
                                                                        {indexedOutputs.map((o) => (
                                                                            <div
                                                                                key={o.id}
                                                                                className="flex items-start gap-2 rounded-xl
                                                                                border border-emerald-400/10 bg-emerald-500/[0.03] px-3 py-2"
                                                                            >
                                                                                <span
                                                                                    className="mt-0.5 shrink-0 rounded-full bg-emerald-500/15
                                                                                px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-400"
                                                                                >
                                                                                    {OUTPUT_TYPE_LABELS[
                                                                                        o.outputType
                                                                                    ] ?? "Output"}
                                                                                </span>
                                                                                <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-slate-300">
                                                                                    {o.description}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                </motion.div>

                                                {/* Back / Next */}
                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <button
                                                        type="button"
                                                        disabled={phaseIndex === 0}
                                                        onClick={() =>
                                                            setPhaseIndex((i) => Math.max(0, i - 1))
                                                        }
                                                        className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-40"
                                                    >
                                                        <ChevronLeft size={15} />
                                                        Back
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            phaseIndex === MEETING_PHASES.length - 1
                                                        }
                                                        onClick={() =>
                                                            setPhaseIndex((i) =>
                                                                Math.min(
                                                                    MEETING_PHASES.length - 1,
                                                                    i + 1,
                                                                ),
                                                            )
                                                        }
                                                        className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-40"
                                                    >
                                                        Next
                                                        <ChevronRight size={15} />
                                                    </button>
                                                </div>

                                                {/* Complete button */}
                                                {activePhase === "Closing round" &&
                                                    !activeMeeting?.completedAt && (
                                                        <button
                                                            type="button"
                                                            disabled={isTxPending}
                                                            onClick={handleCompleteMeeting}
                                                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl
                                                            border border-emerald-400/40 bg-emerald-500/15
                                                            px-4 py-3 text-sm font-semibold text-emerald-100
                                                            transition-colors hover:bg-emerald-500/25
                                                            disabled:pointer-events-none disabled:opacity-60"
                                                        >
                                                            {isTxPending ? (
                                                                <Loader2
                                                                    size={15}
                                                                    className="animate-spin"
                                                                />
                                                            ) : (
                                                                <CheckSquare size={15} />
                                                            )}
                                                            {isTxPending
                                                                ? "Completing huddle..."
                                                                : pendingOutputs.length > 0
                                                                  ? `Complete huddle (${pendingOutputs.length} output${pendingOutputs.length !== 1 ? "s" : ""})`
                                                                  : "Complete huddle"}
                                                        </button>
                                                    )}

                                                {txError && (
                                                    <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-[12px] text-rose-400">
                                                        {txError}
                                                    </div>
                                                )}
                                            </section>

                                            {/* Outputs section */}
                                            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div>
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Outputs
                                                        </div>
                                                        <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-white">
                                                            Actions and projects from this huddle
                                                        </h3>
                                                    </div>
                                                    {!activeMeeting?.completedAt && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setShowRecordOutput(true)
                                                            }
                                                            className="flex items-center gap-1.5 rounded-xl border border-[#3481FF]/30 bg-[#3481FF]/10 px-3 py-2 text-xs font-semibold text-[#6aabff] transition-colors hover:bg-[#3481FF]/20"
                                                        >
                                                            <Plus size={14} />
                                                            Record output
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="mt-5 space-y-3">
                                                    {/* Indexed (on-chain) outputs */}
                                                    {indexedOutputs.map((output) => (
                                                        <div
                                                            key={output.id}
                                                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="rounded-full bg-[#3481FF]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6aabff]">
                                                                    {OUTPUT_TYPE_LABELS[
                                                                        output.outputType
                                                                    ] ?? "Output"}
                                                                </span>
                                                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                                                                    On-chain
                                                                </span>
                                                            </div>
                                                            <div className="mt-3 text-sm leading-6 text-slate-200">
                                                                {output.description}
                                                            </div>
                                                            {output.assignedTo && (
                                                                <div className="mt-2 text-xs text-slate-400">
                                                                    Assigned to{" "}
                                                                    {truncateAddress(
                                                                        output.assignedTo,
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* Pending (local) outputs */}
                                                    {pendingOutputs.map((po) => (
                                                        <div
                                                            key={po.id}
                                                            className="rounded-2xl border border-amber-500/20 bg-white/[0.02] px-4 py-4"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="rounded-full bg-[#3481FF]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6aabff]">
                                                                        {OUTPUT_TYPE_LABELS[
                                                                            po.outputType
                                                                        ] ?? "Output"}
                                                                    </span>
                                                                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
                                                                        Pending
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removePendingOutput(po.id)
                                                                    }
                                                                    className="rounded-full p-1 text-slate-500 transition-colors hover:bg-white/[0.03] hover:text-slate-300"
                                                                    aria-label="Remove pending output"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="mt-3 text-sm leading-6 text-slate-200">
                                                                {po.description}
                                                            </div>
                                                            {po.assignedTo && (
                                                                <div className="mt-2 text-xs text-slate-400">
                                                                    Assigned to{" "}
                                                                    {truncateAddress(po.assignedTo)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {indexedOutputs.length === 0 &&
                                                        pendingOutputs.length === 0 && (
                                                            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-4 text-sm text-slate-400">
                                                                No outputs have been captured yet
                                                                for this huddle.
                                                            </div>
                                                        )}
                                                </div>
                                            </section>

                                            {/* AI Copilot — now below outputs in single column */}
                                            <section className="rounded-2xl border border-[#3481FF]/20 bg-[linear-gradient(180deg,rgba(52,129,255,0.08),rgba(10,10,15,0.96))] p-5">
                                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6aabff]">
                                                    <Bot size={15} aria-hidden="true" />
                                                    AI copilot
                                                </div>
                                                <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-white">
                                                    Facilitation suggestions
                                                </h3>
                                                <p className="mt-3 text-sm leading-6 text-slate-400">
                                                    Use the agent to turn live discussion into
                                                    agenda, outputs, and a publication-ready
                                                    summary.
                                                </p>

                                                <div className="mt-5 space-y-2">
                                                    {aiSuggestions.map((suggestion) => (
                                                        <button
                                                            key={suggestion.id}
                                                            type="button"
                                                            onClick={suggestion.action}
                                                            className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-left text-sm text-white transition-colors hover:border-white/[0.08] hover:bg-white/[0.06]"
                                                        >
                                                            <span>{suggestion.label}</span>
                                                            <ChevronRight
                                                                size={16}
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </section>

                                            {/* Meeting info — now below AI copilot in single column */}
                                            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <Sparkles size={15} aria-hidden="true" />
                                                    Huddle info
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Contract
                                                        </div>
                                                        <div className="mt-1 truncate text-sm text-slate-200">
                                                            {truncateAddress(
                                                                activeMeeting.contractAddress,
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Tx hash
                                                        </div>
                                                        <div className="mt-1 truncate text-sm text-slate-200">
                                                            {truncateAddress(activeMeeting.txHash)}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                            Pending outputs
                                                        </div>
                                                        <div className="mt-1 text-sm text-slate-200">
                                                            {pendingOutputs.length}
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    ) : (
                                        /* ── History tab ────────────────────── */
                                        <div className="space-y-6">
                                            {/* In-progress huddles */}
                                            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    In progress
                                                </div>
                                                <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-white">
                                                    Active huddles
                                                </h3>
                                                <div className="mt-5 space-y-3">
                                                    {inProgressMeetings.length > 0 ? (
                                                        inProgressMeetings.map((m) => (
                                                            <div
                                                                key={m.id}
                                                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-white">
                                                                        Huddle #{m.meetingId}
                                                                    </span>
                                                                    <span className="rounded-full border border-[#3481FF]/30 bg-[#3481FF]/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#6aabff]">
                                                                        In progress
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2 text-xs text-slate-400">
                                                                    Created{" "}
                                                                    {formatTimestamp(m.createdAt)}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-4 text-sm text-slate-400">
                                                            No huddles in progress.
                                                        </div>
                                                    )}
                                                </div>
                                            </section>

                                            {/* Completed huddles */}
                                            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    Completed
                                                </div>
                                                <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-white">
                                                    Past huddles
                                                </h3>
                                                <div className="mt-5 space-y-3">
                                                    {completedMeetings.length > 0 ? (
                                                        completedMeetings.map((m) => (
                                                            <div
                                                                key={m.id}
                                                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-white">
                                                                        Huddle #{m.meetingId}
                                                                    </span>
                                                                    <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-200">
                                                                        Completed
                                                                    </span>
                                                                </div>
                                                                <div className="mt-2 text-xs text-slate-400">
                                                                    Completed{" "}
                                                                    {m.completedAt
                                                                        ? formatTimestamp(
                                                                              m.completedAt,
                                                                          )
                                                                        : ""}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-4 text-sm text-slate-400">
                                                            No completed huddles yet.
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* ── Record Output Modal ──────────────────────── */}
                        <AnimatePresence>
                            {showRecordOutput && (
                                <motion.div
                                    className="absolute inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowRecordOutput(false)}
                                >
                                    <motion.div
                                        className="w-full max-w-md rounded-[1.75rem] border border-white/[0.08] bg-[#0a0a0f] p-6 text-slate-100 shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.95, opacity: 0 }}
                                        transition={panelTransition}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold tracking-[-0.02em] text-white">
                                                Record Output
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setShowRecordOutput(false)}
                                                className="rounded-full border border-white/[0.06] p-2 text-slate-300 transition-colors hover:border-white/[0.08] hover:bg-white/[0.03]"
                                                aria-label="Close"
                                            >
                                                <X size={18} aria-hidden="true" />
                                            </button>
                                        </div>

                                        <div className="mt-6 space-y-4">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Output type
                                                </label>
                                                <select
                                                    value={outputType}
                                                    onChange={(e) =>
                                                        setOutputType(Number(e.target.value))
                                                    }
                                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white focus:border-[#3481FF]/50 focus:outline-none focus:ring-2 focus:ring-[#3481FF]/20"
                                                >
                                                    {Object.entries(OUTPUT_TYPE_LABELS).map(
                                                        ([value, label]) => (
                                                            <option key={value} value={value}>
                                                                {label}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Description
                                                </label>
                                                <input
                                                    type="text"
                                                    value={outputDescription}
                                                    onChange={(e) =>
                                                        setOutputDescription(e.target.value)
                                                    }
                                                    placeholder="Describe the output..."
                                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#3481FF]/50 focus:outline-none focus:ring-2 focus:ring-[#3481FF]/20"
                                                    autoFocus
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Assigned to (address)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={outputAssignedTo}
                                                    onChange={(e) =>
                                                        setOutputAssignedTo(e.target.value)
                                                    }
                                                    placeholder={
                                                        authenticatedWalletAddress ?? "0x..."
                                                    }
                                                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-[#3481FF]/50 focus:outline-none focus:ring-2 focus:ring-[#3481FF]/20"
                                                />
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRecordOutput(false)}
                                                    className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAddPendingOutput}
                                                    disabled={!outputDescription.trim()}
                                                    className="flex-1 rounded-xl border border-[#3481FF]/50 bg-[#3481FF]/20 px-4 py-3 text-sm font-medium text-[#6aabff] transition-colors hover:bg-[#3481FF]/30 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Record output
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
