import type { WalletClient } from "viem";

import type { EncryptedPayload, KeyShare } from "../types/crypto.types.js";

/**
 * Hierarchical key management for HolLab organizations.
 * Derives org/circle/role keys via HKDF-SHA256 and provides
 * AES-256-CTR encryption and key sharing.
 */
export interface IKeyManager {
    /**
     * Derives the organization master key from a wallet signature.
     * masterKey = keccak256(wallet.signMessage("hollab:org-key:" + orgId))
     */
    deriveMasterKey(wallet: WalletClient, orgId: bigint): Promise<Uint8Array>;

    /**
     * Derives the org-level encryption key.
     * orgKey = HKDF(ikm: masterKey, salt: orgId, info: "hollab:org")
     */
    deriveOrgKey(masterKey: Uint8Array, orgId: bigint): Uint8Array;

    /**
     * Derives a circle-level encryption key.
     * circleKey = HKDF(ikm: masterKey, salt: circleId, info: "hollab:circle")
     */
    deriveCircleKey(masterKey: Uint8Array, circleId: bigint): Uint8Array;

    /**
     * Derives a role-level encryption key from a circle key.
     * roleKey = HKDF(ikm: circleKey, salt: roleId, info: "hollab:role")
     */
    deriveRoleKey(circleKey: Uint8Array, roleId: bigint): Uint8Array;

    /** Encrypts plaintext with AES-256-CTR using a random nonce. */
    encrypt(key: Uint8Array, plaintext: Uint8Array): EncryptedPayload;

    /** Decrypts an AES-256-CTR encrypted payload. */
    decrypt(key: Uint8Array, payload: EncryptedPayload): Uint8Array;

    /** Creates an encrypted key share for transmitting key material. */
    createKeyShare(key: Uint8Array, sharedSecret: Uint8Array): KeyShare;

    /** Decrypts a key share using the shared secret. */
    decryptKeyShare(share: KeyShare, sharedSecret: Uint8Array): Uint8Array;

    /**
     * Derives a shared secret between two wallets using deterministic signatures.
     * Both parties sign the same message to derive a common secret.
     */
    deriveSharedSecret(
        wallet: WalletClient,
        orgId: bigint,
        counterpartyAddress: `0x${string}`,
    ): Promise<Uint8Array>;
}
