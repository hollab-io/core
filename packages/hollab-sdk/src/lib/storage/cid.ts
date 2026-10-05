/**
 * CIDv0 ⇄ bytes32 content-hash conversion.
 *
 * The pin-proxy returns a CIDv0; on-chain `ContentRef.contentHash` stores only
 * the 32-byte sha2-256 multihash digest. These helpers move between the two so
 * the SDK and the on-chain layout agree (and match the frontend's
 * useIpfsStorage hook).
 */
import { CID } from "multiformats/cid";
import * as Digest from "multiformats/hashes/digest";

import type { ContentHash } from "../../types/storage.types.js";

const SHA2_256_CODE = 0x12;
const DIGEST_BYTES = 32;

function bytesToHex(bytes: Uint8Array): ContentHash {
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    return `0x${hex}` as ContentHash;
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

/** CIDv0 string → bytes32 sha2-256 digest. */
export function cidToContentHash(cid: string): ContentHash {
    const mh = CID.parse(cid).multihash;
    if (mh.code !== SHA2_256_CODE) {
        throw new Error(`Unexpected multihash code ${mh.code}, want sha2-256 (0x12)`);
    }
    if (mh.digest.length !== DIGEST_BYTES) {
        throw new Error(`Unexpected digest length ${mh.digest.length}, want ${DIGEST_BYTES}`);
    }
    return bytesToHex(mh.digest);
}

/** bytes32 sha2-256 digest → CIDv0 string. */
export function contentHashToCid(contentHash: ContentHash): string {
    const mh = Digest.create(SHA2_256_CODE, hexToBytes(contentHash));
    return CID.createV0(mh).toString();
}
