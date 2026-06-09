import type { WalletClient } from "viem";

import type { IKeyManager } from "../interfaces/keyManager.interface.js";
import type { IOrgClient } from "../interfaces/orgClient.interface.js";
import type { IStorageClient } from "../interfaces/storageClient.interface.js";
import type {
    CircleMeta,
    OkrObjective,
    OrgClientConfig,
    OrgMeta,
    Proposal,
    RoleConfig,
    Tension,
} from "../types/org.types.js";
import type { ContentHash } from "../types/storage.types.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bigintReplacer(_key: string, value: unknown): unknown {
    return typeof value === "bigint" ? `__bigint__${value.toString()}` : value;
}

function bigintReviver(_key: string, value: unknown): unknown {
    if (typeof value === "string" && value.startsWith("__bigint__")) {
        return BigInt(value.slice("__bigint__".length));
    }
    return value;
}

function jsonEncode(value: unknown): Uint8Array {
    return encoder.encode(JSON.stringify(value, bigintReplacer));
}

function jsonDecode<T>(data: Uint8Array): T {
    return JSON.parse(decoder.decode(data), bigintReviver) as T;
}

/**
 * High-level reader/writer for an org's private data.
 *
 * Storage is content-addressed: each `set*` encrypts the value with the
 * appropriate scope key, pins it, and returns the bytes32 `contentHash`. Each
 * `get*` takes the `contentHash` (resolved by the caller from on-chain
 * `ContentRef`s) and decrypts the blob. The key scope (org / circle / role)
 * determines who can decrypt; the content hash determines what is fetched.
 */
export class OrgClient implements IOrgClient {
    private readonly orgId: bigint;
    private readonly keyManager: IKeyManager;
    private readonly storageClient: IStorageClient;
    private readonly wallet: WalletClient;
    private masterKey: Uint8Array | null = null;

    constructor(
        config: OrgClientConfig,
        wallet: WalletClient,
        keyManager: IKeyManager,
        storageClient: IStorageClient,
    ) {
        this.orgId = config.orgId;
        this.keyManager = keyManager;
        this.storageClient = storageClient;
        this.wallet = wallet;
    }

    private async getMasterKey(): Promise<Uint8Array> {
        if (!this.masterKey) {
            this.masterKey = await this.keyManager.deriveMasterKey(this.wallet, this.orgId);
        }
        return this.masterKey;
    }

    private async getOrgKey(): Promise<Uint8Array> {
        const mk = await this.getMasterKey();
        return this.keyManager.deriveOrgKey(mk, this.orgId);
    }

    private async getCircleKey(circleId: bigint): Promise<Uint8Array> {
        const mk = await this.getMasterKey();
        return this.keyManager.deriveCircleKey(mk, circleId);
    }

    private async getRoleKey(circleId: bigint, roleId: bigint): Promise<Uint8Array> {
        const circleKey = await this.getCircleKey(circleId);
        return this.keyManager.deriveRoleKey(circleKey, roleId);
    }

    /** @inheritdoc */
    async getOrgMeta(contentHash: ContentHash): Promise<OrgMeta> {
        const key = await this.getOrgKey();
        return jsonDecode<OrgMeta>(await this.storageClient.getDecrypted(contentHash, key));
    }

    /** @inheritdoc */
    async setOrgMeta(meta: OrgMeta): Promise<ContentHash> {
        const key = await this.getOrgKey();
        return this.storageClient.putEncrypted(jsonEncode(meta), key);
    }

    /** @inheritdoc */
    async getCircleMeta(circleId: bigint, contentHash: ContentHash): Promise<CircleMeta> {
        const key = await this.getCircleKey(circleId);
        return jsonDecode<CircleMeta>(await this.storageClient.getDecrypted(contentHash, key));
    }

    /** @inheritdoc */
    async setCircleMeta(circleId: bigint, meta: CircleMeta): Promise<ContentHash> {
        const key = await this.getCircleKey(circleId);
        return this.storageClient.putEncrypted(jsonEncode(meta), key);
    }

    /** @inheritdoc */
    async getTension(circleId: bigint, contentHash: ContentHash): Promise<Tension> {
        const key = await this.getCircleKey(circleId);
        return jsonDecode<Tension>(await this.storageClient.getDecrypted(contentHash, key));
    }

    /** @inheritdoc */
    async setTension(circleId: bigint, tension: Tension): Promise<ContentHash> {
        const key = await this.getCircleKey(circleId);
        return this.storageClient.putEncrypted(jsonEncode(tension), key);
    }

    /** @inheritdoc */
    async getProposal(circleId: bigint, contentHash: ContentHash): Promise<Proposal> {
        const key = await this.getCircleKey(circleId);
        return jsonDecode<Proposal>(await this.storageClient.getDecrypted(contentHash, key));
    }

    /** @inheritdoc */
    async setProposal(circleId: bigint, proposal: Proposal): Promise<ContentHash> {
        const key = await this.getCircleKey(circleId);
        return this.storageClient.putEncrypted(jsonEncode(proposal), key);
    }

    /** @inheritdoc */
    async getRoleConfig(
        circleId: bigint,
        roleId: bigint,
        contentHash: ContentHash,
    ): Promise<RoleConfig> {
        const key = await this.getRoleKey(circleId, roleId);
        return jsonDecode<RoleConfig>(await this.storageClient.getDecrypted(contentHash, key));
    }

    /** @inheritdoc */
    async setRoleConfig(
        circleId: bigint,
        roleId: bigint,
        config: RoleConfig,
    ): Promise<ContentHash> {
        const key = await this.getRoleKey(circleId, roleId);
        return this.storageClient.putEncrypted(jsonEncode(config), key);
    }

    /** @inheritdoc */
    async getOkrs(
        circleId: bigint,
        roleId: bigint,
        contentHash: ContentHash,
    ): Promise<OkrObjective[]> {
        const key = await this.getRoleKey(circleId, roleId);
        return jsonDecode<OkrObjective[]>(await this.storageClient.getDecrypted(contentHash, key));
    }

    /** @inheritdoc */
    async setOkrs(
        circleId: bigint,
        roleId: bigint,
        objectives: OkrObjective[],
    ): Promise<ContentHash> {
        const key = await this.getRoleKey(circleId, roleId);
        return this.storageClient.putEncrypted(jsonEncode(objectives), key);
    }

    /** @inheritdoc */
    async shareCircleKey(circleId: bigint, recipientPublicKey: Uint8Array): Promise<ContentHash> {
        const circleKey = await this.getCircleKey(circleId);
        const share = this.keyManager.createKeyShare(circleKey, recipientPublicKey);
        const orgKey = await this.getOrgKey();
        return this.storageClient.putEncrypted(jsonEncode(share), orgKey);
    }

    /** @inheritdoc */
    async shareRoleKey(
        circleId: bigint,
        roleId: bigint,
        recipientPublicKey: Uint8Array,
    ): Promise<ContentHash> {
        const roleKey = await this.getRoleKey(circleId, roleId);
        const share = this.keyManager.createKeyShare(roleKey, recipientPublicKey);
        const orgKey = await this.getOrgKey();
        return this.storageClient.putEncrypted(jsonEncode(share), orgKey);
    }
}
