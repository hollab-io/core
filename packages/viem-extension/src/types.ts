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

export type WorkspaceSnapshot = {
    currentPartnerId: string;
    updatedAt: string;
    partners: PartnerRecord[];
    circles: CircleRecord[];
    roles: RoleRecord[];
    projects: ProjectRecord[];
    actions: ActionRecord[];
    meetings: TacticalMeetingRecord[];
    meetingOutputs: MeetingOutputRecord[];
};
