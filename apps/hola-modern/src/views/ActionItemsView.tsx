import { motion } from "framer-motion";
import { CheckSquare, KanbanSquare, Target, TrendingUp } from "lucide-react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STATUS_COLORS: Record<string, string> = {
    done: "text-emerald-400",
    current: "text-blue-400",
    top: "text-violet-400",
    waiting: "text-amber-400",
    future: "text-slate-500",
};

export default function ActionItemsView() {
    const { snapshot } = useWorkspaceSnapshot();

    const openActions = snapshot.actions.filter((a) => !a.completed).slice(0, 8);
    const projects = snapshot.projects.filter((p) => p.stage !== "done").slice(0, 6);

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
                    <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-white">
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
                            {openActions.length > 0 && (
                                <span className="ml-auto font-mono text-[11px] text-slate-500">
                                    {openActions.length}
                                </span>
                            )}
                        </div>
                        {openActions.length > 0 ? (
                            <ul className="space-y-1.5">
                                {openActions.map((action) => (
                                    <li
                                        key={action.id}
                                        className="flex items-start gap-2.5 rounded-xl
                                            border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5"
                                    >
                                        <div
                                            className="mt-[3px] h-3 w-3 shrink-0 rounded-full
                                            border border-slate-600 bg-transparent"
                                        />
                                        <p className="text-[13px] leading-snug text-slate-300">
                                            {action.title}
                                        </p>
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
                                {projects.map((project) => (
                                    <li
                                        key={project.id}
                                        className="flex items-center gap-2.5 rounded-xl
                                            border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5"
                                    >
                                        <div
                                            className="h-2 w-2 shrink-0 rounded-full"
                                            style={{ backgroundColor: project.accentToken }}
                                        />
                                        <p className="text-[13px] leading-snug text-slate-300 truncate">
                                            {project.title}
                                        </p>
                                        <span
                                            className={`ml-auto shrink-0 text-[10px] font-semibold uppercase
                                            ${STATUS_COLORS[project.stage] ?? "text-slate-500"}`}
                                        >
                                            {project.stage}
                                        </span>
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
