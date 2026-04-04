import {
    BadgeAlert,
    CalendarDays,
    Gavel,
    Plus,
    Scale,
    ScrollText,
    ShieldAlert,
    Vote,
    X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";


type ProposalFormState = {
    circleId: string;
    proposerRoleId: string;
    tension: string;
    example: string;
    explanation: string;
    changeType:
        | "create-role"
        | "amend-role"
        | "remove-role"
        | "create-policy"
        | "amend-policy"
        | "remove-policy"
        | "move-role";
    existingTargetId: string;
    newTargetId: string;
    changeTitle: string;
    changeSummary: string;
    changePayload: string;
    destinationCircleId: string;
};

type ObjectionFormState = {
    objectorRoleId: string;
    concern: string;
    isConstitutionalViolation: boolean;
    impactOnCircle: boolean;
    impactOnRepresentedRole: boolean;
    createdByProposal: boolean;
    noTimeToAdapt: boolean;
};

type BreakdownFormState = {
    circleId: string;
    declaredByRole: "facilitator" | "secretary" | "super-circle-facilitator";
    reason: string;
    additionalCircleLeadId: string;
};

const proposalStatusClassNames = {
    active: "border-blue-200 bg-blue-50 text-blue-700",
    adopted: "border-emerald-200 bg-emerald-50 text-emerald-700",
    discarded: "border-rose-200 bg-rose-50 text-rose-700",
    draft: "border-slate-200 bg-slate-100 text-slate-600",
    integrating: "border-amber-200 bg-amber-50 text-amber-700",
    objected: "border-orange-200 bg-orange-50 text-orange-700",
    withdrawn: "border-violet-200 bg-violet-50 text-violet-700",
} as const;

const electionStatusClassNames = {
    changing: "border-violet-200 bg-violet-50 text-violet-700",
    complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
    nominating: "border-slate-200 bg-slate-100 text-slate-600",
    "objection-round": "border-orange-200 bg-orange-50 text-orange-700",
    proposing: "border-blue-200 bg-blue-50 text-blue-700",
    sharing: "border-sky-200 bg-sky-50 text-sky-700",
} as const;

const breakdownStatusClassNames = {
    active: "border-rose-200 bg-rose-50 text-rose-700",
    restored: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
});

function formatDate(value?: string) {
    return value ? dateFormatter.format(new Date(value)) : "Not scheduled";
}

function formatShortDate(value?: string) {
    return value ? shortDateFormatter.format(new Date(value)) : "Not set";
}

function isQueryMatch(query: string, parts: Array<string | undefined>) {
    if (!query.trim()) {
        return true;
    }

    return parts.filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase());
}

function buildInitialProposalForm(circleId: string, proposerRoleId: string): ProposalFormState {
    return {
        circleId,
        proposerRoleId,
        tension: "",
        example: "",
        explanation: "",
        changeType: "create-role",
        existingTargetId: "",
        newTargetId: "",
        changeTitle: "",
        changeSummary: "",
        changePayload: "",
        destinationCircleId: "",
    };
}

function buildEmptyObjectionForm(objectorRoleId: string): ObjectionFormState {
    return {
        objectorRoleId,
        concern: "",
        isConstitutionalViolation: false,
        impactOnCircle: false,
        impactOnRepresentedRole: false,
        createdByProposal: false,
        noTimeToAdapt: false,
    };
}

export default function GovernanceWorkspace() {
    const searchQuery = "";
    const {
        activateGovernanceProposal,
        adoptGovernanceProposal,
        advanceGovernanceElection,
        circleMap,
        createGovernanceProposal,
        declareProcessBreakdown,
        discardGovernanceProposal,
        openGovernanceMeeting,
        partnerMap,
        raiseGovernanceObjection,
        resolveGovernanceIntegration,
        restoreProcessBreakdown,
        roleMap,
        snapshot,
        startGovernanceIntegration,
        withdrawGovernanceProposal,
    } = useWorkspaceSnapshot();
    const initialCircleId = snapshot.circles[0]?.id ?? "";
    const initialRoleId =
        snapshot.roles.find((role) => role.circleId === initialCircleId)?.id ??
        snapshot.roles[0]?.id ??
        "";
    const [showProposalComposer, setShowProposalComposer] = useState(false);
    const [showBreakdownComposer, setShowBreakdownComposer] = useState(false);
    const [activeObjectionProposalId, setActiveObjectionProposalId] = useState<string | null>(null);
    const [proposalForm, setProposalForm] = useState<ProposalFormState>(
        buildInitialProposalForm(initialCircleId, initialRoleId),
    );
    const [objectionForms, setObjectionForms] = useState<Record<string, ObjectionFormState>>({});
    const [breakdownForm, setBreakdownForm] = useState<BreakdownFormState>({
        circleId: initialCircleId,
        declaredByRole: "facilitator",
        reason: "",
        additionalCircleLeadId: "",
    });

    const proposalRoleOptions = useMemo(
        () => snapshot.roles.filter((role) => role.circleId === proposalForm.circleId),
        [proposalForm.circleId, snapshot.roles],
    );

    const proposalPolicyOptions = useMemo(
        () => snapshot.policies.filter((policy) => policy.circleId === proposalForm.circleId),
        [proposalForm.circleId, snapshot.policies],
    );

    const existingTargetOptions = useMemo(() => {
        if (proposalForm.changeType.includes("policy")) {
            return proposalPolicyOptions.map((policy) => ({
                id: policy.id,
                label: policy.title,
                summary: policy.summary,
            }));
        }

        return proposalRoleOptions.map((role) => ({
            id: role.id,
            label: role.title,
            summary: role.summary,
        }));
    }, [proposalForm.changeType, proposalPolicyOptions, proposalRoleOptions]);

    const allowsCustomTarget =
        proposalForm.changeType === "create-role" || proposalForm.changeType === "create-policy";
    const filteredProposals = useMemo(
        () =>
            snapshot.governanceProposals.filter((proposal) =>
                isQueryMatch(searchQuery, [
                    proposal.content.title,
                    proposal.content.summary,
                    proposal.tension,
                    proposal.example,
                    circleMap[proposal.circleId]?.title,
                    roleMap[proposal.proposerRoleId]?.title,
                    proposal.status,
                ]),
            ),
        [circleMap, roleMap, searchQuery, snapshot.governanceProposals],
    );
    const filteredMeetings = useMemo(
        () =>
            snapshot.governanceMeetings.filter((meeting) =>
                isQueryMatch(searchQuery, [
                    meeting.title,
                    meeting.intention,
                    meeting.limits,
                    circleMap[meeting.circleId]?.title,
                ]),
            ),
        [circleMap, searchQuery, snapshot.governanceMeetings],
    );
    const filteredElections = useMemo(
        () =>
            snapshot.governanceElections.filter((election) =>
                isQueryMatch(searchQuery, [
                    election.targetRoleLabel,
                    circleMap[election.circleId]?.title,
                    election.status,
                ]),
            ),
        [circleMap, searchQuery, snapshot.governanceElections],
    );
    const filteredBreakdowns = useMemo(
        () =>
            snapshot.processBreakdowns.filter((breakdown) =>
                isQueryMatch(searchQuery, [
                    breakdown.reason,
                    circleMap[breakdown.circleId]?.title,
                    breakdown.status,
                ]),
            ),
        [circleMap, searchQuery, snapshot.processBreakdowns],
    );
    const filteredAuditEntries = useMemo(
        () =>
            snapshot.governanceAuditTrail.filter((entry) =>
                isQueryMatch(searchQuery, [
                    entry.title,
                    entry.summary,
                    circleMap[entry.circleId]?.title,
                ]),
            ),
        [circleMap, searchQuery, snapshot.governanceAuditTrail],
    );

    const proposalCounts = useMemo(
        () => ({
            active: snapshot.governanceProposals.filter((proposal) => proposal.status === "active")
                .length,
            integrating: snapshot.governanceProposals.filter(
                (proposal) => proposal.status === "integrating" || proposal.status === "objected",
            ).length,
            adopted: snapshot.governanceProposals.filter(
                (proposal) => proposal.status === "adopted",
            ).length,
            meetings: snapshot.governanceMeetings.filter(
                (meeting) => meeting.status !== "completed",
            ).length,
        }),
        [snapshot.governanceMeetings, snapshot.governanceProposals],
    );

    const proposalCanSubmit = useMemo(() => {
        const targetId = allowsCustomTarget
            ? proposalForm.newTargetId.trim() ||
              proposalForm.changeTitle.trim().toLowerCase().replace(/\s+/g, "-")
            : proposalForm.existingTargetId;

        return Boolean(
            proposalForm.circleId &&
                proposalForm.proposerRoleId &&
                proposalForm.tension.trim() &&
                proposalForm.example.trim() &&
                proposalForm.explanation.trim() &&
                proposalForm.changeTitle.trim() &&
                proposalForm.changeSummary.trim() &&
                proposalForm.changePayload.trim() &&
                targetId,
        );
    }, [allowsCustomTarget, proposalForm]);

    const handleSubmitProposal = () => {
        const targetId = allowsCustomTarget
            ? proposalForm.newTargetId.trim() ||
              proposalForm.changeTitle.trim().toLowerCase().replace(/\s+/g, "-")
            : proposalForm.existingTargetId;

        const createdProposal = createGovernanceProposal({
            circleId: proposalForm.circleId,
            proposerRoleId: proposalForm.proposerRoleId,
            tension: proposalForm.tension,
            example: proposalForm.example,
            explanation: proposalForm.explanation,
            content: {
                type: proposalForm.changeType,
                targetId,
                title: proposalForm.changeTitle,
                summary: proposalForm.changeSummary,
                payload: proposalForm.changePayload,
                destinationCircleId:
                    proposalForm.changeType === "move-role"
                        ? proposalForm.destinationCircleId || undefined
                        : undefined,
            },
        });

        if (!createdProposal) {
            return;
        }

        setProposalForm(buildInitialProposalForm(initialCircleId, initialRoleId));
        setShowProposalComposer(false);
    };

    const handleSubmitObjection = (proposalId: string) => {
        const proposal = snapshot.governanceProposals.find((entry) => entry.id === proposalId);
        const defaultRoleId =
            snapshot.roles.find((role) => role.circleId === proposal?.circleId)?.id ??
            initialRoleId;
        const currentForm = objectionForms[proposalId] ?? buildEmptyObjectionForm(defaultRoleId);
        const createdObjection = raiseGovernanceObjection({
            proposalId,
            ...currentForm,
        });

        if (!createdObjection) {
            return;
        }

        setObjectionForms((currentForms) => ({
            ...currentForms,
            [proposalId]: buildEmptyObjectionForm(defaultRoleId),
        }));
        setActiveObjectionProposalId(null);
    };

    const handleDeclareBreakdown = () => {
        const breakdown = declareProcessBreakdown({
            circleId: breakdownForm.circleId,
            declaredByRole: breakdownForm.declaredByRole,
            reason: breakdownForm.reason,
            additionalCircleLeadId: breakdownForm.additionalCircleLeadId || undefined,
        });

        if (!breakdown) {
            return;
        }

        setBreakdownForm({
            circleId: initialCircleId,
            declaredByRole: "facilitator",
            reason: "",
            additionalCircleLeadId: "",
        });
        setShowBreakdownComposer(false);
    };

    return (
        <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_40%,#ffffff_100%)] p-6 shadow-sm">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3481FF]">
                            Governance process
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                            Consent-based structural change
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                            Governance changes move through proposal requirements, async objection
                            handling, meeting-based IDM, elections, and process-restoration rules.
                            The UI keeps that full chain visible in one place.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowProposalComposer(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3481FF] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-[#2b74ec]"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Create proposal
                    </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-white/70 bg-white/70 px-5 py-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Active proposals
                        </div>
                        <div className="mt-3 text-3xl font-semibold text-slate-900">
                            {proposalCounts.active}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Proposals currently open for objections or ready for adoption.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/70 bg-white/70 px-5 py-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Integration queue
                        </div>
                        <div className="mt-3 text-3xl font-semibold text-slate-900">
                            {proposalCounts.integrating}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Proposals with valid objections that still need integration work.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/70 bg-white/70 px-5 py-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Governance rooms
                        </div>
                        <div className="mt-3 text-3xl font-semibold text-slate-900">
                            {proposalCounts.meetings}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Scheduled governance meetings ready to process proposals and elections.
                        </p>
                    </div>
                    <div className="rounded-3xl border border-white/70 bg-white/70 px-5 py-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Adopted changes
                        </div>
                        <div className="mt-3 text-3xl font-semibold text-slate-900">
                            {proposalCounts.adopted}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Immutable governance outputs already published into the record.
                        </p>
                    </div>
                </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="space-y-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                            <Scale size={15} aria-hidden="true" />
                            Proposal model
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            Governance can only change defined structural objects
                        </h3>
                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {[
                                {
                                    title: "Roles",
                                    body: "Create, amend, remove, or move roles between circles when governance requires it.",
                                },
                                {
                                    title: "Policies",
                                    body: "Define or amend policies that constrain or grant authority in the circle.",
                                },
                                {
                                    title: "Elections",
                                    body: "Run integrative elections for facilitator, secretary, and circle rep terms.",
                                },
                                {
                                    title: "Audit trail",
                                    body: "Every governance change must leave a visible record with immutable chronology.",
                                },
                            ].map((item) => (
                                <article
                                    key={item.title}
                                    className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                                >
                                    <div className="text-sm font-semibold text-slate-900">
                                        {item.title}
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {item.body}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                            <ScrollText size={15} aria-hidden="true" />
                            Async proposal workflow
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            Proposals move from draft to objection handling, integration, and
                            adoption
                        </h3>

                        <div className="mt-5 space-y-4">
                            {filteredProposals.length > 0 ? (
                                filteredProposals.map((proposal) => {
                                    const proposalObjections = snapshot.governanceObjections.filter(
                                        (objection) => objection.proposalId === proposal.id,
                                    );
                                    const unresolvedObjections = proposalObjections.filter(
                                        (objection) =>
                                            ["raised", "testing", "valid"].includes(
                                                objection.status,
                                            ),
                                    );
                                    const roleOptions = snapshot.roles.filter(
                                        (role) => role.circleId === proposal.circleId,
                                    );
                                    const relatedMeeting = proposal.meetingId
                                        ? snapshot.governanceMeetings.find(
                                              (meeting) => meeting.id === proposal.meetingId,
                                          )
                                        : snapshot.governanceMeetings.find(
                                              (meeting) =>
                                                  meeting.circleId === proposal.circleId &&
                                                  meeting.status !== "completed",
                                          );
                                    const objectionForm =
                                        objectionForms[proposal.id] ??
                                        buildEmptyObjectionForm(roleOptions[0]?.id ?? "");

                                    return (
                                        <article
                                            key={proposal.id}
                                            className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                                        >
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span
                                                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                                                proposalStatusClassNames[
                                                                    proposal.status
                                                                ]
                                                            }`}
                                                        >
                                                            {proposal.status.replace("-", " ")}
                                                        </span>
                                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            {circleMap[proposal.circleId]?.title ??
                                                                proposal.circleId}
                                                        </span>
                                                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                            {proposal.content.type.replace(
                                                                "-",
                                                                " ",
                                                            )}
                                                        </span>
                                                    </div>
                                                    <h4 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-900">
                                                        {proposal.content.title}
                                                    </h4>
                                                    <p className="mt-3 text-sm leading-7 text-slate-600">
                                                        {proposal.content.summary}
                                                    </p>
                                                </div>

                                                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                                                    <div className="font-medium text-slate-900">
                                                        {partnerMap[proposal.proposerId]?.name ??
                                                            proposal.proposerId}
                                                    </div>
                                                    <div className="mt-1">
                                                        representing{" "}
                                                        {roleMap[proposal.proposerRoleId]?.title ??
                                                            proposal.proposerRoleId}
                                                    </div>
                                                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                                                        Created {formatDate(proposal.createdAt)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid gap-4 lg:grid-cols-3">
                                                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Tension
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {proposal.tension}
                                                    </p>
                                                </div>
                                                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Example
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {proposal.example}
                                                    </p>
                                                </div>
                                                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Explanation
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {proposal.explanation}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-5 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                        Objections
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        {proposalObjections.length} total ·{" "}
                                                        {unresolvedObjections.length} unresolved
                                                    </span>
                                                </div>
                                                <div className="mt-4 space-y-3">
                                                    {proposalObjections.length > 0 ? (
                                                        proposalObjections.map((objection) => (
                                                            <div
                                                                key={objection.id}
                                                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                                                            >
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-slate-900">
                                                                            {partnerMap[
                                                                                objection.objectorId
                                                                            ]?.name ??
                                                                                objection.objectorId}
                                                                        </div>
                                                                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                                                                            {roleMap[
                                                                                objection
                                                                                    .objectorRoleId
                                                                            ]?.title ??
                                                                                objection.objectorRoleId}
                                                                        </div>
                                                                    </div>
                                                                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                        {objection.status}
                                                                    </span>
                                                                </div>
                                                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                                                    {objection.concern}
                                                                </p>
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    {[
                                                                        objection.isConstitutionalViolation
                                                                            ? "constitutional violation"
                                                                            : null,
                                                                        objection.impactOnCircle
                                                                            ? "reduces circle capacity"
                                                                            : null,
                                                                        objection.impactOnRepresentedRole
                                                                            ? "limits represented role"
                                                                            : null,
                                                                        objection.createdByProposal
                                                                            ? "created by proposal"
                                                                            : null,
                                                                        objection.noTimeToAdapt
                                                                            ? "no time to adapt"
                                                                            : null,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .map((criterion) => (
                                                                            <span
                                                                                key={criterion}
                                                                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                                                                            >
                                                                                {criterion}
                                                                            </span>
                                                                        ))}
                                                                </div>
                                                                {objection.resolution && (
                                                                    <p className="mt-3 text-sm leading-6 text-emerald-700">
                                                                        {objection.resolution}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                                                            No objections have been raised against
                                                            this proposal yet.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-5 flex flex-wrap gap-3">
                                                {proposal.status === "draft" && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            activateGovernanceProposal(proposal.id)
                                                        }
                                                        className="rounded-full bg-[#3481FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b74ec]"
                                                    >
                                                        Activate proposal
                                                    </button>
                                                )}
                                                {proposal.status === "active" && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setActiveObjectionProposalId(
                                                                activeObjectionProposalId ===
                                                                    proposal.id
                                                                    ? null
                                                                    : proposal.id,
                                                            )
                                                        }
                                                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                                                    >
                                                        Raise objection
                                                    </button>
                                                )}
                                                {proposal.status === "objected" && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startGovernanceIntegration(proposal.id)
                                                        }
                                                        className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
                                                    >
                                                        Start integration
                                                    </button>
                                                )}
                                                {proposal.status === "integrating" && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            resolveGovernanceIntegration(
                                                                proposal.id,
                                                                "Integrated during governance processing and returned for a fresh objection check.",
                                                            )
                                                        }
                                                        className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
                                                    >
                                                        Resolve objections
                                                    </button>
                                                )}
                                                {["active", "integrating"].includes(
                                                    proposal.status,
                                                ) && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            adoptGovernanceProposal(proposal.id)
                                                        }
                                                        disabled={unresolvedObjections.length > 0}
                                                        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Adopt proposal
                                                    </button>
                                                )}
                                                {relatedMeeting &&
                                                    !["withdrawn", "adopted", "discarded"].includes(
                                                        proposal.status,
                                                    ) && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                withdrawGovernanceProposal(
                                                                    proposal.id,
                                                                    relatedMeeting.id,
                                                                )
                                                            }
                                                            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                                                        >
                                                            Bring to meeting
                                                        </button>
                                                    )}
                                                {!["adopted", "discarded"].includes(
                                                    proposal.status,
                                                ) && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            discardGovernanceProposal(
                                                                proposal.id,
                                                                "Discarded because the current proposal package no longer resolves the stated tension well enough.",
                                                            )
                                                        }
                                                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                                                    >
                                                        Discard
                                                    </button>
                                                )}
                                            </div>

                                            {activeObjectionProposalId === proposal.id && (
                                                <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
                                                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#3481FF]">
                                                        <ShieldAlert size={15} aria-hidden="true" />
                                                        Objection requirements
                                                    </div>
                                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                                Represented role
                                                            </label>
                                                            <select
                                                                value={objectionForm.objectorRoleId}
                                                                onChange={(event) =>
                                                                    setObjectionForms(
                                                                        (currentForms) => ({
                                                                            ...currentForms,
                                                                            [proposal.id]: {
                                                                                ...objectionForm,
                                                                                objectorRoleId:
                                                                                    event.target
                                                                                        .value,
                                                                            },
                                                                        }),
                                                                    )
                                                                }
                                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                            >
                                                                {roleOptions.map((role) => (
                                                                    <option
                                                                        key={role.id}
                                                                        value={role.id}
                                                                    >
                                                                        {role.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                                Concern
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={objectionForm.concern}
                                                                onChange={(event) =>
                                                                    setObjectionForms(
                                                                        (currentForms) => ({
                                                                            ...currentForms,
                                                                            [proposal.id]: {
                                                                                ...objectionForm,
                                                                                concern:
                                                                                    event.target
                                                                                        .value,
                                                                            },
                                                                        }),
                                                                    )
                                                                }
                                                                placeholder="State the concrete capacity risk..."
                                                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                        {[
                                                            {
                                                                key: "impactOnCircle" as const,
                                                                label: "Reduces the circle’s capacity",
                                                            },
                                                            {
                                                                key: "impactOnRepresentedRole" as const,
                                                                label: "Limits the represented role’s capacity",
                                                            },
                                                            {
                                                                key: "createdByProposal" as const,
                                                                label: "The concern is created by adopting this proposal",
                                                            },
                                                            {
                                                                key: "noTimeToAdapt" as const,
                                                                label: "There would not be enough time to adapt before harm",
                                                            },
                                                        ].map((criterion) => (
                                                            <label
                                                                key={criterion.key}
                                                                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        objectionForm[criterion.key]
                                                                    }
                                                                    onChange={(event) =>
                                                                        setObjectionForms(
                                                                            (currentForms) => ({
                                                                                ...currentForms,
                                                                                [proposal.id]: {
                                                                                    ...objectionForm,
                                                                                    [criterion.key]:
                                                                                        event.target
                                                                                            .checked,
                                                                                },
                                                                            }),
                                                                        )
                                                                    }
                                                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                                                                />
                                                                <span>{criterion.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <label className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                objectionForm.isConstitutionalViolation
                                                            }
                                                            onChange={(event) =>
                                                                setObjectionForms(
                                                                    (currentForms) => ({
                                                                        ...currentForms,
                                                                        [proposal.id]: {
                                                                            ...objectionForm,
                                                                            isConstitutionalViolation:
                                                                                event.target
                                                                                    .checked,
                                                                        },
                                                                    }),
                                                                )
                                                            }
                                                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                                                        />
                                                        <span>
                                                            This proposal would violate the
                                                            Constitution
                                                        </span>
                                                    </label>
                                                    <div className="mt-5 flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSubmitObjection(proposal.id)
                                                            }
                                                            className="rounded-full bg-[#3481FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b74ec]"
                                                        >
                                                            Save objection
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setActiveObjectionProposalId(null)
                                                            }
                                                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                                    No governance proposals match the current search.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                            <CalendarDays size={15} aria-hidden="true" />
                            Governance meeting room
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            Meetings process agenda items in real time with IDM or elections
                        </h3>
                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            {filteredMeetings.map((meeting) => {
                                const agendaCount = snapshot.governanceAgendaItems.filter(
                                    (item) => item.meetingId === meeting.id,
                                ).length;

                                return (
                                    <article
                                        key={meeting.id}
                                        className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    {circleMap[meeting.circleId]?.title ??
                                                        meeting.circleId}
                                                </div>
                                                <h4 className="mt-2 text-xl font-semibold text-slate-900">
                                                    {meeting.title}
                                                </h4>
                                            </div>
                                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                {meeting.phase.replace("-", " ")}
                                            </span>
                                        </div>
                                        <div className="mt-4 text-sm leading-6 text-slate-600">
                                            {meeting.intention}
                                        </div>
                                        <div className="mt-4 rounded-3xl border border-white/80 bg-white px-4 py-4 text-sm text-slate-600">
                                            <div className="font-medium text-slate-900">
                                                {formatDate(meeting.scheduledAt)}
                                            </div>
                                            <div className="mt-2">
                                                {agendaCount} agenda items ready to process
                                            </div>
                                            <div className="mt-2">
                                                Secretary:{" "}
                                                {partnerMap[meeting.secretaryId]?.name ??
                                                    meeting.secretaryId}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openGovernanceMeeting(meeting.id)}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#3481FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2b74ec]"
                                        >
                                            Open governance room
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                            <Vote size={15} aria-hidden="true" />
                            Election workflow
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            Integrative elections stay separate from proposal decisions
                        </h3>
                        <div className="mt-5 space-y-4">
                            {filteredElections.map((election) => {
                                const nominations = snapshot.governanceNominations.filter(
                                    (nomination) => election.nominationIds.includes(nomination.id),
                                );

                                return (
                                    <article
                                        key={election.id}
                                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    {circleMap[election.circleId]?.title ??
                                                        election.circleId}
                                                </div>
                                                <h4 className="mt-2 text-lg font-semibold text-slate-900">
                                                    {election.targetRoleLabel}
                                                </h4>
                                            </div>
                                            <span
                                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                                    electionStatusClassNames[election.status]
                                                }`}
                                            >
                                                {election.status.replace("-", " ")}
                                            </span>
                                        </div>
                                        <div className="mt-4 text-sm text-slate-600">
                                            Proposed candidate:{" "}
                                            <span className="font-medium text-slate-900">
                                                {election.proposedCandidateId
                                                    ? (partnerMap[election.proposedCandidateId]
                                                          ?.name ?? election.proposedCandidateId)
                                                    : "Awaiting proposal"}
                                            </span>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {nominations.map((nomination) => (
                                                <div
                                                    key={nomination.id}
                                                    className="rounded-2xl border border-white/80 bg-white px-3 py-3 text-sm text-slate-600"
                                                >
                                                    <div className="font-medium text-slate-900">
                                                        {partnerMap[nomination.candidateId]?.name ??
                                                            nomination.candidateId}
                                                    </div>
                                                    <div className="mt-1 leading-6">
                                                        {nomination.reason}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => advanceGovernanceElection(election.id)}
                                            disabled={election.status === "complete"}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Advance election
                                        </button>
                                        <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                                            Term end {formatShortDate(election.expiresAt)}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                                    <BadgeAlert size={15} aria-hidden="true" />
                                    Process breakdown
                                </div>
                                <h3 className="mt-2 text-xl font-semibold text-slate-900">
                                    Declare and restore breakdowns
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBreakdownComposer(true)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                            >
                                <Plus size={15} aria-hidden="true" />
                                Declare
                            </button>
                        </div>
                        <div className="mt-5 space-y-4">
                            {filteredBreakdowns.map((breakdown) => (
                                <article
                                    key={breakdown.id}
                                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-slate-900">
                                            {circleMap[breakdown.circleId]?.title ??
                                                breakdown.circleId}
                                        </div>
                                        <span
                                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                                breakdownStatusClassNames[breakdown.status]
                                            }`}
                                        >
                                            {breakdown.status}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-600">
                                        {breakdown.reason}
                                    </p>
                                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                                        Declared {formatDate(breakdown.declaredAt)}
                                    </div>
                                    {breakdown.additionalCircleLeadId && (
                                        <div className="mt-2 text-sm text-slate-600">
                                            Additional circle lead:{" "}
                                            {partnerMap[breakdown.additionalCircleLeadId]?.name ??
                                                breakdown.additionalCircleLeadId}
                                        </div>
                                    )}
                                    {breakdown.status === "active" && (
                                        <button
                                            type="button"
                                            onClick={() => restoreProcessBreakdown(breakdown.id)}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
                                        >
                                            Restore process
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                            <Gavel size={15} aria-hidden="true" />
                            Immutable audit trail
                        </div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">
                            Published governance chronology
                        </h3>
                        <div className="mt-5 space-y-3">
                            {filteredAuditEntries.map((entry) => (
                                <article
                                    key={entry.id}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-slate-900">
                                            {entry.title}
                                        </div>
                                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                                            {formatDate(entry.occurredAt)}
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {entry.summary}
                                    </p>
                                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                                        {circleMap[entry.circleId]?.title ?? entry.circleId}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {showProposalComposer && (
                <div
                    className="fixed inset-0 z-[68] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm"
                    onClick={() => setShowProposalComposer(false)}
                >
                    <div
                        className="custom-scrollbar w-full max-w-3xl overflow-y-auto rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                                    Proposal composer
                                </div>
                                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                                    Build a governance proposal
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowProposalComposer(false)}
                                className="rounded-full border border-slate-200 p-2 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-700"
                                aria-label="Close proposal composer"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Circle
                                </label>
                                <select
                                    value={proposalForm.circleId}
                                    onChange={(event) => {
                                        const nextCircleId = event.target.value;
                                        const nextRoleId =
                                            snapshot.roles.find(
                                                (role) => role.circleId === nextCircleId,
                                            )?.id ?? "";
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            circleId: nextCircleId,
                                            proposerRoleId: nextRoleId,
                                            existingTargetId: "",
                                        }));
                                    }}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {snapshot.circles.map((circle) => (
                                        <option key={circle.id} value={circle.id}>
                                            {circle.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Represented role
                                </label>
                                <select
                                    value={proposalForm.proposerRoleId}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            proposerRoleId: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {proposalRoleOptions.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Tension
                                </label>
                                <textarea
                                    value={proposalForm.tension}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            tension: event.target.value,
                                        }))
                                    }
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Example
                                </label>
                                <textarea
                                    value={proposalForm.example}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            example: event.target.value,
                                        }))
                                    }
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Reasonable explanation
                                </label>
                                <textarea
                                    value={proposalForm.explanation}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            explanation: event.target.value,
                                        }))
                                    }
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Change type
                                </label>
                                <select
                                    value={proposalForm.changeType}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            changeType: event.target
                                                .value as ProposalFormState["changeType"],
                                            existingTargetId: "",
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="create-role">Create role</option>
                                    <option value="amend-role">Amend role</option>
                                    <option value="remove-role">Remove role</option>
                                    <option value="move-role">Move role</option>
                                    <option value="create-policy">Create policy</option>
                                    <option value="amend-policy">Amend policy</option>
                                    <option value="remove-policy">Remove policy</option>
                                </select>
                            </div>

                            {allowsCustomTarget ? (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        New target ID
                                    </label>
                                    <input
                                        type="text"
                                        value={proposalForm.newTargetId}
                                        onChange={(event) =>
                                            setProposalForm((currentForm) => ({
                                                ...currentForm,
                                                newTargetId: event.target.value,
                                            }))
                                        }
                                        placeholder="governance-steward"
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Existing target
                                    </label>
                                    <select
                                        value={proposalForm.existingTargetId}
                                        onChange={(event) =>
                                            setProposalForm((currentForm) => ({
                                                ...currentForm,
                                                existingTargetId: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="" disabled>
                                            Select a target...
                                        </option>
                                        {existingTargetOptions.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {proposalForm.changeType === "move-role" && (
                            <div className="mt-4">
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Destination circle
                                </label>
                                <select
                                    value={proposalForm.destinationCircleId}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            destinationCircleId: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="" disabled>
                                        Select a destination circle...
                                    </option>
                                    {snapshot.circles
                                        .filter((circle) => circle.id !== proposalForm.circleId)
                                        .map((circle) => (
                                            <option key={circle.id} value={circle.id}>
                                                {circle.title}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        <div className="mt-4 grid gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Change title
                                </label>
                                <input
                                    type="text"
                                    value={proposalForm.changeTitle}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            changeTitle: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Change summary
                                </label>
                                <textarea
                                    value={proposalForm.changeSummary}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            changeSummary: event.target.value,
                                        }))
                                    }
                                    rows={3}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Proposed governance text
                                </label>
                                <textarea
                                    value={proposalForm.changePayload}
                                    onChange={(event) =>
                                        setProposalForm((currentForm) => ({
                                            ...currentForm,
                                            changePayload: event.target.value,
                                        }))
                                    }
                                    rows={4}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={handleSubmitProposal}
                                disabled={!proposalCanSubmit}
                                className="rounded-full bg-[#3481FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b74ec] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Create draft proposal
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowProposalComposer(false)}
                                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBreakdownComposer && (
                <div
                    className="fixed inset-0 z-[68] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm"
                    onClick={() => setShowBreakdownComposer(false)}
                >
                    <div
                        className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                                    Process breakdown
                                </div>
                                <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                                    Declare governance breakdown
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBreakdownComposer(false)}
                                className="rounded-full border border-slate-200 p-2 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-700"
                                aria-label="Close breakdown composer"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Circle
                                </label>
                                <select
                                    value={breakdownForm.circleId}
                                    onChange={(event) =>
                                        setBreakdownForm((currentForm) => ({
                                            ...currentForm,
                                            circleId: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    {snapshot.circles.map((circle) => (
                                        <option key={circle.id} value={circle.id}>
                                            {circle.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Declared by
                                </label>
                                <select
                                    value={breakdownForm.declaredByRole}
                                    onChange={(event) =>
                                        setBreakdownForm((currentForm) => ({
                                            ...currentForm,
                                            declaredByRole: event.target
                                                .value as BreakdownFormState["declaredByRole"],
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="facilitator">Facilitator</option>
                                    <option value="secretary">Secretary</option>
                                    <option value="super-circle-facilitator">
                                        Super-circle facilitator
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Reason
                                </label>
                                <textarea
                                    value={breakdownForm.reason}
                                    onChange={(event) =>
                                        setBreakdownForm((currentForm) => ({
                                            ...currentForm,
                                            reason: event.target.value,
                                        }))
                                    }
                                    rows={4}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Additional circle lead (optional)
                                </label>
                                <select
                                    value={breakdownForm.additionalCircleLeadId}
                                    onChange={(event) =>
                                        setBreakdownForm((currentForm) => ({
                                            ...currentForm,
                                            additionalCircleLeadId: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="">No additional circle lead</option>
                                    {snapshot.partners.map((partner) => (
                                        <option key={partner.id} value={partner.id}>
                                            {partner.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={handleDeclareBreakdown}
                                disabled={!breakdownForm.reason.trim()}
                                className="rounded-full bg-[#3481FF] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2b74ec] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Declare breakdown
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowBreakdownComposer(false)}
                                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
