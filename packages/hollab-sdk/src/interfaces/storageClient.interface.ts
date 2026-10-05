import type { ContentHash } from "../types/storage.types.js";

/**
 * Content-addressed encrypted storage over IPFS (via the indexer pin-proxy).
 *
 * Writes encrypt a value, pin the ciphertext, and return its bytes32 content
 * hash; reads take that hash, fetch the blob from a gateway, and decrypt it.
 * The logical-key → contentHash mapping lives on-chain (`ContentRef`) or in the
 * caller — IPFS is immutable and content-addressed, so there is no mutable
 * (streamId, key) lookup and no append-only log here (the Ponder indexer is the
 * queryable audit trail).
 */
export interface IStorageClient {
    /** Encrypts a value and pins it to IPFS; returns the bytes32 content hash. */
    putEncrypted(value: Uint8Array, encryptionKey: Uint8Array): Promise<ContentHash>;

    /** Fetches the blob by content hash and decrypts it. Throws if not found. */
    getDecrypted(contentHash: ContentHash, encryptionKey: Uint8Array): Promise<Uint8Array>;
}
