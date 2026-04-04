import { Bot, Calendar, MoreVertical } from "lucide-react";
import { useState } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

type ActionsFilter = "mine" | "completed" | "all";
type SortOption = "newest" | "assignee";

const dueDateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
});

const completedDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
});

export default function ActionsList() {
    const {
        snapshot,
        partnerMap,
        roleMap,
        circleMap,
        meetingMap,
        openMeeting,
        toggleActionCompletion,
    } = useWorkspaceSnapshot();
    const [activeFilter, setActiveFilter] = useState<ActionsFilter>("all");
    const [sortBy, setSortBy] = useState<SortOption>("newest");

    const visibleActions = snapshot.actions
        .map((action) => {
            const assignee = action.assigneeId ? partnerMap[action.assigneeId] : null;
            const role = roleMap[action.roleId];
            const circle = circleMap[action.circleId];
            const sourceMeeting = action.sourceMeetingId
                ? meetingMap[action.sourceMeetingId]
                : null;

            return {
                id: action.id,
                text: action.title,
                completed: action.completed,
                context:
                    role && circle
                        ? `${role.title} in ${circle.title}`
                        : (role?.title ?? circle?.title ?? ""),
                date:
                    !action.completed && action.dueDate
                        ? dueDateFormatter.format(new Date(action.dueDate))
                        : undefined,
                dateDesc:
                    action.completed && action.completedAt
                        ? `Completed on ${completedDateFormatter.format(new Date(action.completedAt))}`
                        : undefined,
                sourceMeetingId: sourceMeeting?.id ?? null,
                sourceMeetingTitle: sourceMeeting?.title ?? null,
                user: assignee?.name ?? null,
            };
        })
        .filter((action) => {
            if (activeFilter === "mine") {
                return (
                    snapshot.actions.find((item) => item.id === action.id)?.assigneeId ===
                    snapshot.currentPartnerId
                );
            }

            if (activeFilter === "completed") {
                return action.completed;
            }

            return true;
        })
        .sort((leftAction, rightAction) => {
            if (sortBy === "assignee") {
                return (leftAction.user ?? "ZZZ").localeCompare(rightAction.user ?? "ZZZ");
            }

            return rightAction.id.localeCompare(leftAction.id);
        });

    const filterTabs: Array<{ id: ActionsFilter; label: string }> = [
        { id: "mine", label: "My actions" },
        { id: "completed", label: "Completed actions" },
        { id: "all", label: "All actions" },
    ];
    const completedCount = snapshot.actions.filter((action) => action.completed).length;
    const activeCount = snapshot.actions.length - completedCount;

    return (
        <div className="mt-4 flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-4 py-4 sm:gap-6 sm:px-6">
                {filterTabs.map((tab) => {
                    const isActive = activeFilter === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveFilter(tab.id)}
                            className={`font-medium transition-colors ${
                                isActive
                                    ? "border-b-2 border-primary pb-2 text-slate-800 sm:pb-4"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}

                <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-slate-500">Sort by</span>
                    <button
                        type="button"
                        onClick={() =>
                            setSortBy((currentSort) =>
                                currentSort === "newest" ? "assignee" : "newest",
                            )
                        }
                        className="text-sm font-medium text-slate-800 transition-colors hover:text-primary"
                        aria-label={`Sort actions by ${sortBy === "newest" ? "assignee" : "newest"}`}
                    >
                        {sortBy === "newest" ? "Newest" : "Assignee"} ⌄
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                    {activeCount} active actions
                </div>
                <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                    {completedCount} completed
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500">
                    <Bot size={14} aria-hidden="true" />
                    AI can turn meeting outputs into next actions from here
                </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-auto">
                {visibleActions.map((action) => (
                    <div
                        key={action.id}
                        className="group flex flex-col gap-3 border-b border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-6 lg:flex-row lg:items-center lg:gap-4"
                    >
                        <div className="flex items-start gap-4 lg:flex-1">
                            <button
                                type="button"
                                aria-label={`${action.completed ? "Mark as incomplete" : "Mark as complete"}: ${action.text}`}
                                aria-pressed={action.completed}
                                onClick={() => toggleActionCompletion(action.id)}
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                    action.completed
                                        ? "border-primary bg-primary"
                                        : "border-slate-300 bg-white group-hover:border-primary"
                                }`}
                            >
                                {action.completed && (
                                    <svg
                                        className="h-3.5 w-3.5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={3}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                )}
                            </button>

                            <div className="min-w-0 flex-1">
                                <h4
                                    className={`text-sm font-medium leading-snug ${
                                        action.completed
                                            ? "text-slate-400 line-through"
                                            : "text-slate-700"
                                    }`}
                                >
                                    {action.text}
                                </h4>
                                {action.sourceMeetingTitle && action.sourceMeetingId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (action.sourceMeetingId) {
                                                openMeeting(action.sourceMeetingId);
                                            }
                                        }}
                                        className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                                    >
                                        From tactical room
                                        <span className="normal-case tracking-normal">
                                            {action.sourceMeetingTitle}
                                        </span>
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                            {action.date ? (
                                <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                    <Calendar size={12} aria-hidden="true" />
                                    {action.date}
                                </div>
                            ) : action.dateDesc ? (
                                <span className="text-xs text-slate-400">{action.dateDesc}</span>
                            ) : (
                                <span className="text-xs text-slate-300">No due date</span>
                            )}

                            <div className="max-w-[12rem] truncate px-0 text-xs text-slate-400 sm:px-2 lg:text-right">
                                {action.context || "no role"}
                            </div>

                            {action.user ? (
                                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-200">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${action.user}`}
                                        alt={`Avatar for ${action.user}`}
                                        className="h-full w-full"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    aria-label={`Assign owner to ${action.text}`}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-primary hover:text-primary"
                                >
                                    +
                                </button>
                            )}

                            <button
                                type="button"
                                aria-label={`Open actions menu for ${action.text}`}
                                className="rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-200 hover:text-slate-600"
                            >
                                <MoreVertical size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
