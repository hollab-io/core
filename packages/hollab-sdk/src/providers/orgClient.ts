import type { WalletClient } from "viem";

import type { IKeyManager } from "../interfaces/keyManager.interface.js";
import type { IOrgClient } from "../interfaces/orgClient.interface.js";
import type { IStorageClient } from "../interfaces/storageClient.interface.js";
import type {
    CircleMeta,
    OrgClientConfig,
    OrgMeta,
    Proposal,
    RoleConfig,
    Tension,
} from "../types/org.types.js";
import {
    buildCircleKeyShareKey,
    buildCircleMetaKey,
    buildOrgMetaKey,
    buildProposalKey,
    buildRoleConfigKey,
    buildRoleKeyShareKey,
    buildStreamId,
    buildTensionKey,
} from "../lib/storage/schema.js";

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

export class OrgClient implements IOrgClient {
    private readonly orgId: bigint;
    private readonly streamId: string;
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
        this.streamId = buildStreamId(config.orgId);
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
    async getOrgMeta(): Promise<OrgMeta | null> {
        const key = await this.getOrgKey();
        const data = await this.storageClient.getDecrypted(this.streamId, buildOrgMetaKey(), key);
        return data ? jsonDecode<OrgMeta>(data) : null;
    }

    /** @inheritdoc */
    async setOrgMeta(meta: OrgMeta): Promise<void> {
        const key = await this.getOrgKey();
        await this.storageClient.putEncrypted(
            this.streamId,
            buildOrgMetaKey(),
            jsonEncode(meta),
            key,
        );
    }

    /** @inheritdoc */
    async getCircleMeta(circleId: bigint): Promise<CircleMeta | null> {
        const key = await this.getCircleKey(circleId);
        const data = await this.storageClient.getDecrypted(
            this.streamId,
            buildCircleMetaKey(circleId),
            key,
        );
        return data ? jsonDecode<CircleMeta>(data) : null;
    }

    /** @inheritdoc */
    async setCircleMeta(circleId: bigint, meta: CircleMeta): Promise<void> {
        const key = await this.getCircleKey(circleId);
        await this.storageClient.putEncrypted(
            this.streamId,
            buildCircleMetaKey(circleId),
            jsonEncode(meta),
            key,
        );
    }

    /** @inheritdoc */
    async getTension(circleId: bigint, tensionId: string): Promise<Tension | null> {
        const key = await this.getCircleKey(circleId);
        const data = await this.storageClient.getDecrypted(
            this.streamId,
            buildTensionKey(circleId, tensionId),
            key,
        );
        return data ? jsonDecode<Tension>(data) : null;
    }

    /** @inheritdoc */
    async setTension(circleId: bigint, tension: Tension): Promise<void> {
        const key = await this.getCircleKey(circleId);
        await this.storageClient.putEncrypted(
            this.streamId,
            buildTensionKey(circleId, tension.id),
            jsonEncode(tension),
            key,
        );
    }

    /** @inheritdoc */
    async getProposal(circleId: bigint, proposalId: bigint): Promise<Proposal | null> {
        const key = await this.getCircleKey(circleId);
        const data = await this.storageClient.getDecrypted(
            this.streamId,
            buildProposalKey(circleId, proposalId),
            key,
        );
        return data ? jsonDecode<Proposal>(data) : null;
    }

    /** @inheritdoc */
    async setProposal(circleId: bigint, proposal: Proposal): Promise<void> {
        const key = await this.getCircleKey(circleId);
        await this.storageClient.putEncrypted(
            this.streamId,
            buildProposalKey(circleId, proposal.id),
            jsonEncode(proposal),
            key,
        );
    }

    /** @inheritdoc */
    async getRoleConfig(circleId: bigint, roleId: bigint): Promise<RoleConfig | null> {
        const key = await this.getRoleKey(circleId, roleId);
        const data = await this.storageClient.getDecrypted(
            this.streamId,
            buildRoleConfigKey(roleId),
            key,
        );
        return data ? jsonDecode<RoleConfig>(data) : null;
    }

    /** @inheritdoc */
    async setRoleConfig(circleId: bigint, roleId: bigint, config: RoleConfig): Promise<void> {
        const key = await this.getRoleKey(circleId, roleId);
        await this.storageClient.putEncrypted(
            this.streamId,
            buildRoleConfigKey(roleId),
            jsonEncode(config),
            key,
        );
    }

    /** @inheritdoc */
    async shareCircleKey(
        circleId: bigint,
        recipientAddress: `0x${string}`,
        recipientPublicKey: Uint8Array,
    ): Promise<void> {
        const circleKey = await this.getCircleKey(circleId);
        const share = this.keyManager.createKeyShare(circleKey, recipientPublicKey);
        const orgKey = await this.getOrgKey();
        await this.storageClient.putEncrypted(
            this.streamId,
            buildCircleKeyShareKey(circleId, recipientAddress),
            jsonEncode(share),
            orgKey,
        );
    }

    /** @inheritdoc */
    async shareRoleKey(
        circleId: bigint,
        roleId: bigint,
        recipientAddress: `0x${string}`,
        recipientPublicKey: Uint8Array,
    ): Promise<void> {
        const roleKey = await this.getRoleKey(circleId, roleId);
        const share = this.keyManager.createKeyShare(roleKey, recipientPublicKey);
        const orgKey = await this.getOrgKey();
        await this.storageClient.putEncrypted(
            this.streamId,
            buildRoleKeyShareKey(roleId, recipientAddress),
            jsonEncode(share),
            orgKey,
        );
    }
}
