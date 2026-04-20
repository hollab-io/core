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

/** Visibility tier for off-chain data (mirrors Solidity enum) */
export enum DataVisibility {
    Public = 0,
    OrgEncrypted = 1,
    RoleEncrypted = 2,
}

/** Reference to off-chain encrypted content (mirrors Solidity struct) */
export interface ContentRef {
    contentHash: `0x${string}`;
    visibility: DataVisibility;
}

/** A single key result linked to concrete work items */
export interface OkrKeyResult {
    id: string;
    label: string;
    linkedActionIds: string[];
    linkedProjectIds: string[];
    linkedProposalIds: string[];
    progress?: number; // 0..1 optional externally-computed hint
}

/** An OKR objective anchored on a role via AmendRoleWithRefs content ref */
export interface OkrObjective {
    id: string;
    roleId: string;
    circleId: string;
    quarter: string; // e.g. "Q2-2026"
    title: string;
    description: string;
    ownerId?: string;
    startOffset: number; // weeks from quarter start
    endOffset: number;
    keyResults: OkrKeyResult[];
    createdAt: number;
    updatedAt: number;
}

/** Configuration for OrgClient */
export interface OrgClientConfig {
    orgId: bigint;
    storageConfig: import("./storage.types.js").StorageConfig;
}
