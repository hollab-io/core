import type { PublicClient } from "viem";

import type { IEventIndexer } from "../interfaces/eventIndexer.interface.js";
import type {
    ContentRefEvent,
    EventIndexerConfig,
    ProposalEvent,
    RoleChange,
} from "../types/events.types.js";
import { contentRefEvents, roleRegistryEvents } from "../lib/chain/abis.js";
import { decodeContentRefEvent, decodeRoleRegistryEvent } from "../lib/chain/eventDecoder.js";

const DEFAULT_CHUNK_SIZE = 2000;

type UnwatchFn = () => void;

export class EventIndexer implements IEventIndexer {
    private readonly config: EventIndexerConfig;
    private readonly publicClient: PublicClient;
    private readonly chunkSize: number;

    private unwatchFns: UnwatchFn[] = [];
    private running = false;

    private roleHandlers: ((event: RoleChange) => void)[] = [];
    private contentRefHandlers: ((event: ContentRefEvent) => void)[] = [];

    constructor(config: EventIndexerConfig, publicClient: PublicClient) {
        this.config = config;
        this.publicClient = publicClient;
        this.chunkSize = config.chunkSize ?? DEFAULT_CHUNK_SIZE;
    }

    /** @inheritdoc */
    async start(fromBlock?: bigint): Promise<void> {
        if (this.running) return;
        this.running = true;

        if (fromBlock !== undefined) {
            await this.syncHistorical(fromBlock);
        }

        this.watchRoleRegistry();
        this.watchContentRefs();
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
    onProposalSubmitted(_handler: (event: ProposalEvent) => void): void {
        /* GovernanceProcess contract removed — handler never invoked */
    }

    /** @inheritdoc */
    onRoleChanged(handler: (event: RoleChange) => void): void {
        this.roleHandlers.push(handler);
    }

    /** @inheritdoc */
    onContentRefSet(handler: (event: ContentRefEvent) => void): void {
        this.contentRefHandlers.push(handler);
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
        const roleAddr = this.config.contracts.roleRegistry;

        const [roleLogs, contentRefLogs] = await Promise.all([
            this.publicClient.getContractEvents({
                address: roleAddr,
                abi: roleRegistryEvents,
                fromBlock,
                toBlock,
            }),
            this.publicClient.getContractEvents({
                address: roleAddr,
                abi: contentRefEvents,
                fromBlock,
                toBlock,
            }),
        ]);

        for (const log of roleLogs) {
            this.processRoleRegistryLog(log);
        }
        for (const log of contentRefLogs) {
            this.processContentRefLog(log);
        }
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

    private watchContentRefs(): void {
        const unwatch = this.publicClient.watchContractEvent({
            address: this.config.contracts.roleRegistry,
            abi: contentRefEvents,
            onLogs: (logs) => {
                for (const log of logs) {
                    this.processContentRefLog(log);
                }
            },
        });
        this.unwatchFns.push(unwatch);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private processContentRefLog(log: any): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const event = decodeContentRefEvent(log);
        if (!event) return;

        for (const handler of this.contentRefHandlers) {
            handler(event);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private processRoleRegistryLog(log: any): void {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const event = decodeRoleRegistryEvent(log);
        if (!event) return;

        for (const handler of this.roleHandlers) {
            handler(event);
        }
    }
}
