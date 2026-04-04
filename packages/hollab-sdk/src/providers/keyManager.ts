import type { WalletClient } from "viem";
import { keccak256, toBytes } from "viem";

import type { IKeyManager } from "../interfaces/keyManager.interface.js";
import type { EncryptedPayload, KeyShare } from "../internal.js";
import {
    KEY_INFO,
    MASTER_KEY_MESSAGE_PREFIX,
    SHARED_SECRET_MESSAGE_PREFIX,
} from "../constants/index.js";
import { aesDecrypt, aesEncrypt } from "../lib/crypto/aes.js";
import { deriveKey } from "../lib/crypto/hkdf.js";
import {
    createKeyShare as createShare,
    decryptKeyShare as decryptShare,
} from "../lib/crypto/keyshare.js";

export class KeyManager implements IKeyManager {
    /** @inheritdoc */
    async deriveMasterKey(wallet: WalletClient, orgId: bigint): Promise<Uint8Array> {
        const account = wallet.account;
        if (!account) {
            throw new Error("Wallet must have an account");
        }

        const message = `${MASTER_KEY_MESSAGE_PREFIX}${orgId}`;
        const signature = await wallet.signMessage({ account, message });
        const hash = keccak256(toBytes(signature));
        return toBytes(hash);
    }

    /** @inheritdoc */
    deriveOrgKey(masterKey: Uint8Array, orgId: bigint): Uint8Array {
        return deriveKey(masterKey, orgId, KEY_INFO.ORG);
    }

    /** @inheritdoc */
    deriveCircleKey(masterKey: Uint8Array, circleId: bigint): Uint8Array {
        return deriveKey(masterKey, circleId, KEY_INFO.CIRCLE);
    }

    /** @inheritdoc */
    deriveRoleKey(circleKey: Uint8Array, roleId: bigint): Uint8Array {
        return deriveKey(circleKey, roleId, KEY_INFO.ROLE);
    }

    /** @inheritdoc */
    encrypt(key: Uint8Array, plaintext: Uint8Array): EncryptedPayload {
        return aesEncrypt(key, plaintext);
    }

    /** @inheritdoc */
    decrypt(key: Uint8Array, payload: EncryptedPayload): Uint8Array {
        return aesDecrypt(key, payload);
    }

    /** @inheritdoc */
    createKeyShare(key: Uint8Array, sharedSecret: Uint8Array): KeyShare {
        return createShare(key, sharedSecret);
    }

    /** @inheritdoc */
    decryptKeyShare(share: KeyShare, sharedSecret: Uint8Array): Uint8Array {
        return decryptShare(share, sharedSecret);
    }

    /** @inheritdoc */
    async deriveSharedSecret(
        wallet: WalletClient,
        orgId: bigint,
        counterpartyAddress: `0x${string}`,
    ): Promise<Uint8Array> {
        const account = wallet.account;
        if (!account) {
            throw new Error("Wallet must have an account");
        }

        const message = `${SHARED_SECRET_MESSAGE_PREFIX}${orgId}:${counterpartyAddress.toLowerCase()}`;
        const signature = await wallet.signMessage({ account, message });
        const hash = keccak256(toBytes(signature));
        return toBytes(hash);
    }
}
