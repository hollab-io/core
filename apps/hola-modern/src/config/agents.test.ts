import { describe, expect, it } from "vitest";

import { isAgentAddress } from "./agents";

// The known-agent address from agents.ts (anvil account #9).
const KNOWN_AGENT = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";

describe("isAgentAddress", () => {
    it("returns true for the exact allowlisted address", () => {
        expect(isAgentAddress(KNOWN_AGENT)).toBe(true);
    });

    it("is case-insensitive — lowercased version matches", () => {
        expect(isAgentAddress(KNOWN_AGENT.toLowerCase())).toBe(true);
    });

    it("is case-insensitive — uppercased version matches", () => {
        expect(isAgentAddress(KNOWN_AGENT.toUpperCase())).toBe(true);
    });

    it("returns false for an unknown address", () => {
        expect(isAgentAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(false);
    });

    it("returns false for null", () => {
        expect(isAgentAddress(null)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isAgentAddress(undefined)).toBe(false);
    });

    it("returns false for an empty string", () => {
        expect(isAgentAddress("")).toBe(false);
    });
});
