import type { WorkspaceSnapshot } from "@/types.js";
import { getMockWorkspaceSnapshot } from "@/mock.js";
import {
    createCircleMap,
    createPartnerMap,
    createRoleMap,
    getAnchorCircle,
    getRolesForCircle,
    getSubCircles,
} from "@/selectors.js";
import { describe, expect, it } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal WorkspaceSnapshot for targeted tests. */
function makeSnapshot(overrides: Partial<WorkspaceSnapshot> = {}): WorkspaceSnapshot {
    return {
        currentPartnerId: "elena",
        updatedAt: new Date().toISOString(),
        partners: [],
        circles: [],
        roles: [],
        policies: [],
        projects: [],
        actions: [],
        meetings: [],
        meetingOutputs: [],
        governanceProposals: [],
        governanceObjections: [],
        governanceMeetings: [],
        governanceAgendaItems: [],
        governanceElections: [],
        governanceNominations: [],
        processBreakdowns: [],
        governanceAuditTrail: [],
        ...overrides,
    };
}

// ─── createPartnerMap ─────────────────────────────────────────────────────────

describe("createPartnerMap", () => {
    it("returns an empty object for an empty snapshot", () => {
        const map = createPartnerMap(makeSnapshot());
        expect(map).toEqual({});
    });

    it("keys every partner by their id", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createPartnerMap(snapshot);

        for (const partner of snapshot.partners) {
            expect(map[partner.id]).toBe(partner);
        }
    });

    it("covers all 16 mock partners without duplicates", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createPartnerMap(snapshot);

        expect(Object.keys(map)).toHaveLength(snapshot.partners.length);
    });

    it("maps known partner ids to the correct records", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createPartnerMap(snapshot);

        expect(map["elena"]!.name).toBe("Elena Moroz");
        expect(map["marcus"]!.name).toBe("Marcus Hale");
        expect(map["felix"]!.name).toBe("Felix Armand");
    });

    it("last entry wins for duplicate ids", () => {
        const a = { id: "dup", name: "First", avatarSeed: "a" };
        const b = { id: "dup", name: "Second", avatarSeed: "b" };
        const map = createPartnerMap(makeSnapshot({ partners: [a, b] }));

        expect(map["dup"]).toBe(b);
    });
});

// ─── createCircleMap ──────────────────────────────────────────────────────────

describe("createCircleMap", () => {
    it("returns an empty object for an empty snapshot", () => {
        expect(createCircleMap(makeSnapshot())).toEqual({});
    });

    it("keys every circle by their id", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createCircleMap(snapshot);

        for (const circle of snapshot.circles) {
            expect(map[circle.id]).toBe(circle);
        }
    });

    it("covers all 5 mock circles", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createCircleMap(snapshot);

        expect(Object.keys(map)).toHaveLength(5);
    });

    it("maps known circle ids to the correct records", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createCircleMap(snapshot);

        expect(map["anchor"]!.title).toBe("General Company Circle");
        expect(map["anchor"]!.isAnchor).toBe(true);
        expect(map["product"]!.title).toBe("Product & engineering");
        expect(map["growth"]!.title).toBe("Growth & support");
    });
});

// ─── createRoleMap ────────────────────────────────────────────────────────────

describe("createRoleMap", () => {
    it("returns an empty object for an empty snapshot", () => {
        expect(createRoleMap(makeSnapshot())).toEqual({});
    });

    it("keys every role by their id", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createRoleMap(snapshot);

        for (const role of snapshot.roles) {
            expect(map[role.id]).toBe(role);
        }
    });

    it("covers all roles without losing any", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createRoleMap(snapshot);

        expect(Object.keys(map)).toHaveLength(snapshot.roles.length);
    });

    it("maps a known role id to the correct record", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const map = createRoleMap(snapshot);

        expect(map["lead-link-anchor"]!.title).toBe("Lead Link");
        expect(map["lead-link-anchor"]!.circleId).toBe("anchor");
    });
});

// ─── getAnchorCircle ──────────────────────────────────────────────────────────

describe("getAnchorCircle", () => {
    it("returns null for an empty snapshot", () => {
        expect(getAnchorCircle(makeSnapshot())).toBeNull();
    });

    it("returns null when no circle has isAnchor = true", () => {
        const snapshot = makeSnapshot({
            circles: [
                {
                    id: "c1",
                    title: "Sub",
                    purpose: "",
                    summary: "",
                    accent: "#000",
                    parentCircleId: "c0",
                    isAnchor: false,
                },
            ],
        });

        expect(getAnchorCircle(snapshot)).toBeNull();
    });

    it("returns the anchor circle from the mock snapshot", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const anchor = getAnchorCircle(snapshot);

        expect(anchor).not.toBeNull();
        expect(anchor!.id).toBe("anchor");
        expect(anchor!.isAnchor).toBe(true);
    });

    it("returns the first anchor when multiple circles claim isAnchor", () => {
        const snapshot = makeSnapshot({
            circles: [
                {
                    id: "a1",
                    title: "Anchor 1",
                    purpose: "",
                    summary: "",
                    accent: "#000",
                    parentCircleId: null,
                    isAnchor: true,
                },
                {
                    id: "a2",
                    title: "Anchor 2",
                    purpose: "",
                    summary: "",
                    accent: "#fff",
                    parentCircleId: null,
                    isAnchor: true,
                },
            ],
        });

        expect(getAnchorCircle(snapshot)!.id).toBe("a1");
    });
});

// ─── getSubCircles ────────────────────────────────────────────────────────────

describe("getSubCircles", () => {
    it("returns an empty array when there are no circles", () => {
        expect(getSubCircles(makeSnapshot(), "anchor")).toEqual([]);
    });

    it("returns only circles whose parentCircleId matches", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const subs = getSubCircles(snapshot, "anchor");

        // All four non-anchor circles are direct children of anchor
        expect(subs).toHaveLength(4);
        for (const c of subs) {
            expect(c.parentCircleId).toBe("anchor");
        }
    });

    it("does not include the anchor circle itself", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const subs = getSubCircles(snapshot, "anchor");

        expect(subs.find((c) => c.id === "anchor")).toBeUndefined();
    });

    it("returns an empty array for a leaf circle with no children", () => {
        const snapshot = getMockWorkspaceSnapshot();

        // "product", "people", "growth", "leadership" have no children in mock data
        expect(getSubCircles(snapshot, "product")).toEqual([]);
        expect(getSubCircles(snapshot, "growth")).toEqual([]);
    });

    it("returns an empty array when the circleId does not exist", () => {
        const snapshot = getMockWorkspaceSnapshot();
        expect(getSubCircles(snapshot, "nonexistent-circle")).toEqual([]);
    });

    it("sub-circles include the expected ids", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const subs = getSubCircles(snapshot, "anchor");
        const ids = subs.map((c) => c.id).sort();

        expect(ids).toEqual(["growth", "leadership", "people", "product"]);
    });
});

// ─── getRolesForCircle ────────────────────────────────────────────────────────

describe("getRolesForCircle", () => {
    it("returns an empty array when there are no roles", () => {
        expect(getRolesForCircle(makeSnapshot(), "anchor")).toEqual([]);
    });

    it("returns only roles belonging to the given circle", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const roles = getRolesForCircle(snapshot, "anchor");

        for (const role of roles) {
            expect(role.circleId).toBe("anchor");
        }
    });

    it("returns non-empty results for the anchor circle", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const roles = getRolesForCircle(snapshot, "anchor");

        expect(roles.length).toBeGreaterThan(0);
    });

    it("returns an empty array for a circle with no roles assigned", () => {
        const snapshot = getMockWorkspaceSnapshot();
        expect(getRolesForCircle(snapshot, "nonexistent-circle")).toEqual([]);
    });

    it("does not include roles from other circles", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const anchorRoles = getRolesForCircle(snapshot, "anchor");
        const productRoles = getRolesForCircle(snapshot, "product");

        const anchorIds = new Set(anchorRoles.map((r) => r.id));
        for (const r of productRoles) {
            expect(anchorIds.has(r.id)).toBe(false);
        }
    });

    it("roles from all circles partition the full role list", () => {
        const snapshot = getMockWorkspaceSnapshot();
        const circleIds = snapshot.circles.map((c) => c.id);
        const allRolesViaSelectorIds = circleIds
            .flatMap((cid) => getRolesForCircle(snapshot, cid))
            .map((r) => r.id)
            .sort();

        const allRoleIds = snapshot.roles.map((r) => r.id).sort();

        expect(allRolesViaSelectorIds).toEqual(allRoleIds);
    });
});
