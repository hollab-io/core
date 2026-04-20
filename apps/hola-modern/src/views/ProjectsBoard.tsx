import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, Plus, X } from "lucide-react";
import { useState } from "react";

import { showToast } from "../components/ToastHost";
import { getProjectAccentToken } from "../config/workspace";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const PROJECT_COLUMNS = [
    { id: "future", title: "Future", color: "text-slate-500 dark:text-slate-500" },
    { id: "waiting", title: "Waiting", color: "text-amber-600 dark:text-amber-500" },
    { id: "current", title: "Current", color: "text-blue-600 dark:text-blue-400" },
    { id: "top", title: "Top Priority", color: "text-rose-600 dark:text-rose-400" },
    { id: "done", title: "Done", color: "text-emerald-600 dark:text-emerald-400" },
] as const;

const SPRING = "cubic-bezier(0.32,0.72,0,1)";

export default function ProjectsBoard() {
    const {
        snapshot,
        partnerMap,
        circleMap,
        meetingMap,
        openMeeting,
        addProject,
        projectBoardCircleId,
        setProjectBoardCircleId,
    } = useWorkspaceSnapshot();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newProjectRoleId, setNewProjectRoleId] = useState("");

    const activeCircleId = circleMap[projectBoardCircleId]
        ? projectBoardCircleId
        : Object.keys(circleMap)[0];
    const activeCircle = circleMap[activeCircleId];
    const circleProjects = snapshot.projects.filter((p) => p.circleId === activeCircleId);
    const circleRoles = snapshot.roles.filter((r) => r.circleId === activeCircleId);
    const hasValidRole = circleRoles.some((r) => r.id === newProjectRoleId);

    const handleAdd = () => {
        if (!newProjectTitle.trim() || !hasValidRole) return;
        addProject({
            id: `project-${Date.now()}`,
            circleId: activeCircleId,
            roleId: newProjectRoleId,
            title: newProjectTitle.trim(),
            stage: "future" as const,
            accentToken: getProjectAccentToken(activeCircleId),
        });
        setShowAddModal(false);
        setNewProjectTitle("");
        setNewProjectRoleId("");
    };

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Circle tabs */}
            <div className="flex flex-wrap items-center gap-2">
                <div
                    className="flex flex-wrap items-center gap-1.5 rounded-full
                    bg-slate-100/80 dark:bg-white/[0.05]
                    ring-1 ring-slate-200/80 dark:ring-white/[0.06]
                    p-[3px]"
                >
                    {snapshot.circles.map((circle) => {
                        const isActive = circle.id === activeCircleId;
                        return (
                            <button
                                key={circle.id}
                                type="button"
                                onClick={() => {
                                    setProjectBoardCircleId(circle.id);
                                    setNewProjectRoleId("");
                                }}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300
                                    ${
                                        isActive
                                            ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-white/[0.1]"
                                            : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                {circle.title}
                            </button>
                        );
                    })}
                </div>
                <span
                    className="rounded-full border border-slate-200/70 dark:border-white/[0.07]
                    bg-white dark:bg-white/[0.04]
                    px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-500"
                >
                    {circleProjects.filter((p) => p.stage !== "done").length} active
                </span>
            </div>

            {/* Board columns */}
            <div className="custom-scrollbar flex-1 overflow-x-auto pb-2">
                <div className="flex h-full min-w-max gap-4">
                    {PROJECT_COLUMNS.map((col) => {
                        const cards = circleProjects.filter((p) => p.stage === col.id);
                        return (
                            <section
                                key={col.id}
                                aria-labelledby={`col-${col.id}`}
                                className="flex h-full w-[260px] flex-col md:w-[280px]"
                            >
                                {/* Column header */}
                                <div className="mb-3 flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <h3
                                            id={`col-${col.id}`}
                                            className={`text-[12px] font-bold uppercase tracking-[0.12em] ${col.color}`}
                                        >
                                            {col.title}
                                        </h3>
                                        <span
                                            className="rounded-full bg-slate-100 dark:bg-white/[0.06]
                                            px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-500"
                                        >
                                            {cards.length}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={`More options for ${col.title}`}
                                        onClick={() => showToast("Column options coming soon")}
                                        className="flex h-6 w-6 items-center justify-center rounded-md
                                            text-slate-300 dark:text-slate-700
                                            hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-500 dark:hover:text-slate-400"
                                    >
                                        <MoreHorizontal
                                            size={14}
                                            strokeWidth={1.75}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>

                                {/* Cards */}
                                <div
                                    className="custom-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto
                                    rounded-2xl border border-slate-200/60 dark:border-white/[0.06]
                                    bg-slate-50/60 dark:bg-white/[0.02]
                                    p-2.5"
                                >
                                    {cards.map((project) => {
                                        const sourceMeeting = project.sourceMeetingId
                                            ? meetingMap[project.sourceMeetingId]
                                            : null;
                                        const owner = project.ownerId
                                            ? partnerMap[project.ownerId]
                                            : null;
                                        return (
                                            <article
                                                key={project.id}
                                                className="group rounded-xl
                                                    border border-slate-200/70 dark:border-white/[0.07]
                                                    bg-white dark:bg-[#0e0e12]
                                                    p-4 shadow-sm
                                                    transition-all duration-300
                                                    hover:border-slate-300/80 dark:hover:border-white/[0.12]
                                                    hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
                                                style={{ transitionTimingFunction: SPRING }}
                                            >
                                                {/* Accent bar */}
                                                <div
                                                    className={`mb-3 h-1 w-10 rounded-full ${project.accentToken}`}
                                                />
                                                <h4
                                                    className="text-[13px] font-semibold leading-snug
                                                    text-slate-800 dark:text-slate-200
                                                    transition-colors group-hover:text-[#3481FF]"
                                                >
                                                    {project.title}
                                                </h4>
                                                {(project.subtitle || activeCircle?.purpose) && (
                                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-600 line-clamp-2">
                                                        {project.subtitle ?? activeCircle?.purpose}
                                                    </p>
                                                )}
                                                {sourceMeeting && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openMeeting(sourceMeeting.id)
                                                        }
                                                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full
                                                            border border-blue-200/70 dark:border-blue-500/20
                                                            bg-blue-50 dark:bg-blue-500/[0.08]
                                                            px-2.5 py-0.5 text-[10px] font-semibold
                                                            text-blue-700 dark:text-blue-400
                                                            transition-colors hover:bg-blue-100 dark:hover:bg-blue-500/[0.14]"
                                                    >
                                                        {sourceMeeting.title}
                                                    </button>
                                                )}
                                                {owner && (
                                                    <div className="mt-3 flex justify-end">
                                                        <div
                                                            className="h-6 w-6 overflow-hidden rounded-full
                                                            border border-slate-200 dark:border-white/[0.1]"
                                                        >
                                                            <img
                                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${owner.avatarSeed ?? project.ownerId}`}
                                                                alt={`Avatar for ${owner.name}`}
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}

                                    {col.id === "future" && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(true)}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl
                                                border-2 border-dashed border-slate-200 dark:border-white/[0.07]
                                                bg-transparent py-3 text-[12px] font-semibold
                                                text-slate-400 dark:text-slate-600
                                                transition-all duration-300
                                                hover:border-[#3481FF]/40 hover:text-[#3481FF] hover:bg-[#3481FF]/[0.04]"
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
                                            Add project
                                        </button>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>

            {/* Add project modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center
                            bg-black/50 dark:bg-black/70 backdrop-blur-sm px-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full max-w-[400px] rounded-[1.75rem]
                                border border-slate-200/80 dark:border-white/[0.1]
                                bg-white dark:bg-[#0e0e12]
                                p-[5px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="rounded-[calc(1.75rem-5px)] p-6">
                                <div className="mb-5 flex items-center justify-between">
                                    <h3 className="text-[16px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                                        New project
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full
                                            text-slate-400 dark:text-slate-600
                                            hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        <X size={16} strokeWidth={2} aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                                            Title
                                        </label>
                                        <input
                                            type="text"
                                            value={newProjectTitle}
                                            onChange={(e) => setNewProjectTitle(e.target.value)}
                                            placeholder="Project title…"
                                            autoFocus
                                            className="w-full rounded-xl
                                                border border-slate-200 dark:border-white/[0.08]
                                                bg-slate-50 dark:bg-white/[0.04]
                                                px-4 py-3 text-[13px] font-medium
                                                text-slate-900 dark:text-white
                                                placeholder:text-slate-400 dark:placeholder:text-slate-600
                                                outline-none transition-all duration-300
                                                focus:border-[#3481FF] dark:focus:border-[#3481FF]/60
                                                focus:bg-white dark:focus:bg-white/[0.06]
                                                focus:ring-4 focus:ring-[#3481FF]/[0.1] dark:focus:ring-[#3481FF]/[0.08]"
                                            style={{ transitionTimingFunction: SPRING }}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                                            Role
                                        </label>
                                        <select
                                            value={newProjectRoleId}
                                            onChange={(e) => setNewProjectRoleId(e.target.value)}
                                            className="w-full rounded-xl
                                                border border-slate-200 dark:border-white/[0.08]
                                                bg-slate-50 dark:bg-[#0e0e12]
                                                px-4 py-3 text-[13px] font-medium
                                                text-slate-900 dark:text-white
                                                outline-none transition-all duration-300
                                                focus:border-[#3481FF] dark:focus:border-[#3481FF]/60
                                                focus:ring-4 focus:ring-[#3481FF]/[0.1] dark:focus:ring-[#3481FF]/[0.08]"
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            <option value="" disabled>
                                                Select a role…
                                            </option>
                                            {circleRoles.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setShowAddModal(false)}
                                            className="flex-1 rounded-xl border border-slate-200 dark:border-white/[0.08]
                                                bg-slate-50 dark:bg-white/[0.04]
                                                py-3 text-[13px] font-semibold
                                                text-slate-700 dark:text-slate-300
                                                transition-all duration-300 hover:bg-slate-100 dark:hover:bg-white/[0.07]"
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAdd}
                                            disabled={!newProjectTitle.trim() || !hasValidRole}
                                            className={`flex-1 rounded-xl py-3 text-[13px] font-bold
                                                transition-all duration-300 active:scale-[0.98]
                                                ${
                                                    newProjectTitle.trim() && hasValidRole
                                                        ? "bg-[#3481FF] text-white shadow-[0_8px_24px_rgba(52,129,255,0.3)] hover:bg-[#2570f0]"
                                                        : "cursor-not-allowed bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-600"
                                                }`}
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            Create
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
