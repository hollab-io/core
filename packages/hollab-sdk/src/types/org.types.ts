/** Organization-level metadata stored in 0G KV */
export interface OrgMeta {
    name: string;
    purpose: string;
    config: Record<string, unknown>;
}

/** Circle-level metadata */
export interface CircleMeta {
    name: string;
    purpose: string;
    parentCircleId: bigint | null;
    config: Record<string, unknown>;
}

/** A tension within a circle */
export interface Tension {
    id: string;
    circleId: bigint;
    author: string;
    title: string;
    description: string;
    createdAt: number;
    resolvedAt: number | null;
}

/** Extended proposal data stored off-chain */
export interface Proposal {
    id: bigint;
    circleId: bigint;
    proposer: string;
    tension: string;
    explanation: string;
    rationale: string;
    discussion: string[];
    createdAt: number;
}

/** Role configuration (agent config, instructions) */
export interface RoleConfig {
    name: string;
    purpose: string;
    instructions: string;
    agentConfig: Record<string, unknown> | null;
}

/** Configuration for OrgClient */
export interface OrgClientConfig {
    orgId: bigint;
    storageConfig: import("./storage.types.js").StorageConfig;
}
