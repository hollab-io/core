import { motion } from "framer-motion";
import { CheckSquare, KanbanSquare, Target, TrendingUp } from "lucide-react";

import type { MeetingOutput, TacticalMeeting } from "../hooks/useTacticalMeetingsFromIndexer";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

function truncateAddress(addr: string): string {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type Props = {
    outputs: MeetingOutput[];
    meetings: TacticalMeeting[];
};

export default function ActionItemsView({ outputs, meetings }: Props) {
    const nextActions = outputs.filter((o) => o.outputType === 0);
    const projects = outputs.filter((o) => o.outputType === 1);

    const meetingMap = new Map(meetings.map((m) => [m.meetingId, m]));

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
                        Actions
                    </p>
                    <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-slate-900 dark:text-white">
                        Operational work
                    </h1>
                    <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-400">
                        Next actions, projects, OKRs, and metrics — the concrete output of every
                        tactical huddle.
                    </p>
                </motion.div>

                {/* 2 × 2 grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Next actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.06, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <CheckSquare size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Next actions
                            </p>
                            {nextActions.length > 0 && (
                                <span className="ml-auto font-mono text-[11px] text-slate-500">
                                    {nextActions.length}
                                </span>
                            )}
                        </div>
                        {nextActions.length > 0 ? (
                            <ul className="space-y-1.5">
                                {nextActions.slice(0, 8).map((output) => (
                                    <li
                                        key={output.id}
                                        className="flex items-start gap-2.5 rounded-xl
                                            border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5"
                                    >
                                        <div
                                            className="mt-[3px] h-3 w-3 shrink-0 rounded-full
                                            border border-slate-600 bg-transparent"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] leading-snug text-slate-300">
                                                {output.description}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {output.assignedTo !==
                                                    "0x0000000000000000000000000000000000000000" && (
                                                    <span className="text-[10px] text-slate-500">
                                                        {truncateAddress(output.assignedTo)}
                                                    </span>
                                                )}
                                                {meetingMap.has(output.meetingId) && (
                                                    <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                                        Meeting #{output.meetingId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={CheckSquare}
                                text="No open actions. Start a tactical huddle to capture next steps."
                            />
                        )}
                    </motion.div>

                    {/* Projects */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <KanbanSquare size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Projects
                            </p>
                            {projects.length > 0 && (
                                <span className="ml-auto font-mono text-[11px] text-slate-500">
                                    {projects.length}
                                </span>
                            )}
                        </div>
                        {projects.length > 0 ? (
                            <ul className="space-y-1.5">
                                {projects.slice(0, 6).map((output) => (
                                    <li
                                        key={output.id}
                                        className="flex items-center gap-2.5 rounded-xl
                                            border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5"
                                    >
                                        <div className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] leading-snug text-slate-300 truncate">
                                                {output.description}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {output.assignedTo !==
                                                    "0x0000000000000000000000000000000000000000" && (
                                                    <span className="text-[10px] text-slate-500">
                                                        {truncateAddress(output.assignedTo)}
                                                    </span>
                                                )}
                                                {meetingMap.has(output.meetingId) && (
                                                    <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                                        Meeting #{output.meetingId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={KanbanSquare}
                                text="No active projects. Create one from a tactical huddle."
                            />
                        )}
                    </motion.div>

                    {/* OKRs */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.14, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <Target size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                OKRs
                            </p>
                        </div>
                        <EmptyState
                            icon={Target}
                            text="OKR tracking is coming. Define objectives and link key results to roles."
                        />
                    </motion.div>

                    {/* Metrics */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.18, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Metrics
                            </p>
                        </div>
                        <EmptyState
                            icon={TrendingUp}
                            text="Metrics reporting is coming. Track role-based indicators across circles."
                        />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function EmptyState({
    icon: Icon,
    text,
}: {
    icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
    text: string;
}) {
    return (
        <div
            className="flex flex-col items-center gap-3 rounded-2xl
            border border-dashed border-white/[0.06] bg-white/[0.015]
            px-4 py-8 text-center"
        >
            <Icon size={20} className="text-slate-700" strokeWidth={1.5} />
            <p className="max-w-[24ch] text-xs leading-relaxed text-slate-600">{text}</p>
        </div>
    );
}
