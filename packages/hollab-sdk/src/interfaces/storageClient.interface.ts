import type { LogEntry, StreamId } from "../types/storage.types.js";

/**
 * Wrapper around 0G Storage (KV + Log) with client-side encryption.
 */
export interface IStorageClient {
    /** Encrypts value with the given key and stores it in KV. */
    putEncrypted(
        streamId: StreamId,
        key: string,
        value: Uint8Array,
        encryptionKey: Uint8Array,
    ): Promise<void>;

    /** Fetches from KV and decrypts with the given key. Returns null if not found. */
    getDecrypted(
        streamId: StreamId,
        key: string,
        encryptionKey: Uint8Array,
    ): Promise<Uint8Array | null>;

    /** Appends a plaintext entry to the 0G Storage Log. */
    appendLog(streamId: StreamId, entry: LogEntry): Promise<void>;

    /** Reads entries from the 0G Storage Log. */
    readLog(streamId: StreamId, fromIndex: number, count: number): Promise<LogEntry[]>;

    /** Checks whether a stream exists. */
    streamExists(streamId: StreamId): Promise<boolean>;
}
