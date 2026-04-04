import type { PublicClient } from "viem";

import type { IEventIndexer } from "../interfaces/eventIndexer.interface.js";
import type { IStorageClient } from "../interfaces/storageClient.interface.js";
import type {
    EventIndexerConfig,
    ProposalEvent,
    RoleChange,
    TreasuryEvent,
} from "../types/events.types.js";
import {
    circleRegistryEvents,
    circleTreasuryEvents,
    governanceProcessEvents,
    roleRegistryEvents,
    timelockControllerEvents,
} from "../lib/chain/abis.js";
import {
    decodeCircleRegistryEvent,
    decodeGovernanceProcessEvent,
    decodeRoleRegistryEvent,
    decodeTreasuryEvent,
} from "../lib/chain/eventDecoder.js";
import { buildStreamId } from "../lib/storage/schema.js";

const DEFAULT_CHUNK_SIZE = 2000;

type UnwatchFn = () => void;

export class EventIndexer implements IEventIndexer {
    private readonly config: EventIndexerConfig;
    private readonly publicClient: PublicClient;
    private readonly storageClient: IStorageClient;
    private readonly streamId: string;
    private readonly chunkSize: number;

    private unwatchFns: UnwatchFn[] = [];
    private running = false;

    private proposalHandlers: ((event: ProposalEvent) => void)[] = [];
    private treasuryHandlers: ((event: TreasuryEvent) => void)[] = [];
    private roleHandlers: ((event: RoleChange) => void)[] = [];

    constructor(
        config: EventIndexerConfig,
        publicClient: PublicClient,
        storageClient: IStorageClient,
    ) {
        this.config = config;
        this.publicClient = publicClient;
        this.storageClient = storageClient;
        this.streamId = buildStreamId(config.orgId);
        this.chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE;
    }

    /** @inheritdoc */
    async start(fromBlock?: bigint): Promise<void> {
        if (this.running) return;
        this.running = true;

        if (fromBlock !== undefined) {
            await this.syncHistorical(fromBlock);
        }

        this.watchCircleRegistry();
        this.watchRoleRegistry();
        this.watchGovernanceProcess();
        this.watchTreasury();
    }

    /** @inheritdoc */
    async stop(): Promise<void> {
        this.running = false;
        for (const unwatch of this.unwatchFns) {
            unwatch();
        }
        this.unwatchFns = [];
        await Promise.resolve();
    }

    /** @inheritdoc */
    async syncOrg(_orgId: bigint, fromBlock?: bigint): Promise<void> {
        const startBlock = fromBlock ?? 0n;
        await this.syncHistorical(startBlock);
    }

    /** @inheritdoc */
    onProposalSubmitted(handler: (event: ProposalEvent) => void): void {
        this.proposalHandlers.push(handler);
    }

    /** @inheritdoc */
    onTreasuryScheduled(handler: (event: TreasuryEvent) => void): void {
        this.treasuryHandlers.push(handler);
    }

    /** @inheritdoc */
    onRoleChanged(handler: (event: RoleChange) => void): void {
        this.roleHandlers.push(handler);
    }

    private async syncHistorical(fromBlock: bigint): Promise<void> {
        const latestBlock = await this.publicClient.getBlockNumber();

        for (let start = fromBlock; start <= latestBlock; start += BigInt(this.chunkSize)) {
            const end =
                start + BigInt(this.chunkSize) - 1n > latestBlock
                    ? latestBlock
                    : start + BigInt(this.chunkSize) - 1n;

            await this.fetchAndProcessChunk(start, end);
        }
    }

    private async fetchAndProcessChunk(fromBlock: bigint, toBlock: bigint): Promise<void> {
        const [circleLogs, roleLogs, govLogs, treasuryLogs, timelockLogs] = await Promise.all([
            this.publicClient.getContractEvents({
                address: this.config.contracts.circleRegistry,
                abi: circleRegistryEvents,
                fromBlock,
                toBlock,
            }),
            this.publicClient.getContractEvents({
                address: this.config.contracts.roleRegistry,
                abi: roleRegistryEvents,
                fromBlock,
                toBlock,
            }),
            this.publicClient.getContractEvents({
                address: this.config.contracts.governanceProcess,
                abi: governanceProcessEvents,
                fromBlock,
                toBlock,
            }),
            this.publicClient.getContractEvents({
                address: this.config.contracts.circleTreasury,
                abi: circleTreasuryEvents,
                fromBlock,
                toBlock,
            }),
            this.publicClient.getContractEvents({
                address: this.config.contracts.circleTreasury,
                abi: timelockControllerEvents,
                fromBlock,
                toBlock,
            }),
        ]);

        for (const log of circleLogs) {
            this.processCircleRegistryLog(log);
        }
        for (const log of roleLogs) {
            this.processRoleRegistryLog(log);
        }
        for (const log of govLogs) {
            this.processGovernanceLog(log);
        }
        for (const log of [...treasuryLogs, ...timelockLogs]) {
            this.processTreasuryLog(log);
        }
    }

    private watchCircleRegistry(): void {
        const unwatch = this.publicClient.watchContractEvent({
            address: this.config.contracts.circleRegistry,
            abi: circleRegistryEvents,
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processCircleRegistryLog(log);
                }
            },
        });
        this.unwatchFns.push(unwatch);
    }

    private watchRoleRegistry(): void {
        const unwatch = this.publicClient.watchContractEvent({
            address: this.config.contracts.roleRegistry,
            abi: roleRegistryEvents,
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processRoleRegistryLog(log);
                }
            },
        });
        this.unwatchFns.push(unwatch);
    }

    private watchGovernanceProcess(): void {
        const unwatch = this.publicClient.watchContractEvent({
            address: this.config.contracts.governanceProcess,
            abi: governanceProcessEvents,
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processGovernanceLog(log);
                }
            },
        });
        this.unwatchFns.push(unwatch);
    }

    private watchTreasury(): void {
        const unwatchTreasury = this.publicClient.watchContractEvent({
            address: this.config.contracts.circleTreasury,
            abi: circleTreasuryEvents,
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processTreasuryLog(log);
                }
            },
        });
        const unwatchTimelock = this.publicClient.watchContractEvent({
            address: this.config.contracts.circleTreasury,
            abi: timelockControllerEvents,
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processTreasuryLog(log);
                }
            },
        });
        this.unwatchFns.push(unwatchTreasury, unwatchTimelock);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private processCircleRegistryLog(log: any): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const event = decodeCircleRegistryEvent(log);
        if (!event) return;

        void this.storageClient.appendLog(this.streamId, {
            type: `circle:${event.type}`,
            data: event as unknown as Record<string, unknown>,
            timestamp: event.timestamp,
            txHash: event.transactionHash,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private processRoleRegistryLog(log: any): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const event = decodeRoleRegistryEvent(log);
        if (!event) return;

        for (const handler of this.roleHandlers) {
            handler(event);
        }

        void this.storageClient.appendLog(this.streamId, {
            type: `role:${event.type}`,
            data: event as unknown as Record<string, unknown>,
            timestamp: event.timestamp,
            txHash: event.transactionHash,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private processGovernanceLog(log: any): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const event = decodeGovernanceProcessEvent(log);
        if (!event) return;

        for (const handler of this.proposalHandlers) {
            handler(event);
        }

        void this.storageClient.appendLog(this.streamId, {
            type: `governance:${event.type}`,
            data: event as unknown as Record<string, unknown>,
            timestamp: event.timestamp,
            txHash: event.transactionHash,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private processTreasuryLog(log: any): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const event = decodeTreasuryEvent(log);
        if (!event) return;

        for (const handler of this.treasuryHandlers) {
            handler(event);
        }

        void this.storageClient.appendLog(this.streamId, {
            type: `treasury:${event.type}`,
            data: event as unknown as Record<string, unknown>,
            timestamp: event.timestamp,
            txHash: event.transactionHash,
        });
    }
}
