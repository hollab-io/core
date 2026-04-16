import { decodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";

import {
    encodeAmendRole,
    encodeCreateRole,
    encodeElection,
    encodeRemoveRole,
} from "../src/encoding.js";

const roleTypes = [
    { type: "uint256" as const },
    { type: "string" as const },
    { type: "string" as const },
    { type: "string[]" as const },
    { type: "string[]" as const },
];

describe("encoding", () => {
    it("encodeCreateRole round-trips and defaults arrays to empty", () => {
        const data = encodeCreateRole({
            circleId: 7n,
            name: "Designer",
            purpose: "Make things look good",
        });
        const [circleId, name, purpose, domains, accountabilities] = decodeAbiParameters(
            roleTypes,
            data,
        );
        expect(circleId).toBe(7n);
        expect(name).toBe("Designer");
        expect(purpose).toBe("Make things look good");
        expect(domains).toEqual([]);
        expect(accountabilities).toEqual([]);
    });

    it("encodeAmendRole preserves domains and accountabilities", () => {
        const data = encodeAmendRole({
            roleId: 42n,
            name: "Lead",
            purpose: "Coordinate",
            domains: ["roadmap"],
            accountabilities: ["weekly sync", "quarterly review"],
        });
        const [roleId, name, purpose, domains, accountabilities] = decodeAbiParameters(
            roleTypes,
            data,
        );
        expect(roleId).toBe(42n);
        expect(name).toBe("Lead");
        expect(purpose).toBe("Coordinate");
        expect(domains).toEqual(["roadmap"]);
        expect(accountabilities).toEqual(["weekly sync", "quarterly review"]);
    });

    it("encodeRemoveRole encodes a single uint256", () => {
        const data = encodeRemoveRole(123n);
        const [roleId] = decodeAbiParameters([{ type: "uint256" }], data);
        expect(roleId).toBe(123n);
    });

    it("encodeElection encodes (roleId, newLead, previousLead) defaulting previousLead to address(0)", () => {
        const lead = "0x1111111111111111111111111111111111111111" as const;
        const data = encodeElection(9n, lead);
        const [roleId, decodedLead, decodedPrevious] = decodeAbiParameters(
            [{ type: "uint256" }, { type: "address" }, { type: "address" }],
            data,
        );
        expect(roleId).toBe(9n);
        expect((decodedLead as string).toLowerCase()).toBe(lead);
        expect(decodedPrevious).toBe("0x0000000000000000000000000000000000000000");
    });

    it("encodeElection encodes an explicit previousLead", () => {
        const lead = "0x1111111111111111111111111111111111111111" as const;
        const previous = "0x2222222222222222222222222222222222222222" as const;
        const data = encodeElection(9n, lead, previous);
        const [roleId, decodedLead, decodedPrevious] = decodeAbiParameters(
            [{ type: "uint256" }, { type: "address" }, { type: "address" }],
            data,
        );
        expect(roleId).toBe(9n);
        expect((decodedLead as string).toLowerCase()).toBe(lead);
        expect((decodedPrevious as string).toLowerCase()).toBe(previous);
    });
});
