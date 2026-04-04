/** Unique identifier for a 0G Storage stream */
export type StreamId = string;

/** A single entry in a 0G Storage Log */
export interface LogEntry {
    /** Entry type identifier (e.g. "governance:proposal-adopted") */
    type: string;
    /** Arbitrary JSON-serializable data */
    data: Record<string, unknown>;
    /** Unix timestamp in seconds */
    timestamp: number;
    /** Optional transaction hash for on-chain events */
    txHash?: string;
}

/** Configuration for connecting to 0G Storage */
export interface StorageConfig {
    /** 0G Storage KV endpoint URL */
    kvEndpoint: string;
    /** 0G Storage Log endpoint URL */
    logEndpoint: string;
    /** 0G Storage node endpoint URL */
    nodeEndpoint: string;
    /** Private key for 0G Storage authentication */
    privateKey: string;
}
