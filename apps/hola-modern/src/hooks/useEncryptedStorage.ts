/**
 * useEncryptedStorage — encrypt + upload to 0G / fetch + decrypt from 0G.
 *
 * Composition hook combining:
 *  - useKeyManager  (wallet-backed AES key derivation)
 *  - useZgStorage   (0G blob upload/download)
 *  - KeyManager     (AES encrypt/decrypt)
 *
 * The upload path serializes EncryptedPayload using a 2-byte nonce-length
 * prefix format (matching the hollab-sdk StorageClient wire format).
 */
import type { EncryptedPayload } from "@hollab-io/hollab-sdk";
import { KeyManager } from "@hollab-io/hollab-sdk";
import { useMutation } from "@tanstack/react-query";

import type { DataVisibilityValue } from "./useContentRef";
import { DataVisibility } from "./useContentRef";
import { useKeyManager } from "./useKeyManager";
import { downloadBytes, uploadBytes } from "./useZgStorage";

// ── Serialization (matches hollab-sdk StorageClient wire format) ─────────────

function serializePayload(p: EncryptedPayload): Uint8Array {
    const buf = new Uint8Array(2 + p.nonce.length + p.ciphertext.length);
    new DataView(buf.buffer).setUint16(0, p.nonce.length);
    buf.set(p.nonce, 2);
    buf.set(p.ciphertext, 2 + p.nonce.length);
    return buf;
}

function deserializePayload(buf: Uint8Array): EncryptedPayload {
    const nonceLen = new DataView(buf.buffer, buf.byteOffset).getUint16(0);
    const nonce = buf.slice(2, 2 + nonceLen);
    const ciphertext = buf.slice(2 + nonceLen);
    return { nonce, ciphertext };
}

// ── Types ────────────────────────────────────────────────────────────────────

export type EncryptAndUploadParams = {
    text: string;
    visibility: DataVisibilityValue;
    orgId: bigint;
    circleId: bigint;
    roleId?: bigint;
};

export type EncryptAndUploadResult = {
    /** 0G Merkle root hash — stored on-chain as ContentRef.contentHash */
    rootHash: string;
};

export type FetchAndDecryptParams = {
    /** 0G root hash (from on-chain ContentRef.contentHash) */
    rootHash: string;
    visibility: DataVisibilityValue;
    orgId: bigint;
    circleId: bigint;
    roleId?: bigint;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

const km = new KeyManager();

export function useEncryptedStorage() {
    const { isUnlocked, unlock, getEncryptionKey, lock, error: keyError } = useKeyManager();

    const encryptAndUpload = useMutation({
        mutationFn: async (params: EncryptAndUploadParams): Promise<EncryptAndUploadResult> => {
            const textBytes = new TextEncoder().encode(params.text);

            if (params.visibility === DataVisibility.Public) {
                const { rootHash } = await uploadBytes(textBytes);
                return { rootHash };
            }

            // Encrypted path
            const key = getEncryptionKey({
                visibility: params.visibility,
                orgId: params.orgId,
                circleId: params.circleId,
                roleId: params.roleId,
            });
            if (!key) {
                throw new Error("Expected encryption key for non-public visibility");
            }

            const payload = km.encrypt(key, textBytes);
            const serialized = serializePayload(payload);
            const { rootHash } = await uploadBytes(serialized);
            return { rootHash };
        },
    });

    async function fetchAndDecrypt(params: FetchAndDecryptParams): Promise<string> {
        const bytes = await downloadBytes(params.rootHash);

        if (params.visibility === DataVisibility.Public) {
            return new TextDecoder().decode(bytes);
        }

        // Encrypted path
        const key = getEncryptionKey({
            visibility: params.visibility,
            orgId: params.orgId,
            circleId: params.circleId,
            roleId: params.roleId,
        });
        if (!key) {
            throw new Error("Expected encryption key for non-public visibility");
        }

        const payload = deserializePayload(bytes);
        const plaintext = km.decrypt(key, payload);
        return new TextDecoder().decode(plaintext);
    }

    return {
        encryptAndUpload,
        fetchAndDecrypt,
        isKeyUnlocked: isUnlocked,
        unlockKeys: unlock,
        lockKeys: lock,
        keyError,
    };
}

// Re-export for tests
export { serializePayload, deserializePayload };
