import { AnimatePresence, motion } from "framer-motion";
import {
    Bot,
    CalendarDays,
    CheckSquare,
    ChevronRight,
    Clock3,
    KanbanSquare,
    MapPin,
    Sparkles,
    Users,
    X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import type { AppTabId } from "../config/navigation";
import { getProjectAccentToken } from "../config/workspace";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

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

const statusClassNames = {
    completed: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    in_progress: "border-blue-400/30 bg-blue-500/15 text-blue-100",
    scheduled: "border-slate-400/30 bg-slate-500/15 text-slate-200",
} as const;

const panelTransition = {
    type: "spring",
    stiffness: 210,
    damping: 26,
    mass: 0.88,
} as const;

const meetingDateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
});

const meetingTimeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
});

function formatMeetingWindow(start: string, end: string, allDay?: boolean) {
    if (allDay) {
        return `${meetingDateFormatter.format(new Date(`${start}T12:00:00`))} · All day`;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    return `${meetingDateFormatter.format(startDate)} · ${meetingTimeFormatter.format(
        startDate,
    )} – ${meetingTimeFormatter.format(endDate)}`;
}

function getDefaultPhase(meetingType: string, status: string): MeetingPhaseId {
    if (status === "completed") {
        return "Closing round";
    }

    if (meetingType === "tactical") {
        return "Triage items";
    }

    return "Progress updates";
}

export default function TacticalMeetingRoom({
    onNavigateToTab,
}: {
    onNavigateToTab: (tabId: AppTabId) => void;
}) {
    const {
        activeMeeting,
        addProject,
        circleMap,
        closeMeeting,
        partnerMap,
        roleMap,
        setProjectBoardCircleId,
        snapshot,
    } = useWorkspaceSnapshot();
    const [phaseOverrides, setPhaseOverrides] = useState<Record<string, MeetingPhaseId>>({});
    const [showAddProject, setShowAddProject] = useState(false);
    const [newProjectTitle, setNewProjectTitle] = useState("");
    const [newProjectRoleId, setNewProjectRoleId] = useState<string>("");
    const activePhase = activeMeeting
        ? (phaseOverrides[activeMeeting.id] ??
          getDefaultPhase(activeMeeting.meetingType, activeMeeting.status))
        : "Triage items";

    const handleAddProject = useCallback(() => {
        if (!activeMeeting || !newProjectTitle.trim() || !newProjectRoleId) {
            return;
        }

        const newProject = {
            id: `project-${Date.now()}`,
            circleId: activeMeeting.circleId,
            roleId: newProjectRoleId,
            title: newProjectTitle.trim(),
            stage: "current" as const,
            accentToken: getProjectAccentToken(activeMeeting.circleId),
            sourceMeetingId: activeMeeting.id,
        };

        addProject(newProject);
        setProjectBoardCircleId(activeMeeting.circleId);
        setShowAddProject(false);
        setNewProjectTitle("");
        setNewProjectRoleId("");
        closeMeeting();
        onNavigateToTab("actions");
    }, [
        activeMeeting,
        newProjectTitle,
        newProjectRoleId,
        addProject,
        closeMeeting,
        onNavigateToTab,
        setProjectBoardCircleId,
    ]);

    const meetingOutputs = useMemo(
        () =>
            activeMeeting
                ? snapshot.meetingOutputs.filter((output) => output.meetingId === activeMeeting.id)
                : [],
        [activeMeeting, snapshot.meetingOutputs],
    );

    const relatedActions = useMemo(
        () =>
            activeMeeting
                ? snapshot.actions.filter((action) => action.sourceMeetingId === activeMeeting.id)
                : [],
        [activeMeeting, snapshot.actions],
    );

    const relatedProjects = useMemo(
        () =>
            activeMeeting
                ? snapshot.projects.filter(
                      (project) => project.sourceMeetingId === activeMeeting.id,
                  )
                : [],
        [activeMeeting, snapshot.projects],
    );

    const agendaItems = useMemo(() => {
        if (!activeMeeting) {
            return [];
        }

        const invitedRoles = activeMeeting.invitedRoleIds
            .map((roleId) => roleMap[roleId]?.title)
            .filter(Boolean);

        const baseItems = [
            `Check operational pulse for ${circleMap[activeMeeting.circleId]?.title ?? "this circle"}`,
            invitedRoles.length > 0
                ? `Surface tensions from ${invitedRoles.join(", ")}`
                : "Surface active operational tensions",
            relatedActions.length > 0
                ? `Review ${relatedActions.length} follow-up actions from prior meetings`
                : "Capture the next actions required before the next sync",
            relatedProjects.length > 0
                ? `Re-sequence ${relatedProjects.length} live project streams`
                : "Identify projects that need explicit ownership",
        ];

        return baseItems.map((label, index) => ({
            id: `${activeMeeting.id}-agenda-${index}`,
            label,
            status:
                activePhase === "Triage items" && index === 0
                    ? "Processing"
                    : index < 2
                      ? "Queued"
                      : "New",
        }));
    }, [
        activeMeeting,
        activePhase,
        circleMap,
        relatedActions.length,
        relatedProjects.length,
        roleMap,
    ]);

    const aiSuggestions = useMemo(
        () => [
            {
                id: "agenda",
                label: "Draft agenda from open work",
                action: () =>
                    activeMeeting &&
                    setPhaseOverrides((currentOverrides) => ({
                        ...currentOverrides,
                        [activeMeeting.id]: "Build agenda",
                    })),
            },
            {
                id: "triage",
                label: "Convert tensions into outputs",
                action: () =>
                    activeMeeting &&
                    setPhaseOverrides((currentOverrides) => ({
                        ...currentOverrides,
                        [activeMeeting.id]: "Triage items",
                    })),
            },
            {
                id: "closing",
                label: "Prepare summary for publication",
                action: () =>
                    activeMeeting &&
                    setPhaseOverrides((currentOverrides) => ({
                        ...currentOverrides,
                        [activeMeeting.id]: "Closing round",
                    })),
            },
        ],
        [activeMeeting],
    );

    return (
        <AnimatePresence>
            {activeMeeting && (
                <motion.div
                    className="fixed inset-0 z-[70] bg-slate-950/55 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeMeeting}
                >
                    <motion.aside
                        className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-slate-700/80 bg-[#0f1726] text-slate-100 shadow-[0_32px_90px_rgba(15,23,42,0.55)]"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={panelTransition}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="border-b border-slate-800 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                                            {activeMeeting.meetingType === "tactical"
                                                ? "Tactical room"
                                                : "Meeting room"}
                                        </span>
                                        <span
                                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                                                statusClassNames[activeMeeting.status]
                                            }`}
                                        >
                                            {activeMeeting.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                                        {activeMeeting.title}
                                    </h2>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays size={15} aria-hidden="true" />
                                            {formatMeetingWindow(
                                                activeMeeting.start,
                                                activeMeeting.end,
                                                activeMeeting.allDay,
                                            )}
                                        </span>
                                        <span className="inline-flex items-center gap-2">
                                            <MapPin size={15} aria-hidden="true" />
                                            {activeMeeting.location} · {activeMeeting.room}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeMeeting}
                                    className="rounded-full border border-slate-700 p-2 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-900"
                                    aria-label="Close meeting room"
                                >
                                    <X size={18} aria-hidden="true" />
                                </button>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Circle
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {circleMap[activeMeeting.circleId]?.title ?? "Unassigned"}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Host
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {partnerMap[activeMeeting.hostId]?.name ??
                                            activeMeeting.hostId}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Participants
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {activeMeeting.participantIds.length} partners
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_280px]">
                                <div className="space-y-6">
                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                                    Meeting process
                                                </div>
                                                <h3 className="mt-2 text-xl font-semibold text-white">
                                                    Tactical phases
                                                </h3>
                                            </div>
                                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">
                                                <Clock3 size={14} aria-hidden="true" />
                                                {activePhase}
                                            </span>
                                        </div>

                                        <div className="mt-5 grid gap-3">
                                            {MEETING_PHASES.map((phase, index) => {
                                                const isActive = phase === activePhase;
                                                const isComplete =
                                                    MEETING_PHASES.indexOf(activePhase) > index;

                                                return (
                                                    <button
                                                        key={phase}
                                                        type="button"
                                                        onClick={() =>
                                                            activeMeeting &&
                                                            setPhaseOverrides(
                                                                (currentOverrides) => ({
                                                                    ...currentOverrides,
                                                                    [activeMeeting.id]: phase,
                                                                }),
                                                            )
                                                        }
                                                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                                                            isActive
                                                                ? "border-blue-400/50 bg-blue-500/12"
                                                                : "border-slate-800 bg-[#131c2d] hover:border-slate-700 hover:bg-[#172133]"
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                Phase {index + 1}
                                                            </div>
                                                            <div className="mt-1 text-sm font-medium text-white">
                                                                {phase}
                                                            </div>
                                                        </div>
                                                        <div
                                                            className={`h-8 w-8 rounded-full border text-center text-sm leading-8 ${
                                                                isActive
                                                                    ? "border-blue-300 bg-blue-300 text-slate-950"
                                                                    : isComplete
                                                                      ? "border-emerald-300 bg-emerald-300 text-slate-950"
                                                                      : "border-slate-700 text-slate-400"
                                                            }`}
                                                        >
                                                            {index + 1}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                                    Agenda
                                                </div>
                                                <h3 className="mt-2 text-xl font-semibold text-white">
                                                    Items to process
                                                </h3>
                                            </div>
                                            <span className="text-sm text-slate-400">
                                                {agendaItems.length} items
                                            </span>
                                        </div>

                                        <div className="mt-5 space-y-3">
                                            {agendaItems.map((agendaItem) => (
                                                <div
                                                    key={agendaItem.id}
                                                    className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="text-sm font-medium text-white">
                                                            {agendaItem.label}
                                                        </div>
                                                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                                            {agendaItem.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                            Outputs
                                        </div>
                                        <h3 className="mt-2 text-xl font-semibold text-white">
                                            Actions and projects created from this meeting
                                        </h3>

                                        <div className="mt-5 space-y-3">
                                            {meetingOutputs.length > 0 ? (
                                                meetingOutputs.map((output) => (
                                                    <div
                                                        key={output.id}
                                                        className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="rounded-full bg-blue-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                                                                {output.type.replace("-", " ")}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {roleMap[output.roleId]?.title ??
                                                                    output.roleId}
                                                            </span>
                                                        </div>
                                                        <div className="mt-3 text-sm leading-6 text-slate-200">
                                                            {output.description}
                                                        </div>
                                                        {output.assignedPartnerId && (
                                                            <div className="mt-3 text-xs text-slate-400">
                                                                Assigned to{" "}
                                                                {partnerMap[
                                                                    output.assignedPartnerId
                                                                ]?.name ?? output.assignedPartnerId}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="rounded-2xl border border-dashed border-slate-700 bg-[#131c2d] px-4 py-4 text-sm text-slate-400">
                                                    No outputs have been captured yet for this
                                                    meeting.
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section className="rounded-[28px] border border-blue-400/20 bg-[linear-gradient(180deg,rgba(37,99,235,0.18),rgba(15,23,38,0.96))] p-5">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                                            <Bot size={15} aria-hidden="true" />
                                            AI copilot
                                        </div>
                                        <h3 className="mt-3 text-xl font-semibold text-white">
                                            Facilitation suggestions
                                        </h3>
                                        <p className="mt-3 text-sm leading-6 text-blue-50/80">
                                            Use the agent to turn live discussion into agenda,
                                            outputs, and a publication-ready summary.
                                        </p>

                                        <div className="mt-5 space-y-2">
                                            {aiSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.id}
                                                    type="button"
                                                    onClick={suggestion.action}
                                                    className="flex w-full items-center justify-between rounded-2xl border border-blue-300/15 bg-slate-950/30 px-4 py-3 text-left text-sm text-white transition-colors hover:border-blue-300/30 hover:bg-slate-950/45"
                                                >
                                                    <span>{suggestion.label}</span>
                                                    <ChevronRight size={16} aria-hidden="true" />
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                            <Users size={15} aria-hidden="true" />
                                            Participants
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {activeMeeting.participantIds.map((participantId) => (
                                                <span
                                                    key={participantId}
                                                    className="rounded-full border border-slate-700 bg-[#131c2d] px-3 py-1.5 text-sm text-slate-200"
                                                >
                                                    {partnerMap[participantId]?.name ??
                                                        participantId}
                                                </span>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                            <Sparkles size={15} aria-hidden="true" />
                                            Linked work
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddProject(true)}
                                                className="flex w-full items-center justify-between rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/10 px-4 py-4 text-left transition-colors hover:border-blue-400/50 hover:bg-blue-500/15"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <KanbanSquare size={16} aria-hidden="true" />
                                                    <div>
                                                        <div className="text-sm font-medium text-blue-100">
                                                            Add Project
                                                        </div>
                                                        <div className="mt-1 text-xs text-blue-200/60">
                                                            Create a new project from this meeting
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} aria-hidden="true" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    closeMeeting();
                                                    onNavigateToTab("actions");
                                                }}
                                                className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4 text-left transition-colors hover:border-slate-700 hover:bg-[#172133]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CalendarDays size={16} aria-hidden="true" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">
                                                            Back to calendar
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-400">
                                                            Schedule or inspect the full meeting
                                                            series
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} aria-hidden="true" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    closeMeeting();
                                                    onNavigateToTab("actions");
                                                }}
                                                className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4 text-left transition-colors hover:border-slate-700 hover:bg-[#172133]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CheckSquare size={16} aria-hidden="true" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">
                                                            Open actions
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-400">
                                                            {relatedActions.length} action items
                                                            linked to this meeting
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} aria-hidden="true" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    closeMeeting();
                                                    onNavigateToTab("actions");
                                                }}
                                                className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4 text-left transition-colors hover:border-slate-700 hover:bg-[#172133]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <KanbanSquare size={16} aria-hidden="true" />
                                                    <div>
                                                        <div className="text-sm font-medium text-white">
                                                            Open projects
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-400">
                                                            {relatedProjects.length} projects linked
                                                            to this meeting
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Add Project Modal */}
                        <AnimatePresence>
                            {showAddProject && (
                                <motion.div
                                    className="absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowAddProject(false)}
                                >
                                    <motion.div
                                        className="w-full max-w-md rounded-3xl border border-slate-700/80 bg-[#0f1726] p-6 text-slate-100 shadow-2xl"
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.95, opacity: 0 }}
                                        transition={panelTransition}
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-semibold text-white">
                                                Add New Project
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddProject(false)}
                                                className="rounded-full border border-slate-700 p-2 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-900"
                                                aria-label="Close"
                                            >
                                                <X size={18} aria-hidden="true" />
                                            </button>
                                        </div>

                                        <div className="mt-6 space-y-4">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Project Title
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newProjectTitle}
                                                    onChange={(e) =>
                                                        setNewProjectTitle(e.target.value)
                                                    }
                                                    placeholder="Enter project title..."
                                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                                                    autoFocus
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                                    Role
                                                </label>
                                                <select
                                                    value={newProjectRoleId}
                                                    onChange={(e) =>
                                                        setNewProjectRoleId(e.target.value)
                                                    }
                                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-white focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
                                                >
                                                    <option value="" disabled>
                                                        Select a role...
                                                    </option>
                                                    {activeMeeting &&
                                                        activeMeeting.invitedRoleIds.map(
                                                            (roleId) => (
                                                                <option key={roleId} value={roleId}>
                                                                    {roleMap[roleId]?.title ??
                                                                        roleId}
                                                                </option>
                                                            ),
                                                        )}
                                                </select>
                                            </div>

                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddProject(false)}
                                                    className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAddProject}
                                                    disabled={
                                                        !newProjectTitle.trim() || !newProjectRoleId
                                                    }
                                                    className="flex-1 rounded-xl border border-blue-400/50 bg-blue-500/20 px-4 py-3 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    Create Project
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
