/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";

import {
    decodeCircleRegistryEvent,
    decodeGovernanceProcessEvent,
    decodeRoleRegistryEvent,
    decodeTreasuryEvent,
} from "../../src/lib/chain/eventDecoder.js";

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
    describe("decodeCircleRegistryEvent", () => {
        it("decodes AnchorCircleCreated", () => {
            const log = makeLog("AnchorCircleCreated", { _circleId: 1n });
            const result = decodeCircleRegistryEvent(log as any);
            expect(result).toMatchObject({
                type: "AnchorCircleCreated",
                circleId: 1n,
            });
        });

        it("decodes SubCircleCreated", () => {
            const log = makeLog("SubCircleCreated", {
                _circleId: 2n,
                _parentCircleId: 1n,
                _roleId: 5n,
            });
            const result = decodeCircleRegistryEvent(log as any);
            expect(result).toMatchObject({
                type: "SubCircleCreated",
                circleId: 2n,
                parentCircleId: 1n,
                roleId: 5n,
            });
        });

        it("decodes CircleLeadAdded", () => {
            const log = makeLog("CircleLeadAdded", { _circleId: 1n, _lead: "0xAlice" });
            const result = decodeCircleRegistryEvent(log as any);
            expect(result).toMatchObject({
                type: "CircleLeadAdded",
                circleId: 1n,
                lead: "0xAlice",
            });
        });

        it("decodes PolicyAdded", () => {
            const log = makeLog("PolicyAdded", { _circleId: 1n, _policyId: 3n, _name: "Policy" });
            const result = decodeCircleRegistryEvent(log as any);
            expect(result).toMatchObject({
                type: "PolicyAdded",
                circleId: 1n,
                policyId: 3n,
                name: "Policy",
            });
        });

        it("returns null for unknown event", () => {
            const log = makeLog("Unknown", {});
            expect(decodeCircleRegistryEvent(log as any)).toBeNull();
        });
    });

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
    });

    describe("decodeGovernanceProcessEvent", () => {
        it("decodes ProposalSubmitted", () => {
            const log = makeLog("ProposalSubmitted", {
                _proposalId: 1n,
                _circleId: 2n,
                _proposer: "0xAlice",
            });
            const result = decodeGovernanceProcessEvent(log as any);
            expect(result).toMatchObject({
                type: "ProposalSubmitted",
                proposalId: 1n,
                circleId: 2n,
                proposer: "0xAlice",
            });
        });

        it("decodes ProposalAdopted", () => {
            const log = makeLog("ProposalAdopted", { _proposalId: 5n });
            const result = decodeGovernanceProcessEvent(log as any);
            expect(result).toMatchObject({ type: "ProposalAdopted", proposalId: 5n });
        });

        it("returns null for ObjectionRaised (not in ProposalEvent type)", () => {
            const log = makeLog("ObjectionRaised", {
                _objectionId: 1n,
                _proposalId: 2n,
                _objector: "0x",
            });
            const result = decodeGovernanceProcessEvent(log as any);
            expect(result).toBeNull();
        });
    });

    describe("decodeTreasuryEvent", () => {
        it("decodes Deposited", () => {
            const log = makeLog("Deposited", { _sender: "0xBob", _amount: 1000n });
            const result = decodeTreasuryEvent(log as any);
            expect(result).toMatchObject({
                type: "Deposited",
                sender: "0xBob",
                amount: 1000n,
            });
        });

        it("decodes CallScheduled", () => {
            const log = makeLog("CallScheduled", {
                id: "0xop1",
                target: "0xTarget",
                value: 500n,
            });
            const result = decodeTreasuryEvent(log as any);
            expect(result).toMatchObject({
                type: "CallScheduled",
                operationId: "0xop1",
                target: "0xTarget",
                value: 500n,
            });
        });

        it("decodes Cancelled", () => {
            const log = makeLog("Cancelled", { id: "0xop1" });
            const result = decodeTreasuryEvent(log as any);
            expect(result).toMatchObject({ type: "Cancelled", operationId: "0xop1" });
        });
    });

    describe("common fields", () => {
        it("includes block number and tx hash", () => {
            const log = makeLog("Deposited", { _sender: "0x", _amount: 0n });
            const result = decodeTreasuryEvent(log as any);
            expect(result?.blockNumber).toBe(100n);
            expect(result?.transactionHash).toBe("0xabcdef");
            expect(result?.logIndex).toBe(3);
        });
    });
});
