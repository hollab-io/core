import { describe, expect, it } from "vitest";

import { aesDecrypt, aesEncrypt } from "../../src/lib/crypto/aes.js";

describe("AES-256-CTR", () => {
    const key = new Uint8Array(32).fill(0xaa);

    it("encrypts and decrypts roundtrip", () => {
        const plaintext = new TextEncoder().encode("hello hollab");
        const payload = aesEncrypt(key, plaintext);
        const decrypted = aesDecrypt(key, payload);
        expect(decrypted).toEqual(plaintext);
    });

    it("produces a 16-byte nonce", () => {
        const plaintext = new Uint8Array([1, 2, 3]);
        const payload = aesEncrypt(key, plaintext);
        expect(payload.nonce).toHaveLength(16);
    });

    it("produces different nonces for each encryption", () => {
        const plaintext = new Uint8Array([1, 2, 3]);
        const a = aesEncrypt(key, plaintext);
        const b = aesEncrypt(key, plaintext);
        expect(a.nonce).not.toEqual(b.nonce);
    });

    it("produces different ciphertext for each encryption (different nonces)", () => {
        const plaintext = new Uint8Array([1, 2, 3]);
        const a = aesEncrypt(key, plaintext);
        const b = aesEncrypt(key, plaintext);
        expect(a.ciphertext).not.toEqual(b.ciphertext);
    });

    it("fails to decrypt with wrong key", () => {
        const plaintext = new TextEncoder().encode("secret data");
        const payload = aesEncrypt(key, plaintext);

        const wrongKey = new Uint8Array(32).fill(0xbb);
        const decrypted = aesDecrypt(wrongKey, payload);
        // CTR mode doesn't throw on wrong key — it produces garbage
        expect(decrypted).not.toEqual(plaintext);
    });

    it("handles empty plaintext", () => {
        const plaintext = new Uint8Array(0);
        const payload = aesEncrypt(key, plaintext);
        const decrypted = aesDecrypt(key, payload);
        expect(decrypted).toEqual(plaintext);
    });

    it("handles large plaintext", () => {
        const plaintext = new Uint8Array(10000).fill(0x42);
        const payload = aesEncrypt(key, plaintext);
        const decrypted = aesDecrypt(key, payload);
        expect(decrypted).toEqual(plaintext);
    });
});
