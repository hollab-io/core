import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IKeyManager } from "../../src/interfaces/keyManager.interface.js";
import type { IStorageClient } from "../../src/interfaces/storageClient.interface.js";
import type { OrgMeta, RoleConfig, Tension } from "../../src/types/org.types.js";
import { OrgClient } from "../../src/internal.js";

const encoder = new TextEncoder();

function createMockKeyManager(): IKeyManager {
    const orgKey = new Uint8Array(32).fill(0x01);
    const circleKey = new Uint8Array(32).fill(0x02);
    const roleKey = new Uint8Array(32).fill(0x03);

    return {
        deriveMasterKey: vi.fn().mockResolvedValue(new Uint8Array(32).fill(0x00)),
        deriveOrgKey: vi.fn().mockReturnValue(orgKey),
        deriveCircleKey: vi.fn().mockReturnValue(circleKey),
        deriveRoleKey: vi.fn().mockReturnValue(roleKey),
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
        putEncrypted: vi.fn(),
        getDecrypted: vi.fn(),
        appendLog: vi.fn(),
        readLog: vi.fn(),
        streamExists: vi.fn(),
    };
}

function createMockWallet(): { account: { address: `0x${string}` } } {
    return { account: { address: "0xAlice" } };
}

describe("OrgClient", () => {
    let orgClient: OrgClient;
    let mockKm: IKeyManager;
    let mockStorage: IStorageClient;

    beforeEach(() => {
        mockKm = createMockKeyManager();
        mockStorage = createMockStorageClient();
        orgClient = new OrgClient(
            {
                orgId: 1n,
                storageConfig: {
                    kvEndpoint: "",
                    logEndpoint: "",
                    nodeEndpoint: "",
                    privateKey: "",
                },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createMockWallet() as any,
            mockKm,
            mockStorage,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("getOrgMeta / setOrgMeta", () => {
        it("uses org key scope for metadata", async () => {
            const meta: OrgMeta = { name: "Test Org", purpose: "Testing", config: {} };
            await orgClient.setOrgMeta(meta);

            expect(mockKm.deriveOrgKey).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "meta",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });

        it("returns null when no meta exists", async () => {
            vi.mocked(mockStorage.getDecrypted).mockResolvedValue(null);
            const result = await orgClient.getOrgMeta();
            expect(result).toBeNull();
        });

        it("deserializes stored meta", async () => {
            const meta: OrgMeta = { name: "Test", purpose: "Test", config: {} };
            vi.mocked(mockStorage.getDecrypted).mockResolvedValue(
                encoder.encode(JSON.stringify(meta)),
            );
            const result = await orgClient.getOrgMeta();
            expect(result).toEqual(meta);
        });
    });

    describe("getCircleMeta / setCircleMeta", () => {
        it("uses circle key scope", async () => {
            await orgClient.setCircleMeta(5n, {
                name: "Circle",
                purpose: "Test",
                parentCircleId: null,
                config: {},
            });

            expect(mockKm.deriveCircleKey).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "circle:5:meta",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });
    });

    describe("getTension / setTension", () => {
        it("uses circle key scope and correct key path", async () => {
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

            expect(mockKm.deriveCircleKey).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "circle:5:tension:abc",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });
    });

    describe("getProposal / setProposal", () => {
        it("uses circle key scope", async () => {
            await orgClient.setProposal(3n, {
                id: 10n,
                circleId: 3n,
                proposer: "0xBob",
                tension: "t",
                explanation: "e",
                rationale: "r",
                discussion: [],
                createdAt: 1000,
            });

            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "circle:3:proposal:10",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });
    });

    describe("getRoleConfig / setRoleConfig", () => {
        it("uses role key scope (circle key → role key)", async () => {
            const config: RoleConfig = {
                name: "R",
                purpose: "P",
                instructions: "I",
                agentConfig: null,
            };
            await orgClient.setRoleConfig(3n, 7n, config);

            expect(mockKm.deriveCircleKey).toHaveBeenCalled();
            expect(mockKm.deriveRoleKey).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "role:7:config",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });
    });

    describe("shareCircleKey", () => {
        it("creates key share and stores at keyshare path", async () => {
            await orgClient.shareCircleKey(5n, "0xBob", new Uint8Array(32));

            expect(mockKm.createKeyShare).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "keyshare:circle:5:0xbob",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });
    });

    describe("shareRoleKey", () => {
        it("creates key share and stores at role keyshare path", async () => {
            await orgClient.shareRoleKey(3n, 7n, "0xBob", new Uint8Array(32));

            expect(mockKm.createKeyShare).toHaveBeenCalled();
            expect(mockStorage.putEncrypted).toHaveBeenCalledWith(
                "org:1",
                "keyshare:role:7:0xbob",
                expect.any(Uint8Array),
                expect.any(Uint8Array),
            );
        });
    });

    describe("master key caching", () => {
        it("only derives master key once across multiple calls", async () => {
            vi.mocked(mockStorage.getDecrypted).mockResolvedValue(null);
            await orgClient.getOrgMeta();
            await orgClient.getCircleMeta(1n);
            await orgClient.getTension(1n, "x");

            expect(mockKm.deriveMasterKey).toHaveBeenCalledTimes(1);
        });
    });
});
