import { motion } from "framer-motion";
import { ArrowRight, CheckSquare, Clock3, FileText, ListChecks, TrendingUp, Users } from "lucide-react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { type: "spring", stiffness: 340, damping: 28 } as const;

const PHASES = [
    { label: "Check-in", desc: "Each partner shares current state" },
    { label: "Checklist", desc: "Verify recurring actions" },
    { label: "Metrics", desc: "Share reported metrics" },
    { label: "Progress", desc: "Highlight project updates" },
    { label: "Build agenda", desc: "Collect items to process" },
    { label: "Triage", desc: "Process agenda items" },
    { label: "Closing", desc: "Closing reflections" },
] as const;

export default function TacticalView() {
    const { snapshot, openMeeting, circleMap } = useWorkspaceSnapshot();
    const meetings = snapshot.meetings.filter((m) => m.meetingType === "tactical");
    const upcoming = meetings.filter((m) => m.status === "scheduled").slice(0, 3);
    const recent = meetings.filter((m) => m.status === "completed").slice(0, 2);

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
                        Tactical
                    </p>
                    <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-white">
                        Operational sync
                    </h1>
                    <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-400">
                        A structured ceremony to process tensions, capture next actions, and
                        advance projects — in seven phases.
                    </p>
                </motion.div>

                {/* Start CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.08, ease: EXPO }}
                    className="mb-8"
                >
                    {meetings.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => openMeeting(meetings[0].id)}
                            className="group flex w-full items-center justify-between gap-4
                                rounded-[1.5rem]
                                border border-[#3481FF]/25
                                bg-[linear-gradient(135deg,rgba(52,129,255,0.12),rgba(52,129,255,0.06))]
                                p-5
                                transition-all duration-500
                                hover:border-[#3481FF]/40
                                hover:shadow-[0_0_40px_rgba(52,129,255,0.12)]
                                active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl
                                    border border-[#3481FF]/30 bg-[#3481FF]/15">
                                    <Users size={18} className="text-[#3481FF]" strokeWidth={1.75} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[15px] font-semibold text-white">Start a huddle</p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        {circleMap[meetings[0].circleId]?.title ?? "Circle"} · 7 phases
                                    </p>
                                </div>
                            </div>
                            <motion.div
                                className="flex h-8 w-8 items-center justify-center rounded-full
                                    border border-[#3481FF]/30 bg-[#3481FF]/10 text-[#3481FF]"
                                whileHover={{ x: 3 }}
                                transition={SPRING}
                            >
                                <ArrowRight size={15} strokeWidth={2} />
                            </motion.div>
                        </button>
                    ) : (
                        <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5">
                            <p className="text-sm text-slate-500">No tactical meetings scheduled yet.</p>
                        </div>
                    )}
                </motion.div>

                {/* Meeting phases reference */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.14, ease: EXPO }}
                    className="mb-8"
                >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        Meeting phases
                    </p>
                    <div className="grid grid-cols-1 gap-px rounded-[1.5rem] overflow-hidden
                        border border-white/[0.06] bg-white/[0.04]">
                        {PHASES.map((phase, i) => (
                            <div
                                key={phase.label}
                                className="flex items-center gap-4 bg-[#0a0a0f] px-5 py-3.5
                                    first:rounded-t-[calc(1.5rem-1px)]
                                    last:rounded-b-[calc(1.5rem-1px)]"
                            >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center
                                    rounded-full bg-white/[0.05] text-[11px] font-semibold text-slate-500">
                                    {i + 1}
                                </span>
                                <span className="text-sm font-medium text-slate-200">{phase.label}</span>
                                <span className="ml-auto text-xs text-slate-600">{phase.desc}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Upcoming + Recent split */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.2, ease: EXPO }}
                    className="grid gap-4 sm:grid-cols-2"
                >
                    {/* Upcoming */}
                    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Clock3 size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Upcoming
                            </p>
                        </div>
                        {upcoming.length > 0 ? (
                            <ul className="space-y-2">
                                {upcoming.map((m) => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            onClick={() => openMeeting(m.id)}
                                            className="group flex w-full items-center justify-between rounded-xl
                                                border border-white/[0.05] bg-white/[0.02]
                                                px-3.5 py-2.5 text-left
                                                transition-colors hover:border-white/[0.1] hover:bg-white/[0.05]"
                                        >
                                            <div>
                                                <p className="text-[13px] font-medium text-slate-200">{m.title}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-600">
                                                    {circleMap[m.circleId]?.title ?? "Circle"}
                                                </p>
                                            </div>
                                            <ArrowRight size={13} className="text-slate-600 transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-slate-600">No scheduled huddles.</p>
                        )}
                    </div>

                    {/* Recent */}
                    <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <FileText size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Recent
                            </p>
                        </div>
                        {recent.length > 0 ? (
                            <ul className="space-y-2">
                                {recent.map((m) => (
                                    <li key={m.id}>
                                        <button
                                            type="button"
                                            onClick={() => openMeeting(m.id)}
                                            className="group flex w-full items-center justify-between rounded-xl
                                                border border-white/[0.05] bg-white/[0.02]
                                                px-3.5 py-2.5 text-left
                                                transition-colors hover:border-white/[0.1] hover:bg-white/[0.05]"
                                        >
                                            <div>
                                                <p className="text-[13px] font-medium text-slate-200">{m.title}</p>
                                                <p className="mt-0.5 text-[11px] text-slate-600">
                                                    {circleMap[m.circleId]?.title ?? "Circle"}
                                                </p>
                                            </div>
                                            <span className="rounded-full border border-emerald-400/20
                                                bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                                Done
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-slate-600">No completed huddles yet.</p>
                        )}
                    </div>
                </motion.div>

                {/* Stat strip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="mt-6 grid grid-cols-3 gap-px rounded-[1.25rem] overflow-hidden
                        border border-white/[0.05]"
                >
                    {[
                        { icon: ListChecks, label: "Total huddles", value: meetings.length },
                        { icon: CheckSquare, label: "Actions captured", value: snapshot.actions.length },
                        { icon: TrendingUp, label: "Projects active", value: snapshot.projects.filter(p => p.stage !== "done").length },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex flex-col items-center justify-center
                            gap-1 bg-[#0a0a0f] px-4 py-4">
                            <Icon size={14} className="text-slate-600" strokeWidth={1.75} />
                            <p className="font-mono text-xl font-semibold tracking-tight text-white">{value}</p>
                            <p className="text-center text-[10px] uppercase tracking-wider text-slate-600">{label}</p>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
