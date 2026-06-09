/**
 * useIpfsStorage round-trip tests.
 *
 * The load-bearing invariant of the 0G→IPFS migration: the frontend derives a
 * bytes32 `contentHash` from the CID the indexer pin-proxy returns, then must
 * reconstruct the *exact same CID* to read the blob back. We simulate the
 * indexer's CID derivation with the same multiformats primitives it uses
 * (sha2-256 multihash → CIDv0), so this test pins down the cross-component
 * contract without any network.
 */
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadBytes, uploadBytes } from "./useIpfsStorage";

// Isolate the storage logic from chain config / localStorage / env.
vi.mock("../config/chains", () => ({
    DEFAULT_CHAIN_ID: 31337,
    getChainConfig: () => ({ indexerUrl: "http://indexer.test" }),
}));

/** Mirror the indexer pin-proxy's `localCidFor`: sha2-256 digest → CIDv0. */
async function indexerCidFor(bytes: Uint8Array): Promise<string> {
    const mh = await sha256.digest(bytes);
    return CID.createV0(mh).toString();
}

function hex(bytes: Uint8Array): string {
    let s = "";
    for (const b of bytes) s += b.toString(16).padStart(2, "0");
    return s;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
});

describe("useIpfsStorage round-trip", () => {
    const payload = new TextEncoder().encode("a hollab tension worth resolving");

    it("derives contentHash = the sha2-256 digest the indexer hashed into its CID", async () => {
        const cid = await indexerCidFor(payload);
        const digestHex = hex((await sha256.digest(payload)).digest);

        globalThis.fetch = vi.fn(async () => Response.json({ cid })) as typeof fetch;

        const { contentHash } = await uploadBytes(payload);

        // contentHash is exactly the 32-byte sha2-256 digest of the content.
        expect(contentHash).toBe(`0x${digestHex}`);
        expect(contentHash).toHaveLength(2 + 64);
    });

    it("reconstructs the indexer's exact CID when reading back (the round-trip)", async () => {
        const cid = await indexerCidFor(payload);

        // 1. Upload: proxy returns the indexer-derived CID.
        globalThis.fetch = vi.fn(async () => Response.json({ cid })) as typeof fetch;
        const { contentHash } = await uploadBytes(payload);

        // 2. Download: capture the gateway URL the hook builds from contentHash.
        let requestedUrl = "";
        globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
            requestedUrl = String(url);
            const ab = new ArrayBuffer(payload.byteLength);
            new Uint8Array(ab).set(payload);
            return new Response(ab);
        }) as typeof fetch;

        const out = await downloadBytes(contentHash);

        // The reconstructed CID must equal the CID the indexer originally stored.
        expect(requestedUrl).toContain(`/ipfs/${cid}`);
        expect(out).toEqual(payload);
    });

    it("rejects a contentHash that is not 32 bytes", async () => {
        await expect(downloadBytes("0xdeadbeef" as `0x${string}`)).rejects.toThrow(/32-byte/);
    });

    it("surfaces a pin-proxy error instead of producing a bogus hash", async () => {
        globalThis.fetch = vi.fn(
            async () => new Response("payload too large", { status: 413 }),
        ) as typeof fetch;
        await expect(uploadBytes(payload)).rejects.toThrow(/413/);
    });
});
