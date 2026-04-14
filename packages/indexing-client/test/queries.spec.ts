/**
 * Regression tests for BigInt query variable types.
 *
 * The Ponder indexer uses BigInt columns for `organization.id` and `orgId`
 * foreign keys. GraphQL variables must declare `BigInt!` — not `String!`.
 * This has regressed twice (GET_ORGANIZATION commit 10824bb,
 * LIST_ROLES_BY_ORG / LIST_CIRCLES_BY_ORG this sprint). These tests are
 * intentionally string-assertive so that a type flip back to `String!` is
 * caught immediately.
 */
import {
    GET_ORGANIZATION,
    LIST_CIRCLES_BY_ORG,
    LIST_MEETING_COMPONENTS_BY_ORG,
    LIST_ROLES_BY_ORG,
} from "@/queries.js";
import { describe, expect, it } from "vitest";

describe("query variable types — BigInt regression guard", () => {
    it("GET_ORGANIZATION declares $id as BigInt!", () => {
        expect(GET_ORGANIZATION).toContain("$id: BigInt!");
    });

    it("LIST_ROLES_BY_ORG declares $orgId as BigInt!", () => {
        expect(LIST_ROLES_BY_ORG).toContain("$orgId: BigInt!");
    });

    it("LIST_CIRCLES_BY_ORG declares $orgId as BigInt!", () => {
        expect(LIST_CIRCLES_BY_ORG).toContain("$orgId: BigInt!");
    });

    it("LIST_MEETING_COMPONENTS_BY_ORG declares $orgId as BigInt!", () => {
        expect(LIST_MEETING_COMPONENTS_BY_ORG).toContain("$orgId: BigInt!");
    });
});
