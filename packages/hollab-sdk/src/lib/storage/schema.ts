import type { StreamId } from "../../types/storage.types.js";
import { KEY_PREFIX, STREAM_PREFIX } from "../../constants/index.js";

/** Builds the stream ID for an organization: "org:{orgId}" */
export function buildStreamId(orgId: bigint): StreamId {
    return `${STREAM_PREFIX}${orgId}`;
}

/** Key for org metadata: "meta" */
export function buildOrgMetaKey(): string {
    return KEY_PREFIX.META;
}

/** Key for circle metadata: "circle:{circleId}:meta" */
export function buildCircleMetaKey(circleId: bigint): string {
    return `${KEY_PREFIX.CIRCLE}${circleId}:${KEY_PREFIX.META}`;
}

/** Key for a tension: "circle:{circleId}:tension:{tensionId}" */
export function buildTensionKey(circleId: bigint, tensionId: string): string {
    return `${KEY_PREFIX.CIRCLE}${circleId}${KEY_PREFIX.TENSION}${tensionId}`;
}

/** Key for a proposal: "circle:{circleId}:proposal:{proposalId}" */
export function buildProposalKey(circleId: bigint, proposalId: bigint): string {
    return `${KEY_PREFIX.CIRCLE}${circleId}${KEY_PREFIX.PROPOSAL}${proposalId}`;
}

/** Key for treasury log: "circle:{circleId}:treasury:log" */
export function buildTreasuryLogKey(circleId: bigint): string {
    return `${KEY_PREFIX.CIRCLE}${circleId}${KEY_PREFIX.TREASURY_LOG}`;
}

/** Key for role config: "role:{roleId}:config" */
export function buildRoleConfigKey(roleId: bigint): string {
    return `${KEY_PREFIX.ROLE}${roleId}${KEY_PREFIX.CONFIG}`;
}

/** Key for role/agent memory: "role:{roleId}:memory" */
export function buildRoleMemoryKey(roleId: bigint): string {
    return `${KEY_PREFIX.ROLE}${roleId}${KEY_PREFIX.MEMORY}`;
}

/** Key for agent state: "agent:{agentId}:state" */
export function buildAgentStateKey(agentId: bigint): string {
    return `${KEY_PREFIX.AGENT}${agentId}${KEY_PREFIX.STATE}`;
}

/** Key for circle key share: "keyshare:circle:{circleId}:{address}" */
export function buildCircleKeyShareKey(circleId: bigint, address: string): string {
    return `${KEY_PREFIX.KEYSHARE}circle:${circleId}:${address.toLowerCase()}`;
}

/** Key for role key share: "keyshare:role:{roleId}:{address}" */
export function buildRoleKeyShareKey(roleId: bigint, address: string): string {
    return `${KEY_PREFIX.KEYSHARE}role:${roleId}:${address.toLowerCase()}`;
}
