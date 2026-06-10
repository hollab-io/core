import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { IKeyManager } from "../../src/interfaces/keyManager.interface.js";
import { StorageClient } from "../../src/internal.js";

const NONCE = new Uint8Array(16).fill(0x01);
const encKey = new Uint8Array(32).fill(0xaa);

function createMockKeyManager(): IKeyManager {
    return {
        deriveMasterKey: vi.fn(),
        deriveOrgKey: vi.fn(),
        deriveCircleKey: vi.fn(),
        deriveRoleKey: vi.fn(),
        // Passthrough cipher with a fixed nonce, so we can predict the bytes
        // that get pinned and therefore the resulting CID.
        encrypt: vi.fn().mockImplementation((_k: Uint8Array, plaintext: Uint8Array) => ({
            nonce: NONCE,
            ciphertext: plaintext,
        })),
        decrypt: vi
            .fn()
            .mockImplementation((_k: Uint8Array, p: { ciphertext: Uint8Array }) => p.ciphertext),
        createKeyShare: vi.fn(),
        decryptKeyShare: vi.fn(),
        deriveSharedSecret: vi.fn(),
    };
}

/** Mirror StorageClient's wire format: [2-byte nonceLen][nonce][ciphertext]. */
function serialize(nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array {
    const out = new Uint8Array(2 + nonce.length + ciphertext.length);
    out[0] = (nonce.length >> 8) & 0xff;
    out[1] = nonce.length & 0xff;
    out.set(nonce, 2);
    out.set(ciphertext, 2 + nonce.length);
    return out;
}

/** Mirror the indexer pin-proxy: sha2-256 → CIDv0. */
async function cidForBytes(bytes: Uint8Array): Promise<string> {
    return CID.createV0(await sha256.digest(bytes)).toString();
}

async function digestHex(bytes: Uint8Array): Promise<string> {
    const d = (await sha256.digest(bytes)).digest;
    let hex = "";
    for (const b of d) hex += b.toString(16).padStart(2, "0");
    return hex;
}

describe("StorageClient (IPFS pin-proxy)", () => {
    let km: IKeyManager;
    let fetchMock: ReturnType<typeof vi.fn>;
    let client: StorageClient;

    beforeEach(() => {
        km = createMockKeyManager();
        fetchMock = vi.fn();
        client = new StorageClient(km, {
            pinUrl: "http://indexer.test/storage/pin",
            gatewayUrl: "http://indexer.test/",
            fetchImpl: fetchMock as unknown as typeof fetch,
        });
    });

    afterEach(() => vi.clearAllMocks());

    describe("putEncrypted", () => {
        it("encrypts, POSTs to the pin endpoint, and returns the CID's bytes32 digest", async () => {
            const value = new TextEncoder().encode("secret");
            const pinned = serialize(NONCE, value); // passthrough cipher
            const cid = await cidForBytes(pinned);
            fetchMock.mockResolvedValue(
                new Response(JSON.stringify({ cid }), {
                    headers: { "content-type": "application/json" },
                }),
            );

            const contentHash = await client.putEncrypted(value, encKey);

            expect(km.encrypt).toHaveBeenCalledWith(encKey, value);
            const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
            expect(url).toBe("http://indexer.test/storage/pin");
            expect(init.method).toBe("POST");
            // contentHash is exactly the sha2-256 digest the proxy hashed into the CID.
            expect(contentHash).toBe(`0x${await digestHex(pinned)}`);
        });

        it("throws a StorageError when the proxy rejects the upload", async () => {
            fetchMock.mockResolvedValue(new Response("payload too large", { status: 413 }));
            await expect(
                client.putEncrypted(new TextEncoder().encode("x"), encKey),
            ).rejects.toThrow(/413/);
        });

        it("throws when the proxy returns no CID", async () => {
            fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "boom" })));
            await expect(
                client.putEncrypted(new TextEncoder().encode("x"), encKey),
            ).rejects.toThrow(/no CID/);
        });
    });

    describe("getDecrypted", () => {
        it("reconstructs the CID, fetches from the gateway, and decrypts", async () => {
            const plaintext = new TextEncoder().encode("hello");
            const stored = serialize(NONCE, plaintext);
            const cid = await cidForBytes(stored);
            const contentHash = `0x${await digestHex(stored)}` as `0x${string}`;

            const ab = new ArrayBuffer(stored.byteLength);
            new Uint8Array(ab).set(stored);
            fetchMock.mockResolvedValue(new Response(ab));

            const out = await client.getDecrypted(contentHash, encKey);

            const [url] = fetchMock.mock.calls[0] as [string];
            // Gateway URL is normalized (trailing slash stripped) + /ipfs/<reconstructed cid>.
            expect(url).toBe(`http://indexer.test/ipfs/${cid}`);
            expect(km.decrypt).toHaveBeenCalled();
            expect(out).toEqual(plaintext);
        });

        it("throws a StorageError when the gateway 404s", async () => {
            const contentHash = `0x${"ab".repeat(32)}` as `0x${string}`;
            fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
            await expect(client.getDecrypted(contentHash, encKey)).rejects.toThrow(/404/);
        });
    });
});
