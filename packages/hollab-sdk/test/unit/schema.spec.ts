import { describe, expect, it } from "vitest";

import {
    buildAgentStateKey,
    buildCircleKeyShareKey,
    buildCircleMetaKey,
    buildOrgMetaKey,
    buildProposalKey,
    buildRoleConfigKey,
    buildRoleKeyShareKey,
    buildRoleMemoryKey,
    buildStreamId,
    buildTensionKey,
    buildTreasuryLogKey,
} from "../../src/internal.js";

describe("Schema key builders", () => {
    it("buildStreamId", () => {
        expect(buildStreamId(42n)).toBe("org:42");
    });

    it("buildOrgMetaKey", () => {
        expect(buildOrgMetaKey()).toBe("meta");
    });

    it("buildCircleMetaKey", () => {
        expect(buildCircleMetaKey(1n)).toBe("circle:1:meta");
    });

    it("buildTensionKey", () => {
        expect(buildTensionKey(1n, "abc")).toBe("circle:1:tension:abc");
    });

    it("buildProposalKey", () => {
        expect(buildProposalKey(1n, 5n)).toBe("circle:1:proposal:5");
    });

    it("buildTreasuryLogKey", () => {
        expect(buildTreasuryLogKey(3n)).toBe("circle:3:treasury:log");
    });

    it("buildRoleConfigKey", () => {
        expect(buildRoleConfigKey(7n)).toBe("role:7:config");
    });

    it("buildRoleMemoryKey", () => {
        expect(buildRoleMemoryKey(7n)).toBe("role:7:memory");
    });

    it("buildAgentStateKey", () => {
        expect(buildAgentStateKey(10n)).toBe("agent:10:state");
    });

    it("buildCircleKeyShareKey lowercases address", () => {
        expect(buildCircleKeyShareKey(1n, "0xABCD")).toBe("keyshare:circle:1:0xabcd");
    });

    it("buildRoleKeyShareKey lowercases address", () => {
        expect(buildRoleKeyShareKey(2n, "0xABCD")).toBe("keyshare:role:2:0xabcd");
    });
});
