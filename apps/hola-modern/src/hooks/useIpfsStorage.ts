/**
 * useIpfsStorage — browser-side IPFS uploads via a Pinata proxy.
 *
 * Uploads stream raw bytes to the indexer's POST /storage/pin endpoint
 * (which holds the Pinata JWT). The proxy returns a CIDv0; this hook
 * extracts the 32-byte sha2-256 multihash digest as a bytes32 hex string
 * so the on-chain ContentRef.contentHash layout stays unchanged.
 *
 * Reads fetch from VITE_IPFS_GATEWAY by reconstructing the CIDv0 from the
 * on-chain digest.
 */
import { useMutation } from "@tanstack/react-query";
import { CID } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";

import { DEFAULT_CHAIN_ID, getChainConfig } from "../config/chains";

const SHA2_256_CODE = 0x12;
const DIGEST_BYTES = 32;
const PIN_PATH = "/storage/pin";

const DEFAULT_GATEWAY = "https://gateway.pinata.cloud";

export type UploadResult = {
    /** 32-byte sha2-256 digest extracted from the CIDv0, formatted as bytes32. */
    contentHash: `0x${string}`;
};

function activeChainId(): number {
    const stored =
        typeof localStorage !== "undefined" ? localStorage.getItem("hollab:activeChainId") : null;
    return stored ? Number(stored) : DEFAULT_CHAIN_ID;
}

function pinUrl(): string {
    const base = getChainConfig(activeChainId()).indexerUrl;
    if (!base) {
        throw new Error("Indexer URL not configured for the active chain — cannot upload to IPFS");
    }
    return `${base.replace(/\/$/, "")}${PIN_PATH}`;
}

function gatewayBase(): string {
    return (import.meta.env.VITE_IPFS_GATEWAY ?? DEFAULT_GATEWAY).replace(/\/$/, "");
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    return `0x${hex}` as `0x${string}`;
}

function hexToBytes(hex: string): Uint8Array {
    const stripped = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (stripped.length !== DIGEST_BYTES * 2) {
        throw new Error(`Expected ${DIGEST_BYTES}-byte hex, got ${stripped.length / 2} bytes`);
    }
    const out = new Uint8Array(DIGEST_BYTES);
    for (let i = 0; i < DIGEST_BYTES; i++) {
        out[i] = parseInt(stripped.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

function cidToContentHash(cid: string): `0x${string}` {
    const parsed = CID.parse(cid);
    const mh = parsed.multihash;
    if (mh.code !== SHA2_256_CODE) {
        throw new Error(`Unexpected multihash code ${mh.code}, want sha2-256 (0x12)`);
    }
    if (mh.digest.length !== DIGEST_BYTES) {
        throw new Error(`Unexpected digest length ${mh.digest.length}, want ${DIGEST_BYTES}`);
    }
    return bytesToHex(mh.digest);
}

function contentHashToCid(contentHash: `0x${string}`): string {
    const digest = hexToBytes(contentHash);
    const mh = Digest.create(SHA2_256_CODE, digest);
    return CID.createV0(mh).toString();
}

/** Upload raw bytes to IPFS via the indexer pin proxy. */
export async function uploadBytes(data: Uint8Array): Promise<UploadResult> {
    // Copy into a fresh ArrayBuffer so the Blob body type narrows correctly
    // (lib.dom rejects Uint8Array<ArrayBufferLike> as a BlobPart in TS 5.7+).
    const ab = new ArrayBuffer(data.byteLength);
    new Uint8Array(ab).set(data);

    const res = await fetch(pinUrl(), {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: new Blob([ab]),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Pin proxy upload failed (${res.status}): ${detail}`);
    }
    const json = (await res.json()) as { cid?: string; error?: string };
    if (!json.cid) {
        throw new Error(`Pin proxy returned no CID: ${json.error ?? "unknown error"}`);
    }
    return { contentHash: cidToContentHash(json.cid) };
}

/** Download raw bytes from IPFS by the on-chain bytes32 content hash. */
export async function downloadBytes(contentHash: `0x${string}`): Promise<Uint8Array> {
    const cid = contentHashToCid(contentHash);
    const url = `${gatewayBase()}/ipfs/${cid}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`IPFS gateway fetch failed (${res.status}) for ${cid}`);
    }
    return new Uint8Array(await res.arrayBuffer());
}

export function useIpfsStorage() {
    const uploadText = useMutation({
        mutationFn: async (text: string): Promise<UploadResult> => {
            return uploadBytes(new TextEncoder().encode(text));
        },
    });

    const uploadFile = useMutation({
        mutationFn: async (file: File): Promise<UploadResult> => {
            const buffer = await file.arrayBuffer();
            return uploadBytes(new Uint8Array(buffer));
        },
    });

    return { uploadText, uploadFile };
}
