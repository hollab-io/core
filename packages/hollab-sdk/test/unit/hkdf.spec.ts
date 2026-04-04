import { describe, expect, it } from "vitest";

import { bigintToBytes32, deriveKey } from "../../src/lib/crypto/hkdf.js";

describe("HKDF", () => {
    describe("bigintToBytes32", () => {
        it("converts 0n to 32 zero bytes", () => {
            const result = bigintToBytes32(0n);
            expect(result).toHaveLength(32);
            expect(result.every((b) => b === 0)).toBe(true);
        });

        it("converts 1n to bytes with only last byte set", () => {
            const result = bigintToBytes32(1n);
            expect(result[31]).toBe(1);
            expect(result.slice(0, 31).every((b) => b === 0)).toBe(true);
        });

        it("converts 256n correctly", () => {
            const result = bigintToBytes32(256n);
            expect(result[30]).toBe(1);
            expect(result[31]).toBe(0);
        });

        it("handles large values", () => {
            const val = 2n ** 255n;
            const result = bigintToBytes32(val);
            expect(result[0]).toBe(128); // 0x80
            expect(result.slice(1).every((b) => b === 0)).toBe(true);
        });
    });

    describe("deriveKey", () => {
        it("produces a 32-byte key", () => {
            const ikm = new Uint8Array(32).fill(0x0b);
            const result = deriveKey(ikm, 1n, "test-info");
            expect(result).toHaveLength(32);
        });

        it("produces deterministic output", () => {
            const ikm = new Uint8Array(32).fill(0x0b);
            const a = deriveKey(ikm, 42n, "hollab:org");
            const b = deriveKey(ikm, 42n, "hollab:org");
            expect(a).toEqual(b);
        });

        it("produces different keys for different salts", () => {
            const ikm = new Uint8Array(32).fill(0x0b);
            const a = deriveKey(ikm, 1n, "hollab:org");
            const b = deriveKey(ikm, 2n, "hollab:org");
            expect(a).not.toEqual(b);
        });

        it("produces different keys for different info strings", () => {
            const ikm = new Uint8Array(32).fill(0x0b);
            const a = deriveKey(ikm, 1n, "hollab:org");
            const b = deriveKey(ikm, 1n, "hollab:circle");
            expect(a).not.toEqual(b);
        });

        it("produces different keys for different IKM", () => {
            const ikm1 = new Uint8Array(32).fill(0x0b);
            const ikm2 = new Uint8Array(32).fill(0x0c);
            const a = deriveKey(ikm1, 1n, "hollab:org");
            const b = deriveKey(ikm2, 1n, "hollab:org");
            expect(a).not.toEqual(b);
        });
    });
});
