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
    LIST_OBJECTIONS_BY_PROPOSAL,
    LIST_OPEN_PROPOSALS_BY_ORG,
    LIST_PROPOSALS_BY_CIRCLE,
    LIST_PROPOSALS_BY_ORG,
    LIST_ROLES_BY_ORG,
    PROPOSAL_FIELDS,
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

    it("LIST_PROPOSALS_BY_ORG declares $orgId as BigInt!", () => {
        expect(LIST_PROPOSALS_BY_ORG).toContain("$orgId: BigInt!");
    });

    it("LIST_OPEN_PROPOSALS_BY_ORG declares $orgId as BigInt!", () => {
        expect(LIST_OPEN_PROPOSALS_BY_ORG).toContain("$orgId: BigInt!");
    });

    it("LIST_PROPOSALS_BY_CIRCLE declares $circleId as BigInt!", () => {
        expect(LIST_PROPOSALS_BY_CIRCLE).toContain("$circleId: BigInt!");
    });

    it("LIST_OBJECTIONS_BY_PROPOSAL declares $proposalId as BigInt!", () => {
        expect(LIST_OBJECTIONS_BY_PROPOSAL).toContain("$proposalId: BigInt!");
    });
});

describe("PROPOSAL_FIELDS — column coverage", () => {
    // Guards against a regression where new proposal columns get added to the
    // schema but forgotten here — every consumer (manifest, agent-sdk,
    // frontend) would silently see `undefined` on the dropped field.
    it.each(["tensionHash", "changeType", "changeData", "changeResultId", "orgId", "resolvedBy"])(
        "includes %s",
        (field) => {
            expect(PROPOSAL_FIELDS).toContain(field);
        },
    );
});
