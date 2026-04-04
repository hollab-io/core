import type { IKeyManager } from "../interfaces/keyManager.interface.js";
import type { IStorageClient } from "../interfaces/storageClient.interface.js";
import type { EncryptedPayload, LogEntry, StreamId } from "../internal.js";

/**
 * Serializes an EncryptedPayload to a Uint8Array for storage.
 * Format: [2-byte nonce length][nonce][ciphertext]
 */
function serializePayload(payload: EncryptedPayload): Uint8Array {
    const nonceLen = payload.nonce.length;
    const result = new Uint8Array(2 + nonceLen + payload.ciphertext.length);
    result[0] = (nonceLen >> 8) & 0xff;
    result[1] = nonceLen & 0xff;
    result.set(payload.nonce, 2);
    result.set(payload.ciphertext, 2 + nonceLen);
    return result;
}

/**
 * Deserializes a Uint8Array back to an EncryptedPayload.
 */
function deserializePayload(data: Uint8Array): EncryptedPayload {
    const nonceLen = (data[0]! << 8) | data[1]!;
    const nonce = data.slice(2, 2 + nonceLen);
    const ciphertext = data.slice(2 + nonceLen);
    return { nonce, ciphertext };
}

/** Interface for the 0G KV client operations we use */
export interface ZeroGKvClient {
    put(streamId: string, key: string, value: Uint8Array): Promise<void>;
    get(streamId: string, key: string): Promise<Uint8Array | null>;
    exists(streamId: string): Promise<boolean>;
}

/** Interface for the 0G Log client operations we use */
export interface ZeroGLogClient {
    append(streamId: string, data: Uint8Array): Promise<void>;
    read(streamId: string, fromIndex: number, count: number): Promise<Uint8Array[]>;
}

export class StorageClient implements IStorageClient {
    private readonly keyManager: IKeyManager;
    private readonly kvClient: ZeroGKvClient;
    private readonly logClient: ZeroGLogClient;

    constructor(keyManager: IKeyManager, kvClient: ZeroGKvClient, logClient: ZeroGLogClient) {
        this.keyManager = keyManager;
        this.kvClient = kvClient;
        this.logClient = logClient;
    }

    /** @inheritdoc */
    async putEncrypted(
        streamId: StreamId,
        key: string,
        value: Uint8Array,
        encryptionKey: Uint8Array,
    ): Promise<void> {
        const payload = this.keyManager.encrypt(encryptionKey, value);
        const serialized = serializePayload(payload);
        await this.kvClient.put(streamId, key, serialized);
    }

    /** @inheritdoc */
    async getDecrypted(
        streamId: StreamId,
        key: string,
        encryptionKey: Uint8Array,
    ): Promise<Uint8Array | null> {
        const data = await this.kvClient.get(streamId, key);
        if (!data) return null;

        const payload = deserializePayload(data);
        return this.keyManager.decrypt(encryptionKey, payload);
    }

    /** @inheritdoc */
    async appendLog(streamId: StreamId, entry: LogEntry): Promise<void> {
        const encoded = new TextEncoder().encode(JSON.stringify(entry));
        await this.logClient.append(streamId, encoded);
    }

    /** @inheritdoc */
    async readLog(streamId: StreamId, fromIndex: number, count: number): Promise<LogEntry[]> {
        const rawEntries = await this.logClient.read(streamId, fromIndex, count);
        const decoder = new TextDecoder();
        return rawEntries.map((raw) => JSON.parse(decoder.decode(raw)) as LogEntry);
    }

    /** @inheritdoc */
    async streamExists(streamId: StreamId): Promise<boolean> {
        return this.kvClient.exists(streamId);
    }
}
