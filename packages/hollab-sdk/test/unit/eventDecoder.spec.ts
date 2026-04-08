/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";

import { decodeRoleRegistryEvent } from "../../src/lib/chain/eventDecoder.js";

function makeLog(
    eventName: string,
    args: Record<string, unknown>,
): {
    eventName: string;
    args: Record<string, unknown>;
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
} {
    return {
        eventName,
        args,
        blockNumber: 100n,
        transactionHash: "0xabcdef",
        logIndex: 3,
    };
}

describe("Event Decoders", () => {
    describe("decodeRoleRegistryEvent", () => {
        it("decodes RoleCreated", () => {
            const log = makeLog("RoleCreated", { _roleId: 1n, _circleId: 2n, _name: "Secretary" });
            const result = decodeRoleRegistryEvent(log as any);
            expect(result).toMatchObject({
                type: "RoleCreated",
                roleId: 1n,
                circleId: 2n,
                name: "Secretary",
            });
        });

        it("decodes RoleLeadAssigned", () => {
            const log = makeLog("RoleLeadAssigned", { _roleId: 1n, _lead: "0xBob" });
            const result = decodeRoleRegistryEvent(log as any);
            expect(result).toMatchObject({
                type: "RoleLeadAssigned",
                roleId: 1n,
                lead: "0xBob",
            });
        });

        it("decodes RoleLeadUnassigned", () => {
            const log = makeLog("RoleLeadUnassigned", { _roleId: 1n, _lead: "0xBob" });
            const result = decodeRoleRegistryEvent(log as any);
            expect(result).toMatchObject({ type: "RoleLeadUnassigned", roleId: 1n });
        });

        it("returns null for unknown event", () => {
            const log = makeLog("Unknown", {});
            expect(decodeRoleRegistryEvent(log as any)).toBeNull();
        });
    });

    describe("common fields", () => {
        it("includes block number and tx hash", () => {
            const log = makeLog("RoleCreated", { _roleId: 1n, _circleId: 2n, _name: "X" });
            const result = decodeRoleRegistryEvent(log as any);
            expect(result?.blockNumber).toBe(100n);
            expect(result?.transactionHash).toBe("0xabcdef");
            expect(result?.logIndex).toBe(3);
        });
    });
});
