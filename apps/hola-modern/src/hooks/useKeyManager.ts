/**
 * useKeyManager — wallet-backed encryption key derivation.
 *
 * Bridges the hollab-sdk KeyManager (which takes a viem WalletClient) with
 * wagmi's useWalletClient. Caches the derived master key in a ref so the
 * wallet signature prompt fires only once per session.
 */
import { KeyManager } from "@hollab-io/hollab-sdk";
import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";

import type { DataVisibilityValue } from "./useContentRef";
import { DataVisibility } from "./useContentRef";

const km = new KeyManager();

// Module-level key cache — survives re-renders without useRef (avoids
// the "cannot access refs during render" lint rule).
let cachedMasterKey: Uint8Array | null = null;

export type GetEncryptionKeyParams = {
    visibility: DataVisibilityValue;
    orgId: bigint;
    circleId: bigint;
    roleId?: bigint;
};

export function useKeyManager() {
    const { data: walletClient } = useWalletClient();
    const [unlocked, setUnlocked] = useState(!!cachedMasterKey);
    const [error, setError] = useState<string | null>(null);

    // Derive isUnlocked: cached key exists AND wallet is still connected
    const isUnlocked = unlocked && !!walletClient;

    const unlock = useCallback(
        async (orgId: bigint) => {
            if (cachedMasterKey) return;
            if (!walletClient) {
                throw new Error("Connect a wallet before unlocking encryption keys");
            }
            setError(null);
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                cachedMasterKey = await km.deriveMasterKey(walletClient as any, orgId);
                setUnlocked(true);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                setError(msg);
                throw err;
            }
        },
        [walletClient],
    );

    const lock = useCallback(() => {
        cachedMasterKey = null;
        setUnlocked(false);
        setError(null);
    }, []);

    const getEncryptionKey = useCallback((params: GetEncryptionKeyParams): Uint8Array | null => {
        if (params.visibility === DataVisibility.Public) return null;

        if (!cachedMasterKey) {
            throw new Error("Encryption keys not unlocked. Call unlock() first.");
        }

        const orgKey = km.deriveOrgKey(cachedMasterKey, params.orgId);

        if (params.visibility === DataVisibility.OrgEncrypted) {
            return orgKey;
        }

        if (params.roleId === undefined) {
            throw new Error("roleId is required for RoleEncrypted visibility");
        }
        const circleKey = km.deriveCircleKey(orgKey, params.circleId);
        return km.deriveRoleKey(circleKey, params.roleId);
    }, []);

    return { isUnlocked, unlock, getEncryptionKey, lock, error };
}
