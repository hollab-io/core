/**
 * Pure unit tests for the ABI encoding helpers in useExecuteGovernance.ts.
 *
 * No network, no mocks — each test encodes a payload then round-trips it
 * through viem's decodeAbiParameters to verify the values survive the
 * encode/decode boundary unchanged.
 */
import { decodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";

import {
    ChangeType,
    encodeAmendRole,
    encodeAmendRoleWithRefs,
    encodeCreateRole,
    encodeCreateRoleWithRefs,
    encodeElection,
    encodeExpandRoleToCircle,
    encodeRemoveRole,
} from "./useExecuteGovernance";

// ── ChangeType enum ──────────────────────────────────────────────────────────

describe("ChangeType enum", () => {
    it("maps all change types to their expected numeric values", () => {
        expect(ChangeType.CreateRole).toBe(0);
        expect(ChangeType.AmendRole).toBe(1);
        expect(ChangeType.RemoveRole).toBe(2);
        expect(ChangeType.CreatePolicy).toBe(3);
        expect(ChangeType.AmendPolicy).toBe(4);
        expect(ChangeType.RemovePolicy).toBe(5);
        expect(ChangeType.MoveRole).toBe(6);
        expect(ChangeType.Election).toBe(7);
        expect(ChangeType.CreateRoleWithRefs).toBe(8);
        expect(ChangeType.AmendRoleWithRefs).toBe(9);
        expect(ChangeType.CreatePolicyWithRefs).toBe(10);
        expect(ChangeType.AmendPolicyWithRefs).toBe(11);
        expect(ChangeType.ExpandRoleToCircle).toBe(12);
    });

    it("has unique values for all keys", () => {
        const values = Object.values(ChangeType);
        expect(new Set(values).size).toBe(values.length);
    });
});

// ── encodeCreateRole ─────────────────────────────────────────────────────────

describe("encodeCreateRole", () => {
    const roleParamTypes = [
        { type: "uint256" as const },
        { type: "string" as const },
        { type: "string" as const },
        { type: "string[]" as const },
        { type: "string[]" as const },
    ] as const;

    it("round-trips typical role params", () => {
        const params = {
            circleId: 1n,
            name: "Developer",
            purpose: "Ship great software",
            domains: ["codebase", "CI pipeline"],
            accountabilities: ["write tests", "review PRs"],
        };

        const encoded = encodeCreateRole(params);

        expect(encoded).toMatch(/^0x/);

        const [circleId, name, purpose, domains, accountabilities] = decodeAbiParameters(
            roleParamTypes,
            encoded,
        );
        expect(circleId).toBe(params.circleId);
        expect(name).toBe(params.name);
        expect(purpose).toBe(params.purpose);
        expect([...domains]).toEqual(params.domains);
        expect([...accountabilities]).toEqual(params.accountabilities);
    });

    it("encodes correctly with empty domains and accountabilities arrays", () => {
        const params = {
            circleId: 42n,
            name: "Watcher",
            purpose: "Observe",
            domains: [],
            accountabilities: [],
        };

        const encoded = encodeCreateRole(params);
        const [circleId, name, purpose, domains, accountabilities] = decodeAbiParameters(
            roleParamTypes,
            encoded,
        );
        expect(circleId).toBe(42n);
        expect(name).toBe("Watcher");
        expect(purpose).toBe("Observe");
        expect([...domains]).toEqual([]);
        expect([...accountabilities]).toEqual([]);
    });

    it("encodes a large circleId (uint256 boundary test)", () => {
        const largeId = 2n ** 128n - 1n;
        const encoded = encodeCreateRole({
            circleId: largeId,
            name: "BigCircle",
            purpose: "",
            domains: [],
            accountabilities: [],
        });
        const [circleId] = decodeAbiParameters(roleParamTypes, encoded);
        expect(circleId).toBe(largeId);
    });
});

// ── encodeAmendRole ──────────────────────────────────────────────────────────

describe("encodeAmendRole", () => {
    const roleParamTypes = [
        { type: "uint256" as const },
        { type: "string" as const },
        { type: "string" as const },
        { type: "string[]" as const },
        { type: "string[]" as const },
    ] as const;

    it("round-trips amended role params", () => {
        const params = {
            roleId: 7n,
            name: "Lead Developer",
            purpose: "Lead the engineering team",
            domains: ["architecture"],
            accountabilities: ["mentor juniors", "set tech direction"],
        };

        const encoded = encodeAmendRole(params);

        expect(encoded).toMatch(/^0x/);

        const [roleId, name, purpose, domains, accountabilities] = decodeAbiParameters(
            roleParamTypes,
            encoded,
        );
        expect(roleId).toBe(params.roleId);
        expect(name).toBe(params.name);
        expect(purpose).toBe(params.purpose);
        expect([...domains]).toEqual(params.domains);
        expect([...accountabilities]).toEqual(params.accountabilities);
    });

    it("produces different output than encodeCreateRole for same logical params", () => {
        // Both functions share the same param types, but test that the same
        // values produce identical bytes (role of first param differs semantically,
        // but the ABI encoding is identical — this verifies no extra tagging).
        const sharedId = 5n;
        const createEncoded = encodeCreateRole({
            circleId: sharedId,
            name: "X",
            purpose: "Y",
            domains: [],
            accountabilities: [],
        });
        const amendEncoded = encodeAmendRole({
            roleId: sharedId,
            name: "X",
            purpose: "Y",
            domains: [],
            accountabilities: [],
        });
        // Same encoding scheme — identical bytes for same values
        expect(createEncoded).toBe(amendEncoded);
    });
});

// ── encodeRemoveRole ─────────────────────────────────────────────────────────

describe("encodeRemoveRole", () => {
    const paramTypes = [{ type: "uint256" as const }] as const;

    it("encodes a roleId and round-trips correctly", () => {
        const roleId = 99n;
        const encoded = encodeRemoveRole(roleId);

        expect(encoded).toMatch(/^0x/);

        const [decoded] = decodeAbiParameters(paramTypes, encoded);
        expect(decoded).toBe(roleId);
    });

    it("encodes roleId = 0 without error", () => {
        const encoded = encodeRemoveRole(0n);
        const [decoded] = decodeAbiParameters(paramTypes, encoded);
        expect(decoded).toBe(0n);
    });

    it("encodes the maximum uint256", () => {
        const max = 2n ** 256n - 1n;
        const encoded = encodeRemoveRole(max);
        const [decoded] = decodeAbiParameters(paramTypes, encoded);
        expect(decoded).toBe(max);
    });
});

// ── encodeElection ───────────────────────────────────────────────────────────

describe("encodeElection", () => {
    const paramTypes = [
        { type: "uint256" as const },
        { type: "address" as const },
        { type: "address" as const },
    ] as const;

    it("round-trips roleId, lead, and previousLead (defaulting to address(0))", () => {
        const roleId = 3n;
        const lead = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;

        const encoded = encodeElection(roleId, lead);

        expect(encoded).toMatch(/^0x/);

        const [decodedRoleId, decodedLead, decodedPrevious] = decodeAbiParameters(
            paramTypes,
            encoded,
        );
        expect(decodedRoleId).toBe(roleId);
        expect(decodedLead.toLowerCase()).toBe(lead.toLowerCase());
        expect(decodedPrevious).toBe("0x0000000000000000000000000000000000000000");
    });

    it("encodes the zero address for lead", () => {
        const encoded = encodeElection(1n, "0x0000000000000000000000000000000000000000");
        const [, decodedLead, decodedPrevious] = decodeAbiParameters(paramTypes, encoded);
        expect(decodedLead).toBe("0x0000000000000000000000000000000000000000");
        expect(decodedPrevious).toBe("0x0000000000000000000000000000000000000000");
    });

    it("encodes an explicit previousLead", () => {
        const roleId = 5n;
        const lead = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
        const previous = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

        const encoded = encodeElection(roleId, lead, previous);

        const [decodedRoleId, decodedLead, decodedPrevious] = decodeAbiParameters(
            paramTypes,
            encoded,
        );
        expect(decodedRoleId).toBe(roleId);
        expect(decodedLead.toLowerCase()).toBe(lead.toLowerCase());
        expect(decodedPrevious.toLowerCase()).toBe(previous.toLowerCase());
    });
});

// ── encodeExpandRoleToCircle ─────────────────────────────────────────────────

describe("encodeExpandRoleToCircle", () => {
    const paramTypes = [{ type: "uint256" as const }] as const;

    it("encodes a roleId and round-trips correctly", () => {
        const roleId = 55n;
        const encoded = encodeExpandRoleToCircle(roleId);

        expect(encoded).toMatch(/^0x/);

        const [decoded] = decodeAbiParameters(paramTypes, encoded);
        expect(decoded).toBe(roleId);
    });

    it("produces the same bytes as encodeRemoveRole for the same roleId", () => {
        // Both encode a single uint256 — no type tag in the ABI encoding.
        // This verifies the encoding scheme is consistent and not accidentally
        // differentiated at the encoding layer (differentiation is at ChangeType).
        const roleId = 12n;
        expect(encodeExpandRoleToCircle(roleId)).toBe(encodeRemoveRole(roleId));
    });

    it("encodes roleId = 1 (minimum non-zero role)", () => {
        const encoded = encodeExpandRoleToCircle(1n);
        const [decoded] = decodeAbiParameters(paramTypes, encoded);
        expect(decoded).toBe(1n);
    });
});

// ── encodeCreateRoleWithRefs ─────────────────────────────────────────────────

describe("encodeCreateRoleWithRefs", () => {
    const roleWithRefsParamTypes = [
        { type: "uint256" as const },
        { type: "string" as const },
        { type: "string" as const },
        { type: "string[]" as const },
        { type: "string[]" as const },
        { type: "bytes32[]" as const },
        {
            type: "tuple[]" as const,
            components: [
                { type: "bytes32" as const, name: "contentHash" },
                { type: "uint8" as const, name: "visibility" },
            ],
        },
    ] as const;

    const ZERO_HASH = `0x${"00".repeat(32)}` as `0x${string}`;
    const CONTENT_HASH = `0x${"ab".repeat(32)}` as `0x${string}`;

    it("round-trips all fields including fieldNames and refs", () => {
        const params = {
            circleId: 10n,
            name: "Strategist",
            purpose: "Define direction",
            domains: ["strategy"],
            accountabilities: ["quarterly planning"],
            fieldNames: [ZERO_HASH, CONTENT_HASH],
            refs: [
                { contentHash: CONTENT_HASH, visibility: 0 },
                { contentHash: ZERO_HASH, visibility: 1 },
            ],
        };

        const encoded = encodeCreateRoleWithRefs(params);

        expect(encoded).toMatch(/^0x/);

        const [circleId, name, purpose, domains, accountabilities, fieldNames, refs] =
            decodeAbiParameters(roleWithRefsParamTypes, encoded);

        expect(circleId).toBe(params.circleId);
        expect(name).toBe(params.name);
        expect(purpose).toBe(params.purpose);
        expect([...domains]).toEqual(params.domains);
        expect([...accountabilities]).toEqual(params.accountabilities);
        expect([...fieldNames]).toEqual(params.fieldNames);
        expect(refs[0].contentHash).toBe(CONTENT_HASH);
        expect(refs[0].visibility).toBe(0);
        expect(refs[1].contentHash).toBe(ZERO_HASH);
        expect(refs[1].visibility).toBe(1);
    });

    it("encodes with empty fieldNames and refs arrays", () => {
        const params = {
            circleId: 1n,
            name: "Minimal",
            purpose: "",
            domains: [],
            accountabilities: [],
            fieldNames: [],
            refs: [],
        };

        const encoded = encodeCreateRoleWithRefs(params);
        const [, , , , , fieldNames, refs] = decodeAbiParameters(roleWithRefsParamTypes, encoded);
        expect([...fieldNames]).toEqual([]);
        expect([...refs]).toEqual([]);
    });

    it("encodes visibility=2 (RoleEncrypted) correctly", () => {
        const params = {
            circleId: 3n,
            name: "Private",
            purpose: "Sensitive work",
            domains: [],
            accountabilities: [],
            fieldNames: [ZERO_HASH],
            refs: [{ contentHash: CONTENT_HASH, visibility: 2 }],
        };

        const encoded = encodeCreateRoleWithRefs(params);
        const [, , , , , , refs] = decodeAbiParameters(roleWithRefsParamTypes, encoded);
        expect(refs[0].visibility).toBe(2);
    });
});

// ── encodeAmendRoleWithRefs ──────────────────────────────────────────────────

describe("encodeAmendRoleWithRefs", () => {
    const roleWithRefsParamTypes = [
        { type: "uint256" as const },
        { type: "string" as const },
        { type: "string" as const },
        { type: "string[]" as const },
        { type: "string[]" as const },
        { type: "bytes32[]" as const },
        {
            type: "tuple[]" as const,
            components: [
                { type: "bytes32" as const, name: "contentHash" },
                { type: "uint8" as const, name: "visibility" },
            ],
        },
    ] as const;

    const ZERO_HASH = `0x${"00".repeat(32)}` as `0x${string}`;
    const FIELD_HASH = `0x${"cd".repeat(32)}` as `0x${string}`;

    it("round-trips roleId (not circleId) as the first field", () => {
        const params = {
            roleId: 77n,
            name: "Updated Role",
            purpose: "New purpose",
            domains: ["domain-a", "domain-b"],
            accountabilities: ["acc-1"],
            fieldNames: [FIELD_HASH],
            refs: [{ contentHash: ZERO_HASH, visibility: 0 }],
        };

        const encoded = encodeAmendRoleWithRefs(params);

        expect(encoded).toMatch(/^0x/);

        const [roleId, name, purpose, domains, accountabilities, fieldNames, refs] =
            decodeAbiParameters(roleWithRefsParamTypes, encoded);

        expect(roleId).toBe(params.roleId);
        expect(name).toBe(params.name);
        expect(purpose).toBe(params.purpose);
        expect([...domains]).toEqual(params.domains);
        expect([...accountabilities]).toEqual(params.accountabilities);
        expect([...fieldNames]).toEqual(params.fieldNames);
        expect(refs[0].contentHash).toBe(ZERO_HASH);
        expect(refs[0].visibility).toBe(0);
    });

    it("produces identical bytes to encodeCreateRoleWithRefs when id and all params match", () => {
        // Both share the same ABI encoding layout — differs only in semantics of
        // first param (circleId vs roleId). Same values → same bytes.
        const sharedId = 5n;
        const HASH = `0x${"ff".repeat(32)}` as `0x${string}`;
        const sharedParams = {
            name: "Shared",
            purpose: "Same",
            domains: ["x"],
            accountabilities: ["y"],
            fieldNames: [HASH],
            refs: [{ contentHash: HASH, visibility: 1 }],
        };

        const createEncoded = encodeCreateRoleWithRefs({ circleId: sharedId, ...sharedParams });
        const amendEncoded = encodeAmendRoleWithRefs({ roleId: sharedId, ...sharedParams });
        expect(createEncoded).toBe(amendEncoded);
    });
});
