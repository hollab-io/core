import type {
    ActionRecord,
    CircleRecord,
    GovernanceAgendaItemRecord,
    GovernanceAuditEntryRecord,
    GovernanceElectionRecord,
    GovernanceMeetingRecord,
    GovernanceNominationRecord,
    GovernanceObjectionRecord,
    GovernanceProposalRecord,
    MeetingOutputRecord,
    PartnerRecord,
    PolicyRecord,
    ProcessBreakdownRecord,
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

const POLICIES: PolicyRecord[] = [
    {
        id: "policy-leadership-role-representation",
        circleId: "leadership",
        title: "Role representation guardrail",
        summary:
            "Limit governance representation to one active role lead per role during async review.",
        rule: "When a role has multiple leads, one lead serves as governance representative unless the secretary expands the list for a specific proposal.",
        recursive: false,
    },
    {
        id: "policy-people-onboarding-handshake",
        circleId: "people",
        title: "Onboarding handshake policy",
        summary: "Clarify which role can amend onboarding rituals affecting multiple teams.",
        rule: "Employee Experience may change onboarding practices that affect all circles only after publishing the change through governance records.",
        recursive: true,
    },
    {
        id: "policy-growth-escalation-window",
        circleId: "growth",
        title: "Customer escalation window",
        summary: "Constrain how support issues escalate into commercial commitments.",
        rule: "Commercial promises impacting implementation or roadmap must be reviewed with the Growth role before they become commitments.",
        recursive: true,
    },
];

const GOVERNANCE_PROPOSALS: GovernanceProposalRecord[] = [
    {
        id: "proposal-leadership-governance-steward",
        circleId: "leadership",
        proposerId: "felix",
        proposerRoleId: "cto",
        tension:
            "Governance changes are scattered across chat threads and difficult for the secretary to consolidate.",
        example:
            "The last facilitator election required copying rationale from multiple places before we could publish the final record.",
        explanation:
            "A Governance Steward role would centralize preparation, record hygiene, and handoff to the secretary, reducing friction before adoption.",
        content: {
            type: "create-role",
            targetId: "governance-steward",
            title: "Create Governance Steward role",
            summary:
                "Introduce a role to prepare proposals, integration notes, and governance publication packages.",
            payload:
                "Purpose: keep governance changes coherent. Accountabilities: structure proposal records, maintain integration notes, and prep outputs for publication.",
        },
        status: "active",
        objectionIds: [],
        isAsync: true,
        createdAt: buildTimedWindow(-4, 11, 15, 15).start,
    },
    {
        id: "proposal-people-onboarding-policy",
        circleId: "people",
        proposerId: "john",
        proposerRoleId: "employee-experience",
        tension:
            "Cross-circle onboarding changes currently bypass governance and create surprise constraints for hiring and support teams.",
        example:
            "A new onboarding checklist was introduced last month and support only discovered the extra obligations after candidate handoff failed.",
        explanation:
            "Amending the onboarding handshake policy would require explicit governance publication before shared rituals change, reducing future surprises.",
        content: {
            type: "amend-policy",
            targetId: "policy-people-onboarding-handshake",
            title: "Amend onboarding handshake policy",
            summary:
                "Require publication-ready governance updates before onboarding obligations change across circles.",
            payload:
                "Employee Experience may amend onboarding workflows for multiple circles only after governance review and publication by the secretary.",
        },
        status: "integrating",
        objectionIds: ["objection-people-recruiting-capacity"],
        isAsync: true,
        meetingId: "meeting-people-governance",
        createdAt: buildTimedWindow(-6, 9, 0, 15).start,
    },
    {
        id: "proposal-product-quality-review",
        circleId: "product",
        proposerId: "ava",
        proposerRoleId: "product-circle",
        tension:
            "Quality review ownership is diffused, so role leads cannot tell who convenes release-risk discussions.",
        example:
            "During the last release, design and engineering both assumed the other would call the release-go / no-go review.",
        explanation:
            "Creating a Product Quality Review policy would make one role explicitly responsible for convening the decision point.",
        content: {
            type: "create-policy",
            targetId: "policy-product-quality-review",
            title: "Create Product Quality Review policy",
            summary: "Establish a mandatory quality review before cross-functional releases.",
            payload:
                "Before a release affecting more than one delivery stream, Product must convene a quality review with design and engineering representatives.",
        },
        status: "draft",
        objectionIds: [],
        isAsync: true,
        createdAt: buildTimedWindow(-1, 16, 10, 15).start,
    },
    {
        id: "proposal-growth-circle-rep-election-rule",
        circleId: "growth",
        proposerId: "paul",
        proposerRoleId: "growth-role",
        tension:
            "The growth circle has no explicit rule for preparing circle rep election context, so broader-circle constraints are surfaced late.",
        example:
            "When the support escalation rule changed, no one was ready to represent the downstream impact in the broader circle.",
        explanation:
            "A small election-prep rule would make tensions visible sooner and help candidates represent the circle effectively.",
        content: {
            type: "create-policy",
            targetId: "policy-growth-circle-rep-prep",
            title: "Create circle rep preparation policy",
            summary: "Require a written tension brief before each circle rep election.",
            payload:
                "Before any circle rep election, circle members publish the top tensions they expect the rep to process in the broader circle.",
        },
        status: "adopted",
        objectionIds: [],
        isAsync: true,
        createdAt: buildTimedWindow(-18, 10, 30, 15).start,
        resolvedAt: buildTimedWindow(-11, 15, 0, 15).start,
    },
];

const GOVERNANCE_OBJECTIONS: GovernanceObjectionRecord[] = [
    {
        id: "objection-people-recruiting-capacity",
        proposalId: "proposal-people-onboarding-policy",
        objectorId: "anna",
        objectorRoleId: "employee-experience",
        concern:
            "The draft policy would make recruiting wait for governance publication even for local checklist adjustments, reducing recruiting capacity during active hiring.",
        isConstitutionalViolation: false,
        impactOnCircle: true,
        impactOnRepresentedRole: true,
        createdByProposal: true,
        noTimeToAdapt: true,
        status: "valid",
        resolution:
            "Narrow the amendment so only cross-circle onboarding obligations require governance publication; local recruiting checklists remain operational work.",
        createdAt: buildTimedWindow(-5, 14, 10, 15).start,
    },
];

const GOVERNANCE_MEETINGS: GovernanceMeetingRecord[] = [
    {
        id: "meeting-leadership-governance",
        circleId: "leadership",
        title: "Leadership Governance Forum",
        scheduledById: "marcus",
        facilitatorId: "elena",
        secretaryId: "marcus",
        intention: "Process active governance proposals and prepare the next elected role term.",
        limits: "Focus on leadership roles, policies, and elected roles only.",
        participantIds: ["elena", "marcus", "felix", "marta"],
        agendaItemIds: [
            "agenda-leadership-steward-proposal",
            "agenda-leadership-facilitator-election",
        ],
        status: "scheduled",
        phase: "agenda-processing",
        scheduledAt: buildTimedWindow(6, 15, 0, 90).start,
        startedAt: buildTimedWindow(6, 15, 0, 90).start,
    },
    {
        id: "meeting-people-governance",
        circleId: "people",
        title: "Special Governance: Onboarding Policy",
        scheduledById: "maria",
        facilitatorId: "john",
        secretaryId: "maria",
        intention: "Resolve the active objection on the onboarding handshake amendment.",
        limits: "Only the onboarding handshake policy may be processed in this meeting.",
        participantIds: ["john", "maria", "anna"],
        agendaItemIds: ["agenda-people-onboarding-policy"],
        status: "scheduled",
        phase: "check-in",
        scheduledAt: buildTimedWindow(2, 16, 30, 60).start,
    },
];

const GOVERNANCE_AGENDA_ITEMS: GovernanceAgendaItemRecord[] = [
    {
        id: "agenda-leadership-steward-proposal",
        meetingId: "meeting-leadership-governance",
        ownerId: "felix",
        label: "Governance Steward role proposal",
        type: "proposal",
        proposalId: "proposal-leadership-governance-steward",
        status: "processing",
    },
    {
        id: "agenda-leadership-facilitator-election",
        meetingId: "meeting-leadership-governance",
        ownerId: "elena",
        label: "Facilitator term election",
        type: "election",
        electionId: "election-leadership-facilitator",
        status: "pending",
    },
    {
        id: "agenda-people-onboarding-policy",
        meetingId: "meeting-people-governance",
        ownerId: "john",
        label: "Onboarding handshake amendment",
        type: "proposal",
        proposalId: "proposal-people-onboarding-policy",
        status: "pending",
    },
];

const GOVERNANCE_ELECTIONS: GovernanceElectionRecord[] = [
    {
        id: "election-leadership-facilitator",
        circleId: "leadership",
        targetRoleId: "facilitator-role",
        targetRoleLabel: "Facilitator",
        termSeconds: 60 * 60 * 24 * 180,
        nominationIds: [
            "nomination-felix-for-facilitator",
            "nomination-elena-for-facilitator",
            "nomination-marta-for-facilitator",
        ],
        proposedCandidateId: "felix",
        status: "objection-round",
        expiresAt: buildTimedWindow(180, 9, 0, 15).start,
    },
    {
        id: "election-product-circle-rep",
        circleId: "product",
        targetRoleId: "circle-rep-role",
        targetRoleLabel: "Circle Rep",
        termSeconds: 60 * 60 * 24 * 120,
        nominationIds: ["nomination-ava-for-circle-rep", "nomination-clara-for-circle-rep"],
        status: "sharing",
    },
];

const GOVERNANCE_NOMINATIONS: GovernanceNominationRecord[] = [
    {
        id: "nomination-felix-for-facilitator",
        electionId: "election-leadership-facilitator",
        nominatorId: "elena",
        candidateId: "felix",
        reason: "Felix has been holding the logic of objections cleanly and keeps the process moving.",
        changed: false,
    },
    {
        id: "nomination-elena-for-facilitator",
        electionId: "election-leadership-facilitator",
        nominatorId: "marta",
        candidateId: "elena",
        reason: "Elena has the broadest view of leadership tensions and keeps integrations grounded.",
        changed: true,
        changedTo: "felix",
        changeReason:
            "After sharing, Felix looked better positioned to facilitate without also carrying the proposer role.",
    },
    {
        id: "nomination-marta-for-facilitator",
        electionId: "election-leadership-facilitator",
        nominatorId: "felix",
        candidateId: "marta",
        reason: "Marta has been neutral across tensions and consistently maintains process focus.",
        changed: false,
    },
    {
        id: "nomination-ava-for-circle-rep",
        electionId: "election-product-circle-rep",
        nominatorId: "jon",
        candidateId: "ava",
        reason: "Ava can translate product tensions into broader-circle governance constraints.",
        changed: false,
    },
    {
        id: "nomination-clara-for-circle-rep",
        electionId: "election-product-circle-rep",
        nominatorId: "clara",
        candidateId: "clara",
        reason: "Clara is closest to cross-functional workflow breakdowns affecting delivery quality.",
        changed: false,
    },
];

const PROCESS_BREAKDOWNS: ProcessBreakdownRecord[] = [
    {
        id: "breakdown-growth-escalation",
        circleId: "growth",
        declaredById: "paul",
        declaredByRole: "facilitator",
        reason: "Repeated proposals on customer commitments stalled without integration, creating a pattern of unresolved constitutional process.",
        status: "active",
        additionalCircleLeadId: "sarah",
        declaredAt: buildTimedWindow(-3, 17, 0, 15).start,
    },
    {
        id: "breakdown-product-release-review",
        circleId: "product",
        declaredById: "ava",
        declaredByRole: "secretary",
        reason: "Release governance proposals cycled between objections and silence until the super-circle facilitator intervened.",
        status: "restored",
        declaredAt: buildTimedWindow(-22, 13, 0, 15).start,
        restoredAt: buildTimedWindow(-12, 15, 30, 15).start,
    },
];

const GOVERNANCE_AUDIT_TRAIL: GovernanceAuditEntryRecord[] = [
    {
        id: "audit-proposal-growth-adopted",
        circleId: "growth",
        actorId: "paul",
        title: "Proposal adopted",
        summary:
            "Circle rep preparation policy was adopted after async review closed without objections.",
        occurredAt: buildTimedWindow(-11, 15, 0, 15).start,
        proposalId: "proposal-growth-circle-rep-election-rule",
    },
    {
        id: "audit-leadership-meeting-scheduled",
        circleId: "leadership",
        actorId: "marcus",
        title: "Governance meeting scheduled",
        summary: "Leadership Governance Forum was scheduled for role and elected-role processing.",
        occurredAt: buildTimedWindow(-2, 10, 0, 15).start,
        meetingId: "meeting-leadership-governance",
    },
    {
        id: "audit-people-objection-raised",
        circleId: "people",
        actorId: "anna",
        title: "Objection raised",
        summary:
            "A valid capacity objection was raised against the onboarding handshake amendment.",
        occurredAt: buildTimedWindow(-5, 14, 10, 15).start,
        proposalId: "proposal-people-onboarding-policy",
    },
    {
        id: "audit-growth-breakdown-declared",
        circleId: "growth",
        actorId: "paul",
        title: "Process breakdown declared",
        summary:
            "Growth circle entered process breakdown due to unresolved governance objections over customer commitments.",
        occurredAt: buildTimedWindow(-3, 17, 0, 15).start,
        breakdownId: "breakdown-growth-escalation",
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
        policies: POLICIES,
        projects: PROJECTS,
        actions: ACTIONS,
        meetings: MEETINGS,
        meetingOutputs: MEETING_OUTPUTS,
        governanceProposals: GOVERNANCE_PROPOSALS,
        governanceObjections: GOVERNANCE_OBJECTIONS,
        governanceMeetings: GOVERNANCE_MEETINGS,
        governanceAgendaItems: GOVERNANCE_AGENDA_ITEMS,
        governanceElections: GOVERNANCE_ELECTIONS,
        governanceNominations: GOVERNANCE_NOMINATIONS,
        processBreakdowns: PROCESS_BREAKDOWNS,
        governanceAuditTrail: GOVERNANCE_AUDIT_TRAIL,
    };
}
