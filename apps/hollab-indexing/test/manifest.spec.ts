/**
 * Tests for the pure manifest assembly functions.
 *
 * These run entirely offline — no Ponder, no DB, no network.
 * All bigint fields mirror the ponder.schema.ts definitions.
 */
import { describe, expect, it } from "vitest";

import type {
    CircleRow,
    ComponentSetRow,
    ManifestOpts,
    MemberRow,
    OrgRow,
    ProposalRow,
    RoleRow,
} from "../src/api/manifest.js";
import { assembleOrgIndex, assembleOrgManifest } from "../src/api/manifest.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORG: OrgRow = {
    id: 1n,
    subname: "acme",
    name: "ACME DAO",
    purpose: "Build the best tools for all",
    creator: "0xCreator000000000000000000000000000000001",
    createdAt: 1712000000n,
    token: "0xToken00000000000000000000000000000000001",
    circleRegistry: "0xCircleReg00000000000000000000000000001",
    roleRegistry: "0xRoleReg000000000000000000000000000001",
    governanceProcess: "0xGovProcess00000000000000000000000001",
};

const ANCHOR_CIRCLE: CircleRow = {
    circleId: 1n,
    name: "Anchor",
    purpose: "Top-level strategic circle",
    parentCircleId: 0n,
    isAnchor: true,
    roleIds: ["1", "2"],
    subCircleIds: ["2"],
};

const SUB_CIRCLE: CircleRow = {
    circleId: 2n,
    name: "Engineering",
    purpose: "Build and ship",
    parentCircleId: 1n,
    isAnchor: false,
    roleIds: ["3"],
    subCircleIds: [],
};

const ROLE_1: RoleRow = {
    roleId: 1n,
    name: "Lead Link",
    purpose: "Hold overall purpose",
    domains: ["org strategy"],
    accountabilities: ["prioritise work"],
    circleId: 1n,
    leads: ["0xAgent0000000000000000000000000000000001"],
};

const ROLE_2: RoleRow = {
    roleId: 2n,
    name: "Secretary",
    purpose: "Steward governance process",
    domains: [],
    accountabilities: [],
    circleId: 1n,
    leads: [],
};

const MEMBER_HUMAN: MemberRow = {
    memberAddress: "0xHuman0000000000000000000000000000000001",
    addedAt: 1712000001n,
};

const MEMBER_AGENT: MemberRow = {
    memberAddress: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720", // anvil #9
    addedAt: 1712000002n,
};

const COMPONENT_SET_OLD: ComponentSetRow = {
    meetingFactory: "0xMeetingFactory_OLD0000000000000000000",
    actionVoting: "0xActionVoting_OLD0000000000000000000001",
    deployedAt: 1000n,
};

const COMPONENT_SET_NEW: ComponentSetRow = {
    meetingFactory: "0xMeetingFactory_NEW0000000000000000000",
    actionVoting: "0xActionVoting_NEW0000000000000000000001",
    deployedAt: 2000n,
};

const OPTS: ManifestOpts = {
    chainId: 31337,
    origin: "http://localhost:42069",
};

// ── assembleOrgManifest ───────────────────────────────────────────────────────

describe("assembleOrgManifest", () => {
    it("returns version 1 and correct chainId", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.version).toBe(1);
        expect(result.chainId).toBe(31337);
    });

    it("serializes org.id as a decimal string (bigint safety)", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.org.id).toBe("1");
        expect(typeof result.org.id).toBe("string");
    });

    it("builds ensName from subname", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.org.ensName).toBe("acme.hollab.eth");
    });

    it("maps purpose to mission", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.org.mission).toBe(ORG.purpose);
    });

    it("converts org.createdAt bigint to a JS number", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.org.createdAt).toBe(1712000000);
        expect(typeof result.org.createdAt).toBe("number");
    });

    it("sets memberCount / circleCount / roleCount from array lengths", () => {
        const result = assembleOrgManifest(
            ORG,
            [ANCHOR_CIRCLE, SUB_CIRCLE],
            [ROLE_1, ROLE_2],
            [MEMBER_HUMAN, MEMBER_AGENT],
            [],
            OPTS,
        );
        expect(result.org.memberCount).toBe(2);
        expect(result.org.circleCount).toBe(2);
        expect(result.org.roleCount).toBe(2);
    });

    // ── contracts block ──────────────────────────────────────────────────────

    it("populates contracts from org row fields", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [COMPONENT_SET_NEW], OPTS);
        expect(result.contracts.circleRegistry).toBe(ORG.circleRegistry);
        expect(result.contracts.roleRegistry).toBe(ORG.roleRegistry);
        expect(result.contracts.governanceProcess).toBe(ORG.governanceProcess);
        expect(result.contracts.govToken).toBe(ORG.token);
    });

    it("meetingFactory and actionVoting are null (not undefined) when no componentSet", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        // JSON.stringify drops `undefined` keys — `null` is preserved
        expect(result.contracts.meetingFactory).toBeNull();
        expect(result.contracts.actionVoting).toBeNull();
        // Both keys must survive JSON serialisation.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- JSON.parse returns any; we immediately type it
        const serialised: Record<string, Record<string, unknown>> = JSON.parse(
            JSON.stringify(result),
        );
        const contracts = serialised["contracts"]!;
        expect(Object.prototype.hasOwnProperty.call(contracts, "meetingFactory")).toBe(true);
        expect(Object.prototype.hasOwnProperty.call(contracts, "actionVoting")).toBe(true);
    });

    it("picks the most recently deployed componentSet when multiple exist", () => {
        // Pass old first, new second — should still pick new
        const result = assembleOrgManifest(
            ORG,
            [],
            [],
            [],
            [COMPONENT_SET_OLD, COMPONENT_SET_NEW],
            OPTS,
        );
        expect(result.contracts.meetingFactory).toBe(COMPONENT_SET_NEW.meetingFactory);
        expect(result.contracts.actionVoting).toBe(COMPONENT_SET_NEW.actionVoting);
    });

    it("picks the most recently deployed even when input order is reversed", () => {
        // Pass new first, old second — must not rely on input order
        const result = assembleOrgManifest(
            ORG,
            [],
            [],
            [],
            [COMPONENT_SET_NEW, COMPONENT_SET_OLD],
            OPTS,
        );
        expect(result.contracts.meetingFactory).toBe(COMPONENT_SET_NEW.meetingFactory);
    });

    it("does not mutate the input componentSets array", () => {
        const sets = [COMPONENT_SET_OLD, COMPONENT_SET_NEW];
        const copy = [...sets];
        assembleOrgManifest(ORG, [], [], [], sets, OPTS);
        expect(sets).toEqual(copy);
    });

    // ── circles ──────────────────────────────────────────────────────────────

    it("serializes circle.circleId as decimal string", () => {
        const result = assembleOrgManifest(ORG, [ANCHOR_CIRCLE], [], [], [], OPTS);
        expect(result.circles[0]!.id).toBe("1");
        expect(typeof result.circles[0]!.id).toBe("string");
    });

    it("serializes circle.parentCircleId as decimal string (anchor = '0')", () => {
        const result = assembleOrgManifest(ORG, [ANCHOR_CIRCLE], [], [], [], OPTS);
        expect(result.circles[0]!.parentId).toBe("0");
    });

    it("preserves circle ordering from the input array", () => {
        // Input already ordered by circleId asc (caller's responsibility)
        const result = assembleOrgManifest(ORG, [ANCHOR_CIRCLE, SUB_CIRCLE], [], [], [], OPTS);
        expect(result.circles[0]!.id).toBe("1");
        expect(result.circles[1]!.id).toBe("2");
    });

    it("stable ordering — shuffled circles are in DB-query order, not re-sorted", () => {
        // Deliberately pass circles in reverse order to confirm the function does
        // not re-sort (ordering responsibility belongs to the DB query in index.ts)
        const result = assembleOrgManifest(ORG, [SUB_CIRCLE, ANCHOR_CIRCLE], [], [], [], OPTS);
        expect(result.circles[0]!.id).toBe("2"); // sub-circle first because input is reversed
        expect(result.circles[1]!.id).toBe("1");
    });

    // ── roles ────────────────────────────────────────────────────────────────

    it("serializes role.roleId and role.circleId as decimal strings", () => {
        const result = assembleOrgManifest(ORG, [], [ROLE_1], [], [], OPTS);
        expect(result.roles[0]!.id).toBe("1");
        expect(result.roles[0]!.circleId).toBe("1");
    });

    it("preserves role fields: name, purpose, domains, accountabilities, leads", () => {
        const result = assembleOrgManifest(ORG, [], [ROLE_1], [], [], OPTS);
        expect(result.roles[0]!.name).toBe(ROLE_1.name);
        expect(result.roles[0]!.purpose).toBe(ROLE_1.purpose);
        expect(result.roles[0]!.domains).toEqual(ROLE_1.domains);
        expect(result.roles[0]!.leads).toEqual(ROLE_1.leads);
    });

    // ── members ──────────────────────────────────────────────────────────────

    it("serializes member.addedAt bigint as JS number (joinedAt)", () => {
        const result = assembleOrgManifest(ORG, [], [], [MEMBER_HUMAN], [], OPTS);
        expect(result.members[0]!.joinedAt).toBe(1712000001);
        expect(typeof result.members[0]!.joinedAt).toBe("number");
    });

    it("preserves member address", () => {
        const result = assembleOrgManifest(ORG, [], [], [MEMBER_AGENT], [], OPTS);
        expect(result.members[0]!.address).toBe(MEMBER_AGENT.memberAddress);
    });

    // ── openProposals ────────────────────────────────────────────────────────

    it("openProposals is always an empty array (v1 known limitation)", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.openProposals).toEqual([]);
    });

    // ── indexer block ────────────────────────────────────────────────────────

    it("sets indexer.endpoint and graphql from opts.origin", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.indexer.endpoint).toBe("http://localhost:42069");
        expect(result.indexer.graphql).toBe("http://localhost:42069/graphql");
        expect(result.indexer.type).toBe("ponder");
    });

    it("indexer.endpoint and graphql are null when origin is null", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], { chainId: 31337, origin: null });
        expect(result.indexer.endpoint).toBeNull();
        expect(result.indexer.graphql).toBeNull();
    });

    // ── v1 schema completeness ────────────────────────────────────────────────

    it("manifest contains every top-level key defined in agent-manifest-v1.md", () => {
        const result = assembleOrgManifest(
            ORG,
            [ANCHOR_CIRCLE],
            [ROLE_1],
            [MEMBER_HUMAN],
            [COMPONENT_SET_NEW],
            OPTS,
        );
        const keys = Object.keys(result);
        for (const required of [
            "version",
            "chainId",
            "org",
            "contracts",
            "circles",
            "roles",
            "members",
            "openProposals",
            "indexer",
        ]) {
            expect(keys).toContain(required);
        }
    });

    it("org block contains all required sub-keys", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        for (const key of [
            "id",
            "ensName",
            "name",
            "mission",
            "creator",
            "createdAt",
            "memberCount",
            "circleCount",
            "roleCount",
        ]) {
            expect(Object.keys(result.org)).toContain(key);
        }
    });

    it("contracts block contains all required sub-keys", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        for (const key of [
            "circleRegistry",
            "roleRegistry",
            "governanceProcess",
            "meetingFactory",
            "actionVoting",
            "govToken",
        ]) {
            expect(Object.keys(result.contracts)).toContain(key);
        }
    });

    it("all bigint fields survive JSON.stringify without precision loss", () => {
        const bigOrg: OrgRow = { ...ORG, id: 999999999999999999999n };
        const result = assembleOrgManifest(bigOrg, [], [], [], [], OPTS);
        // Must be parseable as a decimal string representing the exact value
        expect(result.org.id).toBe("999999999999999999999");
        // JSON.stringify must not throw (standard JSON cannot handle bigint)
        expect(() => JSON.stringify(result)).not.toThrow();
    });
});

// ── openProposals ─────────────────────────────────────────────────────────────

describe("assembleOrgManifest — openProposals", () => {
    const PROPOSAL_1: ProposalRow = {
        proposalId: 1n,
        processAddress: "0xMeetingFactoryClone00000000000000000001",
        circleId: 0n,
        proposer: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
        proposerRoleId: 0n,
        tensionHash: "0xaaaabbbbccccdddd000000000000000000000000000000000000000000000001",
        changeType: 0, // CreateRole
        changeData: "0xdeadbeef",
        status: 0, // Draft
        submittedAt: 1712000100n,
    };

    const PROPOSAL_2: ProposalRow = {
        ...PROPOSAL_1,
        proposalId: 2n,
        tensionHash: "0xaaaabbbbccccdddd000000000000000000000000000000000000000000000002",
        submittedAt: 1712000200n,
    };

    it("defaults to empty openProposals when caller omits the argument", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], OPTS);
        expect(result.openProposals).toEqual([]);
    });

    it("maps proposal rows onto the manifest shape", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], [PROPOSAL_1], OPTS);
        expect(result.openProposals).toHaveLength(1);
        const p = result.openProposals[0]!;
        expect(p.id).toBe("1");
        expect(p.processAddress).toBe(PROPOSAL_1.processAddress);
        expect(p.circleId).toBe("0");
        expect(p.proposer).toBe(PROPOSAL_1.proposer);
        expect(p.tensionHash).toBe(PROPOSAL_1.tensionHash);
        expect(p.changeType).toBe(0);
        expect(p.changeData).toBe("0xdeadbeef");
        expect(p.status).toBe(0);
        expect(p.submittedAt).toBe(1712000100);
    });

    it("includes a path-based permalink keyed on orgId and proposalId", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], [PROPOSAL_1], OPTS);
        expect(result.openProposals[0]!.permalink).toBe("/o/1/p/1");
    });

    it("preserves caller ordering (assumed submittedAt asc by the route)", () => {
        const result = assembleOrgManifest(ORG, [], [], [], [], [PROPOSAL_1, PROPOSAL_2], OPTS);
        expect(result.openProposals.map((p) => p.id)).toEqual(["1", "2"]);
    });

    it("serializes bigints inside proposal rows as decimal strings", () => {
        const big: ProposalRow = {
            ...PROPOSAL_1,
            proposalId: 999999999999999999999n,
            proposerRoleId: 42n,
            circleId: 7n,
        };
        const result = assembleOrgManifest(ORG, [], [], [], [], [big], OPTS);
        expect(result.openProposals[0]!.id).toBe("999999999999999999999");
        expect(result.openProposals[0]!.proposerRoleId).toBe("42");
        expect(result.openProposals[0]!.circleId).toBe("7");
        expect(() => JSON.stringify(result)).not.toThrow();
    });
});

// ── assembleOrgIndex ──────────────────────────────────────────────────────────

describe("assembleOrgIndex", () => {
    const ORG_1 = { id: 1n, subname: "acme", name: "ACME DAO", purpose: "Build great tools" };
    const ORG_2 = { id: 2n, subname: "beta", name: "Beta Org", purpose: "Beta mission" };

    it("returns version 1 and correct chainId", () => {
        const result = assembleOrgIndex([], OPTS);
        expect(result.version).toBe(1);
        expect(result.chainId).toBe(31337);
    });

    it("maps each org to id/ensName/name/mission/manifest fields", () => {
        const result = assembleOrgIndex([ORG_1], OPTS);
        const org = result.orgs[0]!;
        expect(org.id).toBe("1");
        expect(org.ensName).toBe("acme.hollab.eth");
        expect(org.name).toBe("ACME DAO");
        expect(org.mission).toBe("Build great tools");
        expect(org.manifest).toBe("/agents/1.json");
    });

    it("serializes org.id bigint as decimal string", () => {
        const result = assembleOrgIndex([ORG_1], OPTS);
        expect(typeof result.orgs[0]!.id).toBe("string");
    });

    it("builds manifest path from org.id decimal string", () => {
        const result = assembleOrgIndex([ORG_2], OPTS);
        expect(result.orgs[0]!.manifest).toBe("/agents/2.json");
    });

    it("preserves input ordering (caller is responsible for asc order)", () => {
        const result = assembleOrgIndex([ORG_1, ORG_2], OPTS);
        expect(result.orgs[0]!.id).toBe("1");
        expect(result.orgs[1]!.id).toBe("2");
    });

    it("returns empty orgs array when no orgs exist", () => {
        const result = assembleOrgIndex([], OPTS);
        expect(result.orgs).toEqual([]);
    });

    it("sets indexer.endpoint from opts.origin", () => {
        const result = assembleOrgIndex([], OPTS);
        expect(result.indexer.endpoint).toBe("http://localhost:42069");
        expect(result.indexer.type).toBe("ponder");
    });

    it("indexer.endpoint is null when origin is null", () => {
        const result = assembleOrgIndex([], { chainId: 31337, origin: null });
        expect(result.indexer.endpoint).toBeNull();
    });

    it("index contains every top-level key defined in agent-manifest-v1.md discovery shape", () => {
        const result = assembleOrgIndex([ORG_1], OPTS);
        for (const key of ["version", "chainId", "indexer", "orgs"]) {
            expect(Object.keys(result)).toContain(key);
        }
    });

    it("manifest path survives large bigint org ids without precision loss", () => {
        const bigOrg = {
            id: 123456789012345678901n,
            subname: "big",
            name: "Big",
            purpose: "Big purpose",
        };
        const result = assembleOrgIndex([bigOrg], OPTS);
        expect(result.orgs[0]!.id).toBe("123456789012345678901");
        expect(result.orgs[0]!.manifest).toBe("/agents/123456789012345678901.json");
    });
});

// ── jsonReplacer behaviour (via JSON.stringify) ───────────────────────────────
// These tests verify the bigint serialisation assumption that the route handlers
// rely on (jsonReplacer in index.ts). We test it indirectly through the
// assembleOrgManifest output to ensure there are no regressions if the helper
// is ever inlined differently.

describe("bigint serialisation invariants", () => {
    it("circle.circleId bigint becomes a decimal string in the manifest", () => {
        const circleWithLargeBigint: CircleRow = {
            ...ANCHOR_CIRCLE,
            circleId: 9007199254740993n, // > Number.MAX_SAFE_INTEGER
        };
        const result = assembleOrgManifest(ORG, [circleWithLargeBigint], [], [], [], OPTS);
        expect(result.circles[0]!.id).toBe("9007199254740993");
    });

    it("role.roleId and role.circleId bigints become decimal strings", () => {
        const roleWithLargeBigint: RoleRow = {
            ...ROLE_1,
            roleId: 9007199254740994n,
            circleId: 9007199254740995n,
        };
        const result = assembleOrgManifest(ORG, [], [roleWithLargeBigint], [], [], OPTS);
        expect(result.roles[0]!.id).toBe("9007199254740994");
        expect(result.roles[0]!.circleId).toBe("9007199254740995");
    });

    it("member.addedAt bigint becomes a JS number via Number()", () => {
        const memberWithBigAt: MemberRow = {
            ...MEMBER_HUMAN,
            addedAt: 1712345678n,
        };
        const result = assembleOrgManifest(ORG, [], [], [memberWithBigAt], [], OPTS);
        expect(result.members[0]!.joinedAt).toBe(1712345678);
    });
});
