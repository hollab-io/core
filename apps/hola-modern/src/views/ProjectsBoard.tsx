import { Bot, MoreHorizontal, X } from "lucide-react";
import { useState } from "react";

import { getProjectAccentToken } from "../config/workspace";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const PROJECT_COLUMNS = [
    { id: "future", title: "Future" },
    { id: "waiting", title: "Waiting" },
    { id: "current", title: "Current" },
    { id: "top", title: "🔥 Top Priority Projects" },
    { id: "done", title: "Done" },
] as const;

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
    const circleProjects = snapshot.projects.filter(
        (project) => project.circleId === activeCircleId,
    );
    const circleRoles = snapshot.roles.filter((role) => role.circleId === activeCircleId);
    const activeProjects = circleProjects.filter((project) => project.stage !== "done").length;
    const hasValidSelectedRole = circleRoles.some((role) => role.id === newProjectRoleId);

    const handleAddProject = () => {
        if (!newProjectTitle.trim() || !hasValidSelectedRole) {
            return;
        }

        const newProject = {
            id: `project-${Date.now()}`,
            circleId: activeCircleId,
            roleId: newProjectRoleId,
            title: newProjectTitle.trim(),
            stage: "future" as const,
            accentToken: getProjectAccentToken(activeCircleId),
        };

        addProject(newProject);
        setShowAddModal(false);
        setNewProjectTitle("");
        setNewProjectRoleId("");
    };

    return (
        <div className="flex h-full flex-col pt-4">
            <div className="mb-6 flex flex-wrap gap-3 px-2">
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
                            className={`rounded-lg border px-4 py-1.5 font-medium transition-colors ${
                                isActive
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                            }`}
                        >
                            {circle.title}
                        </button>
                    );
                })}
                <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                    {activeProjects} active projects
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500">
                    <Bot size={14} aria-hidden="true" />
                    Tactical outputs can create projects directly in this board
                </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-x-auto pb-4">
                <div className="flex h-full min-w-max gap-6 px-2">
                    {PROJECT_COLUMNS.map((column) => (
                        <section
                            key={column.id}
                            aria-labelledby={`project-column-${column.id}`}
                            className="flex h-full w-[280px] flex-col rounded-2xl border border-slate-200 bg-slate-100/50 p-4 shadow-sm md:w-[300px]"
                        >
                            <div className="mb-4 flex items-center justify-between px-2">
                                <h3
                                    id={`project-column-${column.id}`}
                                    className="font-semibold text-slate-700"
                                >
                                    {column.title}
                                </h3>
                                <button
                                    type="button"
                                    aria-label={`Open actions for ${column.title}`}
                                    className="text-slate-400 transition-colors hover:text-slate-600"
                                >
                                    <MoreHorizontal size={20} aria-hidden="true" />
                                </button>
                            </div>

                            <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto">
                                {circleProjects
                                    .filter((project) => project.stage === column.id)
                                    .map((project) => {
                                        const sourceMeeting = project.sourceMeetingId
                                            ? meetingMap[project.sourceMeetingId]
                                            : null;

                                        return (
                                            <article
                                                key={project.id}
                                                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                                            >
                                                <div
                                                    className={`mb-3 h-1.5 w-12 rounded-full ${project.accentToken}`}
                                                />
                                                <h4 className="mb-1 font-medium leading-snug text-slate-800 transition-colors group-hover:text-primary">
                                                    {project.title}
                                                </h4>
                                                {(project.subtitle || activeCircle?.purpose) && (
                                                    <p className="text-sm text-slate-500">
                                                        {project.subtitle ?? activeCircle?.purpose}
                                                    </p>
                                                )}

                                                {sourceMeeting && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openMeeting(sourceMeeting.id)
                                                        }
                                                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 transition-colors hover:border-blue-200 hover:bg-blue-100"
                                                    >
                                                        From meeting
                                                        <span className="normal-case tracking-normal">
                                                            {sourceMeeting.title}
                                                        </span>
                                                    </button>
                                                )}

                                                {project.ownerId && (
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <div className="h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                                            <img
                                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${
                                                                    partnerMap[project.ownerId]
                                                                        ?.avatarSeed ??
                                                                    project.ownerId
                                                                }`}
                                                                alt={`Avatar for ${partnerMap[project.ownerId]?.name ?? project.ownerId}`}
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        );
                                    })}

                                {column.id === "future" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(true)}
                                        className="mt-2 flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/50 py-3 text-sm font-medium text-slate-500 transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                                    >
                                        + Add Project
                                    </button>
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            {/* Add Project Modal */}
            {showAddModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">
                                Add New Project
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X size={20} aria-hidden="true" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Project Title
                                </label>
                                <input
                                    type="text"
                                    value={newProjectTitle}
                                    onChange={(e) => setNewProjectTitle(e.target.value)}
                                    placeholder="Enter project title..."
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Role
                                </label>
                                <select
                                    value={newProjectRoleId}
                                    onChange={(event) => setNewProjectRoleId(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="" disabled>
                                        Select a role...
                                    </option>
                                    {circleRoles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddProject}
                                    disabled={!newProjectTitle.trim() || !hasValidSelectedRole}
                                    className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Create Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
