import type { CircleMeta, OrgMeta, Proposal, RoleConfig, Tension } from "../types/org.types.js";

/**
 * High-level interface for reading and writing org private data
 * in 0G Storage with appropriate key scope.
 */
export interface IOrgClient {
    getOrgMeta(): Promise<OrgMeta | null>;
    setOrgMeta(meta: OrgMeta): Promise<void>;

    getCircleMeta(circleId: bigint): Promise<CircleMeta | null>;
    setCircleMeta(circleId: bigint, meta: CircleMeta): Promise<void>;

    getTension(circleId: bigint, tensionId: string): Promise<Tension | null>;
    setTension(circleId: bigint, tension: Tension): Promise<void>;

    getProposal(circleId: bigint, proposalId: bigint): Promise<Proposal | null>;
    setProposal(circleId: bigint, proposal: Proposal): Promise<void>;

    getRoleConfig(circleId: bigint, roleId: bigint): Promise<RoleConfig | null>;
    setRoleConfig(circleId: bigint, roleId: bigint, config: RoleConfig): Promise<void>;

    shareCircleKey(
        circleId: bigint,
        recipientAddress: `0x${string}`,
        recipientPublicKey: Uint8Array,
    ): Promise<void>;

    shareRoleKey(
        circleId: bigint,
        roleId: bigint,
        recipientAddress: `0x${string}`,
        recipientPublicKey: Uint8Array,
    ): Promise<void>;
}
