import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IKeyManager } from "../../src/interfaces/keyManager.interface.js";
import type { ZeroGKvClient, ZeroGLogClient } from "../../src/providers/storageClient.js";
import { StorageClient } from "../../src/internal.js";

function createMockKeyManager(): IKeyManager {
    return {
        deriveMasterKey: vi.fn(),
        deriveOrgKey: vi.fn(),
        deriveCircleKey: vi.fn(),
        deriveRoleKey: vi.fn(),
        encrypt: vi.fn().mockImplementation((_key: Uint8Array, plaintext: Uint8Array) => ({
            nonce: new Uint8Array(16).fill(0x01),
            ciphertext: plaintext, // passthrough for testing
        })),
        decrypt: vi
            .fn()
            .mockImplementation(
                (_key: Uint8Array, payload: { ciphertext: Uint8Array }) => payload.ciphertext,
            ),
        createKeyShare: vi.fn(),
        decryptKeyShare: vi.fn(),
        deriveSharedSecret: vi.fn(),
    };
}

function createMockKvClient(): ZeroGKvClient {
    return {
        put: vi.fn(),
        get: vi.fn(),
        exists: vi.fn(),
    };
}

function createMockLogClient(): ZeroGLogClient {
    return {
        append: vi.fn(),
        read: vi.fn(),
    };
}

describe("StorageClient", () => {
    let storageClient: StorageClient;
    let mockKm: IKeyManager;
    let mockKv: ZeroGKvClient;
    let mockLog: ZeroGLogClient;

    const streamId = "org:1";
    const encKey = new Uint8Array(32).fill(0xaa);

    beforeEach(() => {
        mockKm = createMockKeyManager();
        mockKv = createMockKvClient();
        mockLog = createMockLogClient();
        storageClient = new StorageClient(mockKm, mockKv, mockLog);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("putEncrypted", () => {
        it("encrypts and stores value", async () => {
            const value = new TextEncoder().encode("test data");
            await storageClient.putEncrypted(streamId, "mykey", value, encKey);

            expect(mockKm.encrypt).toHaveBeenCalledWith(encKey, value);
            expect(mockKv.put).toHaveBeenCalledWith(streamId, "mykey", expect.any(Uint8Array));
        });
    });

    describe("getDecrypted", () => {
        it("returns null when key not found", async () => {
            vi.mocked(mockKv.get).mockResolvedValue(null);

            const result = await storageClient.getDecrypted(streamId, "missing", encKey);
            expect(result).toBeNull();
        });

        it("fetches and decrypts value", async () => {
            const plaintext = new TextEncoder().encode("hello");
            // Simulate stored data: [0, 16, ...nonce(16 bytes), ...ciphertext]
            const nonce = new Uint8Array(16).fill(0x01);
            const stored = new Uint8Array(2 + 16 + plaintext.length);
            stored[0] = 0;
            stored[1] = 16;
            stored.set(nonce, 2);
            stored.set(plaintext, 18);

            vi.mocked(mockKv.get).mockResolvedValue(stored);

            const result = await storageClient.getDecrypted(streamId, "mykey", encKey);
            expect(mockKm.decrypt).toHaveBeenCalled();
            expect(result).toEqual(plaintext);
        });
    });

    describe("appendLog", () => {
        it("serializes entry and appends to log", async () => {
            const entry = { type: "test", data: { foo: "bar" }, timestamp: 1234567890 };
            await storageClient.appendLog(streamId, entry);

            expect(mockLog.append).toHaveBeenCalledWith(streamId, expect.any(Uint8Array));
            const call = vi.mocked(mockLog.append).mock.calls[0]!;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const decoded = JSON.parse(new TextDecoder().decode(call[1]));
            expect(decoded).toEqual(entry);
        });
    });

    describe("readLog", () => {
        it("reads and parses log entries", async () => {
            const entries = [
                { type: "a", data: {}, timestamp: 1 },
                { type: "b", data: { x: 1 }, timestamp: 2 },
            ];
            vi.mocked(mockLog.read).mockResolvedValue(
                entries.map((e) => new TextEncoder().encode(JSON.stringify(e))),
            );

            const result = await storageClient.readLog(streamId, 0, 2);
            expect(result).toEqual(entries);
            expect(mockLog.read).toHaveBeenCalledWith(streamId, 0, 2);
        });

        it("returns empty array for no entries", async () => {
            vi.mocked(mockLog.read).mockResolvedValue([]);
            const result = await storageClient.readLog(streamId, 0, 10);
            expect(result).toEqual([]);
        });
    });

    describe("streamExists", () => {
        it("delegates to kv client", async () => {
            vi.mocked(mockKv.exists).mockResolvedValue(true);
            const result = await storageClient.streamExists(streamId);
            expect(result).toBe(true);
        });

        it("returns false when stream does not exist", async () => {
            vi.mocked(mockKv.exists).mockResolvedValue(false);
            const result = await storageClient.streamExists(streamId);
            expect(result).toBe(false);
        });
    });
});
