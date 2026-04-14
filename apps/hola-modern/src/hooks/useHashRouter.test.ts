import { describe, expect, it } from "vitest";

import type { Route } from "./useHashRouter";
import { parseHash, routeToHash } from "./useHashRouter";

describe("useHashRouter — parseHash", () => {
    it("parses empty and root as home", () => {
        expect(parseHash("")).toEqual({ page: "home" });
        expect(parseHash("#")).toEqual({ page: "home" });
        expect(parseHash("#/")).toEqual({ page: "home" });
    });

    it("parses the public org route", () => {
        expect(parseHash("#/o/1")).toEqual({ page: "public", orgId: "1" });
        expect(parseHash("#/o/0xabc")).toEqual({ page: "public", orgId: "0xabc" });
    });

    it("falls through to home when public route has no orgId", () => {
        expect(parseHash("#/o")).toEqual({ page: "home" });
        expect(parseHash("#/o/")).toEqual({ page: "home" });
    });

    it("parses the explore route", () => {
        expect(parseHash("#/explore")).toEqual({ page: "explore" });
    });

    it("parses the public role permalink", () => {
        expect(parseHash("#/o/1/r/0xabc-42")).toEqual({
            page: "publicRole",
            orgId: "1",
            roleId: "0xabc-42",
        });
    });

    it("decodes url-encoded role ids", () => {
        // composite id "<registry>-<roleId>" — the "-" survives but paths with
        // additional segments or percent-encoded chars should decode cleanly.
        expect(parseHash("#/o/1/r/0xAbC%2D7")).toEqual({
            page: "publicRole",
            orgId: "1",
            roleId: "0xAbC-7",
        });
    });

    it("falls back to public org when role permalink is malformed", () => {
        expect(parseHash("#/o/1/r")).toEqual({ page: "public", orgId: "1" });
        expect(parseHash("#/o/1/r/")).toEqual({ page: "public", orgId: "1" });
    });

    it("handles uppercase hex in orgId (addresses are case-preserved)", () => {
        // orgId is passed through as-is — no lowercasing in the router.
        expect(parseHash("#/o/0xABCDEF123")).toEqual({
            page: "public",
            orgId: "0xABCDEF123",
        });
        expect(parseHash("#/o/0xABCDEF123/r/0xReg-99")).toEqual({
            page: "publicRole",
            orgId: "0xABCDEF123",
            roleId: "0xReg-99",
        });
    });

    it("decodes a percent-encoded space in roleId", () => {
        // Unusual, but decodeURIComponent should handle it without throwing.
        expect(parseHash("#/o/1/r/my%20role")).toEqual({
            page: "publicRole",
            orgId: "1",
            roleId: "my role",
        });
    });

    it("round-trips a roleId that contains a forward-slash via encodeURIComponent", () => {
        // encodeURIComponent("/") → "%2F", so the slash survives the URL split.
        const r: Route = { page: "publicRole", orgId: "1", roleId: "0xReg/42" };
        expect(parseHash(routeToHash(r))).toEqual(r);
    });

    it("still parses existing routes", () => {
        expect(parseHash("#/constitution")).toEqual({ page: "constitution" });
        expect(parseHash("#/join/42")).toEqual({ page: "join", orgId: "42" });
        expect(parseHash("#/orgs/7")).toMatchObject({ page: "org", orgId: "7" });
        expect(parseHash("#/orgs/7/governance")).toMatchObject({
            page: "org",
            orgId: "7",
            tab: "governance",
        });
    });
});

describe("useHashRouter — routeToHash", () => {
    it("stringifies the public org route", () => {
        expect(routeToHash({ page: "public", orgId: "1" })).toBe("#/o/1");
        expect(routeToHash({ page: "public", orgId: "42" })).toBe("#/o/42");
    });

    it("round-trips the public route", () => {
        const cases: Route[] = [
            { page: "public", orgId: "1" },
            { page: "public", orgId: "999" },
        ];
        for (const r of cases) {
            expect(parseHash(routeToHash(r))).toEqual(r);
        }
    });

    it("round-trips home and constitution", () => {
        expect(parseHash(routeToHash({ page: "home" }))).toEqual({ page: "home" });
        expect(parseHash(routeToHash({ page: "constitution" }))).toEqual({ page: "constitution" });
    });

    it("stringifies and round-trips explore", () => {
        expect(routeToHash({ page: "explore" })).toBe("#/explore");
        expect(parseHash(routeToHash({ page: "explore" }))).toEqual({ page: "explore" });
    });

    it("stringifies and round-trips publicRole", () => {
        const r: Route = {
            page: "publicRole",
            orgId: "1",
            roleId: "0xabc123-42",
        };
        expect(routeToHash(r)).toBe("#/o/1/r/0xabc123-42");
        expect(parseHash(routeToHash(r))).toEqual(r);
    });
});
