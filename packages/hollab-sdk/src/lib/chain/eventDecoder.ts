import type { Log } from "viem";

import type {
    CircleChange,
    ContentRefEvent,
    ProposalEvent,
    RoleChange,
    TreasuryEvent,
} from "../../types/events.types.js";

type DecodedLog = Log & {
    eventName: string;
    args: Record<string, unknown>;
};

function baseEvent(log: DecodedLog): {
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
    timestamp: number;
} {
    return {
        blockNumber: log.blockNumber ?? 0n,
        transactionHash: log.transactionHash ?? "",
        logIndex: log.logIndex ?? 0,
        timestamp: Math.floor(Date.now() / 1000),
    };
}

export function decodeCircleRegistryEvent(log: DecodedLog): CircleChange | null {
    const base = baseEvent(log);
    const args = log.args;

    switch (log.eventName) {
        case "AnchorCircleCreated":
            return {
                ...base,
                type: "AnchorCircleCreated",
                circleId: args._circleId as bigint,
            };
        case "SubCircleCreated":
            return {
                ...base,
                type: "SubCircleCreated",
                circleId: args._circleId as bigint,
                parentCircleId: args._parentCircleId as bigint,
                roleId: args._roleId as bigint,
            };
        case "CircleRoleCreated":
            return {
                ...base,
                type: "CircleRoleCreated",
                circleId: args._circleId as bigint,
                roleId: args._roleId as bigint,
            };
        case "ElectedRoleSet":
            return {
                ...base,
                type: "ElectedRoleSet",
                circleId: args._circleId as bigint,
                lead: args._account as string,
            };
        case "CircleLeadAdded":
            return {
                ...base,
                type: "CircleLeadAdded",
                circleId: args._circleId as bigint,
                lead: args._lead as string,
            };
        case "CircleLeadRemoved":
            return {
                ...base,
                type: "CircleLeadRemoved",
                circleId: args._circleId as bigint,
                lead: args._lead as string,
            };
        case "PolicyAdded":
            return {
                ...base,
                type: "PolicyAdded",
                circleId: args._circleId as bigint,
                policyId: args._policyId as bigint,
                name: args._name as string,
            };
        case "PolicyRemoved":
            return {
                ...base,
                type: "PolicyRemoved",
                circleId: args._circleId as bigint,
                policyId: args._policyId as bigint,
            };
        case "RoleLeadAssignedViaCircle":
            return {
                ...base,
                type: "RoleLeadAssignedViaCircle",
                circleId: args._circleId as bigint,
                roleId: args._roleId as bigint,
                lead: args._lead as string,
            };
        default:
            return null;
    }
}

export function decodeRoleRegistryEvent(log: DecodedLog): RoleChange | null {
    const base = baseEvent(log);
    const args = log.args;

    switch (log.eventName) {
        case "RoleCreated":
            return {
                ...base,
                type: "RoleCreated",
                roleId: args._roleId as bigint,
                circleId: args._circleId as bigint,
                name: args._name as string,
            };
        case "RoleUpdated":
            return { ...base, type: "RoleUpdated", roleId: args._roleId as bigint };
        case "RoleRemoved":
            return {
                ...base,
                type: "RoleRemoved",
                roleId: args._roleId as bigint,
                circleId: args._circleId as bigint,
            };
        case "RoleLeadAssigned":
            return {
                ...base,
                type: "RoleLeadAssigned",
                roleId: args._roleId as bigint,
                lead: args._lead as string,
            };
        case "RoleLeadUnassigned":
            return {
                ...base,
                type: "RoleLeadUnassigned",
                roleId: args._roleId as bigint,
                lead: args._lead as string,
            };
        default:
            return null;
    }
}

export function decodeGovernanceProcessEvent(log: DecodedLog): ProposalEvent | null {
    const base = baseEvent(log);
    const args = log.args;

    switch (log.eventName) {
        case "ProposalSubmitted":
            return {
                ...base,
                type: "ProposalSubmitted",
                proposalId: args._proposalId as bigint,
                circleId: args._circleId as bigint,
                proposer: args._proposer as string,
            };
        case "ProposalActivated":
            return { ...base, type: "ProposalActivated", proposalId: args._proposalId as bigint };
        case "ProposalAdopted":
            return { ...base, type: "ProposalAdopted", proposalId: args._proposalId as bigint };
        case "ProposalWithdrawn":
            return { ...base, type: "ProposalWithdrawn", proposalId: args._proposalId as bigint };
        case "ProposalDiscarded":
            return { ...base, type: "ProposalDiscarded", proposalId: args._proposalId as bigint };
        default:
            return null;
    }
}

export function decodeContentRefEvent(log: DecodedLog): ContentRefEvent | null {
    if (log.eventName !== "ContentRefSet") return null;

    const base = baseEvent(log);
    const args = log.args;

    return {
        ...base,
        type: "ContentRefSet",
        entityType: args._entityType as string,
        entityId: args._entityId as bigint,
        fieldName: args._fieldName as string,
        contentHash: args._contentHash as string,
        visibility: Number(args._visibility),
    };
}

export function decodeTreasuryEvent(log: DecodedLog): TreasuryEvent | null {
    const base = baseEvent(log);
    const args = log.args;

    switch (log.eventName) {
        case "Deposited":
            return {
                ...base,
                type: "Deposited",
                sender: args._sender as string,
                amount: args._amount as bigint,
            };
        case "TokenDeposited":
            return {
                ...base,
                type: "TokenDeposited",
                sender: args._sender as string,
                token: args._token as string,
                amount: args._amount as bigint,
            };
        case "CallScheduled":
            return {
                ...base,
                type: "CallScheduled",
                operationId: args.id as string,
                target: args.target as string,
                value: args.value as bigint,
            };
        case "CallExecuted":
            return {
                ...base,
                type: "CallExecuted",
                operationId: args.id as string,
                target: args.target as string,
                value: args.value as bigint,
            };
        case "Cancelled":
            return {
                ...base,
                type: "Cancelled",
                operationId: args.id as string,
            };
        default:
            return null;
    }
}
