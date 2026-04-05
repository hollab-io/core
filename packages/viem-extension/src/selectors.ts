import type { WorkspaceSnapshot } from "./types.js";

export function createPartnerMap(snapshot: WorkspaceSnapshot) {
    return Object.fromEntries(snapshot.partners.map((partner) => [partner.id, partner]));
}

export function createCircleMap(snapshot: WorkspaceSnapshot) {
    return Object.fromEntries(snapshot.circles.map((circle) => [circle.id, circle]));
}

export function createRoleMap(snapshot: WorkspaceSnapshot) {
    return Object.fromEntries(snapshot.roles.map((role) => [role.id, role]));
}

export function getAnchorCircle(snapshot: WorkspaceSnapshot) {
    return snapshot.circles.find((c) => c.isAnchor) ?? null;
}

export function getSubCircles(snapshot: WorkspaceSnapshot, circleId: string) {
    return snapshot.circles.filter((c) => c.parentCircleId === circleId);
}

export function getRolesForCircle(snapshot: WorkspaceSnapshot, circleId: string) {
    return snapshot.roles.filter((r) => r.circleId === circleId);
}
