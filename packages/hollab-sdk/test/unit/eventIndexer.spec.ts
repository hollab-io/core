import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IStorageClient } from "../../src/interfaces/storageClient.interface.js";
import type { EventIndexerConfig } from "../../src/types/events.types.js";
import { EventIndexer } from "../../src/internal.js";

interface MockPublicClient {
    getBlockNumber: ReturnType<typeof vi.fn>;
    getContractEvents: ReturnType<typeof vi.fn>;
    watchContractEvent: ReturnType<typeof vi.fn>;
}

function createMockPublicClient(): MockPublicClient {
    return {
        getBlockNumber: vi.fn().mockResolvedValue(1000n),
        getContractEvents: vi.fn().mockResolvedValue([]),
        watchContractEvent: vi.fn().mockReturnValue(() => {}),
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

const config: EventIndexerConfig = {
    rpcUrl: "http://localhost:8545",
    contracts: {
        roleRegistry: "0x2222222222222222222222222222222222222222",
    },
    orgId: 1n,
    chunkSize: 500,
};

describe("EventIndexer", () => {
    let indexer: EventIndexer;
    let mockPublicClient: MockPublicClient;
    let mockStorage: IStorageClient;

    beforeEach(() => {
        mockPublicClient = createMockPublicClient();
        mockStorage = createMockStorageClient();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        indexer = new EventIndexer(config, mockPublicClient as any, mockStorage);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("start/stop lifecycle", () => {
        it("starts watching events", async () => {
            await indexer.start();
            expect(mockPublicClient.watchContractEvent).toHaveBeenCalledTimes(2);
        });

        it("does not double-start", async () => {
            await indexer.start();
            await indexer.start();
            expect(mockPublicClient.watchContractEvent).toHaveBeenCalledTimes(2);
        });

        it("stop calls unwatch functions", async () => {
            const unwatch = vi.fn();
            mockPublicClient.watchContractEvent.mockReturnValue(unwatch);

            await indexer.start();
            await indexer.stop();

            expect(unwatch).toHaveBeenCalledTimes(2);
        });
    });

    describe("historical sync", () => {
        it("syncs in chunks", async () => {
            mockPublicClient.getBlockNumber.mockResolvedValue(1200n);

            await indexer.start(0n);

            // 0-499, 500-999, 1000-1200 = 3 chunks × 2 contract event calls (role + contentRef)
            expect(mockPublicClient.getContractEvents).toHaveBeenCalledTimes(6);
        });

        it("handles single chunk", async () => {
            mockPublicClient.getBlockNumber.mockResolvedValue(100n);

            await indexer.start(0n);

            expect(mockPublicClient.getContractEvents).toHaveBeenCalledTimes(2);
        });
    });

    describe("syncOrg", () => {
        it("fetches historical events", async () => {
            mockPublicClient.getBlockNumber.mockResolvedValue(100n);

            await indexer.syncOrg(1n, 0n);

            expect(mockPublicClient.getContractEvents).toHaveBeenCalled();
        });
    });

    describe("event handlers", () => {
        it("calls role handlers for role events", async () => {
            const handler = vi.fn();
            indexer.onRoleChanged(handler);

            mockPublicClient.getContractEvents.mockImplementation(
                (params: { abi: readonly { name: string }[] }) => {
                    if (params.abi[0]?.name === "RoleCreated") {
                        return [
                            {
                                eventName: "RoleCreated",
                                args: {
                                    _roleId: 5n,
                                    _circleId: 3n,
                                    _name: "Secretary",
                                },
                                blockNumber: 50n,
                                transactionHash: "0xdef",
                                logIndex: 0,
                            },
                        ];
                    }
                    return [];
                },
            );

            mockPublicClient.getBlockNumber.mockResolvedValue(100n);
            await indexer.syncOrg(1n, 0n);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ type: "RoleCreated", roleId: 5n }),
            );
        });
    });

    describe("log storage", () => {
        it("appends decoded events to 0G log", async () => {
            mockPublicClient.getContractEvents.mockImplementation(
                (params: { abi: readonly { name: string }[] }) => {
                    if (params.abi[0]?.name === "RoleCreated") {
                        return [
                            {
                                eventName: "RoleLeadAssigned",
                                args: { _roleId: 1n, _lead: "0xAlice" },
                                blockNumber: 50n,
                                transactionHash: "0xabc",
                                logIndex: 0,
                            },
                        ];
                    }
                    return [];
                },
            );

            mockPublicClient.getBlockNumber.mockResolvedValue(100n);
            await indexer.syncOrg(1n, 0n);

            expect(mockStorage.appendLog).toHaveBeenCalledWith(
                "org:1",
                expect.objectContaining({ type: "role:RoleLeadAssigned" }),
            );
        });
    });
});
