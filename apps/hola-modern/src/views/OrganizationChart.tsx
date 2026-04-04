import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    CalendarDays,
    CheckSquare,
    Info,
    KanbanSquare,
    Plus,
    Sparkles,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

type BubbleType = "primary" | "secondary";
type ComposerMode = "circle" | "role" | null;

type CircleNode = {
    id: string;
    title: string;
    label: string;
    x: number;
    y: number;
    r: number;
    type: BubbleType;
    groupId: string;
    summary: string;
    cadence: string;
    scope: string[];
    members: string[];
};

type GroupMeta = {
    id: string;
    title: string;
    accent: string;
    description: string;
    background: {
        x: number;
        y: number;
        r: number;
    };
    parking: {
        x: number;
        y: number;
        r: number;
    };
};

type BubbleMetrics = {
    x: number;
    y: number;
    r: number;
    opacity: number;
    zIndex: number;
};

type GroupLayoutHint = {
    nodesX: number;
    nodesY: number;
    titleMaxWidth: number;
    titleSize: number;
    titleX: number;
    titleY: number;
};

type RoleDraft = {
    targetGroupId: string;
    title: string;
    summary: string;
    cadence: string;
    scope: string;
    members: string;
};

type CircleDraft = {
    title: string;
    summary: string;
    cadence: string;
    scope: string;
    members: string;
    accent: string;
};

const FOCUS_CENTER = { x: 430, y: 470 };
const INITIAL_GROUP_COUNT = 4;

const ACCENT_PALETTE = ["#4B8DFF", "#6AA7FF", "#7BBAFF", "#90C2FF", "#8E8CFF", "#67B8FF"];

const EXTRA_CLUSTER_LAYOUTS = [
    {
        background: { x: 770, y: 245, r: 118 },
        parking: { x: 860, y: 190, r: 88 },
    },
    {
        background: { x: 250, y: 245, r: 118 },
        parking: { x: 130, y: 240, r: 88 },
    },
    {
        background: { x: 765, y: 740, r: 118 },
        parking: { x: 860, y: 700, r: 88 },
    },
];

const GROUP_LAYOUT_HINTS: Record<string, GroupLayoutHint> = {
    leadership: {
        nodesX: -0.18,
        nodesY: -0.16,
        titleMaxWidth: 230,
        titleSize: 34,
        titleX: 0.28,
        titleY: 0.02,
    },
    product: {
        nodesX: -0.02,
        nodesY: -0.18,
        titleMaxWidth: 180,
        titleSize: 26,
        titleX: 0,
        titleY: 0.34,
    },
    people: {
        nodesX: -0.02,
        nodesY: -0.14,
        titleMaxWidth: 190,
        titleSize: 24,
        titleX: 0,
        titleY: 0.34,
    },
    growth: {
        nodesX: -0.02,
        nodesY: -0.12,
        titleMaxWidth: 190,
        titleSize: 24,
        titleX: 0,
        titleY: 0.34,
    },
};

const BUBBLE_SPRING = {
    type: "spring",
    stiffness: 145,
    damping: 24,
    mass: 0.7,
} as const;

const inputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#3B82F6] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const textareaClassName = `${inputClassName} min-h-[110px] resize-y`;
const CUSTOM_GROUPS_STORAGE_KEY = "hola-modern:org-chart:custom-groups";
const CUSTOM_NODES_STORAGE_KEY = "hola-modern:org-chart:custom-nodes";
const GROUP_TO_WORKSPACE_CIRCLE_ID: Record<string, string> = {
    growth: "growth",
    leadership: "leadership",
    people: "people",
    product: "product",
};
const NODE_TO_WORKSPACE_ROLE_ID: Record<string, string> = {
    ceo: "ceo",
    cto: "cto",
    cs: "customer-services",
    ee: "employee-experience",
    growth: "growth-role",
    product: "product-circle",
    vision: "vision",
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isValidPoint(value: unknown): value is {
    x: number;
    y: number;
    r: number;
} {
    return (
        isObjectRecord(value) &&
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        typeof value.r === "number"
    );
}

function isValidGroupMeta(value: unknown): value is GroupMeta {
    return (
        isObjectRecord(value) &&
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.accent === "string" &&
        typeof value.description === "string" &&
        isValidPoint(value.background) &&
        isValidPoint(value.parking)
    );
}

function isValidCircleNode(value: unknown): value is CircleNode {
    return (
        isObjectRecord(value) &&
        typeof value.id === "string" &&
        typeof value.title === "string" &&
        typeof value.label === "string" &&
        typeof value.x === "number" &&
        typeof value.y === "number" &&
        typeof value.r === "number" &&
        (value.type === "primary" || value.type === "secondary") &&
        typeof value.groupId === "string" &&
        typeof value.summary === "string" &&
        typeof value.cadence === "string" &&
        Array.isArray(value.scope) &&
        value.scope.every((item) => typeof item === "string") &&
        Array.isArray(value.members) &&
        value.members.every((item) => typeof item === "string")
    );
}

function isValidGroupMetaArray(value: unknown): value is GroupMeta[] {
    return Array.isArray(value) && value.every(isValidGroupMeta);
}

function isValidCircleNodeArray(value: unknown): value is CircleNode[] {
    return Array.isArray(value) && value.every(isValidCircleNode);
}

function readPersistedItems<T>(storageKey: string, validator: (value: unknown) => value is T[]) {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const rawValue = window.localStorage.getItem(storageKey);

        if (!rawValue) {
            return [];
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        return validator(parsedValue) ? parsedValue : [];
    } catch {
        return [];
    }
}

function mergeById<T extends { id: string }>(baseItems: T[], customItems: T[]) {
    const existingIds = new Set(baseItems.map((item) => item.id));

    return [...baseItems, ...customItems.filter((item) => !existingIds.has(item.id))];
}

const initialGroups: GroupMeta[] = [
    {
        id: "leadership",
        title: "Leadership &\ngovernance",
        accent: "#4B8DFF",
        description: "Strategic direction, governance design, and executive coordination.",
        background: { x: 480, y: 280, r: 200 },
        parking: { x: 170, y: 190, r: 92 },
    },
    {
        id: "product",
        title: "Product &\nengineering",
        accent: "#6AA7FF",
        description: "Product strategy, design, engineering delivery, and platform quality.",
        background: { x: 240, y: 540, r: 200 },
        parking: { x: 180, y: 410, r: 96 },
    },
    {
        id: "people",
        title: "Employee\nexperience",
        accent: "#7BBAFF",
        description: "People operations, onboarding, learning, and employee support.",
        background: { x: 540, y: 720, r: 200 },
        parking: { x: 180, y: 650, r: 96 },
    },
    {
        id: "growth",
        title: "Growth &\nsupport",
        accent: "#90C2FF",
        description: "Marketing, sales, support, and customer-facing operations.",
        background: { x: 770, y: 480, r: 160 },
        parking: { x: 860, y: 420, r: 96 },
    },
];

const initialNodes: CircleNode[] = [
    {
        id: "ceo",
        title: "CEO",
        label: "CEO",
        x: 500,
        y: 300,
        r: 60,
        type: "primary",
        groupId: "leadership",
        summary: "Holds the company-wide strategic direction and resolves cross-circle tension.",
        cadence: "Weekly exec sync · Monthly strategy review",
        scope: [
            "Align company priorities across circles",
            "Clarify governance boundaries",
            "Sponsor major operating decisions",
        ],
        members: ["Elena Moroz", "Marcus Hale"],
    },
    {
        id: "cto",
        title: "CTO",
        label: "CTO",
        x: 390,
        y: 300,
        r: 50,
        type: "primary",
        groupId: "leadership",
        summary: "Owns technical direction, architecture quality, and platform readiness.",
        cadence: "Weekly architecture review",
        scope: [
            "Guide engineering investments",
            "Set technical standards",
            "Surface delivery risks early",
        ],
        members: ["Felix Armand", "Marta Klein"],
    },
    {
        id: "vision",
        title: "Vision",
        label: "Vision",
        x: 610,
        y: 300,
        r: 50,
        type: "primary",
        groupId: "leadership",
        summary: "Translates long-term direction into a coherent narrative and roadmap framing.",
        cadence: "Bi-weekly strategic vision review",
        scope: [
            "Shape narrative for the org",
            "Connect strategy to execution",
            "Keep long-term bets visible",
        ],
        members: ["Nina Solberg", "Tom Ridley"],
    },
    {
        id: "back_office",
        title: "Back Office Circle Rep",
        label: "Back Office\nCircle Rep",
        x: 450,
        y: 395,
        r: 40,
        type: "secondary",
        groupId: "leadership",
        summary: "Represents finance and legal operations inside the leadership space.",
        cadence: "Weekly leadership operations sync",
        scope: [
            "Carry legal and finance tensions upward",
            "Coordinate policy changes",
            "Support execution discipline",
        ],
        members: ["Jonas Berg", "Clara Lu"],
    },
    {
        id: "holacracy",
        title: "Holacracy Summit Project",
        label: "Holacracy\nSummit\nProject",
        x: 550,
        y: 395,
        r: 35,
        type: "secondary",
        groupId: "leadership",
        summary: "Runs the governance improvement stream and experiments for structure changes.",
        cadence: "Monthly governance summit",
        scope: [
            "Test role and policy improvements",
            "Prepare governance proposals",
            "Document org design decisions",
        ],
        members: ["Paul Werner", "Ava Chen"],
    },
    {
        id: "product",
        title: "Product",
        label: "Product",
        x: 260,
        y: 500,
        r: 55,
        type: "primary",
        groupId: "product",
        summary:
            "Connects product strategy, design, and engineering delivery into one execution circle.",
        cadence: "Weekly product delivery review",
        scope: [
            "Prioritize roadmap execution",
            "Balance product quality and speed",
            "Coordinate product and engineering roles",
        ],
        members: ["Ava Chen", "Felix Armand", "Mila Novak"],
    },
    {
        id: "trans",
        title: "Translation Expert",
        label: "Translation\nExpert",
        x: 260,
        y: 413,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Ensures product language and internal documentation stay clear across markets.",
        cadence: "Weekly language QA",
        scope: ["Review copy consistency", "Support localization handoff"],
        members: ["Lena Ortiz"],
    },
    {
        id: "dev_be",
        title: "Development Back End",
        label: "Development\nBack End",
        x: 321.5,
        y: 438.5,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary:
            "Builds core APIs, integration logic, and backend reliability for product delivery.",
        cadence: "Twice-weekly engineering sync",
        scope: ["Own API quality and uptime", "Ship backend capabilities for roadmap work"],
        members: ["Marta Klein", "Ravi Shah"],
    },
    {
        id: "dev_fe",
        title: "Developer Front End",
        label: "Developer\nFront End",
        x: 347,
        y: 500,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Owns the user-facing experience and implementation quality of the product UI.",
        cadence: "UI review every Tuesday",
        scope: ["Ship responsive product interfaces", "Maintain interaction quality"],
        members: ["Mila Novak", "Sarah Kim"],
    },
    {
        id: "infra",
        title: "Infrastructure & Security",
        label: "Infrastructure\n& Security",
        x: 321.5,
        y: 561.5,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Keeps delivery environments stable, secure, and production-ready.",
        cadence: "Weekly reliability review",
        scope: ["Own runtime hardening", "Reduce operational risk"],
        members: ["Marcus Hale", "Iris Patel"],
    },
    {
        id: "pm",
        title: "Product Manager",
        label: "Product\nManager",
        x: 260,
        y: 587,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Shapes scope, sequencing, and outcome framing for roadmap work.",
        cadence: "Roadmap sync every Thursday",
        scope: ["Prioritize work across teams", "Keep outcomes measurable"],
        members: ["Ava Chen"],
    },
    {
        id: "dev_mgr",
        title: "Development Manager",
        label: "Development\nManager",
        x: 198.5,
        y: 561.5,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Supports engineering throughput, staffing, and execution health.",
        cadence: "Weekly delivery health check",
        scope: ["Unblock engineering delivery", "Coordinate staffing and priorities"],
        members: ["Felix Armand"],
    },
    {
        id: "design",
        title: "Design",
        label: "Design",
        x: 173,
        y: 500,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Leads product design decisions, flows, and visual coherence.",
        cadence: "Design critique every Monday",
        scope: ["Craft product interaction patterns", "Maintain usability and consistency"],
        members: ["Mila Novak", "Clara Lu"],
    },
    {
        id: "mobile",
        title: "Mobile App",
        label: "Mobile\nApp",
        x: 198.5,
        y: 438.5,
        r: 30,
        type: "secondary",
        groupId: "product",
        summary: "Owns the mobile-specific product surface and release quality.",
        cadence: "Weekly mobile release review",
        scope: ["Ship native app improvements", "Track mobile experience health"],
        members: ["Noah Price", "Sarah Kim"],
    },
    {
        id: "ee",
        title: "Employee Experience",
        label: "Employee\nExperience",
        x: 500,
        y: 700,
        r: 55,
        type: "primary",
        groupId: "people",
        summary: "Designs the employee lifecycle, support systems, and people operations routines.",
        cadence: "Weekly people ops planning",
        scope: [
            "Own employee journey health",
            "Coordinate support and development programs",
            "Maintain role clarity for people processes",
        ],
        members: ["Nina Solberg", "Maria Costa"],
    },
    {
        id: "onb",
        title: "Onboarding",
        label: "Onboarding",
        x: 500,
        y: 615,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Creates a smooth first-week and first-month experience for new joiners.",
        cadence: "New hire check-in every Friday",
        scope: ["Run onboarding sequence", "Keep joining experience consistent"],
        members: ["Maria Costa"],
    },
    {
        id: "comp",
        title: "Compensation Architect",
        label: "Compensation\nArchitect",
        x: 546,
        y: 628.5,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Shapes compensation structures, progression logic, and market alignment.",
        cadence: "Monthly compensation review",
        scope: ["Maintain pay framework", "Model compensation changes"],
        members: ["Jonas Berg"],
    },
    {
        id: "ho",
        title: "Happiness Officer",
        label: "Happiness\nOfficer",
        x: 577.3,
        y: 664.7,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Tracks engagement, morale, and cultural friction signals inside the org.",
        cadence: "Bi-weekly engagement pulse",
        scope: ["Measure team sentiment", "Design cultural interventions"],
        members: ["Lena Ortiz"],
    },
    {
        id: "dei",
        title: "DEI Champion",
        label: "DEI\nChampion",
        x: 584.1,
        y: 712.1,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Keeps diversity, equity, and inclusion visible in people decisions.",
        cadence: "Monthly inclusion review",
        scope: ["Audit inclusion practices", "Raise equity concerns early"],
        members: ["Nina Solberg"],
    },
    {
        id: "ld",
        title: "Learning & Development",
        label: "Learning &\nDevelopment",
        x: 564.2,
        y: 755.7,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Builds learning programs and capability growth paths for teams.",
        cadence: "Quarterly capability planning",
        scope: ["Design learning programs", "Support role growth and mentoring"],
        members: ["Maria Costa", "Paul Werner"],
    },
    {
        id: "ma",
        title: "Members Assembly",
        label: "Members\nAssembly",
        x: 523.9,
        y: 781.6,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Coordinates broad participation rituals and shared decision moments.",
        cadence: "Monthly member assembly",
        scope: ["Prepare assembly agenda", "Make participation visible"],
        members: ["Clara Lu", "Tom Ridley"],
    },
    {
        id: "cr",
        title: "Circle Rep",
        label: "Circle\nRep",
        x: 476.1,
        y: 781.6,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Carries operational tensions from people programs into governance conversations.",
        cadence: "Weekly representation sync",
        scope: ["Escalate structural tensions", "Keep people concerns connected to governance"],
        members: ["Paul Werner"],
    },
    {
        id: "rec",
        title: "Recruitment",
        label: "Recruitment",
        x: 435.8,
        y: 755.7,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Owns hiring funnel health, candidate quality, and recruiting coordination.",
        cadence: "Hiring sync every Wednesday",
        scope: ["Run candidate pipeline", "Coordinate hiring stakeholders"],
        members: ["Iris Patel", "Clara Lu"],
    },
    {
        id: "hr",
        title: "Human Resources",
        label: "Human\nResources",
        x: 415.9,
        y: 712.1,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Maintains people policy, employee support, and compliance routines.",
        cadence: "Weekly HR operations review",
        scope: ["Handle employee relations", "Keep people operations compliant"],
        members: ["Maria Costa", "Jonas Berg"],
    },
    {
        id: "training",
        title: "Training Expert",
        label: "Training\nExpert",
        x: 422.7,
        y: 664.7,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Creates enablement content and role-specific training tracks.",
        cadence: "Learning review every second Thursday",
        scope: ["Prepare training material", "Support role ramp-up"],
        members: ["Paul Werner"],
    },
    {
        id: "div",
        title: "Diversity & Inclusion",
        label: "Diversity\n&\nInclusion",
        x: 454,
        y: 628.5,
        r: 28,
        type: "secondary",
        groupId: "people",
        summary: "Translates inclusion commitments into concrete practices and rituals.",
        cadence: "Monthly inclusion planning",
        scope: ["Drive inclusion initiatives", "Track representation efforts"],
        members: ["Nina Solberg", "Lena Ortiz"],
    },
    {
        id: "growth",
        title: "Growth Circle Rep",
        label: "Growth\nCircle\nRep",
        x: 740,
        y: 500,
        r: 45,
        type: "primary",
        groupId: "growth",
        summary:
            "Coordinates revenue, acquisition, and customer-facing execution across the growth cluster.",
        cadence: "Weekly growth review",
        scope: [
            "Align sales, support, and growth work",
            "Surface customer and revenue tensions",
            "Support go-to-market decisions",
        ],
        members: ["Paul Werner", "Sarah Kim"],
    },
    {
        id: "marketing",
        title: "Marketing",
        label: "Marketing",
        x: 740,
        y: 423,
        r: 30,
        type: "secondary",
        groupId: "growth",
        summary: "Owns campaigns, messaging experiments, and demand generation.",
        cadence: "Campaign review every Tuesday",
        scope: ["Run acquisition campaigns", "Test messaging and positioning"],
        members: ["Sarah Kim", "Tom Ridley"],
    },
    {
        id: "sales",
        title: "Sales",
        label: "Sales",
        x: 806.7,
        y: 538.5,
        r: 30,
        type: "secondary",
        groupId: "growth",
        summary: "Handles pipeline progression, deal quality, and commercial feedback loops.",
        cadence: "Daily pipeline stand-up",
        scope: ["Advance qualified opportunities", "Bring market feedback into the org"],
        members: ["Marcus Hale", "Iris Patel"],
    },
    {
        id: "cs",
        title: "Customer Services",
        label: "Customer\nServices",
        x: 673.3,
        y: 538.5,
        r: 30,
        type: "secondary",
        groupId: "growth",
        summary: "Owns support flow, issue escalation, and customer continuity after purchase.",
        cadence: "Weekly support operations review",
        scope: ["Maintain customer support quality", "Feed customer friction into roadmap work"],
        members: ["Bob Martin", "Lena Ortiz"],
    },
];

function polarPosition(
    centerX: number,
    centerY: number,
    radius: number,
    index: number,
    total: number,
) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(total, 1);

    return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
    };
}

function buildBubbleLabel(title: string) {
    const words = title.trim().split(/\s+/).filter(Boolean);

    if (words.length <= 1) {
        return title.trim();
    }

    if (words.length === 2) {
        return words.join("\n");
    }

    const midpoint = Math.ceil(words.length / 2);

    return `${words.slice(0, midpoint).join(" ")}\n${words.slice(midpoint).join(" ")}`;
}

function createId(value: string) {
    const base = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return `${base || "circle"}-${Date.now().toString(36).slice(-5)}`;
}

function splitLines(value: string) {
    return value
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function splitCommaList(value: string) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function matchesSearch(node: CircleNode, query: string) {
    if (!query) {
        return true;
    }

    const haystack = [node.title, node.summary, node.scope.join(" "), node.members.join(" ")]
        .join(" ")
        .toLowerCase();

    return haystack.includes(query);
}

function getBubblePalette(node: CircleNode, isSelected: boolean) {
    if (node.type === "primary") {
        return {
            background: isSelected ? "#8FC6E6" : "#99CEE9",
            border: "rgba(133, 188, 219, 0.65)",
            shadow: "0 10px 24px rgba(133, 188, 219, 0.12)",
            text: "#31444C",
        };
    }

    return {
        background: isSelected ? "#B7D38A" : "#BDD990",
        border: "rgba(170, 193, 127, 0.58)",
        shadow: "0 10px 24px rgba(168, 192, 124, 0.12)",
        text: "#46533E",
    };
}

function getDynamicBackgroundRadius(group: GroupMeta, nodes: CircleNode[]) {
    const secondaryCount = nodes.filter(
        (node) => node.groupId === group.id && node.type === "secondary",
    ).length;
    const extraRings = Math.max(0, Math.ceil(secondaryCount / 6) - 1);

    return group.background.r + extraRings * 34;
}

function getRoleOrbit(
    group: GroupMeta,
    nodes: CircleNode[],
    roleIndex: number,
    totalRoles: number,
) {
    const ringSize = 6;
    const ringIndex = Math.floor(roleIndex / ringSize);
    const indexInRing = roleIndex % ringSize;
    const rolesInThisRing = Math.min(ringSize, totalRoles - ringIndex * ringSize);
    const backgroundRadius = getDynamicBackgroundRadius(group, nodes);
    const orbitRadius = Math.max(64, backgroundRadius - 24 + ringIndex * 38);

    return polarPosition(
        group.background.x,
        group.background.y,
        orbitRadius,
        indexInRing,
        rolesInThisRing,
    );
}

function getNextClusterLayout(groupCount: number) {
    const extraIndex = groupCount - INITIAL_GROUP_COUNT;

    if (extraIndex >= 0 && extraIndex < EXTRA_CLUSTER_LAYOUTS.length) {
        return EXTRA_CLUSTER_LAYOUTS[extraIndex];
    }

    const angle = (extraIndex - EXTRA_CLUSTER_LAYOUTS.length) * (Math.PI / 3);
    const background = {
        x: 500 + Math.cos(angle) * 300,
        y: 500 + Math.sin(angle) * 260,
        r: 116,
    };

    return {
        background,
        parking: {
            x: 500 + Math.cos(angle) * 410,
            y: 500 + Math.sin(angle) * 340,
            r: 88,
        },
    };
}

function getPackedRowSizes(total: number) {
    if (total <= 3) return [total];
    if (total === 4) return [2, 2];
    if (total === 5) return [3, 2];
    if (total === 6) return [3, 3];
    if (total === 7) return [3, 2, 2];
    if (total === 8) return [3, 3, 2];
    if (total === 9) return [3, 3, 3];
    if (total === 10) return [4, 3, 3];
    if (total === 11) return [4, 4, 3];
    if (total === 12) return [4, 4, 4];

    const rows = Math.ceil(Math.sqrt(total));
    const base = Math.floor(total / rows);
    const remainder = total % rows;

    return Array.from({ length: rows }, (_, index) => base + (index < remainder ? 1 : 0)).filter(
        (size) => size > 0,
    );
}

function getGroupLayoutHint(groupId: string): GroupLayoutHint {
    return (
        GROUP_LAYOUT_HINTS[groupId] ?? {
            nodesX: 0,
            nodesY: -0.16,
            titleMaxWidth: 180,
            titleSize: 24,
            titleX: 0,
            titleY: 0.34,
        }
    );
}

/**
 * Arrange nodes in a grid pattern inside the cluster circle.
 * Returns the grid-based x/y for a node given its group.
 */
function getGridPosition(node: CircleNode, allNodes: CircleNode[], group: GroupMeta) {
    const groupNodes = allNodes
        .filter((n) => n.groupId === group.id)
        .sort((left, right) => {
            if (left.type !== right.type) {
                return left.type === "primary" ? -1 : 1;
            }

            return left.title.localeCompare(right.title);
        });
    const hint = getGroupLayoutHint(group.id);

    const baseR = group.background.r;
    const clusterR = Math.max(
        baseR,
        baseR + Math.ceil(Math.max(0, groupNodes.length - 6) / 3) * 22,
    );
    const slotRadius = Math.max(28, Math.min(42, clusterR * 0.16));
    const primaryRadius = Math.min(slotRadius + 6, 48);
    const stepX = slotRadius * 2 + 10;
    const stepY = slotRadius * 2 + 10;
    const rowSizes = getPackedRowSizes(groupNodes.length);
    const idx = groupNodes.findIndex((n) => n.id === node.id);

    if (idx === -1) {
        return { x: node.x, y: node.y, r: node.r };
    }

    let cursor = 0;
    let rowIndex = 0;
    let colIndex = 0;

    rowSizes.some((rowSize, currentRowIndex) => {
        if (idx < cursor + rowSize) {
            rowIndex = currentRowIndex;
            colIndex = idx - cursor;
            return true;
        }

        cursor += rowSize;
        return false;
    });

    const totalRows = rowSizes.length;
    const rowSize = rowSizes[rowIndex] ?? rowSizes[0] ?? 1;
    const widestRow = Math.max(...rowSizes);
    const rowWidth = (rowSize - 1) * stepX;
    const gridHeight = (totalRows - 1) * stepY;
    const anchorX = group.background.x + clusterR * hint.nodesX;
    const anchorY = group.background.y + clusterR * hint.nodesY;
    const startX = anchorX - rowWidth / 2;
    const startY = anchorY - gridHeight / 2;
    const rowOffset = ((widestRow - rowSize) * stepX) / 2;

    return {
        x: startX + rowOffset + colIndex * stepX,
        y: startY + rowIndex * stepY,
        r: node.type === "primary" ? primaryRadius : slotRadius,
    };
}

function getNodeMetrics(
    node: CircleNode,
    nodes: CircleNode[],
    groups: GroupMeta[],
    selectedNode: CircleNode | null,
    query: string,
): BubbleMetrics {
    const isMatch = matchesSearch(node, query);
    const group = groups.find((g) => g.id === node.groupId);

    if (!selectedNode) {
        if (!group) {
            return {
                x: node.x,
                y: node.y,
                r: node.r,
                opacity: query && !isMatch ? 0.2 : 1,
                zIndex: node.type === "primary" ? 2 : 1,
            };
        }
        const gridPos = getGridPosition(node, nodes, group);
        return {
            x: gridPos.x,
            y: gridPos.y,
            r: gridPos.r,
            opacity: query && !isMatch ? 0.2 : 1,
            zIndex: isMatch ? 3 : node.type === "primary" ? 2 : 1,
        };
    }

    if (node.groupId === selectedNode.groupId) {
        if (node.id === selectedNode.id) {
            return {
                x: FOCUS_CENTER.x,
                y: FOCUS_CENTER.y,
                r: node.type === "primary" ? 96 : 82,
                opacity: query && !isMatch ? 0.5 : 1,
                zIndex: 10,
            };
        }

        const peers = nodes.filter(
            (peer) => peer.groupId === selectedNode.groupId && peer.id !== selectedNode.id,
        );
        const peerIndex = peers.findIndex((peer) => peer.id === node.id);
        const firstRingCount = Math.min(6, peers.length);
        const isSecondRing = peerIndex >= firstRingCount;
        const peersInRing = isSecondRing ? peers.length - firstRingCount : firstRingCount;
        const ringIndex = isSecondRing ? peerIndex - firstRingCount : peerIndex;
        const orbit = polarPosition(
            FOCUS_CENTER.x,
            FOCUS_CENTER.y,
            isSecondRing ? 224 : 154,
            ringIndex,
            Math.max(peersInRing, 1),
        );

        return {
            x: orbit.x,
            y: orbit.y,
            r: node.type === "primary" ? Math.max(node.r * 0.84, 40) : Math.max(node.r * 0.74, 28),
            opacity: query && !isMatch ? 0.35 : 1,
            zIndex: node.type === "primary" ? 8 : 7,
        };
    }

    const parkedGroup = groups.find((g) => g.id === node.groupId);

    if (!parkedGroup) {
        return {
            x: node.x,
            y: node.y,
            r: node.r,
            opacity: 0.14,
            zIndex: 1,
        };
    }

    const parkedNodes = nodes.filter((peer) => peer.groupId === node.groupId);
    const parkedIndex = parkedNodes.findIndex((peer) => peer.id === node.id);
    const parkedOrbit = polarPosition(
        parkedGroup.parking.x,
        parkedGroup.parking.y,
        parkedGroup.parking.r - 24,
        parkedIndex,
        parkedNodes.length,
    );

    return {
        x: parkedOrbit.x,
        y: parkedOrbit.y,
        r: node.type === "primary" ? Math.max(node.r * 0.44, 24) : Math.max(node.r * 0.36, 18),
        opacity: query && !isMatch ? 0.06 : 0.14,
        zIndex: 1,
    };
}

function getBackgroundMetrics(
    group: GroupMeta,
    nodes: CircleNode[],
    selectedNode: CircleNode | null,
    query: string,
) {
    const secondaryCount = nodes.filter(
        (n) => n.groupId === group.id && n.type === "secondary",
    ).length;
    const baseR = group.background.r;
    const dynamicR = Math.max(baseR, baseR + Math.ceil(secondaryCount / 5) * 14);

    if (!selectedNode) {
        return {
            x: group.background.x,
            y: group.background.y,
            r: dynamicR,
            opacity: query ? 0.44 : 0.72,
        };
    }

    if (group.id === selectedNode.groupId) {
        return {
            x: FOCUS_CENTER.x,
            y: FOCUS_CENTER.y,
            r: 300,
            opacity: 0.86,
        };
    }

    return {
        x: group.parking.x,
        y: group.parking.y,
        r: group.parking.r,
        opacity: 0.22,
    };
}

function Bubble({
    node,
    metrics,
    isSelected,
    isMatch,
    onSelect,
}: {
    node: CircleNode;
    metrics: BubbleMetrics;
    isSelected: boolean;
    isMatch: boolean;
    onSelect: (id: string) => void;
}) {
    const palette = getBubblePalette(node, isSelected);

    return (
        <motion.button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onSelect(node.id);
            }}
            initial={false}
            animate={{
                width: metrics.r * 2,
                height: metrics.r * 2,
                left: metrics.x - metrics.r,
                top: metrics.y - metrics.r,
                opacity: metrics.opacity,
                zIndex: metrics.zIndex,
                boxShadow: palette.shadow,
                scale: isSelected ? 1.025 : 1,
                backgroundColor: palette.background,
                borderColor: palette.border,
                color: palette.text,
            }}
            transition={BUBBLE_SPRING}
            whileHover={{ scale: isSelected ? 1.06 : 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`absolute flex items-center justify-center rounded-full border text-center ${
                isMatch ? "ring-4 ring-yellow-300/70" : ""
            }`}
            aria-pressed={isSelected}
            aria-label={`Open details for ${node.title}`}
        >
            <span
                className="select-none whitespace-pre-line px-2 leading-tight"
                style={{
                    fontSize: Math.max(10, metrics.r / (node.type === "primary" ? 3.9 : 4.4)),
                    fontWeight: 500,
                }}
            >
                {node.label}
            </span>
        </motion.button>
    );
}

function ComposerActions({
    selectedGroupTitle,
    onAddRole,
    onAddCircle,
}: {
    selectedGroupTitle: string | null;
    onAddRole: () => void;
    onAddCircle: () => void;
}) {
    return (
        <div className="flex flex-wrap gap-3">
            <button
                type="button"
                onClick={onAddRole}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
            >
                <Plus size={16} aria-hidden="true" />
                Add role
                {selectedGroupTitle ? ` to ${selectedGroupTitle}` : ""}
            </button>
            <button
                type="button"
                onClick={onAddCircle}
                className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
            >
                <Plus size={16} aria-hidden="true" />
                Add circle
            </button>
        </div>
    );
}

export default function OrganizationChart({ searchQuery = "" }: { searchQuery?: string }) {
    const { snapshot, openMeeting } = useWorkspaceSnapshot();
    const [customGroups, setCustomGroups] = useState<GroupMeta[]>(() =>
        readPersistedItems(CUSTOM_GROUPS_STORAGE_KEY, isValidGroupMetaArray),
    );
    const [customNodes, setCustomNodes] = useState<CircleNode[]>(() =>
        readPersistedItems(CUSTOM_NODES_STORAGE_KEY, isValidCircleNodeArray),
    );
    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
    const [composerMode, setComposerMode] = useState<ComposerMode>(null);
    const [roleDraft, setRoleDraft] = useState<RoleDraft>({
        targetGroupId: initialGroups[0].id,
        title: "",
        summary: "",
        cadence: "",
        scope: "",
        members: "",
    });
    const [circleDraft, setCircleDraft] = useState<CircleDraft>({
        title: "",
        summary: "",
        cadence: "",
        scope: "",
        members: "",
        accent: ACCENT_PALETTE[0],
    });

    const groups = mergeById(initialGroups, customGroups);
    const nodes = mergeById(initialNodes, customNodes);

    useEffect(() => {
        window.localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(customGroups));
    }, [customGroups]);

    useEffect(() => {
        window.localStorage.setItem(CUSTOM_NODES_STORAGE_KEY, JSON.stringify(customNodes));
    }, [customNodes]);

    useEffect(() => {
        if (selectedCircleId && !nodes.some((node) => node.id === selectedCircleId)) {
            setSelectedCircleId(null);
        }
    }, [nodes, selectedCircleId]);

    const normalizedSearch = searchQuery.toLowerCase().trim();
    const selectedNode = nodes.find((node) => node.id === selectedCircleId) ?? null;
    const selectedGroup = selectedNode
        ? (groups.find((group) => group.id === selectedNode.groupId) ?? null)
        : null;
    const relatedNodes = selectedNode
        ? nodes.filter(
              (node) => node.groupId === selectedNode.groupId && node.id !== selectedNode.id,
          )
        : [];
    const workspaceCircleId = selectedGroup
        ? (GROUP_TO_WORKSPACE_CIRCLE_ID[selectedGroup.id] ?? selectedGroup.id)
        : null;
    const workspaceRoleId = selectedNode
        ? (NODE_TO_WORKSPACE_ROLE_ID[selectedNode.id] ?? null)
        : null;
    const relatedMeetings = selectedGroup
        ? snapshot.meetings.filter((meeting) => {
              const matchesCircle = workspaceCircleId
                  ? meeting.circleId === workspaceCircleId
                  : false;
              const matchesRole = workspaceRoleId
                  ? meeting.invitedRoleIds.includes(workspaceRoleId)
                  : false;

              return matchesCircle || matchesRole;
          })
        : [];
    const relatedActions = selectedGroup
        ? snapshot.actions.filter((action) => {
              const matchesCircle = workspaceCircleId
                  ? action.circleId === workspaceCircleId
                  : false;
              const matchesRole = workspaceRoleId ? action.roleId === workspaceRoleId : false;

              return matchesCircle || matchesRole;
          })
        : [];
    const relatedProjects = selectedGroup
        ? snapshot.projects.filter((project) => {
              const matchesCircle = workspaceCircleId
                  ? project.circleId === workspaceCircleId
                  : false;
              const matchesRole = workspaceRoleId ? project.roleId === workspaceRoleId : false;

              return matchesCircle || matchesRole;
          })
        : [];

    const groupTitles = Object.fromEntries(groups.map((group) => [group.id, group.title]));
    const groupAccents = Object.fromEntries(groups.map((group) => [group.id, group.accent]));

    const openRoleComposer = (targetGroupId = selectedGroup?.id ?? groups[0]?.id ?? "") => {
        setRoleDraft({
            targetGroupId,
            title: "",
            summary: "",
            cadence: "",
            scope: "",
            members: "",
        });
        setComposerMode("role");
    };

    const openCircleComposer = () => {
        setCircleDraft({
            title: "",
            summary: "",
            cadence: "",
            scope: "",
            members: "",
            accent: ACCENT_PALETTE[groups.length % ACCENT_PALETTE.length],
        });
        setComposerMode("circle");
    };

    const handleCreateRole = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const targetGroup = groups.find((group) => group.id === roleDraft.targetGroupId);

        if (!targetGroup || !roleDraft.title.trim()) {
            return;
        }

        const groupSecondaryNodes = nodes.filter(
            (node) => node.groupId === targetGroup.id && node.type === "secondary",
        );
        const orbit = getRoleOrbit(
            targetGroup,
            nodes,
            groupSecondaryNodes.length,
            groupSecondaryNodes.length + 1,
        );

        const newRole: CircleNode = {
            id: createId(roleDraft.title),
            title: roleDraft.title.trim(),
            label: buildBubbleLabel(roleDraft.title),
            x: orbit.x,
            y: orbit.y,
            r: roleDraft.title.length > 20 ? 28 : 30,
            type: "secondary",
            groupId: targetGroup.id,
            summary:
                roleDraft.summary.trim() ||
                `New role in ${targetGroup.title} responsible for newly added work.`,
            cadence: roleDraft.cadence.trim() || "Cadence not yet defined",
            scope: splitLines(roleDraft.scope),
            members: splitCommaList(roleDraft.members),
        };

        setCustomNodes((currentNodes) => [...currentNodes, newRole]);
        setSelectedCircleId(newRole.id);
        setComposerMode(null);
        setRoleDraft({
            targetGroupId: targetGroup.id,
            title: "",
            summary: "",
            cadence: "",
            scope: "",
            members: "",
        });
    };

    const handleCreateCircle = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!circleDraft.title.trim()) {
            return;
        }

        const layout = getNextClusterLayout(groups.length);
        const groupId = createId(circleDraft.title);
        const primaryCircle: CircleNode = {
            id: `${groupId}-primary`,
            title: circleDraft.title.trim(),
            label: buildBubbleLabel(circleDraft.title),
            x: layout.background.x,
            y: layout.background.y,
            r: 54,
            type: "primary",
            groupId,
            summary:
                circleDraft.summary.trim() ||
                `Newly created circle for ${circleDraft.title.trim().toLowerCase()}.`,
            cadence: circleDraft.cadence.trim() || "Cadence not yet defined",
            scope: splitLines(circleDraft.scope),
            members: splitCommaList(circleDraft.members),
        };

        const newGroup: GroupMeta = {
            id: groupId,
            title: circleDraft.title.trim(),
            accent: circleDraft.accent,
            description:
                circleDraft.summary.trim() ||
                `New circle created for ${circleDraft.title.trim().toLowerCase()}.`,
            background: layout.background,
            parking: layout.parking,
        };

        setCustomGroups((currentGroups) => [...currentGroups, newGroup]);
        setCustomNodes((currentNodes) => [...currentNodes, primaryCircle]);
        setSelectedCircleId(primaryCircle.id);
        setComposerMode(null);
        setCircleDraft({
            title: "",
            summary: "",
            cadence: "",
            scope: "",
            members: "",
            accent: ACCENT_PALETTE[(groups.length + 1) % ACCENT_PALETTE.length],
        });
    };

    return (
        <section className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[32px] bg-white transition-colors duration-300 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 px-8 py-6 dark:border-slate-800">
                <div>
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#3B82F6]">
                        Holaspiriters
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-50">
                        Organization map
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Focus any circle, read its full details, and create new circles or roles
                        directly from the chart.
                    </p>
                </div>

                <div className="flex max-w-xl flex-col items-start gap-4">
                    <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-slate-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-slate-300">
                        <Info size={18} className="mt-0.5 text-[#3B82F6]" aria-hidden="true" />
                        <div>
                            Smooth transitions happen on focus, and the right-hand panel is now also
                            your entry point for creating new roles and circles.
                        </div>
                    </div>

                    <ComposerActions
                        selectedGroupTitle={selectedGroup?.title ?? null}
                        onAddRole={() => openRoleComposer()}
                        onAddCircle={openCircleComposer}
                    />
                </div>
            </div>

            <div className="min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_420px]">
                <div
                    className="relative min-h-[760px] min-w-0 overflow-hidden bg-white dark:bg-slate-950"
                    onClick={() => setSelectedCircleId(null)}
                >
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[980px] w-[980px] rounded-full bg-[#F2F8FD] pointer-events-none dark:bg-slate-900" />

                    <motion.div
                        className="absolute left-1/2 top-1/2"
                        initial={false}
                        animate={{
                            x: selectedNode ? -570 : -550,
                            y: selectedNode ? -530 : -500,
                            scale: selectedNode ? 0.88 : 0.78,
                        }}
                        transition={BUBBLE_SPRING}
                        style={{
                            width: 1100,
                            height: 1100,
                            transformOrigin: "center center",
                        }}
                    >
                        {groups.map((group) => {
                            const metrics = getBackgroundMetrics(
                                group,
                                nodes,
                                selectedNode,
                                normalizedSearch,
                            );

                            return (
                                <motion.div
                                    key={group.id}
                                    className="absolute rounded-full pointer-events-none bg-[#E4F0FB] dark:bg-[rgba(255,255,255,0.06)]"
                                    initial={false}
                                    animate={{
                                        width: metrics.r * 2,
                                        height: metrics.r * 2,
                                        left: metrics.x - metrics.r,
                                        top: metrics.y - metrics.r,
                                        opacity: metrics.opacity,
                                    }}
                                    transition={BUBBLE_SPRING}
                                />
                            );
                        })}

                        {!selectedNode &&
                            groups.map((group) => {
                                const metrics = getBackgroundMetrics(
                                    group,
                                    nodes,
                                    selectedNode,
                                    normalizedSearch,
                                );
                                const hint = getGroupLayoutHint(group.id);

                                if (metrics.r < 90) {
                                    return null;
                                }

                                return (
                                    <motion.div
                                        key={`label-${group.id}`}
                                        className="pointer-events-none absolute z-10"
                                        initial={false}
                                        animate={{
                                            left: metrics.x + metrics.r * hint.titleX,
                                            top: metrics.y + metrics.r * hint.titleY,
                                            opacity: metrics.opacity,
                                        }}
                                        style={{
                                            maxWidth: `${hint.titleMaxWidth}px`,
                                            transform: "translate(-50%, -50%)",
                                        }}
                                        transition={BUBBLE_SPRING}
                                    >
                                        <div
                                            className="whitespace-pre-line text-center font-normal leading-[1.04] text-slate-700"
                                            style={{
                                                fontSize: `${hint.titleSize}px`,
                                                letterSpacing: "-0.04em",
                                            }}
                                        >
                                            {group.title}
                                        </div>
                                    </motion.div>
                                );
                            })}

                        {nodes.map((node) => {
                            const metrics = getNodeMetrics(
                                node,
                                nodes,
                                groups,
                                selectedNode,
                                normalizedSearch,
                            );

                            return (
                                <Bubble
                                    key={node.id}
                                    node={node}
                                    metrics={metrics}
                                    isSelected={node.id === selectedNode?.id}
                                    isMatch={
                                        Boolean(normalizedSearch) &&
                                        matchesSearch(node, normalizedSearch)
                                    }
                                    onSelect={setSelectedCircleId}
                                />
                            );
                        })}
                    </motion.div>

                    {!selectedNode && (
                        <div className="pointer-events-none absolute bottom-6 left-6 right-6 flex flex-wrap gap-3">
                            {groups.map((group) => (
                                <div
                                    key={group.id}
                                    className="rounded-full border border-[#D7E7F0] bg-white/72 px-4 py-2 text-sm font-medium text-slate-500 shadow-[0_12px_24px_-22px_rgba(51,65,85,0.4)] backdrop-blur"
                                >
                                    {group.title}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="custom-scrollbar flex max-h-full min-h-0 flex-col overflow-auto border-l border-slate-200 bg-slate-50/70 px-6 py-6 dark:border-slate-800 dark:bg-slate-900/40">
                    <AnimatePresence mode="wait">
                        {selectedNode ? (
                            <motion.div
                                key={selectedNode.id}
                                initial={{ opacity: 0, x: 28 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 22 }}
                                transition={{ duration: 0.28, ease: "easeOut" }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-200">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        groupAccents[selectedNode.groupId] ??
                                                        "#3B82F6",
                                                }}
                                            />
                                            {selectedGroup?.title ?? "Circle"}
                                        </div>
                                        <h3 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-50">
                                            {selectedNode.title}
                                        </h3>
                                        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {selectedNode.summary}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCircleId(null)}
                                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                                        aria-label="Close circle details"
                                    >
                                        <X size={18} aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="mt-5">
                                    <ComposerActions
                                        selectedGroupTitle={selectedGroup?.title ?? null}
                                        onAddRole={() => openRoleComposer(selectedNode.groupId)}
                                        onAddCircle={openCircleComposer}
                                    />
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                            Cadence
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {selectedNode.cadence}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                            Circle type
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {selectedNode.type === "primary"
                                                ? "Primary circle"
                                                : "Supporting role"}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                        <Sparkles size={16} aria-hidden="true" />
                                        Scope
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {selectedNode.scope.length > 0 ? (
                                            selectedNode.scope.map((item) => (
                                                <div
                                                    key={item}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                                >
                                                    {item}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                                No scope items defined yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                        <Users size={16} aria-hidden="true" />
                                        People
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {selectedNode.members.length > 0 ? (
                                            selectedNode.members.map((member) => (
                                                <span
                                                    key={member}
                                                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"
                                                >
                                                    {member}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                No members added yet.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                        Related roles & circles
                                    </div>
                                    <div className="mt-4 grid gap-3">
                                        {relatedNodes.length > 0 ? (
                                            relatedNodes.map((node) => (
                                                <button
                                                    key={node.id}
                                                    type="button"
                                                    onClick={() => setSelectedCircleId(node.id)}
                                                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                            {node.title}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {node.type === "primary"
                                                                ? "Primary"
                                                                : "Role"}{" "}
                                                            ·{" "}
                                                            {groupTitles[node.groupId] ??
                                                                selectedGroup?.title}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="h-3 w-3 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                groupAccents[node.groupId] ??
                                                                "#3B82F6",
                                                        }}
                                                    />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                                No related roles or circles yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                        <CalendarDays size={16} aria-hidden="true" />
                                        Tactical meetings
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {relatedMeetings.length > 0 ? (
                                            relatedMeetings.slice(0, 3).map((meeting) => (
                                                <button
                                                    key={meeting.id}
                                                    type="button"
                                                    onClick={() => openMeeting(meeting.id)}
                                                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10"
                                                >
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                            {meeting.title}
                                                        </div>
                                                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {meeting.meetingType} ·{" "}
                                                            {meeting.location}
                                                        </div>
                                                    </div>
                                                    <span
                                                        className="h-3 w-3 rounded-full"
                                                        style={{ backgroundColor: meeting.accent }}
                                                    />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                                No linked meetings in the shared workspace yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                            <CheckSquare size={16} aria-hidden="true" />
                                            Live actions
                                        </div>
                                        <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-50">
                                            {relatedActions.length}
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                            Operational follow-ups currently tied to this circle or
                                            role.
                                        </p>
                                    </div>
                                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                                        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                            <KanbanSquare size={16} aria-hidden="true" />
                                            Live projects
                                        </div>
                                        <div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-50">
                                            {relatedProjects.length}
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                                            Projects already connected to this workspace area.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[28px] border border-blue-100 bg-blue-50/80 p-5 shadow-[0_18px_40px_rgba(37,99,235,0.08)] dark:border-blue-500/20 dark:bg-blue-500/10">
                                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB] dark:text-blue-200">
                                        <Sparkles size={16} aria-hidden="true" />
                                        AI copilot
                                    </div>
                                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        The next useful AI actions here are to summarize tensions,
                                        prep the tactical agenda, and publish outputs into actions
                                        or projects.
                                    </p>
                                    {relatedMeetings[0] && (
                                        <button
                                            type="button"
                                            onClick={() => openMeeting(relatedMeetings[0].id)}
                                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                                        >
                                            Open tactical workspace
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="chart-hint"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-6 dark:border-slate-700 dark:bg-slate-950/70">
                                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                        Circle details
                                    </div>
                                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-slate-50">
                                        Open any circle
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        Select a circle to inspect its role in the org, or start by
                                        creating a new circle or role from the panel below.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
                                    Chart editor
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                    Add supporting roles into an existing circle or create a brand
                                    new circle with its own cluster.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setComposerMode(null)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                                    composerMode
                                        ? "border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                                        : "border-transparent text-slate-300 dark:text-slate-600"
                                }`}
                            >
                                {composerMode ? "Close form" : "Ready"}
                            </button>
                        </div>

                        <div className="mt-5">
                            <ComposerActions
                                selectedGroupTitle={selectedGroup?.title ?? null}
                                onAddRole={() => openRoleComposer()}
                                onAddCircle={openCircleComposer}
                            />
                        </div>

                        {composerMode === "role" && (
                            <form className="mt-6 space-y-4" onSubmit={handleCreateRole}>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Target circle
                                    </label>
                                    <select
                                        value={roleDraft.targetGroupId}
                                        onChange={(event) =>
                                            setRoleDraft((currentDraft) => ({
                                                ...currentDraft,
                                                targetGroupId: event.target.value,
                                            }))
                                        }
                                        className={inputClassName}
                                    >
                                        {groups.map((group) => (
                                            <option key={group.id} value={group.id}>
                                                {group.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Role title
                                    </label>
                                    <input
                                        value={roleDraft.title}
                                        onChange={(event) =>
                                            setRoleDraft((currentDraft) => ({
                                                ...currentDraft,
                                                title: event.target.value,
                                            }))
                                        }
                                        placeholder="Example: Customer Insights Lead"
                                        className={inputClassName}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Summary
                                    </label>
                                    <textarea
                                        value={roleDraft.summary}
                                        onChange={(event) =>
                                            setRoleDraft((currentDraft) => ({
                                                ...currentDraft,
                                                summary: event.target.value,
                                            }))
                                        }
                                        placeholder="What does this role actually own?"
                                        className={textareaClassName}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Cadence
                                        </label>
                                        <input
                                            value={roleDraft.cadence}
                                            onChange={(event) =>
                                                setRoleDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    cadence: event.target.value,
                                                }))
                                            }
                                            placeholder="Weekly planning sync"
                                            className={inputClassName}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Members
                                        </label>
                                        <input
                                            value={roleDraft.members}
                                            onChange={(event) =>
                                                setRoleDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    members: event.target.value,
                                                }))
                                            }
                                            placeholder="Anna, Paul, Sarah"
                                            className={inputClassName}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Scope items
                                    </label>
                                    <textarea
                                        value={roleDraft.scope}
                                        onChange={(event) =>
                                            setRoleDraft((currentDraft) => ({
                                                ...currentDraft,
                                                scope: event.target.value,
                                            }))
                                        }
                                        placeholder={
                                            "One item per line\nOwn interview loop\nBring hiring insights into roadmap"
                                        }
                                        className={textareaClassName}
                                    />
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="submit"
                                        className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                                    >
                                        Create role
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setComposerMode(null)}
                                        className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        {composerMode === "circle" && (
                            <form className="mt-6 space-y-4" onSubmit={handleCreateCircle}>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Circle title
                                    </label>
                                    <input
                                        value={circleDraft.title}
                                        onChange={(event) =>
                                            setCircleDraft((currentDraft) => ({
                                                ...currentDraft,
                                                title: event.target.value,
                                            }))
                                        }
                                        placeholder="Example: Revenue Operations"
                                        className={inputClassName}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                        Circle summary
                                    </label>
                                    <textarea
                                        value={circleDraft.summary}
                                        onChange={(event) =>
                                            setCircleDraft((currentDraft) => ({
                                                ...currentDraft,
                                                summary: event.target.value,
                                            }))
                                        }
                                        placeholder="What is this circle responsible for across the org?"
                                        className={textareaClassName}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Cadence
                                        </label>
                                        <input
                                            value={circleDraft.cadence}
                                            onChange={(event) =>
                                                setCircleDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    cadence: event.target.value,
                                                }))
                                            }
                                            placeholder="Monthly revenue review"
                                            className={inputClassName}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Accent color
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={circleDraft.accent}
                                                onChange={(event) =>
                                                    setCircleDraft((currentDraft) => ({
                                                        ...currentDraft,
                                                        accent: event.target.value,
                                                    }))
                                                }
                                                className={inputClassName}
                                            >
                                                {ACCENT_PALETTE.map((color) => (
                                                    <option key={color} value={color}>
                                                        {color}
                                                    </option>
                                                ))}
                                            </select>
                                            <span
                                                className="h-10 w-10 rounded-full border border-white/70 shadow-sm"
                                                style={{ backgroundColor: circleDraft.accent }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Members
                                        </label>
                                        <input
                                            value={circleDraft.members}
                                            onChange={(event) =>
                                                setCircleDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    members: event.target.value,
                                                }))
                                            }
                                            placeholder="Elena, Marcus, Sarah"
                                            className={inputClassName}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                                            Scope items
                                        </label>
                                        <textarea
                                            value={circleDraft.scope}
                                            onChange={(event) =>
                                                setCircleDraft((currentDraft) => ({
                                                    ...currentDraft,
                                                    scope: event.target.value,
                                                }))
                                            }
                                            placeholder={
                                                "One item per line\nOwn pipeline health\nAlign forecasting"
                                            }
                                            className={textareaClassName}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="submit"
                                        className="rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                                    >
                                        Create circle
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setComposerMode(null)}
                                        className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </aside>
            </div>
        </section>
    );
}
