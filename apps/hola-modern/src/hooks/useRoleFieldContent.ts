/**
 * useRoleFieldContent — read a role field's content from IPFS via on-chain ContentRef.
 *
 * 1. Reads ContentRef from RoleRegistry (on-chain)
 * 2. If zero hash → returns undefined (backward compat with non-Refs roles)
 * 3. Downloads from IPFS + decrypts based on visibility tier
 *
 * For encrypted fields, returns { needsUnlock: true } when keys are not yet
 * derived, so the UI can show a lock icon + "Unlock to view" button.
 */
import type { Address } from "viem";
import { useQuery } from "@tanstack/react-query";

import { DataVisibility, useReadContentRef } from "./useContentRef";
import { useEncryptedStorage } from "./useEncryptedStorage";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function useRoleFieldContent(params: {
    roleRegistryAddress: Address | undefined;
    roleId: bigint | undefined;
    fieldName: string | undefined;
    orgId: bigint;
    circleId: bigint;
    roleId_forKey?: bigint;
}) {
    const { fetchAndDecrypt, isKeyUnlocked } = useEncryptedStorage();

    const {
        data: contentRef,
        isLoading: isRefLoading,
        error: refError,
    } = useReadContentRef(params.roleRegistryAddress, params.roleId, params.fieldName);

    const hasContent = !!contentRef && contentRef.contentHash !== ZERO_HASH;
    const isEncrypted = hasContent && contentRef.visibility !== DataVisibility.Public;
    const needsUnlock = isEncrypted && !isKeyUnlocked;

    const {
        data,
        isLoading: isContentLoading,
        error: contentError,
    } = useQuery({
        queryKey: [
            "roleFieldContent",
            contentRef?.contentHash,
            contentRef?.visibility,
            isKeyUnlocked,
        ],
        queryFn: async () => {
            if (!contentRef || contentRef.contentHash === ZERO_HASH) return undefined;

            return fetchAndDecrypt({
                contentHash: contentRef.contentHash as `0x${string}`,
                visibility: contentRef.visibility as 0 | 1 | 2,
                orgId: params.orgId,
                circleId: params.circleId,
                roleId: params.roleId_forKey,
            });
        },
        enabled: hasContent && !needsUnlock,
    });

    return {
        data,
        isLoading: isRefLoading || isContentLoading,
        error: refError ?? contentError ?? null,
        needsUnlock,
        hasContent,
    };
}
