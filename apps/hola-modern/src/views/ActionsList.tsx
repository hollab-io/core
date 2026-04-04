import { Calendar, MoreVertical } from "lucide-react";
import { useState } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

type ActionsFilter = "mine" | "completed" | "all";
type SortOption = "newest" | "assignee";

const dueDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });
const completedDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const SPRING = "cubic-bezier(0.32,0.72,0,1)";

export default function ActionsList() {
    const { snapshot, partnerMap, roleMap, circleMap, meetingMap, openMeeting, toggleActionCompletion } =
        useWorkspaceSnapshot();
    const [activeFilter, setActiveFilter] = useState<ActionsFilter>("all");
    const [sortBy, setSortBy] = useState<SortOption>("newest");

    const visibleActions = snapshot.actions
        .map((action) => {
            const assignee = action.assigneeId ? partnerMap[action.assigneeId] : null;
            const role = roleMap[action.roleId];
            const circle = circleMap[action.circleId];
            const sourceMeeting = action.sourceMeetingId ? meetingMap[action.sourceMeetingId] : null;
            return {
                id: action.id,
                text: action.title,
                completed: action.completed,
                context: role && circle ? `${role.title} · ${circle.title}` : (role?.title ?? circle?.title ?? ""),
                date: !action.completed && action.dueDate ? dueDateFormatter.format(new Date(action.dueDate)) : undefined,
                dateDesc: action.completed && action.completedAt
                    ? `Completed ${completedDateFormatter.format(new Date(action.completedAt))}`
                    : undefined,
                sourceMeetingId: sourceMeeting?.id ?? null,
                sourceMeetingTitle: sourceMeeting?.title ?? null,
                user: assignee?.name ?? null,
                avatarSeed: assignee?.avatarSeed ?? assignee?.name ?? null,
            };
        })
        .filter((action) => {
            if (activeFilter === "mine")
                return snapshot.actions.find((a) => a.id === action.id)?.assigneeId === snapshot.currentPartnerId;
            if (activeFilter === "completed") return action.completed;
            return true;
        })
        .sort((a, b) =>
            sortBy === "assignee"
                ? (a.user ?? "ZZZ").localeCompare(b.user ?? "ZZZ")
                : b.id.localeCompare(a.id),
        );

    const filterTabs: Array<{ id: ActionsFilter; label: string }> = [
        { id: "all", label: "All" },
        { id: "mine", label: "Mine" },
        { id: "completed", label: "Completed" },
    ];

    const completedCount = snapshot.actions.filter((a) => a.completed).length;
    const activeCount = snapshot.actions.length - completedCount;

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Filter pills */}
                <div className="flex items-center gap-px rounded-full
                    bg-slate-100/80 dark:bg-white/[0.05]
                    ring-1 ring-slate-200/80 dark:ring-white/[0.06] p-[3px]">
                    {filterTabs.map((tab) => {
                        const isActive = activeFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveFilter(tab.id)}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300
                                    ${isActive
                                        ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-white/[0.1]"
                                        : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Stats */}
                <span className="rounded-full border border-blue-200/70 dark:border-blue-500/20
                    bg-blue-50 dark:bg-blue-500/[0.08]
                    px-3 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    {activeCount} active
                </span>
                <span className="rounded-full border border-emerald-200/70 dark:border-emerald-500/20
                    bg-emerald-50 dark:bg-emerald-500/[0.08]
                    px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    {completedCount} done
                </span>

                {/* Sort */}
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[12px] text-slate-400 dark:text-slate-600">Sort</span>
                    <button
                        type="button"
                        onClick={() => setSortBy((s) => s === "newest" ? "assignee" : "newest")}
                        className="rounded-full border border-slate-200/70 dark:border-white/[0.07]
                            bg-white dark:bg-white/[0.04]
                            px-3 py-1.5 text-[12px] font-semibold
                            text-slate-700 dark:text-slate-300
                            transition-all duration-300 hover:border-[#3481FF]/40 hover:text-[#3481FF]"
                        style={{ transitionTimingFunction: SPRING }}
                    >
                        {sortBy === "newest" ? "Newest" : "Assignee"}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="custom-scrollbar flex-1 overflow-auto rounded-2xl
                border border-slate-200/70 dark:border-white/[0.07]
                bg-white dark:bg-[#0e0e12]">
                {visibleActions.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-600">
                        <div className="text-[13px] font-medium">No actions here</div>
                        <div className="text-[12px]">Try switching the filter above</div>
                    </div>
                ) : (
                    visibleActions.map((action, i) => (
                        <div
                            key={action.id}
                            className={`group flex items-start gap-4 px-5 py-4
                                transition-colors duration-200
                                hover:bg-slate-50/80 dark:hover:bg-white/[0.03]
                                ${i !== visibleActions.length - 1 ? "border-b border-slate-100 dark:border-white/[0.05]" : ""}
                            `}
                        >
                            {/* Checkbox */}
                            <button
                                type="button"
                                aria-label={`${action.completed ? "Mark incomplete" : "Mark complete"}: ${action.text}`}
                                aria-pressed={action.completed}
                                onClick={() => toggleActionCompletion(action.id)}
                                className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px]
                                    border-2 transition-all duration-300
                                    ${action.completed
                                        ? "border-[#3481FF] bg-[#3481FF]"
                                        : "border-slate-300 dark:border-white/[0.2] bg-transparent group-hover:border-[#3481FF]/60"
                                    }`}
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                {action.completed && (
                                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>

                            {/* Content */}
                            <div className="min-w-0 flex-1">
                                <p className={`text-[13px] font-medium leading-snug
                                    ${action.completed
                                        ? "text-slate-400 dark:text-slate-600 line-through"
                                        : "text-slate-800 dark:text-slate-200"
                                    }`}>
                                    {action.text}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    {action.context && (
                                        <span className="text-[11px] text-slate-400 dark:text-slate-600">
                                            {action.context}
                                        </span>
                                    )}
                                    {action.sourceMeetingTitle && action.sourceMeetingId && (
                                        <button
                                            type="button"
                                            onClick={() => { if (action.sourceMeetingId) openMeeting(action.sourceMeetingId); }}
                                            className="inline-flex items-center gap-1.5 rounded-full
                                                border border-blue-200/70 dark:border-blue-500/20
                                                bg-blue-50 dark:bg-blue-500/[0.08]
                                                px-2.5 py-0.5 text-[10px] font-semibold
                                                text-blue-700 dark:text-blue-400
                                                transition-colors hover:bg-blue-100 dark:hover:bg-blue-500/[0.14]"
                                        >
                                            From meeting · {action.sourceMeetingTitle}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="flex flex-shrink-0 items-center gap-3">
                                {action.date ? (
                                    <div className="flex items-center gap-1.5 rounded-lg
                                        bg-slate-100 dark:bg-white/[0.06]
                                        px-2.5 py-1 text-[11px] font-medium
                                        text-slate-600 dark:text-slate-400">
                                        <Calendar size={11} strokeWidth={2} aria-hidden="true" />
                                        {action.date}
                                    </div>
                                ) : action.dateDesc ? (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-600">{action.dateDesc}</span>
                                ) : null}

                                {action.user ? (
                                    <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full
                                        border border-slate-200 dark:border-white/[0.1]
                                        bg-slate-100 dark:bg-white/[0.06]">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${action.avatarSeed ?? action.user}`}
                                            alt={`Avatar for ${action.user}`}
                                            className="h-full w-full"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        aria-label={`Assign owner to: ${action.text}`}
                                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full
                                            border border-dashed border-slate-300 dark:border-white/[0.1]
                                            text-slate-400 dark:text-slate-600
                                            transition-all duration-300 hover:border-[#3481FF] hover:text-[#3481FF]"
                                    >
                                        <span className="text-[13px] leading-none">+</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    aria-label={`More options for: ${action.text}`}
                                    className="flex h-7 w-7 items-center justify-center rounded-full
                                        text-slate-300 dark:text-slate-700
                                        transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-600 dark:hover:text-slate-400"
                                >
                                    <MoreVertical size={14} strokeWidth={1.75} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
