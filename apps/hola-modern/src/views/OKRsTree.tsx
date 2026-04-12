import type {
    GovernanceProposalRecord,
    ProjectRecord,
    WorkspaceSnapshot,
} from "@hollab-io/viem-extension";
import {
    ArrowRight,
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    FolderKanban,
    Gauge,
    Search,
    Sparkles,
    Target,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AppTabId } from "../config/navigation";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

type OkrViewMode = "timeframe" | "hierarchy";

type OKRsTreeProps = {
    onNavigateToTab: (tab: AppTabId) => void;
    view: OkrViewMode;
};

type QuarterMeta = {
    id: string;
    isCurrent: boolean;
    label: string;
    offset: number;
    shortLabel: string;
};

type KeyResultTemplate = {
    id: string;
    label: string;
    linkedActionIds?: string[];
    linkedProjectIds?: string[];
    linkedProposalIds?: string[];
};

type ObjectiveTemplate = {
    circleId: string;
    description: string;
    endOffset: number;
    id: string;
    keyResults: KeyResultTemplate[];
    linkedActionIds: string[];
    linkedProjectIds: string[];
    linkedProposalIds?: string[];
    ownerId?: string;
    roleId: string;
    startOffset: number;
    title: string;
};

type ResolvedKeyResult = {
    id: string;
    label: string;
    progress: number;
};

type ResolvedObjective = ObjectiveTemplate & {
    circleTitle: string;
    linkedActions: WorkspaceSnapshot["actions"];
    linkedProjects: WorkspaceSnapshot["projects"];
    linkedProposals: GovernanceProposalRecord[];
    ownerName?: string;
    progress: number;
    resolvedKeyResults: ResolvedKeyResult[];
    roleTitle: string;
    rowId: string;
    rowSummary: string;
    rowTitle: string;
    selectedForCurrentPartner: boolean;
};

type DetailSelection = {
    circleId?: string;
    circleTitle: string;
    description: string;
    id: string;
    keyResults: ResolvedKeyResult[];
    linkedActions: WorkspaceSnapshot["actions"];
    linkedProjects: WorkspaceSnapshot["projects"];
    linkedProposals: GovernanceProposalRecord[];
    ownerName?: string;
    progress: number;
    rowTitle: string;
    title: string;
};

type HierarchyBlueprintNode = {
    aggregateObjectiveIds?: string[];
    children?: HierarchyBlueprintNode[];
    circleId?: string;
    description: string;
    id: string;
    linkedActionIds?: string[];
    linkedProjectIds?: string[];
    linkedProposalIds?: string[];
    objectiveId?: string;
    subtitle: string;
    title: string;
};

type HierarchyNodeLayout = {
    x: number;
    y: number;
};

type ResolvedHierarchyNode = DetailSelection & {
    children: ResolvedHierarchyNode[];
    depth: number;
    krCount: number;
    subtitle: string;
};

const PROJECT_STAGE_PROGRESS: Record<ProjectRecord["stage"], number> = {
    future: 16,
    waiting: 38,
    current: 62,
    top: 84,
    done: 100,
};

const PROPOSAL_STATUS_PROGRESS: Record<GovernanceProposalRecord["status"], number> = {
    draft: 16,
    active: 42,
    objected: 34,
    integrating: 68,
    adopted: 100,
    withdrawn: 24,
    discarded: 8,
};

const OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
    {
        id: "okr-product-testing",
        circleId: "product",
        description:
            "Bring design partners, release review, and product launch readiness into a single product learning loop.",
        endOffset: 0,
        keyResults: [
            {
                id: "kr-product-research-panel",
                label: "Recruit and schedule the initial design-partner panel",
                linkedActionIds: ["action-product-research-recruiting"],
                linkedProjectIds: ["product-waiting-research-panel"],
            },
            {
                id: "kr-product-launch-evidence",
                label: "Use real user signals in version 3 launch readiness",
                linkedProjectIds: ["product-top-v3-launch"],
            },
        ],
        linkedActionIds: ["action-product-research-recruiting"],
        linkedProjectIds: ["product-waiting-research-panel", "product-top-v3-launch"],
        ownerId: "ava",
        roleId: "product-circle",
        startOffset: -2,
        title: "Activate user testing in every release cycle",
    },
    {
        id: "okr-product-quality",
        circleId: "product",
        description:
            "Turn release quality into a repeatable ritual with explicit governance support and visible ownership.",
        endOffset: 2,
        keyResults: [
            {
                id: "kr-product-rhythm",
                label: "Run one shared release quality review rhythm",
                linkedActionIds: ["action-release-rubric"],
                linkedProjectIds: ["product-current-release-rhythm"],
            },
            {
                id: "kr-product-governance",
                label: "Advance the product quality review policy through governance",
                linkedProposalIds: ["proposal-product-quality-review"],
            },
        ],
        linkedActionIds: ["action-release-rubric"],
        linkedProjectIds: ["product-current-release-rhythm", "product-top-v3-launch"],
        linkedProposalIds: ["proposal-product-quality-review"],
        ownerId: "felix",
        roleId: "product-circle",
        startOffset: -1,
        title: "Ship a release review rhythm teams trust",
    },
    {
        id: "okr-customer-center",
        circleId: "growth",
        description:
            "Build one operating picture for SLA health, escalation patterns, and the support queue across the growth circle.",
        endOffset: 2,
        keyResults: [
            {
                id: "kr-support-command",
                label: "Launch the support command center with visible SLA status",
                linkedProjectIds: ["growth-current-support-command"],
            },
            {
                id: "kr-support-metrics",
                label: "Bring support SLA metrics into the weekly review",
                linkedActionIds: ["action-support-metrics"],
            },
        ],
        linkedActionIds: ["action-support-metrics"],
        linkedProjectIds: ["growth-current-support-command", "growth-done-nps-baseline"],
        ownerId: "bob",
        roleId: "customer-services",
        startOffset: -1,
        title: "Make customer support measurable and visible",
    },
    {
        id: "okr-customer-learning",
        circleId: "growth",
        description:
            "Convert support learnings and customer stories into reusable material for product and growth decisions.",
        endOffset: 2,
        keyResults: [
            {
                id: "kr-customer-stories",
                label: "Keep the customer case-study pipeline moving",
                linkedActionIds: ["action-customer-notes"],
                linkedProjectIds: ["growth-waiting-case-studies"],
            },
            {
                id: "kr-escalation-playbook",
                label: "Publish the escalation playbook inside the support command center",
                linkedActionIds: ["action-support-playbook"],
                linkedProjectIds: ["growth-current-support-command"],
            },
        ],
        linkedActionIds: ["action-customer-notes", "action-support-playbook"],
        linkedProjectIds: ["growth-waiting-case-studies", "growth-current-support-command"],
        ownerId: "sarah",
        roleId: "customer-services",
        startOffset: 0,
        title: "Turn customer signals into reusable insight",
    },
    {
        id: "okr-people-onboarding",
        circleId: "people",
        description:
            "Make onboarding feel intentional across the first 30 days, from recruiting handoff to circle entry.",
        endOffset: 1,
        keyResults: [
            {
                id: "kr-people-audit",
                label: "Audit onboarding touchpoints across the first month",
                linkedActionIds: ["action-onboarding-audit"],
            },
            {
                id: "kr-people-scorecard",
                label: "Roll out the recruiting scorecard without handoff gaps",
                linkedActionIds: ["action-scorecard-template"],
                linkedProjectIds: ["people-waiting-recruiting"],
            },
        ],
        linkedActionIds: ["action-onboarding-audit", "action-scorecard-template"],
        linkedProjectIds: ["people-current-onboarding", "people-waiting-recruiting"],
        ownerId: "john",
        roleId: "employee-experience",
        startOffset: -1,
        title: "Define and promote a reliable onboarding journey",
    },
    {
        id: "okr-people-rituals",
        circleId: "people",
        description:
            "Turn workshops and tactical outputs into repeatable rituals the rest of the organization can adopt quickly.",
        endOffset: 2,
        keyResults: [
            {
                id: "kr-people-ritual-template",
                label: "Publish a reusable tactical ritual template",
                linkedProjectIds: ["people-top-rituals"],
            },
            {
                id: "kr-people-workshop-followup",
                label: "Close the loop on OKR workshop outputs",
                linkedActionIds: ["action-okr-follow-up"],
                linkedProjectIds: ["people-done-workshop"],
            },
        ],
        linkedActionIds: ["action-okr-follow-up"],
        linkedProjectIds: ["people-top-rituals", "people-done-workshop"],
        ownerId: "maria",
        roleId: "employee-experience",
        startOffset: 0,
        title: "Create operating rituals people actually reuse",
    },
];

const HIERARCHY_BLUEPRINT: HierarchyBlueprintNode[] = [
    {
        children: [
            {
                description:
                    "Connect onboarding and recruiting rituals to a shared culture and values story.",
                id: "hier-people-culture",
                objectiveId: "okr-people-onboarding",
                subtitle: "Human Resources in Employee Experience",
                title: "Define and promote company culture and values",
            },
            {
                description:
                    "Create rituals that people reuse and turn workshop outputs into visible operating habits.",
                id: "hier-people-engagement",
                objectiveId: "okr-people-rituals",
                subtitle: "Happiness Officer in Employee Experience",
                title: "Improve internal employee engagement and job satisfaction",
            },
        ],
        circleId: "people",
        description:
            "Tie culture, onboarding, and employee engagement into one visible company focus.",
        id: "hier-people-root",
        subtitle: "In Employee Experience",
        title: "Build a great corporate culture (delight our employees)",
    },
    {
        children: [
            {
                children: [
                    {
                        description:
                            "Use real customer evidence as part of the release cycle instead of relying on internal assumptions only.",
                        id: "hier-product-testing",
                        objectiveId: "okr-product-testing",
                        subtitle: "In Product",
                        title: "Activate user testing of our product",
                    },
                ],
                description:
                    "Make release quality and cross-functional planning explicit before delivery commitments are made.",
                id: "hier-product-planning",
                objectiveId: "okr-product-quality",
                subtitle: "In Product",
                title: "Implement new 360-degree product planning process",
            },
            {
                aggregateObjectiveIds: ["okr-product-quality", "okr-product-testing"],
                circleId: "product",
                description:
                    "Bring version 3 launch readiness into the OKR structure with explicit product milestones and release criteria.",
                id: "hier-product-launch",
                linkedProjectIds: ["product-top-v3-launch"],
                subtitle: "In Product",
                title: "Successfully launch version 3 of our main product",
            },
        ],
        circleId: "product",
        description:
            "Align planning, release quality, and launch readiness around one product operating arc.",
        id: "hier-product-root",
        subtitle: "In Product",
        title: "Make a great product",
    },
    {
        children: [
            {
                aggregateObjectiveIds: ["okr-customer-center", "okr-customer-learning"],
                circleId: "growth",
                description:
                    "Combine support metrics, customer stories, and escalation learnings into a visible improvement loop.",
                id: "hier-growth-satisfaction",
                subtitle: "Customer Happiness Officer in Customer Services",
                title: "Research and improve customer satisfaction",
            },
        ],
        circleId: "growth",
        description:
            "Treat service quality as a strategic promise and feed customer learning back into the organization.",
        id: "hier-growth-root",
        subtitle: "In Customer Services",
        title: "Provide the best Customer Service",
    },
];

const HIERARCHY_LAYOUT: Record<string, HierarchyNodeLayout> = {
    "hier-growth-root": { x: 200, y: 780 },
    "hier-growth-satisfaction": { x: 670, y: 780 },
    "hier-people-culture": { x: 670, y: 78 },
    "hier-people-engagement": { x: 670, y: 232 },
    "hier-people-root": { x: 200, y: 154 },
    "hier-product-launch": { x: 670, y: 520 },
    "hier-product-planning": { x: 670, y: 365 },
    "hier-product-root": { x: 200, y: 486 },
    "hier-product-testing": { x: 1140, y: 365 },
};

const HIERARCHY_CARD_HEIGHT = 108;
const HIERARCHY_CARD_WIDTH = 258;

function clampProgress(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function averageProgress(values: number[]) {
    if (!values.length) {
        return 0;
    }

    return clampProgress(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function createQuarterFromOffset(baseDate: Date, offset: number): QuarterMeta {
    const baseQuarter = Math.floor(baseDate.getMonth() / 3);
    const quarterStart = new Date(baseDate.getFullYear(), baseQuarter * 3, 1);
    quarterStart.setMonth(quarterStart.getMonth() + offset * 3);

    const year = quarterStart.getFullYear();
    const quarterNumber = Math.floor(quarterStart.getMonth() / 3) + 1;

    return {
        id: `${year}-Q${quarterNumber}`,
        isCurrent: offset === 0,
        label: `Q${quarterNumber} '${String(year).slice(-2)}`,
        offset,
        shortLabel: quarterNumber === 1 ? `'${String(year).slice(-2)}` : `Q${quarterNumber}`,
    };
}

function createQuarterWindow(baseDate: Date, windowShift: number) {
    return Array.from({ length: 5 }, (_, index) =>
        createQuarterFromOffset(baseDate, windowShift - 2 + index),
    );
}

function resolveKeyResultProgress(
    projects: WorkspaceSnapshot["projects"],
    actions: WorkspaceSnapshot["actions"],
    proposals: GovernanceProposalRecord[],
) {
    const linkedValues = [
        ...projects.map((project) => PROJECT_STAGE_PROGRESS[project.stage]),
        ...actions.map((action) => (action.completed ? 100 : 42)),
        ...proposals.map((proposal) => PROPOSAL_STATUS_PROGRESS[proposal.status]),
    ];

    return averageProgress(linkedValues);
}

function getCycleLabel(quarters: QuarterMeta[]) {
    if (!quarters.length) {
        return "";
    }

    const firstYear = quarters[0]?.id.slice(0, 4);
    const lastYear = quarters.at(-1)?.id.slice(0, 4);

    return firstYear === lastYear ? `${firstYear} strategic cycle` : `${firstYear} – ${lastYear}`;
}

function getObjectiveSpanLabel(objective: ResolvedObjective) {
    const quarterCount = objective.endOffset - objective.startOffset + 1;

    if (quarterCount >= 4) {
        return "Yearly";
    }

    if (quarterCount === 3) {
        return "Half-yearly";
    }

    return "Quarterly";
}

function getProgressTone(progress: number) {
    if (progress >= 75) {
        return "bg-emerald-500";
    }

    if (progress >= 50) {
        return "bg-[#3481FF]";
    }

    return "bg-amber-500";
}

function dedupeById<T extends { id: string }>(items: T[]) {
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function createSyntheticKeyResult(label: string, progress: number, id: string): ResolvedKeyResult {
    return {
        id,
        label,
        progress,
    };
}

function flattenHierarchyNodes(nodes: ResolvedHierarchyNode[]) {
    const flattened: ResolvedHierarchyNode[] = [];

    const visit = (node: ResolvedHierarchyNode) => {
        flattened.push(node);
        node.children.forEach(visit);
    };

    nodes.forEach(visit);

    return flattened;
}

function buildHierarchyNodeLookup(nodes: ResolvedHierarchyNode[]) {
    return Object.fromEntries(nodes.map((node) => [node.id, node])) as Record<
        string,
        ResolvedHierarchyNode
    >;
}

function ObjectiveBar({
    isSelected,
    objective,
    onSelect,
    quarters,
}: {
    isSelected: boolean;
    objective: ResolvedObjective;
    onSelect: () => void;
    quarters: QuarterMeta[];
}) {
    const firstVisibleOffset = quarters[0]?.offset ?? 0;
    const lastVisibleOffset = quarters.at(-1)?.offset ?? 0;
    const clippedStart = Math.max(objective.startOffset, firstVisibleOffset);
    const clippedEnd = Math.min(objective.endOffset, lastVisibleOffset);

    if (clippedStart > clippedEnd) {
        return null;
    }

    const span = clippedEnd - clippedStart + 1;
    const gridColumn = `${clippedStart - firstVisibleOffset + 1} / span ${span}`;
    const progressTone = getProgressTone(objective.progress);

    return (
        <button
            type="button"
            style={{ gridColumn }}
            onClick={onSelect}
            className={`group relative min-h-[74px] rounded-2xl border px-4 py-3 text-left shadow-sm transition-all ${
                isSelected
                    ? "border-[#3481FF] bg-[#F4F8FF] shadow-[0_16px_40px_-28px_rgba(52,129,255,0.7)]"
                    : "border-slate-200 bg-white/95 hover:-translate-y-0.5 hover:border-[#93BBFF] hover:shadow-[0_18px_38px_-30px_rgba(15,23,42,0.45)]"
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-[#3481FF]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#3481FF]">
                            {getObjectiveSpanLabel(objective)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                            {objective.roleTitle}
                        </span>
                    </div>
                    <h4 className="truncate text-sm font-semibold text-slate-800">
                        {objective.title}
                    </h4>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full rounded-full transition-[width] ${progressTone}`}
                            style={{ width: `${objective.progress}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                        {objective.progress}%
                    </span>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{objective.resolvedKeyResults.length} KRs</span>
                <span aria-hidden="true">•</span>
                <span>{objective.linkedProjects.length} linked projects</span>
                <span aria-hidden="true">•</span>
                <span>{objective.linkedActions.length} next actions</span>
            </div>
        </button>
    );
}

function HierarchyCard({
    isSelected,
    node,
    onSelect,
}: {
    isSelected: boolean;
    node: ResolvedHierarchyNode;
    onSelect: () => void;
}) {
    const layout = HIERARCHY_LAYOUT[node.id];
    const circleInitial = node.circleTitle.charAt(0).toUpperCase();
    const progressDotTone =
        node.progress >= 70
            ? "bg-emerald-400"
            : node.progress >= 40
              ? "bg-[#6AA6FF]"
              : "bg-amber-400";

    if (!layout) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`absolute rounded-[18px] border bg-white/95 px-4 py-3 text-left shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)] transition-all ${
                isSelected
                    ? "border-[#5B9BFF] shadow-[0_26px_52px_-34px_rgba(52,129,255,0.55)]"
                    : "border-slate-200 hover:-translate-y-0.5 hover:border-[#9BC1FF] hover:shadow-[0_22px_44px_-30px_rgba(15,23,42,0.4)]"
            }`}
            style={{
                height: `${HIERARCHY_CARD_HEIGHT}px`,
                left: `${layout.x}px`,
                top: `${layout.y}px`,
                width: `${HIERARCHY_CARD_WIDTH}px`,
            }}
        >
            <div className="flex h-full flex-col justify-between">
                <div>
                    <h4 className="line-clamp-2 text-[15px] font-semibold leading-5 text-slate-700">
                        {node.title}
                    </h4>
                    <p className="mt-2 truncate text-xs text-slate-400">{node.subtitle}</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                        <span className="flex h-4 w-4 items-center justify-center rounded-md bg-[#3481FF] text-[10px] font-semibold text-white">
                            {circleInitial}
                        </span>
                        <span className={`h-2.5 w-2.5 rounded-full ${progressDotTone}`} />
                        <span>
                            {node.krCount} KR{node.krCount === 1 ? "" : "s"}
                        </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-[#DDEAFB]">
                            <div
                                className="h-full rounded-full bg-[#3481FF]"
                                style={{ width: `${node.progress}%` }}
                            />
                        </div>
                        <span className="text-xs font-semibold text-[#5B8ED8]">
                            {node.progress}%
                        </span>
                    </div>
                </div>
            </div>
        </button>
    );
}

function HierarchyConnectorGroup({
    childNodes,
    parent,
}: {
    childNodes: ResolvedHierarchyNode[];
    parent: ResolvedHierarchyNode;
}) {
    if (!childNodes.length) {
        return null;
    }

    const parentLayout = HIERARCHY_LAYOUT[parent.id];

    if (!parentLayout) {
        return null;
    }

    const parentRightX = parentLayout.x + HIERARCHY_CARD_WIDTH;
    const parentCenterY = parentLayout.y + HIERARCHY_CARD_HEIGHT / 2;
    const branchX = parentRightX + 78;
    const childLeftX = Math.min(
        ...childNodes.map((child) => HIERARCHY_LAYOUT[child.id]?.x ?? parentRightX),
    );
    const childCenters = childNodes
        .map((child) => HIERARCHY_LAYOUT[child.id])
        .filter((layout): layout is HierarchyNodeLayout => Boolean(layout))
        .map((layout) => layout.y + HIERARCHY_CARD_HEIGHT / 2);

    if (!childCenters.length) {
        return null;
    }

    const topY = Math.min(...childCenters);
    const bottomY = Math.max(...childCenters);

    return (
        <g>
            <path
                d={`M ${parentRightX} ${parentCenterY} H ${branchX}`}
                fill="none"
                stroke="#71A9F7"
                strokeLinecap="round"
                strokeWidth="2.2"
            />
            {topY !== bottomY && (
                <path
                    d={`M ${branchX} ${topY} V ${bottomY}`}
                    fill="none"
                    stroke="#71A9F7"
                    strokeLinecap="round"
                    strokeWidth="2.2"
                />
            )}
            {childCenters.map((centerY, index) => (
                <path
                    key={`${parent.id}-${childNodes[index]?.id}`}
                    d={`M ${branchX} ${centerY} H ${childLeftX}`}
                    fill="none"
                    stroke="#71A9F7"
                    strokeLinecap="round"
                    strokeWidth="2.2"
                />
            ))}
            <circle cx={branchX} cy={parentCenterY} fill="#3481FF" r="11" />
            <circle
                cx={branchX}
                cy={parentCenterY}
                fill="none"
                r="8"
                stroke="#BFD9FF"
                strokeWidth="1.5"
            />
            <path
                d={`M ${branchX - 4} ${parentCenterY} H ${branchX + 4}`}
                fill="none"
                stroke="#FFFFFF"
                strokeLinecap="round"
                strokeWidth="1.8"
            />
        </g>
    );
}

export default function OKRsTree({ onNavigateToTab, view }: OKRsTreeProps) {
    const { circleMap, meetingMap, partnerMap, roleMap, setProjectBoardCircleId, snapshot } =
        useWorkspaceSnapshot();
    const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
    const [timelineShift, setTimelineShift] = useState(0);
    const [query, setQuery] = useState("");
    const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
    const [selectedHierarchyNodeId, setSelectedHierarchyNodeId] = useState<string | null>(null);
    const [areHierarchyBranchesExpanded, setAreHierarchyBranchesExpanded] = useState(true);
    const detailPanelRef = useRef<HTMLElement | null>(null);
    const shouldRevealDetailsRef = useRef(false);

    const quarters = useMemo(() => createQuarterWindow(new Date(), timelineShift), [timelineShift]);

    const objectives = useMemo<ResolvedObjective[]>(() => {
        const projectMap = new Map(snapshot.projects.map((project) => [project.id, project]));
        const actionMap = new Map(snapshot.actions.map((action) => [action.id, action]));
        const proposalMap = new Map(
            snapshot.governanceProposals.map((proposal) => [proposal.id, proposal]),
        );

        return OBJECTIVE_TEMPLATES.map((template) => {
            const role = roleMap[template.roleId];
            const circle = circleMap[template.circleId];
            const linkedProjects = template.linkedProjectIds
                .map((projectId) => projectMap.get(projectId))
                .filter((project): project is WorkspaceSnapshot["projects"][number] =>
                    Boolean(project),
                );
            const linkedActions = template.linkedActionIds
                .map((actionId) => actionMap.get(actionId))
                .filter((action): action is WorkspaceSnapshot["actions"][number] =>
                    Boolean(action),
                );
            const linkedProposals = (template.linkedProposalIds ?? [])
                .map((proposalId) => proposalMap.get(proposalId))
                .filter((proposal): proposal is GovernanceProposalRecord => Boolean(proposal));
            const resolvedKeyResults = template.keyResults.map((keyResult) => {
                const keyProjects = (keyResult.linkedProjectIds ?? [])
                    .map((projectId) => projectMap.get(projectId))
                    .filter((project): project is WorkspaceSnapshot["projects"][number] =>
                        Boolean(project),
                    );
                const keyActions = (keyResult.linkedActionIds ?? [])
                    .map((actionId) => actionMap.get(actionId))
                    .filter((action): action is WorkspaceSnapshot["actions"][number] =>
                        Boolean(action),
                    );
                const keyProposals = (keyResult.linkedProposalIds ?? [])
                    .map((proposalId) => proposalMap.get(proposalId))
                    .filter((proposal): proposal is GovernanceProposalRecord => Boolean(proposal));

                return {
                    id: keyResult.id,
                    label: keyResult.label,
                    progress: resolveKeyResultProgress(keyProjects, keyActions, keyProposals),
                };
            });

            const inferredProjectOwners = linkedProjects
                .map((project) => project.ownerId)
                .filter(Boolean);
            const inferredActionOwners = linkedActions
                .map((action) => action.assigneeId)
                .filter(Boolean);
            const selectedForCurrentPartner =
                role?.memberIds.includes(snapshot.currentPartnerId) ||
                template.ownerId === snapshot.currentPartnerId ||
                inferredProjectOwners.includes(snapshot.currentPartnerId) ||
                inferredActionOwners.includes(snapshot.currentPartnerId);

            return {
                ...template,
                circleTitle: circle?.title ?? template.circleId,
                linkedActions,
                linkedProjects,
                linkedProposals,
                ownerName: template.ownerId ? partnerMap[template.ownerId]?.name : undefined,
                progress: averageProgress(
                    resolvedKeyResults.map((keyResult) => keyResult.progress),
                ),
                resolvedKeyResults,
                roleTitle: role?.title ?? template.roleId,
                rowId: template.roleId,
                rowSummary: role?.summary ?? circle?.summary ?? template.description,
                rowTitle: role?.title ?? template.roleId,
                selectedForCurrentPartner: Boolean(selectedForCurrentPartner),
            };
        });
    }, [circleMap, partnerMap, roleMap, snapshot]);

    const filteredObjectives = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return objectives.filter((objective) => {
            const passesScope = scopeFilter === "all" || objective.selectedForCurrentPartner;
            const passesQuery =
                !normalizedQuery ||
                objective.title.toLowerCase().includes(normalizedQuery) ||
                objective.description.toLowerCase().includes(normalizedQuery) ||
                objective.roleTitle.toLowerCase().includes(normalizedQuery) ||
                objective.circleTitle.toLowerCase().includes(normalizedQuery);

            return passesScope && passesQuery;
        });
    }, [objectives, query, scopeFilter]);

    const filteredObjectiveIds = filteredObjectives.map((objective) => objective.id);
    const resolvedSelectedObjectiveId =
        selectedObjectiveId && filteredObjectiveIds.includes(selectedObjectiveId)
            ? selectedObjectiveId
            : (filteredObjectiveIds[0] ?? null);
    const selectedObjective =
        filteredObjectives.find((objective) => objective.id === resolvedSelectedObjectiveId) ??
        filteredObjectives[0] ??
        null;

    const objectiveRows = useMemo(() => {
        const rows = new Map<
            string,
            {
                objectives: ResolvedObjective[];
                rowSummary: string;
                rowTitle: string;
            }
        >();

        filteredObjectives.forEach((objective) => {
            const currentRow = rows.get(objective.rowId);

            if (currentRow) {
                currentRow.objectives.push(objective);
                return;
            }

            rows.set(objective.rowId, {
                objectives: [objective],
                rowSummary: objective.rowSummary,
                rowTitle: objective.rowTitle,
            });
        });

        return Array.from(rows.values());
    }, [filteredObjectives]);

    const hierarchyData = useMemo(() => {
        const objectiveMap = new Map(
            filteredObjectives.map((objective) => [objective.id, objective]),
        );
        const projectMap = new Map(snapshot.projects.map((project) => [project.id, project]));
        const actionMap = new Map(snapshot.actions.map((action) => [action.id, action]));
        const proposalMap = new Map(
            snapshot.governanceProposals.map((proposal) => [proposal.id, proposal]),
        );

        const resolveNode = (
            blueprint: HierarchyBlueprintNode,
            depth: number,
        ): ResolvedHierarchyNode | null => {
            const directObjectiveIds = [
                ...(blueprint.objectiveId ? [blueprint.objectiveId] : []),
                ...(blueprint.aggregateObjectiveIds ?? []),
            ];
            const directObjectives = directObjectiveIds
                .map((objectiveId) => objectiveMap.get(objectiveId))
                .filter((objective): objective is ResolvedObjective => Boolean(objective));
            const childNodes = (blueprint.children ?? [])
                .map((childBlueprint) => resolveNode(childBlueprint, depth + 1))
                .filter((child): child is ResolvedHierarchyNode => Boolean(child));

            if (!directObjectives.length && !childNodes.length) {
                return null;
            }

            const linkedProjects = dedupeById([
                ...directObjectives.flatMap((objective) => objective.linkedProjects),
                ...(blueprint.linkedProjectIds ?? [])
                    .map((projectId) => projectMap.get(projectId))
                    .filter((project): project is WorkspaceSnapshot["projects"][number] =>
                        Boolean(project),
                    ),
                ...childNodes.flatMap((child) => child.linkedProjects),
            ]);
            const linkedActions = dedupeById([
                ...directObjectives.flatMap((objective) => objective.linkedActions),
                ...(blueprint.linkedActionIds ?? [])
                    .map((actionId) => actionMap.get(actionId))
                    .filter((action): action is WorkspaceSnapshot["actions"][number] =>
                        Boolean(action),
                    ),
                ...childNodes.flatMap((child) => child.linkedActions),
            ]);
            const linkedProposals = dedupeById([
                ...directObjectives.flatMap((objective) => objective.linkedProposals),
                ...(blueprint.linkedProposalIds ?? [])
                    .map((proposalId) => proposalMap.get(proposalId))
                    .filter((proposal): proposal is GovernanceProposalRecord => Boolean(proposal)),
                ...childNodes.flatMap((child) => child.linkedProposals),
            ]);

            const directKeyResults = directObjectives.flatMap(
                (objective) => objective.resolvedKeyResults,
            );
            const keyResults =
                directKeyResults.length > 0
                    ? directKeyResults
                    : childNodes.length > 0
                      ? childNodes.map((child) =>
                            createSyntheticKeyResult(
                                child.title,
                                child.progress,
                                `synthetic-${blueprint.id}-${child.id}`,
                            ),
                        )
                      : [
                            createSyntheticKeyResult(
                                "Linked execution progress",
                                resolveKeyResultProgress(
                                    linkedProjects,
                                    linkedActions,
                                    linkedProposals,
                                ),
                                `synthetic-${blueprint.id}`,
                            ),
                        ];

            const progressValues = [
                ...directObjectives.map((objective) => objective.progress),
                ...childNodes.map((child) => child.progress),
                ...(linkedProjects.length || linkedActions.length || linkedProposals.length
                    ? [resolveKeyResultProgress(linkedProjects, linkedActions, linkedProposals)]
                    : []),
            ];
            const circleId =
                blueprint.circleId ?? directObjectives[0]?.circleId ?? childNodes[0]?.circleId;
            const circleTitle =
                (circleId ? circleMap[circleId]?.title : undefined) ??
                directObjectives[0]?.circleTitle ??
                childNodes[0]?.circleTitle ??
                "Company";
            const rowTitle =
                directObjectives[0]?.rowTitle ?? childNodes[0]?.rowTitle ?? circleTitle;
            const ownerName =
                directObjectives.find((objective) => objective.ownerName)?.ownerName ??
                childNodes.find((child) => child.ownerName)?.ownerName;

            return {
                children: childNodes,
                circleId,
                circleTitle,
                description: blueprint.description,
                depth,
                id: blueprint.id,
                keyResults,
                krCount:
                    directKeyResults.length > 0
                        ? directKeyResults.length
                        : childNodes.length > 0
                          ? childNodes.length
                          : keyResults.length,
                linkedActions,
                linkedProjects,
                linkedProposals,
                ownerName,
                progress: averageProgress(progressValues),
                rowTitle,
                subtitle: blueprint.subtitle,
                title: blueprint.title,
            };
        };

        const roots = HIERARCHY_BLUEPRINT.map((node) => resolveNode(node, 0)).filter(
            (node): node is ResolvedHierarchyNode => Boolean(node),
        );
        const flatNodes = flattenHierarchyNodes(roots);

        return {
            flatNodes,
            nodeById: buildHierarchyNodeLookup(flatNodes),
            roots,
        };
    }, [
        circleMap,
        filteredObjectives,
        snapshot.actions,
        snapshot.governanceProposals,
        snapshot.projects,
    ]);

    const visibleHierarchyNodes = useMemo(
        () => (areHierarchyBranchesExpanded ? hierarchyData.flatNodes : hierarchyData.roots),
        [areHierarchyBranchesExpanded, hierarchyData.flatNodes, hierarchyData.roots],
    );

    const visibleHierarchyNodeIds = useMemo(
        () => new Set(visibleHierarchyNodes.map((node) => node.id)),
        [visibleHierarchyNodes],
    );

    const hierarchyConnectorGroups = useMemo(
        () =>
            visibleHierarchyNodes
                .map((node) => ({
                    childNodes: node.children.filter((child) =>
                        visibleHierarchyNodeIds.has(child.id),
                    ),
                    parent: node,
                }))
                .filter((group) => group.childNodes.length > 0),
        [visibleHierarchyNodeIds, visibleHierarchyNodes],
    );

    const resolvedSelectedHierarchyNodeId =
        selectedHierarchyNodeId && visibleHierarchyNodeIds.has(selectedHierarchyNodeId)
            ? selectedHierarchyNodeId
            : (visibleHierarchyNodes[0]?.id ?? null);
    const selectedHierarchyNode =
        (resolvedSelectedHierarchyNodeId
            ? hierarchyData.nodeById[resolvedSelectedHierarchyNodeId]
            : null) ?? null;

    const selectedDetails = useMemo<DetailSelection | null>(() => {
        if (view === "hierarchy") {
            return selectedHierarchyNode;
        }

        if (!selectedObjective) {
            return null;
        }

        return {
            circleId: selectedObjective.circleId,
            circleTitle: selectedObjective.circleTitle,
            description: selectedObjective.description,
            id: selectedObjective.id,
            keyResults: selectedObjective.resolvedKeyResults,
            linkedActions: selectedObjective.linkedActions,
            linkedProjects: selectedObjective.linkedProjects,
            linkedProposals: selectedObjective.linkedProposals,
            ownerName: selectedObjective.ownerName,
            progress: selectedObjective.progress,
            rowTitle: selectedObjective.rowTitle,
            title: selectedObjective.title,
        };
    }, [selectedHierarchyNode, selectedObjective, view]);

    const linkedMeetingTitles = useMemo(() => {
        if (!selectedDetails) {
            return [];
        }

        const relatedMeetingIds = [
            ...selectedDetails.linkedProjects
                .map((project) => project.sourceMeetingId)
                .filter(Boolean),
            ...selectedDetails.linkedActions
                .map((action) => action.sourceMeetingId)
                .filter(Boolean),
        ];

        return Array.from(new Set(relatedMeetingIds))
            .map((meetingId) => meetingMap[meetingId as string]?.title)
            .filter(Boolean) as string[];
    }, [meetingMap, selectedDetails]);

    useEffect(() => {
        if (!selectedDetails || !shouldRevealDetailsRef.current) {
            return;
        }

        shouldRevealDetailsRef.current = false;
        requestAnimationFrame(() => {
            detailPanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }, [selectedDetails]);

    const handleObjectiveSelect = (objectiveId: string) => {
        shouldRevealDetailsRef.current = true;
        setSelectedObjectiveId(objectiveId);
    };

    const handleHierarchyNodeSelect = (nodeId: string) => {
        shouldRevealDetailsRef.current = true;
        setSelectedHierarchyNodeId(nodeId);
    };

    return (
        <section className="mx-auto flex h-full w-full max-w-[1720px] flex-col gap-6 py-4">
            {view === "timeframe" ? (
                <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#3481FF]">
                                Strategic alignment
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
                                OKRs across teams, roles, and execution
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                                Your teams have purpose and clear responsibilities. This OKR layer
                                adds cycle focus on top of that structure, then connects each
                                objective back to the projects, actions, and proposals already
                                living in the workspace.
                            </p>
                        </div>

                        <div className="flex w-full max-w-xl flex-col gap-4 xl:items-end">
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                    {[
                                        { id: "all", label: "All OKRs" },
                                        { id: "mine", label: "My OKRs" },
                                    ].map((option) => {
                                        const isActive = scopeFilter === option.id;

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() =>
                                                    setScopeFilter(option.id as "all" | "mine")
                                                }
                                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                                    isActive
                                                        ? "bg-white text-slate-900 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-900"
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <label className="relative block min-w-[260px]">
                                    <span className="sr-only">Search OKRs</span>
                                    <Search
                                        size={16}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="search"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Search an objective or circle"
                                        className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-[#3481FF] focus:ring-4 focus:ring-[#3481FF]/10"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                                    <CalendarRange size={14} aria-hidden="true" />
                                    {getCycleLabel(quarters)}
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                                    <Target size={14} aria-hidden="true" />
                                    {filteredObjectives.length} visible objectives
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium">
                                    <Sparkles size={14} aria-hidden="true" />
                                    Grouped by accountable role
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {view === "timeframe" ? (
                <div className="rounded-[32px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Timeframe
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-slate-900">
                                {getCycleLabel(quarters)}
                            </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setTimelineShift((current) => current - 1)}
                                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
                                    aria-label="Show previous quarters"
                                >
                                    <ChevronLeft size={18} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTimelineShift(0)}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:text-slate-900"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTimelineShift((current) => current + 1)}
                                    className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
                                    aria-label="Show next quarters"
                                >
                                    <ChevronRight size={18} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="custom-scrollbar overflow-x-auto">
                        <div className="min-w-[1320px]">
                            <div className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-slate-200 bg-slate-50/80">
                                <div className="border-r border-slate-200 px-6 py-4">
                                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        Accountable role
                                    </div>
                                </div>
                                <div
                                    className="grid"
                                    style={{
                                        gridTemplateColumns: `repeat(${quarters.length}, minmax(220px, 1fr))`,
                                    }}
                                >
                                    {quarters.map((quarter) => (
                                        <div
                                            key={quarter.id}
                                            className={`border-r border-slate-200 px-5 py-4 last:border-r-0 ${
                                                quarter.isCurrent ? "bg-[#F5F9FF]" : ""
                                            }`}
                                        >
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                                {quarter.shortLabel}
                                            </div>
                                            <div className="mt-2 text-lg font-semibold text-slate-900">
                                                {quarter.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {objectiveRows.length ? (
                                objectiveRows.map((row) => (
                                    <div
                                        key={row.rowTitle}
                                        className="grid grid-cols-[220px_minmax(0,1fr)] border-b border-slate-100 last:border-b-0"
                                    >
                                        <div className="border-r border-slate-100 px-6 py-6">
                                            <div className="text-sm font-semibold text-slate-800">
                                                {row.rowTitle}
                                            </div>
                                            <div className="mt-2 text-sm leading-6 text-slate-500">
                                                {row.rowSummary}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div
                                                className="pointer-events-none absolute inset-0 grid"
                                                style={{
                                                    gridTemplateColumns: `repeat(${quarters.length}, minmax(220px, 1fr))`,
                                                }}
                                            >
                                                {quarters.map((quarter) => (
                                                    <div
                                                        key={quarter.id}
                                                        className={`border-r border-slate-100 last:border-r-0 ${
                                                            quarter.isCurrent
                                                                ? "bg-[#F8FBFF]"
                                                                : "bg-white"
                                                        }`}
                                                    />
                                                ))}
                                            </div>

                                            <div
                                                className="relative grid gap-x-3 gap-y-3 px-3 py-4"
                                                style={{
                                                    gridTemplateColumns: `repeat(${quarters.length}, minmax(220px, 1fr))`,
                                                }}
                                            >
                                                {row.objectives.map((objective) => (
                                                    <ObjectiveBar
                                                        key={objective.id}
                                                        quarters={quarters}
                                                        objective={objective}
                                                        isSelected={
                                                            selectedDetails?.id === objective.id
                                                        }
                                                        onSelect={() =>
                                                            handleObjectiveSelect(objective.id)
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-8 py-16 text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                        <Target size={22} aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                        No OKRs match this filter
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Try switching from My OKRs to All OKRs or search for a
                                        circle, role, or objective title.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-[32px] border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-6 sm:px-8">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div>
                                <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                                    {[
                                        { id: "mine", label: "My OKRs" },
                                        { id: "all", label: "All OKRs" },
                                    ].map((option) => {
                                        const isActive = scopeFilter === option.id;

                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() =>
                                                    setScopeFilter(option.id as "all" | "mine")
                                                }
                                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                                                    isActive
                                                        ? "bg-white text-slate-900 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-900"
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 text-2xl font-semibold text-slate-900">
                                    Strategic hierarchy
                                </div>
                                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
                                    Company focus rolls down through circles, then into concrete
                                    projects, actions, and governance changes already tracked in the
                                    workspace.
                                </p>
                            </div>

                            <div className="flex flex-col items-start gap-3 xl:items-end">
                                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-500">
                                    <Target size={14} aria-hidden="true" />
                                    {visibleHierarchyNodes.length} visible nodes
                                </div>
                                <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-[#3481FF]">
                                    <button
                                        type="button"
                                        onClick={() => setAreHierarchyBranchesExpanded(true)}
                                        className={`transition-colors ${
                                            areHierarchyBranchesExpanded
                                                ? "text-[#3481FF]"
                                                : "text-slate-400 hover:text-[#3481FF]"
                                        }`}
                                    >
                                        Unfold all OKRs
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAreHierarchyBranchesExpanded(false)}
                                        className={`transition-colors ${
                                            !areHierarchyBranchesExpanded
                                                ? "text-[#3481FF]"
                                                : "text-slate-400 hover:text-[#3481FF]"
                                        }`}
                                    >
                                        Fold all OKRs
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="custom-scrollbar overflow-auto">
                        <div className="min-w-[1540px] p-6 sm:p-8">
                            <div className="relative min-h-[980px] overflow-hidden rounded-[28px] border border-slate-100 bg-[radial-gradient(circle_at_18%_16%,rgba(120,168,255,0.16),transparent_32%),radial-gradient(circle_at_72%_20%,rgba(120,168,255,0.12),transparent_28%),radial-gradient(circle_at_52%_64%,rgba(120,168,255,0.12),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
                                <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                                    {hierarchyConnectorGroups.map((group) => (
                                        <HierarchyConnectorGroup
                                            key={group.parent.id}
                                            childNodes={group.childNodes}
                                            parent={group.parent}
                                        />
                                    ))}
                                </svg>

                                {visibleHierarchyNodes.map((node) => (
                                    <HierarchyCard
                                        key={node.id}
                                        isSelected={selectedDetails?.id === node.id}
                                        node={node}
                                        onSelect={() => handleHierarchyNodeSelect(node.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <section
                ref={detailPanelRef}
                className="rounded-[32px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8"
            >
                {selectedDetails ? (
                    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr_0.85fr]">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3481FF]">
                                Selected objective
                            </p>
                            <h3 className="mt-3 text-2xl font-semibold text-slate-900">
                                {selectedDetails.title}
                            </h3>
                            <p className="mt-3 text-sm leading-7 text-slate-500">
                                {selectedDetails.description}
                            </p>

                            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                    {selectedDetails.rowTitle}
                                </div>
                                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                    {selectedDetails.circleTitle}
                                </div>
                                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                                    Owner: {selectedDetails.ownerName ?? "Shared circle lead"}
                                </div>
                            </div>

                            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            Objective progress
                                        </div>
                                        <div className="mt-2 text-3xl font-semibold text-slate-900">
                                            {selectedDetails.progress}%
                                        </div>
                                    </div>
                                    <Gauge
                                        size={28}
                                        className="text-[#3481FF]"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                                    <div
                                        className={`h-full rounded-full ${getProgressTone(selectedDetails.progress)}`}
                                        style={{ width: `${selectedDetails.progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3481FF]">
                                Key results
                            </p>
                            <div className="mt-4 space-y-3">
                                {selectedDetails.keyResults.map((keyResult) => (
                                    <article
                                        key={keyResult.id}
                                        className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="text-sm font-medium leading-6 text-slate-700">
                                                {keyResult.label}
                                            </div>
                                            <div className="text-sm font-semibold text-slate-600">
                                                {keyResult.progress}%
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                            <div
                                                className={`h-full rounded-full ${getProgressTone(keyResult.progress)}`}
                                                style={{ width: `${keyResult.progress}%` }}
                                            />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3481FF]">
                                Connected execution
                            </p>

                            <div className="mt-4 space-y-4">
                                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-800">
                                            Linked projects
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedDetails.circleId) {
                                                    setProjectBoardCircleId(
                                                        selectedDetails.circleId,
                                                    );
                                                }
                                                onNavigateToTab("actions");
                                            }}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-[#3481FF] transition-colors hover:text-blue-700"
                                        >
                                            Open board
                                            <ArrowRight size={15} aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {selectedDetails.linkedProjects.map((project) => (
                                            <div
                                                key={project.id}
                                                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`h-2.5 w-2.5 rounded-full ${project.accentToken}`}
                                                        aria-hidden="true"
                                                    />
                                                    <div className="text-sm font-medium text-slate-700">
                                                        {project.title}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {project.subtitle ?? project.stage}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-slate-800">
                                            Linked actions
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onNavigateToTab("actions")}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-[#3481FF] transition-colors hover:text-blue-700"
                                        >
                                            Open actions
                                            <ArrowRight size={15} aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="mt-3 space-y-2">
                                        {selectedDetails.linkedActions.map((action) => (
                                            <div
                                                key={action.id}
                                                className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                                            >
                                                <div className="text-sm font-medium text-slate-700">
                                                    {action.title}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {action.completed
                                                        ? "Completed"
                                                        : action.assigneeId
                                                          ? `Assigned to ${
                                                                partnerMap[action.assigneeId]
                                                                    ?.name ?? action.assigneeId
                                                            }`
                                                          : "Unassigned"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {(selectedDetails.linkedProposals.length > 0 ||
                                    linkedMeetingTitles.length > 0) && (
                                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                            <FolderKanban size={16} aria-hidden="true" />
                                            Governance and meeting context
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
                                            {selectedDetails.linkedProposals.map((proposal) => (
                                                <button
                                                    key={proposal.id}
                                                    type="button"
                                                    onClick={() => onNavigateToTab("governance")}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-left transition-colors hover:border-[#93BBFF] hover:bg-[#F5F8FF]"
                                                >
                                                    {proposal.content.title}
                                                </button>
                                            ))}
                                            {linkedMeetingTitles.map((meetingTitle) => (
                                                <div
                                                    key={meetingTitle}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2"
                                                >
                                                    {meetingTitle}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                            <Target size={22} aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                            Select an OKR to inspect the details
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                            The selected objective panel shows how each objective connects back to
                            concrete projects, actions, and governance activity in the workspace.
                        </p>
                    </div>
                )}
            </section>
        </section>
    );
}
