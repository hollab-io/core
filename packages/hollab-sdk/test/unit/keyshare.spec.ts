import { describe, expect, it } from "vitest";

import { createKeyShare, decryptKeyShare } from "../../src/lib/crypto/keyshare.js";

describe("KeyShare", () => {
    const sharedSecret = new Uint8Array(32).fill(0xcc);

    it("roundtrips key material", () => {
        const keyMaterial = new Uint8Array(32).fill(0xdd);
        const share = createKeyShare(keyMaterial, sharedSecret);
        const recovered = decryptKeyShare(share, sharedSecret);
        expect(recovered).toEqual(keyMaterial);
    });

    it("fails with wrong shared secret", () => {
        const keyMaterial = new Uint8Array(32).fill(0xdd);
        const share = createKeyShare(keyMaterial, sharedSecret);

        const wrongSecret = new Uint8Array(32).fill(0xee);
        const recovered = decryptKeyShare(share, wrongSecret);
        expect(recovered).not.toEqual(keyMaterial);
    });

    it("produces encrypted key different from original", () => {
        const keyMaterial = new Uint8Array(32).fill(0xdd);
        const share = createKeyShare(keyMaterial, sharedSecret);
        expect(share.encryptedKey).not.toEqual(keyMaterial);
    });

    it("includes a nonce", () => {
        const keyMaterial = new Uint8Array(32).fill(0xdd);
        const share = createKeyShare(keyMaterial, sharedSecret);
        expect(share.nonce).toHaveLength(16);
    });
});
