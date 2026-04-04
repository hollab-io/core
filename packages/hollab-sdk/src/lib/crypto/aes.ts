import { ctr } from "@noble/ciphers/aes";
import { randomBytes } from "@noble/ciphers/webcrypto";

import type { EncryptedPayload } from "../../types/crypto.types.js";

const NONCE_LENGTH = 16;

/**
 * Encrypts plaintext using AES-256-CTR with a random 16-byte nonce.
 */
export function aesEncrypt(key: Uint8Array, plaintext: Uint8Array): EncryptedPayload {
    const nonce = randomBytes(NONCE_LENGTH);
    const cipher = ctr(key, nonce);
    const ciphertext = cipher.encrypt(plaintext);
    return { nonce, ciphertext };
}

/**
 * Decrypts an AES-256-CTR encrypted payload.
 */
export function aesDecrypt(key: Uint8Array, payload: EncryptedPayload): Uint8Array {
    const cipher = ctr(key, payload.nonce);
    return cipher.decrypt(payload.ciphertext);
}
