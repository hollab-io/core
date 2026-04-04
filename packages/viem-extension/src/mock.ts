import type {
    ActionRecord,
    CircleRecord,
    MeetingOutputRecord,
    PartnerRecord,
    ProjectRecord,
    RoleRecord,
    TacticalMeetingRecord,
    WorkspaceSnapshot,
} from "./types.js";

function toDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
    ).padStart(2, "0")}`;
}

function buildTimedWindow(
    dayOffset: number,
    hour: number,
    minute: number,
    durationMinutes: number,
) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(hour, minute, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}

function buildAllDayWindow(dayOffset: number, durationDays = 1) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + dayOffset);

    const end = new Date(start);
    end.setDate(end.getDate() + durationDays);

    return {
        start: toDateKey(start),
        end: toDateKey(end),
        allDay: true as const,
    };
}

const PARTNERS: PartnerRecord[] = [
    { id: "elena", name: "Elena Moroz", avatarSeed: "Elena Moroz" },
    { id: "marcus", name: "Marcus Hale", avatarSeed: "Marcus Hale" },
    { id: "felix", name: "Felix Armand", avatarSeed: "Felix Armand" },
    { id: "marta", name: "Marta Klein", avatarSeed: "Marta Klein" },
    { id: "ava", name: "Ava Laurent", avatarSeed: "Ava Laurent" },
    { id: "jon", name: "Jon Beck", avatarSeed: "Jon Beck" },
    { id: "nina", name: "Nina Doyle", avatarSeed: "Nina Doyle" },
    { id: "clara", name: "Clara Dunn", avatarSeed: "Clara Dunn" },
    { id: "john", name: "John Mercer", avatarSeed: "John Mercer" },
    { id: "paul", name: "Paul Novak", avatarSeed: "Paul Novak" },
    { id: "maria", name: "Maria Dvorak", avatarSeed: "Maria Dvorak" },
    { id: "anna", name: "Anna Kovac", avatarSeed: "Anna Kovac" },
    { id: "sarah", name: "Sarah Lewis", avatarSeed: "Sarah Lewis" },
    { id: "bob", name: "Bob Turner", avatarSeed: "Bob Turner" },
    { id: "alice", name: "Alice Chen", avatarSeed: "Alice Chen" },
    { id: "mila", name: "Mila Ross", avatarSeed: "Mila Ross" },
];

const CIRCLES: CircleRecord[] = [
    {
        id: "leadership",
        title: "Leadership & governance",
        purpose: "Align company priorities and hold the constitutional operating model together.",
        summary: "Strategic direction, governance design, and executive coordination.",
        accent: "#4B8DFF",
    },
    {
        id: "product",
        title: "Product & engineering",
        purpose: "Ship coherent product value with technical quality and sustainable delivery.",
        summary: "Product strategy, design, engineering delivery, and platform quality.",
        accent: "#6AA7FF",
    },
    {
        id: "people",
        title: "Employee experience",
        purpose: "Support people systems, onboarding, and learning across the organization.",
        summary: "People operations, onboarding, learning, and employee support.",
        accent: "#7BBAFF",
    },
    {
        id: "growth",
        title: "Growth & support",
        purpose: "Grow revenue, strengthen customer relationships, and keep the market close.",
        summary: "Marketing, sales, support, and customer-facing operations.",
        accent: "#90C2FF",
    },
];

const ROLES: RoleRecord[] = [
    {
        id: "ceo",
        circleId: "leadership",
        title: "CEO",
        summary: "Holds company-wide strategic direction and resolves cross-circle tension.",
        cadence: "Weekly exec sync · Monthly strategy review",
        scope: [
            "Clarify strategic direction",
            "Sponsor major operating decisions",
            "Sequence organizational priorities",
        ],
        memberIds: ["elena", "marcus"],
    },
    {
        id: "cto",
        circleId: "leadership",
        title: "CTO",
        summary: "Owns technical direction, platform quality, and engineering readiness.",
        cadence: "Weekly architecture review",
        scope: ["Guide engineering investments", "Set technical standards", "Reduce delivery risk"],
        memberIds: ["felix", "marta"],
    },
    {
        id: "vision",
        circleId: "leadership",
        title: "Vision",
        summary: "Shapes the story, narrative, and long-term market positioning.",
        cadence: "Bi-weekly strategy shaping",
        scope: [
            "Maintain shared direction",
            "Support product narrative",
            "Frame leadership priorities",
        ],
        memberIds: ["elena"],
    },
    {
        id: "product-circle",
        circleId: "product",
        title: "Product",
        summary: "Coordinates roadmap, product quality, and design-engineering execution.",
        cadence: "Weekly roadmap review",
        scope: [
            "Coordinate roadmap decisions",
            "Hold UX and delivery alignment",
            "Sequence product work",
        ],
        memberIds: ["ava", "jon", "clara"],
    },
    {
        id: "employee-experience",
        circleId: "people",
        title: "Employee Experience",
        summary: "Coordinates onboarding, learning, recruiting, and people support rituals.",
        cadence: "Weekly tactical meeting",
        scope: [
            "Run onboarding systems",
            "Support internal learning",
            "Coordinate people operations",
        ],
        memberIds: ["john", "maria", "anna"],
    },
    {
        id: "growth-role",
        circleId: "growth",
        title: "Growth",
        summary: "Aligns market learning, revenue work, and customer-facing follow-through.",
        cadence: "Weekly pipeline sync",
        scope: [
            "Sequence growth experiments",
            "Track sales conversations",
            "Bring customer insight back to product",
        ],
        memberIds: ["paul", "sarah", "alice"],
    },
    {
        id: "customer-services",
        circleId: "growth",
        title: "Customer Services",
        summary: "Handles support flow and operational clarity for customers.",
        cadence: "Daily support review",
        scope: [
            "Resolve customer issues",
            "Track support queue health",
            "Escalate recurring friction",
        ],
        memberIds: ["bob", "mila"],
    },
];

const PROJECTS: ProjectRecord[] = [
    {
        id: "people-future-playbook",
        circleId: "people",
        roleId: "employee-experience",
        title: "People handbook refresh",
        stage: "future",
        ownerId: "maria",
        subtitle: "Internal documentation",
        accentToken: "bg-sky-400",
    },
    {
        id: "people-waiting-recruiting",
        circleId: "people",
        roleId: "employee-experience",
        title: "Recruiting scorecard rollout",
        stage: "waiting",
        ownerId: "anna",
        subtitle: "Waiting on leadership input",
        accentToken: "bg-yellow-400",
        sourceMeetingId: "people-tactical",
    },
    {
        id: "people-current-onboarding",
        circleId: "people",
        roleId: "employee-experience",
        title: "Onboarding journey redesign",
        stage: "current",
        ownerId: "john",
        subtitle: "Circle lead priority",
        accentToken: "bg-orange-500",
        sourceMeetingId: "people-tactical",
    },
    {
        id: "people-top-rituals",
        circleId: "people",
        roleId: "employee-experience",
        title: "Tactical ritual template",
        stage: "top",
        ownerId: "john",
        subtitle: "Supports all circles",
        accentToken: "bg-red-500",
        sourceMeetingId: "leadership-weekly-sync",
    },
    {
        id: "people-done-workshop",
        circleId: "people",
        roleId: "employee-experience",
        title: "OKR Team Workshop",
        stage: "done",
        ownerId: "maria",
        subtitle: "Completed last week",
        accentToken: "bg-orange-500",
    },
];

const ACTIONS: ActionRecord[] = [
    {
        id: "action-scorecard-template",
        circleId: "people",
        roleId: "employee-experience",
        title: "Finalize recruiting scorecard template",
        assigneeId: "anna",
        dueDate: buildTimedWindow(10, 17, 0, 30).start,
        completed: false,
        createdAt: buildTimedWindow(-3, 10, 0, 15).start,
        sourceMeetingId: "people-tactical",
    },
    {
        id: "action-onboarding-audit",
        circleId: "people",
        roleId: "employee-experience",
        title: "Audit onboarding touchpoints across the first 30 days",
        assigneeId: "john",
        dueDate: buildTimedWindow(7, 11, 0, 30).start,
        completed: false,
        createdAt: buildTimedWindow(-2, 9, 0, 15).start,
        sourceMeetingId: "people-tactical",
    },
    {
        id: "action-support-metrics",
        circleId: "growth",
        roleId: "customer-services",
        title: "Bring support SLA metrics into weekly review",
        assigneeId: "bob",
        completed: false,
        createdAt: buildTimedWindow(-1, 14, 0, 15).start,
    },
    {
        id: "action-okr-follow-up",
        circleId: "people",
        roleId: "employee-experience",
        title: "Send follow-up notes after OKR workshop",
        assigneeId: "maria",
        completed: true,
        completedAt: buildTimedWindow(-7, 16, 30, 15).start,
        createdAt: buildTimedWindow(-8, 11, 0, 15).start,
    },
    {
        id: "action-kpi-review",
        circleId: "leadership",
        roleId: "ceo",
        title: "Update the KPI set we need as a SaaS business",
        assigneeId: "elena",
        completed: false,
        createdAt: buildTimedWindow(-4, 13, 0, 15).start,
    },
    {
        id: "action-customer-notes",
        circleId: "growth",
        roleId: "growth-role",
        title: "Organize customer case studies for next retro",
        assigneeId: "sarah",
        dueDate: buildTimedWindow(5, 15, 0, 30).start,
        completed: false,
        createdAt: buildTimedWindow(-1, 12, 0, 15).start,
        sourceMeetingId: "growth-retro",
    },
];

const MEETINGS: TacticalMeetingRecord[] = [
    {
        id: "leadership-weekly-sync",
        circleId: "leadership",
        title: "Leadership Weekly Sync",
        meetingType: "sync",
        status: "scheduled",
        ...buildTimedWindow(0, 9, 30, 60),
        location: "Prague HQ",
        room: "Blue Room",
        hostId: "elena",
        participantIds: ["elena", "marcus", "felix", "marta"],
        invitedRoleIds: ["ceo", "cto", "vision"],
        category: "Leadership",
        accent: "#8AB4F8",
        isRecurring: true,
    },
    {
        id: "product-roadmap-review",
        circleId: "product",
        title: "Product Roadmap Review",
        meetingType: "sync",
        status: "scheduled",
        ...buildTimedWindow(0, 13, 0, 90),
        location: "Google Meet",
        room: "meet.google.com/roadmap",
        hostId: "ava",
        participantIds: ["ava", "felix", "jon", "marta", "clara"],
        invitedRoleIds: ["product-circle", "cto"],
        category: "Product",
        accent: "#7BAAF7",
        isRecurring: true,
    },
    {
        id: "people-tactical",
        circleId: "people",
        title: "Employee Experience Tactical",
        meetingType: "tactical",
        status: "scheduled",
        ...buildTimedWindow(2, 10, 0, 60),
        location: "Prague HQ",
        room: "Strategy Lab",
        hostId: "john",
        participantIds: ["john", "maria", "anna"],
        invitedRoleIds: ["employee-experience"],
        category: "Operations",
        accent: "#669DF6",
        isRecurring: true,
    },
    {
        id: "easter-monday",
        circleId: "people",
        title: "Easter Monday",
        meetingType: "sync",
        status: "scheduled",
        ...buildAllDayWindow(2),
        location: "Czech Republic",
        room: "Public holiday",
        hostId: "john",
        participantIds: ["elena", "marcus", "felix", "marta", "ava", "john"],
        invitedRoleIds: [],
        category: "Holidays",
        accent: "#81C995",
        isRecurring: false,
    },
    {
        id: "design-hiring-panel",
        circleId: "product",
        title: "Design Hiring Panel",
        meetingType: "sync",
        status: "scheduled",
        ...buildTimedWindow(2, 15, 30, 75),
        location: "Zoom",
        room: "zoom.us/j/design-panel",
        hostId: "clara",
        participantIds: ["clara", "nina", "felix"],
        invitedRoleIds: ["product-circle"],
        category: "Hiring",
        accent: "#AECBFA",
        isRecurring: false,
    },
    {
        id: "all-hands",
        circleId: "leadership",
        title: "Company All-hands",
        meetingType: "sync",
        status: "scheduled",
        ...buildTimedWindow(3, 16, 0, 60),
        location: "Town Hall",
        room: "Main Stage",
        hostId: "elena",
        participantIds: ["elena", "marcus", "felix", "marta", "ava", "john", "paul"],
        invitedRoleIds: ["ceo", "vision"],
        category: "Company",
        accent: "#4285F4",
        isRecurring: false,
    },
    {
        id: "growth-retro",
        circleId: "growth",
        title: "Growth Retro",
        meetingType: "tactical",
        status: "scheduled",
        ...buildTimedWindow(4, 14, 0, 45),
        location: "Google Meet",
        room: "meet.google.com/growth-retro",
        hostId: "paul",
        participantIds: ["paul", "sarah", "alice", "bob"],
        invitedRoleIds: ["growth-role", "customer-services"],
        category: "Growth",
        accent: "#669DF6",
        isRecurring: true,
    },
    {
        id: "felix-one-on-one",
        circleId: "leadership",
        title: "1:1 with Felix",
        meetingType: "sync",
        status: "scheduled",
        ...buildTimedWindow(5, 12, 30, 30),
        location: "Prague HQ",
        room: "Focus Room 2",
        hostId: "elena",
        participantIds: ["elena", "felix"],
        invitedRoleIds: ["ceo", "cto"],
        category: "People",
        accent: "#8AB4F8",
        isRecurring: false,
    },
];

const MEETING_OUTPUTS: MeetingOutputRecord[] = [
    {
        id: "output-people-action",
        meetingId: "people-tactical",
        roleId: "employee-experience",
        type: "next-action",
        description: "Finalize the recruiting scorecard template before next tactical.",
        assignedPartnerId: "anna",
        actionId: "action-scorecard-template",
        createdAt: buildTimedWindow(-2, 10, 45, 15).start,
    },
    {
        id: "output-people-project",
        meetingId: "people-tactical",
        roleId: "employee-experience",
        type: "project",
        description: "Run the onboarding journey redesign as a tracked project.",
        assignedPartnerId: "john",
        projectId: "people-current-onboarding",
        createdAt: buildTimedWindow(-2, 10, 50, 15).start,
    },
    {
        id: "output-growth-action",
        meetingId: "growth-retro",
        roleId: "growth-role",
        type: "next-action",
        description: "Bring customer case studies into the next retro.",
        assignedPartnerId: "sarah",
        actionId: "action-customer-notes",
        createdAt: buildTimedWindow(-1, 14, 35, 15).start,
    },
];

export function getMockWorkspaceSnapshot(): WorkspaceSnapshot {
    return {
        currentPartnerId: "felix",
        updatedAt: new Date().toISOString(),
        partners: PARTNERS,
        circles: CIRCLES,
        roles: ROLES,
        projects: PROJECTS,
        actions: ACTIONS,
        meetings: MEETINGS,
        meetingOutputs: MEETING_OUTPUTS,
    };
}
