import type {
    CircleMeta,
    OkrObjective,
    OrgMeta,
    Proposal,
    RoleConfig,
    Tension,
} from "../types/org.types.js";
import type { ContentHash } from "../types/storage.types.js";

/**
 * High-level interface for reading and writing an org's private data on IPFS
 * with the appropriate key scope.
 *
 * Storage is content-addressed: `set*` returns the bytes32 `contentHash` of the
 * pinned blob (which the caller persists, e.g. in an on-chain `ContentRef`), and
 * `get*` takes that hash to fetch and decrypt.
 */
export interface IOrgClient {
    getOrgMeta(contentHash: ContentHash): Promise<OrgMeta>;
    setOrgMeta(meta: OrgMeta): Promise<ContentHash>;

    getCircleMeta(circleId: bigint, contentHash: ContentHash): Promise<CircleMeta>;
    setCircleMeta(circleId: bigint, meta: CircleMeta): Promise<ContentHash>;

    getTension(circleId: bigint, contentHash: ContentHash): Promise<Tension>;
    setTension(circleId: bigint, tension: Tension): Promise<ContentHash>;

    getProposal(circleId: bigint, contentHash: ContentHash): Promise<Proposal>;
    setProposal(circleId: bigint, proposal: Proposal): Promise<ContentHash>;

    getRoleConfig(circleId: bigint, roleId: bigint, contentHash: ContentHash): Promise<RoleConfig>;
    setRoleConfig(circleId: bigint, roleId: bigint, config: RoleConfig): Promise<ContentHash>;

    getOkrs(circleId: bigint, roleId: bigint, contentHash: ContentHash): Promise<OkrObjective[]>;
    setOkrs(circleId: bigint, roleId: bigint, objectives: OkrObjective[]): Promise<ContentHash>;

    shareCircleKey(circleId: bigint, recipientPublicKey: Uint8Array): Promise<ContentHash>;

    shareRoleKey(
        circleId: bigint,
        roleId: bigint,
        recipientPublicKey: Uint8Array,
    ): Promise<ContentHash>;
}
