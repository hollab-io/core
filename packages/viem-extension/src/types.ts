export type PartnerRecord = {
    id: string;
    name: string;
    avatarSeed: string;
};

export type CircleRecord = {
    id: string;
    title: string;
    purpose: string;
    summary: string;
    accent: string;
};

export type RoleRecord = {
    id: string;
    circleId: string;
    title: string;
    summary: string;
    cadence: string;
    scope: string[];
    memberIds: string[];
};

export type PolicyRecord = {
    id: string;
    circleId: string;
    title: string;
    summary: string;
    rule: string;
    recursive: boolean;
};

export type ProjectStage = "future" | "waiting" | "current" | "top" | "done";

export type ProjectRecord = {
    id: string;
    circleId: string;
    roleId: string;
    title: string;
    stage: ProjectStage;
    ownerId?: string;
    subtitle?: string;
    accentToken: string;
    sourceMeetingId?: string;
};

export type ActionRecord = {
    id: string;
    circleId: string;
    roleId: string;
    title: string;
    assigneeId?: string;
    dueDate?: string;
    completedAt?: string;
    completed: boolean;
    createdAt: string;
    sourceMeetingId?: string;
};

export type MeetingStatus = "scheduled" | "in_progress" | "completed";

export type MeetingType = "tactical" | "governance" | "sync";

export type TacticalMeetingRecord = {
    id: string;
    circleId: string;
    title: string;
    meetingType: MeetingType;
    status: MeetingStatus;
    start: string;
    end: string;
    location: string;
    room: string;
    hostId: string;
    participantIds: string[];
    invitedRoleIds: string[];
    category: string;
    accent: string;
    isRecurring: boolean;
    allDay?: boolean;
};

export type MeetingOutputType = "next-action" | "project" | "request" | "information";

export type MeetingOutputRecord = {
    id: string;
    meetingId: string;
    roleId: string;
    type: MeetingOutputType;
    description: string;
    assignedPartnerId?: string;
    actionId?: string;
    projectId?: string;
    createdAt: string;
};

export type GovernanceChangeType =
    | "create-role"
    | "amend-role"
    | "remove-role"
    | "create-policy"
    | "amend-policy"
    | "remove-policy"
    | "move-role"
    | "election";

export type GovernanceProposalStatus =
    | "draft"
    | "active"
    | "objected"
    | "integrating"
    | "adopted"
    | "withdrawn"
    | "discarded";

export type GovernanceAgendaItemStatus = "pending" | "processing" | "complete";

export type GovernanceMeetingPhase = "check-in" | "agenda-processing" | "closing-round";

export type GovernanceAgendaType = "proposal" | "election";

export type GovernanceObjectionStatus =
    | "raised"
    | "testing"
    | "valid"
    | "invalid"
    | "resolved"
    | "abandoned";

export type GovernanceElectionStatus =
    | "nominating"
    | "sharing"
    | "changing"
    | "proposing"
    | "objection-round"
    | "complete";

export type BreakdownStatus = "active" | "restored";

export type DeclaredByRole = "facilitator" | "secretary" | "super-circle-facilitator";

export type GovernanceChangeRecord = {
    type: GovernanceChangeType;
    targetId: string;
    title: string;
    summary: string;
    payload: string;
    destinationCircleId?: string;
};

export type GovernanceProposalRecord = {
    id: string;
    circleId: string;
    proposerId: string;
    proposerRoleId: string;
    tension: string;
    example: string;
    explanation: string;
    content: GovernanceChangeRecord;
    status: GovernanceProposalStatus;
    objectionIds: string[];
    isAsync: boolean;
    meetingId?: string;
    createdAt: string;
    resolvedAt?: string;
};

export type GovernanceObjectionRecord = {
    id: string;
    proposalId: string;
    objectorId: string;
    objectorRoleId: string;
    concern: string;
    isConstitutionalViolation: boolean;
    impactOnCircle: boolean;
    impactOnRepresentedRole: boolean;
    createdByProposal: boolean;
    noTimeToAdapt: boolean;
    status: GovernanceObjectionStatus;
    resolution?: string;
    createdAt: string;
};

export type GovernanceMeetingRecord = {
    id: string;
    circleId: string;
    title: string;
    scheduledById: string;
    facilitatorId: string;
    secretaryId: string;
    intention: string;
    limits: string;
    participantIds: string[];
    agendaItemIds: string[];
    status: MeetingStatus;
    phase: GovernanceMeetingPhase;
    scheduledAt: string;
    startedAt?: string;
    completedAt?: string;
};

export type GovernanceAgendaItemRecord = {
    id: string;
    meetingId: string;
    ownerId: string;
    label: string;
    type: GovernanceAgendaType;
    proposalId?: string;
    electionId?: string;
    status: GovernanceAgendaItemStatus;
};

export type GovernanceElectionRecord = {
    id: string;
    circleId: string;
    targetRoleId: string;
    targetRoleLabel: string;
    termSeconds: number;
    nominationIds: string[];
    proposedCandidateId?: string;
    electedId?: string;
    status: GovernanceElectionStatus;
    electedAt?: string;
    expiresAt?: string;
};

export type GovernanceNominationRecord = {
    id: string;
    electionId: string;
    nominatorId: string;
    candidateId: string;
    reason: string;
    changed: boolean;
    changedTo?: string;
    changeReason?: string;
};

export type ProcessBreakdownRecord = {
    id: string;
    circleId: string;
    declaredById: string;
    declaredByRole: DeclaredByRole;
    reason: string;
    status: BreakdownStatus;
    additionalCircleLeadId?: string;
    declaredAt: string;
    restoredAt?: string;
};

export type GovernanceAuditEntryRecord = {
    id: string;
    circleId: string;
    actorId: string;
    title: string;
    summary: string;
    occurredAt: string;
    proposalId?: string;
    meetingId?: string;
    electionId?: string;
    breakdownId?: string;
};

export type WorkspaceSnapshot = {
    currentPartnerId: string;
    updatedAt: string;
    partners: PartnerRecord[];
    circles: CircleRecord[];
    roles: RoleRecord[];
    policies: PolicyRecord[];
    projects: ProjectRecord[];
    actions: ActionRecord[];
    meetings: TacticalMeetingRecord[];
    meetingOutputs: MeetingOutputRecord[];
    governanceProposals: GovernanceProposalRecord[];
    governanceObjections: GovernanceObjectionRecord[];
    governanceMeetings: GovernanceMeetingRecord[];
    governanceAgendaItems: GovernanceAgendaItemRecord[];
    governanceElections: GovernanceElectionRecord[];
    governanceNominations: GovernanceNominationRecord[];
    processBreakdowns: ProcessBreakdownRecord[];
    governanceAuditTrail: GovernanceAuditEntryRecord[];
};
