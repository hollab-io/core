import { keccak256, toBytes } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KeyManager } from "../../src/internal.js";

function createMockWallet(signature: string): {
    account: { address: `0x${string}` };
    signMessage: ReturnType<typeof vi.fn>;
} {
    return {
        account: { address: "0xAlice" as `0x${string}` },
        signMessage: vi.fn().mockResolvedValue(signature),
    };
}

describe("KeyManager", () => {
    let km: KeyManager;

    beforeEach(() => {
        km = new KeyManager();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("deriveMasterKey", () => {
        it("derives a 32-byte master key", async () => {
            const wallet = createMockWallet("0xfakesig123");
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const masterKey = await km.deriveMasterKey(wallet as any, 1n);
            expect(masterKey).toHaveLength(32);
        });

        it("signs the correct message", async () => {
            const wallet = createMockWallet("0xfakesig123");
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            await km.deriveMasterKey(wallet as any, 42n);
            expect(wallet.signMessage).toHaveBeenCalledWith({
                account: wallet.account,
                message: "hollab:org-key:42",
            });
        });

        it("produces deterministic output for same signature", async () => {
            const wallet = createMockWallet("0xfakesig123");
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const a = await km.deriveMasterKey(wallet as any, 1n);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const b = await km.deriveMasterKey(wallet as any, 1n);
            expect(a).toEqual(b);
        });

        it("equals keccak256 of the signature", async () => {
            const sig = "0xfakesig123";
            const wallet = createMockWallet(sig);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            const masterKey = await km.deriveMasterKey(wallet as any, 1n);
            const expected = toBytes(keccak256(toBytes(sig)));
            expect(masterKey).toEqual(expected);
        });

        it("throws if wallet has no account", async () => {
            const wallet = { signMessage: vi.fn() };
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
            await expect(km.deriveMasterKey(wallet as any, 1n)).rejects.toThrow(
                "Wallet must have an account",
            );
        });
    });

    describe("key hierarchy", () => {
        const masterKey = new Uint8Array(32).fill(0x01);

        it("derives a 32-byte org key", () => {
            const orgKey = km.deriveOrgKey(masterKey, 1n);
            expect(orgKey).toHaveLength(32);
        });

        it("derives a 32-byte circle key", () => {
            const circleKey = km.deriveCircleKey(masterKey, 1n);
            expect(circleKey).toHaveLength(32);
        });

        it("derives a 32-byte role key from circle key", () => {
            const circleKey = km.deriveCircleKey(masterKey, 1n);
            const roleKey = km.deriveRoleKey(circleKey, 1n);
            expect(roleKey).toHaveLength(32);
        });

        it("org key != circle key for same ID", () => {
            const orgKey = km.deriveOrgKey(masterKey, 1n);
            const circleKey = km.deriveCircleKey(masterKey, 1n);
            expect(orgKey).not.toEqual(circleKey);
        });

        it("different circle IDs produce different keys", () => {
            const a = km.deriveCircleKey(masterKey, 1n);
            const b = km.deriveCircleKey(masterKey, 2n);
            expect(a).not.toEqual(b);
        });

        it("different role IDs produce different keys", () => {
            const circleKey = km.deriveCircleKey(masterKey, 1n);
            const a = km.deriveRoleKey(circleKey, 1n);
            const b = km.deriveRoleKey(circleKey, 2n);
            expect(a).not.toEqual(b);
        });

        it("role key is not derivable from another circle's key", () => {
            const circle1Key = km.deriveCircleKey(masterKey, 1n);
            const circle2Key = km.deriveCircleKey(masterKey, 2n);
            const role1From1 = km.deriveRoleKey(circle1Key, 1n);
            const role1From2 = km.deriveRoleKey(circle2Key, 1n);
            expect(role1From1).not.toEqual(role1From2);
        });
    });

    describe("encrypt/decrypt", () => {
        it("roundtrips plaintext", () => {
            const key = new Uint8Array(32).fill(0xaa);
            const plaintext = new TextEncoder().encode("hello");
            const payload = km.encrypt(key, plaintext);
            const decrypted = km.decrypt(key, payload);
            expect(decrypted).toEqual(plaintext);
        });
    });

    describe("key shares", () => {
        it("roundtrips key material", () => {
            const keyMaterial = new Uint8Array(32).fill(0xdd);
            const sharedSecret = new Uint8Array(32).fill(0xcc);
            const share = km.createKeyShare(keyMaterial, sharedSecret);
            const recovered = km.decryptKeyShare(share, sharedSecret);
            expect(recovered).toEqual(keyMaterial);
        });
    });

    describe("deriveSharedSecret", () => {
        it("derives a 32-byte shared secret", async () => {
            const wallet = createMockWallet("0xsharedsig");
            const secret = await km.deriveSharedSecret(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                wallet as any,
                1n,
                "0xBob",
            );
            expect(secret).toHaveLength(32);
        });

        it("signs the correct message with lowercase address", async () => {
            const wallet = createMockWallet("0xsharedsig");
            await km.deriveSharedSecret(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
                wallet as any,
                1n,
                "0xBob",
            );
            expect(wallet.signMessage).toHaveBeenCalledWith({
                account: wallet.account,
                message: "hollab:shared-secret:1:0xbob",
            });
        });
    });
});
