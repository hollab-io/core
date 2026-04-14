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
});
