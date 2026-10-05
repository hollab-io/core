/**
 * A bytes32 content hash — the 32-byte sha2-256 multihash digest of a CIDv0,
 * formatted as a `0x`-prefixed hex string. This is the on-chain
 * `ContentRef.contentHash` value; given it, the StorageClient reconstructs the
 * CID to fetch the blob from an IPFS gateway.
 */
export type ContentHash = `0x${string}`;

/**
 * Logical key namespace label for off-chain blobs (e.g. "org:{orgId}",
 * "circle:{circleId}:meta"). With content-addressed IPFS the label no longer
 * locates the blob — it's a human-meaningful name whose latest CID is tracked
 * on-chain (`ContentRef`) or by the caller. Retained for the schema helpers.
 */
export type StreamId = string;

/**
 * Minimal Response shape the StorageClient consumes — a structural subset of
 * the WHATWG `Response`, declared locally so the SDK does not require the DOM
 * lib. A real global `Response` satisfies it.
 */
export interface FetchResponse {
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
}

/** Minimal fetch signature the StorageClient needs (compatible with global fetch). */
export type FetchLike = (
    input: string,
    init?: { method?: string; headers?: Record<string, string>; body?: ArrayBuffer },
) => Promise<FetchResponse>;

/** Configuration for the IPFS pin-proxy the StorageClient talks to. */
export interface IpfsStorageConfig {
    /** Full URL of the indexer pin endpoint, e.g. http://localhost:42069/storage/pin */
    pinUrl: string;
    /** Base IPFS gateway URL; the client appends `/ipfs/<cid>` on reads. */
    gatewayUrl: string;
    /** Optional fetch implementation (defaults to the global fetch). */
    fetchImpl?: FetchLike;
}
