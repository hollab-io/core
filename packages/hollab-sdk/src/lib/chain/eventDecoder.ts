import type { Log } from "viem";

import type { ContentRefEvent, RoleChange } from "../../types/events.types.js";

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
