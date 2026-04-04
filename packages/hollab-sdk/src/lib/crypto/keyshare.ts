import type { KeyShare } from "../../types/crypto.types.js";
import { aesDecrypt, aesEncrypt } from "./aes.js";

/**
 * Creates an encrypted key share by AES-wrapping the key material
 * with a shared secret derived from deterministic signatures.
 */
export function createKeyShare(keyMaterial: Uint8Array, sharedSecret: Uint8Array): KeyShare {
    const payload = aesEncrypt(sharedSecret, keyMaterial);
    return {
        encryptedKey: payload.ciphertext,
        nonce: payload.nonce,
    };
}

/**
 * Decrypts a key share using the shared secret.
 */
export function decryptKeyShare(share: KeyShare, sharedSecret: Uint8Array): Uint8Array {
    return aesDecrypt(sharedSecret, {
        ciphertext: share.encryptedKey,
        nonce: share.nonce,
    });
}
