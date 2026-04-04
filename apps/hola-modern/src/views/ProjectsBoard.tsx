import { Bot, MoreHorizontal } from "lucide-react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const PROJECT_COLUMNS = [
    { id: "future", title: "Future" },
    { id: "waiting", title: "Waiting" },
    { id: "current", title: "Current" },
    { id: "top", title: "🔥 Top Priority Projects" },
    { id: "done", title: "Done" },
] as const;

export default function ProjectsBoard() {
    const { snapshot, partnerMap, circleMap, meetingMap, openMeeting } = useWorkspaceSnapshot();
    const activeCircleId = "people";
    const activeCircle = circleMap[activeCircleId];
    const circleProjects = snapshot.projects.filter(
        (project) => project.circleId === activeCircleId,
    );
    const activeProjects = circleProjects.filter((project) => project.stage !== "done").length;

    return (
        <div className="flex h-full flex-col pt-4">
            <div className="mb-6 flex flex-wrap gap-3 px-2">
                <button
                    type="button"
                    className="rounded-lg border border-primary bg-primary/5 px-4 py-1.5 font-medium text-primary"
                >
                    {activeCircle?.title ?? "Employee Experience"}
                </button>
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

                                <button
                                    type="button"
                                    className="mt-2 flex w-full items-center justify-center rounded-xl border border-dashed border-transparent py-3 text-slate-400 transition-all hover:border-slate-200 hover:bg-white hover:text-primary"
                                >
                                    + Add Project
                                </button>
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}
