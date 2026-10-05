import type { IKeyManager } from "../interfaces/keyManager.interface.js";
import type { IStorageClient } from "../interfaces/storageClient.interface.js";
import type { EncryptedPayload } from "../types/crypto.types.js";
import type {
    ContentHash,
    FetchLike,
    FetchResponse,
    IpfsStorageConfig,
} from "../types/storage.types.js";
import { StorageError } from "../exceptions/storageError.exception.js";
import { cidToContentHash, contentHashToCid } from "../lib/storage/cid.js";

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

/**
 * Content-addressed encrypted storage backed by IPFS.
 *
 * Uploads encrypt → serialize → POST to the indexer pin-proxy, returning the
 * blob's bytes32 content hash. Downloads reconstruct the CID from that hash,
 * fetch from an IPFS gateway, deserialize, and decrypt. Mirrors the frontend's
 * useIpfsStorage hook so both produce/consume identical `ContentRef` hashes.
 */
export class StorageClient implements IStorageClient {
    private readonly keyManager: IKeyManager;
    private readonly pinUrl: string;
    private readonly gatewayUrl: string;
    private readonly fetchImpl?: FetchLike;

    constructor(keyManager: IKeyManager, config: IpfsStorageConfig) {
        this.keyManager = keyManager;
        this.pinUrl = config.pinUrl;
        this.gatewayUrl = config.gatewayUrl.replace(/\/$/, "");
        this.fetchImpl = config.fetchImpl;
    }

    private fetch(input: string, init?: Parameters<FetchLike>[1]): Promise<FetchResponse> {
        const impl = this.fetchImpl ?? (globalThis as unknown as { fetch: FetchLike }).fetch;
        return impl(input, init);
    }

    /** @inheritdoc */
    async putEncrypted(value: Uint8Array, encryptionKey: Uint8Array): Promise<ContentHash> {
        const payload = this.keyManager.encrypt(encryptionKey, value);
        const serialized = serializePayload(payload);

        // Copy into a fresh ArrayBuffer so the body type narrows correctly.
        const body = new ArrayBuffer(serialized.byteLength);
        new Uint8Array(body).set(serialized);

        const res = await this.fetch(this.pinUrl, {
            method: "POST",
            headers: { "content-type": "application/octet-stream" },
            body,
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new StorageError(`pin proxy upload failed (${res.status}): ${detail}`);
        }
        const json = (await res.json()) as { cid?: string; error?: string };
        if (!json.cid) {
            throw new StorageError(`pin proxy returned no CID: ${json.error ?? "unknown error"}`);
        }
        return cidToContentHash(json.cid);
    }

    /** @inheritdoc */
    async getDecrypted(contentHash: ContentHash, encryptionKey: Uint8Array): Promise<Uint8Array> {
        const cid = contentHashToCid(contentHash);
        const res = await this.fetch(`${this.gatewayUrl}/ipfs/${cid}`);
        if (!res.ok) {
            throw new StorageError(`IPFS gateway fetch failed (${res.status}) for ${cid}`);
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        const payload = deserializePayload(bytes);
        return this.keyManager.decrypt(encryptionKey, payload);
    }
}
