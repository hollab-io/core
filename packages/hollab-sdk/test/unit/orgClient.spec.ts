import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IKeyManager } from "../../src/interfaces/keyManager.interface.js";
import type { IStorageClient } from "../../src/interfaces/storageClient.interface.js";
import type { OrgMeta, RoleConfig, Tension } from "../../src/types/org.types.js";
import type { ContentHash } from "../../src/types/storage.types.js";
import { OrgClient } from "../../src/internal.js";

const encoder = new TextEncoder();
const ORG_KEY = new Uint8Array(32).fill(0x01);
const CIRCLE_KEY = new Uint8Array(32).fill(0x02);
const ROLE_KEY = new Uint8Array(32).fill(0x03);
const STORED_HASH = `0x${"cd".repeat(32)}` as ContentHash;

function createMockKeyManager(): IKeyManager {
    return {
        deriveMasterKey: vi.fn().mockResolvedValue(new Uint8Array(32).fill(0x00)),
        deriveOrgKey: vi.fn().mockReturnValue(ORG_KEY),
        deriveCircleKey: vi.fn().mockReturnValue(CIRCLE_KEY),
        deriveRoleKey: vi.fn().mockReturnValue(ROLE_KEY),
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        createKeyShare: vi
            .fn()
            .mockReturnValue({ encryptedKey: new Uint8Array(32), nonce: new Uint8Array(16) }),
        decryptKeyShare: vi.fn(),
        deriveSharedSecret: vi.fn(),
    };
}

function createMockStorageClient(): IStorageClient {
    return {
        putEncrypted: vi.fn().mockResolvedValue(STORED_HASH),
        getDecrypted: vi.fn(),
    };
}

function createMockWallet(): { account: { address: `0x${string}` } } {
    return { account: { address: "0xAlice" } };
}

describe("OrgClient (content-addressed)", () => {
    let orgClient: OrgClient;
    let mockKm: IKeyManager;
    let mockStorage: IStorageClient;

    beforeEach(() => {
        mockKm = createMockKeyManager();
        mockStorage = createMockStorageClient();
        orgClient = new OrgClient(
            { orgId: 1n },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createMockWallet() as any,
            mockKm,
            mockStorage,
        );
    });

    afterEach(() => vi.clearAllMocks());

    describe("getOrgMeta / setOrgMeta", () => {
        it("encrypts with the org key and returns the pinned content hash", async () => {
            const meta: OrgMeta = { name: "Test Org", purpose: "Testing", config: {} };
            const hash = await orgClient.setOrgMeta(meta);

            expect(mockKm.deriveOrgKey).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(expect.any(Uint8Array), ORG_KEY);
            expect(hash).toBe(STORED_HASH);
        });

        it("fetches by content hash and deserializes", async () => {
            const meta: OrgMeta = { name: "Test", purpose: "Test", config: {} };
            vi.mocked(mockStorage.getDecrypted).mockResolvedValue(
                encoder.encode(JSON.stringify(meta)),
            );
            const result = await orgClient.getOrgMeta(STORED_HASH);
            expect(mockStorage.getDecrypted).toHaveBeenCalledWith(STORED_HASH, ORG_KEY);
            expect(result).toEqual(meta);
        });
    });

    describe("scope keys", () => {
        it("setCircleMeta uses the circle key", async () => {
            await orgClient.setCircleMeta(5n, {
                name: "Circle",
                purpose: "Test",
                parentCircleId: null,
                config: {},
            });
            expect(mockKm.deriveCircleKey).toHaveBeenCalledWith(expect.any(Uint8Array), 5n);
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                expect.any(Uint8Array),
                CIRCLE_KEY,
            );
        });

        it("setTension uses the circle key", async () => {
            const tension: Tension = {
                id: "abc",
                circleId: 5n,
                author: "0xAlice",
                title: "Test",
                description: "Desc",
                createdAt: 1000,
                resolvedAt: null,
            };
            await orgClient.setTension(5n, tension);
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                expect.any(Uint8Array),
                CIRCLE_KEY,
            );
        });

        it("setRoleConfig derives the role key (circle key → role key)", async () => {
            const config: RoleConfig = {
                name: "R",
                purpose: "P",
                instructions: "I",
                agentConfig: null,
            };
            await orgClient.setRoleConfig(3n, 7n, config);
            expect(mockKm.deriveCircleKey).toHaveBeenCalledWith(expect.any(Uint8Array), 3n);
            expect(mockKm.deriveRoleKey).toHaveBeenCalledWith(CIRCLE_KEY, 7n);
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(expect.any(Uint8Array), ROLE_KEY);
        });
    });

    describe("key sharing", () => {
        it("shareCircleKey wraps the circle key and pins it under the org key", async () => {
            const hash = await orgClient.shareCircleKey(5n, new Uint8Array(32));
            expect(mockKm.createKeyShare).toHaveBeenCalledWith(CIRCLE_KEY, expect.any(Uint8Array));
            // The key-share envelope itself is encrypted with the org key.
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(expect.any(Uint8Array), ORG_KEY);
            expect(hash).toBe(STORED_HASH);
        });

        it("shareRoleKey wraps the role key and pins it under the org key", async () => {
            await orgClient.shareRoleKey(3n, 7n, new Uint8Array(32));
            expect(mockKm.createKeyShare).toHaveBeenCalledWith(ROLE_KEY, expect.any(Uint8Array));
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(expect.any(Uint8Array), ORG_KEY);
        });
    });

    describe("master key caching", () => {
        it("only derives the master key once across multiple writes", async () => {
            await orgClient.setOrgMeta({ name: "a", purpose: "b", config: {} });
            await orgClient.setCircleMeta(1n, {
                name: "c",
                purpose: "d",
                parentCircleId: null,
                config: {},
            });
            await orgClient.setRoleConfig(1n, 2n, {
                name: "r",
                purpose: "p",
                instructions: "i",
                agentConfig: null,
            });
            expect(mockKm.deriveMasterKey).toHaveBeenCalledTimes(1);
        });
    });
});
