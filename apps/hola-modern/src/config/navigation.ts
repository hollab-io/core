import type { LucideIcon } from "lucide-react";
import { BookOpen, CheckSquare, Network, Scale, UserPlus, Users } from "lucide-react";

export type AppTabId =
    | "tactical"
    | "governance"
    | "actions"
    | "structure"
    | "members"
    | "constitution";

export type NavItem = {
    id: AppTabId;
    icon: LucideIcon;
    label: string;
};

export const NAV_ITEMS: NavItem[] = [
    { id: "tactical", icon: Users, label: "Tactical" },
    { id: "governance", icon: Scale, label: "Governance" },
    { id: "actions", icon: CheckSquare, label: "Actions" },
    { id: "structure", icon: Network, label: "Structure" },
    { id: "members", icon: UserPlus, label: "Members" },
    { id: "constitution", icon: BookOpen, label: "Constitution" },
];
