/** AES-256-CTR encrypted payload with nonce */
export interface EncryptedPayload {
    /** 16-byte random nonce */
    nonce: Uint8Array;
    /** Ciphertext bytes */
    ciphertext: Uint8Array;
}

/** Encrypted key material for sharing keys between participants */
export interface KeyShare {
    /** AES-encrypted key material */
    encryptedKey: Uint8Array;
    /** Nonce used for encryption */
    nonce: Uint8Array;
}
