import type {
    DeclaredByRole,
    GovernanceChangeRecord,
    GovernanceMeetingPhase,
    GovernanceMeetingRecord,
    TacticalMeetingRecord,
    WorkspaceSnapshot,
} from "@hollab/viem-extension";
import type { PropsWithChildren } from "react";
import {
    createCircleMap,
    createPartnerMap,
    createRoleMap,
    getMockWorkspaceSnapshot,
} from "@hollab/viem-extension";
import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_PROJECT_BOARD_CIRCLE_ID } from "../config/workspace";

type ProjectRecord = WorkspaceSnapshot["projects"][number];
type PolicyRecord = WorkspaceSnapshot["policies"][number];
type GovernanceProposalRecord = WorkspaceSnapshot["governanceProposals"][number];
type GovernanceObjectionRecord = WorkspaceSnapshot["governanceObjections"][number];
type GovernanceElectionRecord = WorkspaceSnapshot["governanceElections"][number];
type GovernanceNominationRecord = WorkspaceSnapshot["governanceNominations"][number];
type ProcessBreakdownRecord = WorkspaceSnapshot["processBreakdowns"][number];
type GovernanceAuditEntryRecord = WorkspaceSnapshot["governanceAuditTrail"][number];

type CreateGovernanceProposalInput = {
    circleId: string;
    proposerRoleId: string;
    tension: string;
    example: string;
    explanation: string;
    content: GovernanceChangeRecord;
    isAsync?: boolean;
    meetingId?: string;
};

type RaiseGovernanceObjectionInput = {
    proposalId: string;
    objectorRoleId: string;
    concern: string;
    isConstitutionalViolation: boolean;
    impactOnCircle: boolean;
    impactOnRepresentedRole: boolean;
    createdByProposal: boolean;
    noTimeToAdapt: boolean;
};

type DeclareProcessBreakdownInput = {
    circleId: string;
    declaredByRole: DeclaredByRole;
    reason: string;
    additionalCircleLeadId?: string;
};

const CUSTOM_PROJECTS_STORAGE_KEY = "hola-modern:workspace:custom-projects";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isValidProjectRecord(value: unknown): value is ProjectRecord {
    return (
        isObjectRecord(value) &&
        typeof value.id === "string" &&
        typeof value.circleId === "string" &&
        typeof value.roleId === "string" &&
        typeof value.title === "string" &&
        ["future", "waiting", "current", "top", "done"].includes(
            typeof value.stage === "string" ? value.stage : "",
        ) &&
        typeof value.accentToken === "string" &&
        (value.ownerId === undefined || typeof value.ownerId === "string") &&
        (value.subtitle === undefined || typeof value.subtitle === "string") &&
        (value.sourceMeetingId === undefined || typeof value.sourceMeetingId === "string")
    );
}

function readPersistedProjects() {
    if (typeof window === "undefined") {
        return [] as ProjectRecord[];
    }

    try {
        const rawValue = window.localStorage.getItem(CUSTOM_PROJECTS_STORAGE_KEY);

        if (!rawValue) {
            return [];
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        return Array.isArray(parsedValue) ? parsedValue.filter(isValidProjectRecord) : [];
    } catch {
        return [];
    }
}

function mergeProjects(baseProjects: ProjectRecord[], customProjects: ProjectRecord[]) {
    const projectsById = new Map(baseProjects.map((project) => [project.id, project]));

    customProjects.forEach((project) => {
        projectsById.set(project.id, project);
    });

    return Array.from(projectsById.values());
}

function buildGovernanceAuditEntry(
    circleId: string,
    actorId: string,
    title: string,
    summary: string,
    refs: Partial<
        Pick<GovernanceAuditEntryRecord, "proposalId" | "meetingId" | "electionId" | "breakdownId">
    > = {},
): GovernanceAuditEntryRecord {
    return {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        circleId,
        actorId,
        title,
        summary,
        occurredAt: new Date().toISOString(),
        ...refs,
    };
}

function getTopElectionCandidate(
    election: GovernanceElectionRecord,
    nominations: GovernanceNominationRecord[],
) {
    const relevantNominations = nominations.filter((nomination) =>
        election.nominationIds.includes(nomination.id),
    );
    const scoreByCandidate = new Map<string, number>();

    relevantNominations.forEach((nomination) => {
        const candidateId = nomination.changedTo ?? nomination.candidateId;
        scoreByCandidate.set(candidateId, (scoreByCandidate.get(candidateId) ?? 0) + 1);
    });

    return Array.from(scoreByCandidate.entries()).sort((left, right) => right[1] - left[1])[0]?.[0];
}

type WorkspaceContextValue = {
    activeGovernanceMeeting: GovernanceMeetingRecord | null;
    activeGovernanceMeetingId: string | null;
    activeMeeting: TacticalMeetingRecord | null;
    activeMeetingId: string | null;
    activateGovernanceProposal: (proposalId: string) => void;
    addProject: (project: WorkspaceSnapshot["projects"][number]) => void;
    adoptGovernanceProposal: (proposalId: string) => boolean;
    advanceGovernanceElection: (electionId: string) => void;
    circleMap: ReturnType<typeof createCircleMap>;
    closeGovernanceMeeting: () => void;
    closeMeeting: () => void;
    createGovernanceProposal: (
        input: CreateGovernanceProposalInput,
    ) => GovernanceProposalRecord | null;
    declareProcessBreakdown: (input: DeclareProcessBreakdownInput) => ProcessBreakdownRecord | null;
    discardGovernanceProposal: (proposalId: string, reason: string) => void;
    governanceMeetingMap: Record<string, GovernanceMeetingRecord>;
    meetingMap: Record<string, TacticalMeetingRecord>;
    openGovernanceMeeting: (meetingId: string) => void;
    openMeeting: (meetingId: string) => void;
    partnerMap: ReturnType<typeof createPartnerMap>;
    policyMap: Record<string, PolicyRecord>;
    projectBoardCircleId: string;
    raiseGovernanceObjection: (
        input: RaiseGovernanceObjectionInput,
    ) => GovernanceObjectionRecord | null;
    resolveGovernanceIntegration: (proposalId: string, resolution: string) => void;
    restoreProcessBreakdown: (breakdownId: string) => void;
    roleMap: ReturnType<typeof createRoleMap>;
    setGovernanceMeetingPhase: (meetingId: string, phase: GovernanceMeetingPhase) => void;
    setProjectBoardCircleId: (circleId: string) => void;
    snapshot: WorkspaceSnapshot;
    startGovernanceIntegration: (proposalId: string) => void;
    toggleActionCompletion: (actionId: string) => void;
    withdrawGovernanceProposal: (proposalId: string, meetingId?: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
    const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(() => {
        const baseSnapshot = getMockWorkspaceSnapshot();

        return {
            ...baseSnapshot,
            projects: mergeProjects(baseSnapshot.projects, readPersistedProjects()),
        };
    });
    const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
    const [activeGovernanceMeetingId, setActiveGovernanceMeetingId] = useState<string | null>(null);
    const [projectBoardCircleId, setProjectBoardCircleId] = useState(
        DEFAULT_PROJECT_BOARD_CIRCLE_ID,
    );

    const partnerMap = useMemo(() => createPartnerMap(snapshot), [snapshot]);
    const circleMap = useMemo(() => createCircleMap(snapshot), [snapshot]);
    const roleMap = useMemo(() => createRoleMap(snapshot), [snapshot]);
    const policyMap = useMemo(
        () => Object.fromEntries(snapshot.policies.map((policy) => [policy.id, policy])),
        [snapshot.policies],
    );
    const meetingMap = useMemo(
        () => Object.fromEntries(snapshot.meetings.map((meeting) => [meeting.id, meeting])),
        [snapshot.meetings],
    );
    const governanceMeetingMap = useMemo(
        () =>
            Object.fromEntries(snapshot.governanceMeetings.map((meeting) => [meeting.id, meeting])),
        [snapshot.governanceMeetings],
    );
    const activeMeeting = activeMeetingId ? (meetingMap[activeMeetingId] ?? null) : null;
    const activeGovernanceMeeting = activeGovernanceMeetingId
        ? (governanceMeetingMap[activeGovernanceMeetingId] ?? null)
        : null;

    const openMeeting = useCallback((meetingId: string) => {
        setActiveMeetingId(meetingId);
    }, []);

    const closeMeeting = useCallback(() => {
        setActiveMeetingId(null);
    }, []);

    const openGovernanceMeeting = useCallback((meetingId: string) => {
        setActiveGovernanceMeetingId(meetingId);
    }, []);

    const closeGovernanceMeeting = useCallback(() => {
        setActiveGovernanceMeetingId(null);
    }, []);

    const toggleActionCompletion = useCallback((actionId: string) => {
        setSnapshot((currentSnapshot) => ({
            ...currentSnapshot,
            actions: currentSnapshot.actions.map((action) => {
                if (action.id !== actionId) {
                    return action;
                }

                const completed = !action.completed;

                return {
                    ...action,
                    completed,
                    completedAt: completed ? new Date().toISOString() : undefined,
                };
            }),
        }));
    }, []);

    const addProject = useCallback((project: ProjectRecord) => {
        const persistedProjects = readPersistedProjects();
        const nextPersistedProjects = mergeProjects(persistedProjects, [project]);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(
                CUSTOM_PROJECTS_STORAGE_KEY,
                JSON.stringify(nextPersistedProjects),
            );
        }

        setSnapshot((currentSnapshot) => ({
            ...currentSnapshot,
            projects: mergeProjects(currentSnapshot.projects, [project]),
        }));
    }, []);

    const createGovernanceProposal = useCallback(
        (input: CreateGovernanceProposalInput) => {
            const normalizedTension = input.tension.trim();
            const normalizedExample = input.example.trim();
            const normalizedExplanation = input.explanation.trim();

            if (
                !input.circleId ||
                !input.proposerRoleId ||
                !normalizedTension ||
                !normalizedExample ||
                !normalizedExplanation ||
                !input.content.title.trim() ||
                !input.content.summary.trim() ||
                !input.content.payload.trim()
            ) {
                return null;
            }

            const proposal: GovernanceProposalRecord = {
                id: `proposal-${Date.now()}`,
                circleId: input.circleId,
                proposerId: snapshot.currentPartnerId,
                proposerRoleId: input.proposerRoleId,
                tension: normalizedTension,
                example: normalizedExample,
                explanation: normalizedExplanation,
                content: {
                    ...input.content,
                    title: input.content.title.trim(),
                    summary: input.content.summary.trim(),
                    payload: input.content.payload.trim(),
                },
                status: "draft",
                objectionIds: [],
                isAsync: input.isAsync ?? true,
                meetingId: input.meetingId,
                createdAt: new Date().toISOString(),
            };

            setSnapshot((currentSnapshot) => ({
                ...currentSnapshot,
                governanceProposals: [proposal, ...currentSnapshot.governanceProposals],
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal created",
                        proposal.content.title,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            }));

            return proposal;
        },
        [snapshot.currentPartnerId],
    );

    const activateGovernanceProposal = useCallback((proposalId: string) => {
        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal || proposal.status === "adopted" || proposal.status === "discarded") {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId ? { ...entry, status: "active" } : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal activated",
                        proposal.content.title,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const raiseGovernanceObjection = useCallback(
        (input: RaiseGovernanceObjectionInput) => {
            const normalizedConcern = input.concern.trim();
            const meetsCriteria =
                input.isConstitutionalViolation ||
                (input.impactOnCircle &&
                    input.impactOnRepresentedRole &&
                    input.createdByProposal &&
                    input.noTimeToAdapt);

            if (
                !input.proposalId ||
                !input.objectorRoleId ||
                !normalizedConcern ||
                !meetsCriteria
            ) {
                return null;
            }

            const objection: GovernanceObjectionRecord = {
                id: `objection-${Date.now()}`,
                proposalId: input.proposalId,
                objectorId: snapshot.currentPartnerId,
                objectorRoleId: input.objectorRoleId,
                concern: normalizedConcern,
                isConstitutionalViolation: input.isConstitutionalViolation,
                impactOnCircle: input.impactOnCircle,
                impactOnRepresentedRole: input.impactOnRepresentedRole,
                createdByProposal: input.createdByProposal,
                noTimeToAdapt: input.noTimeToAdapt,
                status: "raised",
                createdAt: new Date().toISOString(),
            };

            setSnapshot((currentSnapshot) => {
                const proposal = currentSnapshot.governanceProposals.find(
                    (entry) => entry.id === input.proposalId,
                );

                if (!proposal) {
                    return currentSnapshot;
                }

                return {
                    ...currentSnapshot,
                    governanceObjections: [objection, ...currentSnapshot.governanceObjections],
                    governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                        entry.id === input.proposalId
                            ? {
                                  ...entry,
                                  status: "objected",
                                  objectionIds: [...entry.objectionIds, objection.id],
                              }
                            : entry,
                    ),
                    governanceAuditTrail: [
                        buildGovernanceAuditEntry(
                            proposal.circleId,
                            currentSnapshot.currentPartnerId,
                            "Objection raised",
                            normalizedConcern,
                            { proposalId: proposal.id },
                        ),
                        ...currentSnapshot.governanceAuditTrail,
                    ],
                };
            });

            return objection;
        },
        [snapshot.currentPartnerId],
    );

    const startGovernanceIntegration = useCallback((proposalId: string) => {
        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId ? { ...entry, status: "integrating" } : entry,
                ),
                governanceObjections: currentSnapshot.governanceObjections.map((objection) =>
                    objection.proposalId === proposalId &&
                    ["raised", "testing"].includes(objection.status)
                        ? { ...objection, status: "valid" }
                        : objection,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Integration started",
                        `Integration work started for ${proposal.content.title}.`,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const resolveGovernanceIntegration = useCallback((proposalId: string, resolution: string) => {
        const normalizedResolution =
            resolution.trim() || "Integrated through governance processing.";

        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId ? { ...entry, status: "active" } : entry,
                ),
                governanceObjections: currentSnapshot.governanceObjections.map((objection) =>
                    objection.proposalId === proposalId &&
                    ["raised", "testing", "valid"].includes(objection.status)
                        ? { ...objection, status: "resolved", resolution: normalizedResolution }
                        : objection,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Objections resolved",
                        normalizedResolution,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const adoptGovernanceProposal = useCallback((proposalId: string) => {
        let wasAdopted = false;

        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );
            const hasUnresolvedObjections = currentSnapshot.governanceObjections.some(
                (objection) =>
                    objection.proposalId === proposalId &&
                    ["raised", "testing", "valid"].includes(objection.status),
            );

            if (!proposal || hasUnresolvedObjections) {
                return currentSnapshot;
            }

            wasAdopted = true;

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId
                        ? { ...entry, status: "adopted", resolvedAt: new Date().toISOString() }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal adopted",
                        proposal.content.title,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });

        return wasAdopted;
    }, []);

    const withdrawGovernanceProposal = useCallback((proposalId: string, meetingId?: string) => {
        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId
                        ? {
                              ...entry,
                              status: "withdrawn",
                              meetingId: meetingId ?? entry.meetingId,
                              resolvedAt: new Date().toISOString(),
                          }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal withdrawn",
                        meetingId
                            ? "Async processing stopped and the proposal was moved into a governance meeting."
                            : "Async processing stopped and the proposal was withdrawn.",
                        { proposalId: proposal.id, meetingId },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const discardGovernanceProposal = useCallback((proposalId: string, reason: string) => {
        const normalizedReason = reason.trim() || "Discarded during governance processing.";

        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId
                        ? { ...entry, status: "discarded", resolvedAt: new Date().toISOString() }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal discarded",
                        normalizedReason,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const setGovernanceMeetingPhase = useCallback(
        (meetingId: string, phase: GovernanceMeetingPhase) => {
            setSnapshot((currentSnapshot) => {
                const meeting = currentSnapshot.governanceMeetings.find(
                    (entry) => entry.id === meetingId,
                );

                if (!meeting) {
                    return currentSnapshot;
                }

                return {
                    ...currentSnapshot,
                    governanceMeetings: currentSnapshot.governanceMeetings.map((entry) =>
                        entry.id === meetingId
                            ? {
                                  ...entry,
                                  phase,
                                  startedAt: entry.startedAt ?? new Date().toISOString(),
                              }
                            : entry,
                    ),
                    governanceAuditTrail: [
                        buildGovernanceAuditEntry(
                            meeting.circleId,
                            currentSnapshot.currentPartnerId,
                            "Governance meeting phase changed",
                            `${meeting.title} is now in ${phase.replace("-", " ")}.`,
                            { meetingId: meeting.id },
                        ),
                        ...currentSnapshot.governanceAuditTrail,
                    ],
                };
            });
        },
        [],
    );

    const advanceGovernanceElection = useCallback((electionId: string) => {
        const statusOrder: GovernanceElectionRecord["status"][] = [
            "nominating",
            "sharing",
            "changing",
            "proposing",
            "objection-round",
            "complete",
        ];

        setSnapshot((currentSnapshot) => {
            const election = currentSnapshot.governanceElections.find(
                (entry) => entry.id === electionId,
            );

            if (!election || election.status === "complete") {
                return currentSnapshot;
            }

            const currentIndex = statusOrder.indexOf(election.status);
            const nextStatus = statusOrder[Math.min(currentIndex + 1, statusOrder.length - 1)];
            const topCandidateId =
                election.proposedCandidateId ??
                getTopElectionCandidate(election, currentSnapshot.governanceNominations);
            const electedAt =
                nextStatus === "complete" ? new Date().toISOString() : election.electedAt;

            return {
                ...currentSnapshot,
                governanceElections: currentSnapshot.governanceElections.map((entry) =>
                    entry.id === electionId
                        ? {
                              ...entry,
                              status: nextStatus,
                              proposedCandidateId:
                                  nextStatus === "proposing" ||
                                  nextStatus === "objection-round" ||
                                  nextStatus === "complete"
                                      ? topCandidateId
                                      : entry.proposedCandidateId,
                              electedId:
                                  nextStatus === "complete" ? topCandidateId : entry.electedId,
                              electedAt,
                              expiresAt:
                                  nextStatus === "complete"
                                      ? new Date(
                                            Date.now() + entry.termSeconds * 1000,
                                        ).toISOString()
                                      : entry.expiresAt,
                          }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        election.circleId,
                        currentSnapshot.currentPartnerId,
                        nextStatus === "complete" ? "Election completed" : "Election advanced",
                        nextStatus === "complete"
                            ? `${election.targetRoleLabel} assigned to ${topCandidateId ?? "a candidate"}.`
                            : `${election.targetRoleLabel} election moved into ${nextStatus.replace("-", " ")}.`,
                        { electionId: election.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const declareProcessBreakdown = useCallback(
        (input: DeclareProcessBreakdownInput) => {
            const normalizedReason = input.reason.trim();

            if (!input.circleId || !normalizedReason) {
                return null;
            }

            const breakdown: ProcessBreakdownRecord = {
                id: `breakdown-${Date.now()}`,
                circleId: input.circleId,
                declaredById: snapshot.currentPartnerId,
                declaredByRole: input.declaredByRole,
                reason: normalizedReason,
                status: "active",
                additionalCircleLeadId: input.additionalCircleLeadId,
                declaredAt: new Date().toISOString(),
            };

            setSnapshot((currentSnapshot) => ({
                ...currentSnapshot,
                processBreakdowns: [breakdown, ...currentSnapshot.processBreakdowns],
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        breakdown.circleId,
                        currentSnapshot.currentPartnerId,
                        "Process breakdown declared",
                        normalizedReason,
                        { breakdownId: breakdown.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            }));

            return breakdown;
        },
        [snapshot.currentPartnerId],
    );

    const restoreProcessBreakdown = useCallback((breakdownId: string) => {
        setSnapshot((currentSnapshot) => {
            const breakdown = currentSnapshot.processBreakdowns.find(
                (entry) => entry.id === breakdownId,
            );

            if (!breakdown || breakdown.status === "restored") {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                processBreakdowns: currentSnapshot.processBreakdowns.map((entry) =>
                    entry.id === breakdownId
                        ? { ...entry, status: "restored", restoredAt: new Date().toISOString() }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        breakdown.circleId,
                        currentSnapshot.currentPartnerId,
                        "Process restored",
                        "Governance due process was restored for the affected circle.",
                        { breakdownId: breakdown.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const contextValue = useMemo<WorkspaceContextValue>(
        () => ({
            activeGovernanceMeeting,
            activeGovernanceMeetingId,
            activeMeeting,
            activeMeetingId,
            activateGovernanceProposal,
            addProject,
            adoptGovernanceProposal,
            advanceGovernanceElection,
            circleMap,
            closeGovernanceMeeting,
            closeMeeting,
            createGovernanceProposal,
            declareProcessBreakdown,
            discardGovernanceProposal,
            governanceMeetingMap,
            meetingMap,
            openGovernanceMeeting,
            openMeeting,
            partnerMap,
            policyMap,
            projectBoardCircleId,
            raiseGovernanceObjection,
            resolveGovernanceIntegration,
            restoreProcessBreakdown,
            roleMap,
            setGovernanceMeetingPhase,
            setProjectBoardCircleId,
            snapshot,
            startGovernanceIntegration,
            toggleActionCompletion,
            withdrawGovernanceProposal,
        }),
        [
            activeGovernanceMeeting,
            activeGovernanceMeetingId,
            activeMeeting,
            activeMeetingId,
            activateGovernanceProposal,
            addProject,
            adoptGovernanceProposal,
            advanceGovernanceElection,
            circleMap,
            closeGovernanceMeeting,
            closeMeeting,
            createGovernanceProposal,
            declareProcessBreakdown,
            discardGovernanceProposal,
            governanceMeetingMap,
            meetingMap,
            openGovernanceMeeting,
            openMeeting,
            partnerMap,
            policyMap,
            projectBoardCircleId,
            raiseGovernanceObjection,
            resolveGovernanceIntegration,
            restoreProcessBreakdown,
            roleMap,
            setGovernanceMeetingPhase,
            setProjectBoardCircleId,
            snapshot,
            startGovernanceIntegration,
            toggleActionCompletion,
            withdrawGovernanceProposal,
        ],
    );

    return createElement(WorkspaceContext.Provider, { value: contextValue }, children);
}

export function useWorkspaceSnapshot() {
    const context = useContext(WorkspaceContext);

    if (!context) {
        throw new Error("useWorkspaceSnapshot must be used within a WorkspaceProvider");
    }

    return context;
}
