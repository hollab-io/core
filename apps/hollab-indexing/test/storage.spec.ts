/**
 * In-process tests for the IPFS pin proxy (src/api/storage.ts).
 *
 * Exercises the real Hono routes via `storage.request(...)` against a temp
 * filesystem — no Ponder, no network, no Pinata. This is the server half of
 * the 0G→IPFS round-trip the frontend's useIpfsStorage relies on.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import storage, { localCidFor } from "../src/api/storage.js";

let dir: string;
const savedJwt = process.env.PINATA_JWT;

beforeEach(async () => {
    delete process.env.PINATA_JWT; // force local mode
    dir = await mkdtemp(path.join(tmpdir(), "hollab-ipfs-"));
    process.env.LOCAL_IPFS_DIR = dir;
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
    delete process.env.LOCAL_IPFS_DIR;
    if (savedJwt === undefined) delete process.env.PINATA_JWT;
    else process.env.PINATA_JWT = savedJwt;
});

async function pin(body: Uint8Array): Promise<Response> {
    return storage.request("/storage/pin", {
        method: "POST",
        body,
        headers: { "content-type": "application/octet-stream" },
    });
}

describe("pin proxy — local mode round-trip", () => {
    it("pins bytes, returns the deterministic CIDv0, and serves them back", async () => {
        const body = new TextEncoder().encode("hello pin proxy");

        const pinRes = await pin(body);
        expect(pinRes.status).toBe(200);
        const { cid } = (await pinRes.json()) as { cid: string };

        // CID is the pure sha2-256→CIDv0 of the content (matches the frontend).
        expect(cid).toBe(localCidFor(body));

        const getRes = await storage.request(`/ipfs/${cid}`);
        expect(getRes.status).toBe(200);
        const out = new Uint8Array(await getRes.arrayBuffer());
        expect(out).toEqual(body);
    });

    it("is content-addressed: identical bytes pin to the same CID", async () => {
        const body = new TextEncoder().encode("dedupe me");
        const a = (await (await pin(body)).json()) as { cid: string };
        const b = (await (await pin(body)).json()) as { cid: string };
        expect(a.cid).toBe(b.cid);
    });
});

describe("pin proxy — guards", () => {
    it("rejects an empty body (400)", async () => {
        const res = await pin(new Uint8Array(0));
        expect(res.status).toBe(400);
    });

    it("rejects a payload over the 5 MiB cap (413)", async () => {
        const tooBig = new Uint8Array(5 * 1024 * 1024 + 1);
        const res = await pin(tooBig);
        expect(res.status).toBe(413);
        const body = (await res.json()) as { error: string; maxBytes: number };
        expect(body.maxBytes).toBe(5 * 1024 * 1024);
    });

    it("rejects a malformed CID on the gateway (400)", async () => {
        const res = await storage.request("/ipfs/not-a-valid-cid");
        expect(res.status).toBe(400);
    });

    it("returns 404 for a well-formed but unknown CID", async () => {
        const cid = localCidFor(new TextEncoder().encode("never pinned"));
        const res = await storage.request(`/ipfs/${cid}`);
        expect(res.status).toBe(404);
    });
});

describe("pin proxy — pinata mode", () => {
    it("disables the local gateway when PINATA_JWT is set", async () => {
        // Pin a blob in local mode first so the file genuinely exists on disk…
        const body = new TextEncoder().encode("guarded");
        const { cid } = (await (await pin(body)).json()) as { cid: string };

        // …then flip to pinata mode and confirm the gateway refuses to serve it.
        process.env.PINATA_JWT = "test-jwt";
        const res = await storage.request(`/ipfs/${cid}`);
        expect(res.status).toBe(404);
        const json = (await res.json()) as { error: string };
        expect(json.error).toMatch(/disabled/);
    });
});
