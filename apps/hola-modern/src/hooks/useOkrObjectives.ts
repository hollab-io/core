/**
 * useOkrObjectives — reads the aggregate OKR blob for a (role, quarter) pair.
 *
 * Flow: read contentRef on-chain for fieldName = keccak256("okr:{quarter}") →
 *       download 0G blob by rootHash → decrypt with the role key →
 *       parse JSON into OkrObjective[].
 *
 * Writes go through governance via useCreateOkrObjective (AmendRoleWithRefs
 * proposal), not directly — OKRs are a constitutional commitment.
 */
import type { OkrObjective } from "@hollab-io/hollab-sdk";
import type { Address } from "viem";
import { useQuery } from "@tanstack/react-query";

import type { DataVisibilityValue } from "./useContentRef";
import { DataVisibility, fieldNameHash, useReadContentRef } from "./useContentRef";
import { useEncryptedStorage } from "./useEncryptedStorage";

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export function okrFieldName(quarter: string): string {
    return `okr:${quarter}`;
}

export function okrFieldNameHash(quarter: string): `0x${string}` {
    return fieldNameHash(okrFieldName(quarter));
}

export function useOkrObjectives(params: {
    roleRegistryAddress: Address | undefined;
    orgId: bigint | undefined;
    circleId: bigint | undefined;
    roleId: bigint | undefined;
    quarter: string;
}) {
    const { roleRegistryAddress, orgId, circleId, roleId, quarter } = params;
    const { fetchAndDecrypt } = useEncryptedStorage();

    const { data: contentRef, isLoading: refLoading } = useReadContentRef(
        roleRegistryAddress,
        roleId,
        okrFieldName(quarter),
    );

    return useQuery<OkrObjective[]>({
        queryKey: [
            "okrs",
            roleRegistryAddress,
            roleId?.toString(),
            quarter,
            contentRef?.contentHash,
        ],
        queryFn: async () => {
            if (
                !contentRef ||
                contentRef.contentHash === ZERO_HASH ||
                orgId === undefined ||
                circleId === undefined ||
                roleId === undefined
            ) {
                return [];
            }
            const visibility = contentRef.visibility as DataVisibilityValue;
            const text = await fetchAndDecrypt({
                rootHash: contentRef.contentHash,
                visibility: visibility ?? DataVisibility.Public,
                orgId,
                circleId,
                roleId,
            });
            try {
                return JSON.parse(text) as OkrObjective[];
            } catch {
                return [];
            }
        },
        enabled:
            Boolean(roleRegistryAddress) &&
            orgId !== undefined &&
            circleId !== undefined &&
            roleId !== undefined &&
            !refLoading &&
            Boolean(contentRef) &&
            contentRef?.contentHash !== ZERO_HASH,
    });
}
