/**
 * useHashRouter — lightweight hash-based routing for IPFS-compatible SPA.
 *
 * URL structure:
 *   #/                          → orgs home
 *   #/orgs/:id                  → org workspace (default tab)
 *   #/orgs/:id/:tab             → org workspace tab (tactical, governance, etc.)
 *   #/join/:id                  → guest join panel
 *   #/constitution              → public constitution
 *   #/o/:orgId                  → public (wallet-less) org surface
 *   #/o/:orgId/r/:roleId        → public (wallet-less) role permalink
 *   #/o/:orgId/p/:proposalId    → public (wallet-less) proposal permalink
 *   #/explore                   → public (wallet-less) org directory
 *
 * Syncs browser back/forward, persists across refresh.
 */
import { useCallback, useSyncExternalStore } from "react";

import type { AppTabId } from "../config/navigation";

export type Route =
    | { page: "home" }
    | { page: "constitution" }
    | { page: "org"; orgId: string; tab: AppTabId }
    | { page: "join"; orgId: string }
    | { page: "public"; orgId: string }
    | { page: "publicRole"; orgId: string; roleId: string }
    | { page: "publicProposal"; orgId: string; proposalId: string }
    | { page: "explore" };

const DEFAULT_TAB: AppTabId = "constitution";
const VALID_TABS = new Set<string>([
    "tactical",
    "governance",
    "actions",
    "structure",
    "constitution",
]);

export function parseHash(hash: string): Route {
    const path = hash.replace(/^#\/?/, "");
    if (!path || path === "/") return { page: "home" };
    if (path === "constitution") return { page: "constitution" };
    if (path === "explore") return { page: "explore" };

    const parts = path.split("/");
    if (parts[0] === "o" && parts[1]) {
        if (parts[2] === "r" && parts[3]) {
            return {
                page: "publicRole",
                orgId: parts[1],
                roleId: decodeURIComponent(parts.slice(3).join("/")),
            };
        }
        if (parts[2] === "p" && parts[3]) {
            return {
                page: "publicProposal",
                orgId: parts[1],
                proposalId: decodeURIComponent(parts.slice(3).join("/")),
            };
        }
        return { page: "public", orgId: parts[1] };
    }
    if (parts[0] === "join" && parts[1]) {
        return { page: "join", orgId: parts[1] };
    }
    if (parts[0] === "orgs" && parts[1]) {
        const tab = (parts[2] && VALID_TABS.has(parts[2]) ? parts[2] : DEFAULT_TAB) as AppTabId;
        return { page: "org", orgId: parts[1], tab };
    }
    return { page: "home" };
}

export function routeToHash(route: Route): string {
    switch (route.page) {
        case "home":
            return "#/";
        case "constitution":
            return "#/constitution";
        case "join":
            return `#/join/${route.orgId}`;
        case "public":
            return `#/o/${route.orgId}`;
        case "publicRole":
            return `#/o/${route.orgId}/r/${encodeURIComponent(route.roleId)}`;
        case "publicProposal":
            return `#/o/${route.orgId}/p/${encodeURIComponent(route.proposalId)}`;
        case "explore":
            return "#/explore";
        case "org":
            return route.tab === DEFAULT_TAB
                ? `#/orgs/${route.orgId}`
                : `#/orgs/${route.orgId}/${route.tab}`;
    }
}

// ── External store for hash changes ──────────────────────────────────────────

let currentRoute: Route =
    typeof window !== "undefined" ? parseHash(window.location.hash) : { page: "home" };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): Route {
    return currentRoute;
}

function onHashChange() {
    currentRoute = parseHash(window.location.hash);
    for (const l of listeners) l();
}

if (typeof window !== "undefined") {
    window.addEventListener("hashchange", onHashChange);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHashRouter() {
    const route = useSyncExternalStore(subscribe, getSnapshot);

    const navigate = useCallback((next: Route) => {
        const hash = routeToHash(next);
        if (window.location.hash !== hash) {
            window.location.hash = hash;
        }
    }, []);

    const setOrgId = useCallback(
        (orgId: string | null) => {
            if (!orgId) {
                navigate({ page: "home" });
            } else if (route.page === "org" && route.orgId === orgId) {
                // already there
            } else {
                navigate({ page: "org", orgId, tab: DEFAULT_TAB });
            }
        },
        [navigate, route],
    );

    const setTab = useCallback(
        (tab: AppTabId) => {
            if (route.page === "org") {
                navigate({ page: "org", orgId: route.orgId, tab });
            }
        },
        [navigate, route],
    );

    return { route, navigate, setOrgId, setTab };
}
