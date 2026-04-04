import { AnimatePresence, motion } from "framer-motion";
import {
    CalendarDays,
    ChevronRight,
    Scale,
    ScrollText,
    ShieldAlert,
    Users,
    Vote,
    X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const panelTransition = {
    type: "spring",
    stiffness: 210,
    damping: 26,
    mass: 0.88,
} as const;

const meetingPhaseLabels = {
    "check-in": "Check-in round",
    "agenda-processing": "Agenda building & processing",
    "closing-round": "Closing round",
} as const;

const meetingStatusClassNames = {
    completed: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
    in_progress: "border-blue-400/30 bg-blue-500/15 text-blue-100",
    scheduled: "border-slate-400/30 bg-slate-500/15 text-slate-200",
} as const;

const agendaStatusClassNames = {
    complete: "border-emerald-400/20 bg-emerald-500/12 text-emerald-200",
    pending: "border-slate-700 bg-slate-900 text-slate-300",
    processing: "border-blue-400/20 bg-blue-500/12 text-blue-100",
} as const;

const phaseOrder = ["check-in", "agenda-processing", "closing-round"] as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

function formatMeetingDate(value: string) {
    return dateFormatter.format(new Date(value));
}

export default function GovernanceMeetingRoom() {
    const {
        activeGovernanceMeeting,
        circleMap,
        closeGovernanceMeeting,
        partnerMap,
        setGovernanceMeetingPhase,
        snapshot,
    } = useWorkspaceSnapshot();
    const [selectedAgendaItemId, setSelectedAgendaItemId] = useState<string | null>(null);

    const agendaItems = useMemo(
        () =>
            activeGovernanceMeeting
                ? snapshot.governanceAgendaItems.filter(
                      (item) => item.meetingId === activeGovernanceMeeting.id,
                  )
                : [],
        [activeGovernanceMeeting, snapshot.governanceAgendaItems],
    );

    const resolvedSelectedAgendaItemId =
        selectedAgendaItemId && agendaItems.some((item) => item.id === selectedAgendaItemId)
            ? selectedAgendaItemId
            : (agendaItems.find((item) => item.status === "processing")?.id ??
              agendaItems[0]?.id ??
              null);
    const selectedAgendaItem =
        agendaItems.find((item) => item.id === resolvedSelectedAgendaItemId) ??
        agendaItems[0] ??
        null;
    const linkedProposal = selectedAgendaItem?.proposalId
        ? (snapshot.governanceProposals.find(
              (proposal) => proposal.id === selectedAgendaItem.proposalId,
          ) ?? null)
        : null;
    const linkedElection = selectedAgendaItem?.electionId
        ? (snapshot.governanceElections.find(
              (election) => election.id === selectedAgendaItem.electionId,
          ) ?? null)
        : null;
    const linkedObjections = linkedProposal
        ? snapshot.governanceObjections.filter(
              (objection) => objection.proposalId === linkedProposal.id,
          )
        : [];
    const linkedNominations = linkedElection
        ? snapshot.governanceNominations.filter((nomination) =>
              linkedElection.nominationIds.includes(nomination.id),
          )
        : [];

    return (
        <AnimatePresence>
            {activeGovernanceMeeting && (
                <motion.div
                    className="fixed inset-0 z-[72] bg-slate-950/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeGovernanceMeeting}
                >
                    <motion.aside
                        className="absolute inset-y-0 right-0 flex w-full max-w-[840px] flex-col border-l border-slate-700/80 bg-[#0d1524] text-slate-100 shadow-[0_32px_90px_rgba(15,23,42,0.55)]"
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
                                            Governance room
                                        </span>
                                        <span
                                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                                                meetingStatusClassNames[
                                                    activeGovernanceMeeting.status
                                                ]
                                            }`}
                                        >
                                            {activeGovernanceMeeting.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">
                                        {activeGovernanceMeeting.title}
                                    </h2>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                                        <span className="inline-flex items-center gap-2">
                                            <CalendarDays size={15} aria-hidden="true" />
                                            {formatMeetingDate(activeGovernanceMeeting.scheduledAt)}
                                        </span>
                                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                                            {meetingPhaseLabels[activeGovernanceMeeting.phase]}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeGovernanceMeeting}
                                    className="rounded-full border border-slate-700 p-2 text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-900"
                                    aria-label="Close governance room"
                                >
                                    <X size={18} aria-hidden="true" />
                                </button>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-4">
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Circle
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {circleMap[activeGovernanceMeeting.circleId]?.title ??
                                            "Unassigned"}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Facilitator
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {partnerMap[activeGovernanceMeeting.facilitatorId]?.name ??
                                            activeGovernanceMeeting.facilitatorId}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Secretary
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {partnerMap[activeGovernanceMeeting.secretaryId]?.name ??
                                            activeGovernanceMeeting.secretaryId}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                        Participants
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">
                                        {activeGovernanceMeeting.participantIds.length} circle
                                        members
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_260px]">
                                <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                        Process
                                    </div>
                                    <h3 className="mt-2 text-xl font-semibold text-white">
                                        Governance phases
                                    </h3>
                                    <div className="mt-5 grid gap-3">
                                        {phaseOrder.map((phase, index) => {
                                            const isActive =
                                                activeGovernanceMeeting.phase === phase;
                                            const isComplete =
                                                phaseOrder.indexOf(activeGovernanceMeeting.phase) >
                                                index;

                                            return (
                                                <button
                                                    key={phase}
                                                    type="button"
                                                    onClick={() =>
                                                        setGovernanceMeetingPhase(
                                                            activeGovernanceMeeting.id,
                                                            phase,
                                                        )
                                                    }
                                                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                                                        isActive
                                                            ? "border-blue-400/40 bg-blue-500/12"
                                                            : "border-slate-800 bg-[#131c2d] hover:border-slate-700 hover:bg-[#172133]"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            Step {index + 1}
                                                        </div>
                                                        <div className="mt-1 text-sm font-medium text-white">
                                                            {meetingPhaseLabels[phase]}
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

                                <div className="space-y-6">
                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                                    Agenda
                                                </div>
                                                <h3 className="mt-2 text-xl font-semibold text-white">
                                                    Meeting items
                                                </h3>
                                            </div>
                                            <span className="text-sm text-slate-400">
                                                {agendaItems.length} items
                                            </span>
                                        </div>

                                        <div className="mt-5 space-y-3">
                                            {agendaItems.map((agendaItem) => (
                                                <button
                                                    key={agendaItem.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedAgendaItemId(agendaItem.id)
                                                    }
                                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                                                        selectedAgendaItem?.id === agendaItem.id
                                                            ? "border-blue-400/40 bg-blue-500/12"
                                                            : "border-slate-800 bg-[#131c2d] hover:border-slate-700 hover:bg-[#172133]"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                {agendaItem.type === "proposal" ? (
                                                                    <ScrollText
                                                                        size={13}
                                                                        aria-hidden="true"
                                                                    />
                                                                ) : (
                                                                    <Vote
                                                                        size={13}
                                                                        aria-hidden="true"
                                                                    />
                                                                )}
                                                                {agendaItem.type}
                                                            </div>
                                                            <div className="mt-2 text-sm font-medium text-white">
                                                                {agendaItem.label}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                                                agendaStatusClassNames[
                                                                    agendaItem.status
                                                                ]
                                                            }`}
                                                        >
                                                            {agendaItem.status}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                            {selectedAgendaItem?.type === "proposal" ? (
                                                <Scale size={15} aria-hidden="true" />
                                            ) : (
                                                <Vote size={15} aria-hidden="true" />
                                            )}
                                            Current item
                                        </div>

                                        {!selectedAgendaItem && (
                                            <div className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-[#131c2d] px-4 py-5 text-sm text-slate-400">
                                                No agenda item is selected for processing.
                                            </div>
                                        )}

                                        {linkedProposal && (
                                            <div className="mt-4 space-y-4">
                                                <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Proposal
                                                    </div>
                                                    <div className="mt-2 text-lg font-semibold text-white">
                                                        {linkedProposal.content.title}
                                                    </div>
                                                    <p className="mt-3 text-sm leading-6 text-slate-300">
                                                        {linkedProposal.content.summary}
                                                    </p>
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            Tension
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-slate-200">
                                                            {linkedProposal.tension}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            Example
                                                        </div>
                                                        <p className="mt-2 text-sm leading-6 text-slate-200">
                                                            {linkedProposal.example}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        <ShieldAlert size={14} aria-hidden="true" />
                                                        Objections
                                                    </div>
                                                    <div className="mt-4 space-y-3">
                                                        {linkedObjections.length > 0 ? (
                                                            linkedObjections.map((objection) => (
                                                                <div
                                                                    key={objection.id}
                                                                    className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-4"
                                                                >
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="text-sm font-medium text-white">
                                                                            {partnerMap[
                                                                                objection.objectorId
                                                                            ]?.name ??
                                                                                objection.objectorId}
                                                                        </div>
                                                                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                                                            {objection.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-3 text-sm leading-6 text-slate-300">
                                                                        {objection.concern}
                                                                    </p>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 px-4 py-4 text-sm text-slate-400">
                                                                No objections are linked to this
                                                                proposal.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {linkedElection && (
                                            <div className="mt-4 space-y-4">
                                                <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Election
                                                    </div>
                                                    <div className="mt-2 text-lg font-semibold text-white">
                                                        {linkedElection.targetRoleLabel}
                                                    </div>
                                                    <p className="mt-3 text-sm leading-6 text-slate-300">
                                                        Current stage:{" "}
                                                        {linkedElection.status.replace("-", " ")}
                                                    </p>
                                                </div>
                                                <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Proposed candidate
                                                    </div>
                                                    <div className="mt-2 text-sm font-medium text-white">
                                                        {linkedElection.proposedCandidateId
                                                            ? (partnerMap[
                                                                  linkedElection.proposedCandidateId
                                                              ]?.name ??
                                                              linkedElection.proposedCandidateId)
                                                            : "Awaiting facilitator proposal"}
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            Nominations
                                                        </div>
                                                        <span className="text-xs text-slate-500">
                                                            {linkedNominations.length} nominations
                                                        </span>
                                                    </div>
                                                    <div className="mt-4 space-y-3">
                                                        {linkedNominations.map((nomination) => (
                                                            <div
                                                                key={nomination.id}
                                                                className="rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-4"
                                                            >
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-sm font-medium text-white">
                                                                        {partnerMap[
                                                                            nomination.candidateId
                                                                        ]?.name ??
                                                                            nomination.candidateId}
                                                                    </div>
                                                                    <span className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                                                        by{" "}
                                                                        {partnerMap[
                                                                            nomination.nominatorId
                                                                        ]?.name ??
                                                                            nomination.nominatorId}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-3 text-sm leading-6 text-slate-300">
                                                                    {nomination.reason}
                                                                </p>
                                                                {nomination.changed &&
                                                                    nomination.changedTo && (
                                                                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-200">
                                                                            <ChevronRight
                                                                                size={14}
                                                                                aria-hidden="true"
                                                                            />
                                                                            Changed to{" "}
                                                                            {partnerMap[
                                                                                nomination.changedTo
                                                                            ]?.name ??
                                                                                nomination.changedTo}
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                            <Users size={15} aria-hidden="true" />
                                            Participants
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {activeGovernanceMeeting.participantIds.map(
                                                (participantId) => (
                                                    <span
                                                        key={participantId}
                                                        className="rounded-full border border-slate-700 bg-[#131c2d] px-3 py-1.5 text-sm text-slate-200"
                                                    >
                                                        {partnerMap[participantId]?.name ??
                                                            participantId}
                                                    </span>
                                                ),
                                            )}
                                        </div>
                                    </section>

                                    <section className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-5">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                                            <ScrollText size={15} aria-hidden="true" />
                                            Special meeting guardrails
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Intention
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-slate-200">
                                                    {activeGovernanceMeeting.intention}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-800 bg-[#131c2d] px-4 py-4">
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Limits
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-slate-200">
                                                    {activeGovernanceMeeting.limits}
                                                </p>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
