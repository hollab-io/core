import type { LucideIcon } from "lucide-react";
import {
    Bell,
    Calendar,
    CheckSquare,
    Gavel,
    KanbanSquare,
    LayoutGrid,
    Network,
    Search,
    Target,
    Users,
} from "lucide-react";

export const TAB_TITLES = {
    search: "Search",
    notifications: "Notifications",
    chart: "Holaspirit 🇬🇧",
    projects: "Projects",
    actions: "Actions",
    okrs: "OKRs",
    calendar: "Calendar",
    governance: "Governance",
    members: "Members",
    settings: "Settings: Business",
} as const;

export type AppTabId = keyof typeof TAB_TITLES;

export type NavItem = {
    id: AppTabId;
    icon: LucideIcon;
    label: string;
};

export const NAV_ITEMS: NavItem[] = [
    { id: "search", icon: Search, label: "Search" },
    { id: "notifications", icon: Bell, label: "Notifications" },
    { id: "chart", icon: Network, label: "Organization chart" },
    { id: "projects", icon: KanbanSquare, label: "Projects board" },
    { id: "actions", icon: CheckSquare, label: "Actions" },
    { id: "okrs", icon: Target, label: "OKRs tree" },
    { id: "calendar", icon: Calendar, label: "Calendar" },
    { id: "governance", icon: Gavel, label: "Governance" },
    { id: "members", icon: Users, label: "Members" },
    { id: "settings", icon: LayoutGrid, label: "Settings" },
];

export const TAB_DESCRIPTIONS: Record<AppTabId, string> = {
    search: "Search across roles, projects, policies, and people from one place.",
    notifications: "Track the latest updates across teams, circles, and operational changes.",
    chart: "Explore roles, circles, and structural relationships in the organization.",
    projects: "Follow work in progress and prioritize initiatives across the company.",
    actions: "Review assigned work, deadlines, and completion status.",
    okrs: "Browse strategic goals and their dependencies across the organization.",
    calendar: "See upcoming rituals, meetings, and important operating cadences.",
    governance: "Process proposals, objections, elections, and governance breakdowns.",
    members: "Browse people, responsibilities, and ownership across the org.",
    settings: "Configure integrations and business settings for the workspace.",
};
