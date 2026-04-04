import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";

/**
 * Converts a bigint to a 32-byte big-endian Uint8Array for use as HKDF salt.
 */
export function bigintToBytes32(value: bigint): Uint8Array {
    const bytes = new Uint8Array(32);
    let v = value;
    for (let i = 31; i >= 0; i--) {
        bytes[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return bytes;
}

/**
 * Derives a 32-byte key using HKDF-SHA256.
 * @param ikm - Input key material
 * @param salt - Salt value (bigint converted to 32-byte BE)
 * @param info - Context/info string
 * @returns 32-byte derived key
 */
export function deriveKey(ikm: Uint8Array, salt: bigint, info: string): Uint8Array {
    return hkdf(sha256, ikm, bigintToBytes32(salt), info, 32);
}
