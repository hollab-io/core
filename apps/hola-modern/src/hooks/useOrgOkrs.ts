/**
 * useOrgOkrs — aggregate all OKR objectives for an org in a given quarter.
 *
 * Queries the indexer for every content ref across the org's RoleRegistry
 * matching fieldName = keccak256("okr:{quarter}"), then fetches + decrypts
 * each 0G blob to produce a flat list of `OkrObjective` with their owning role.
 */
import type { OkrObjective } from "@hollab-io/hollab-sdk";
import type { ContentRef } from "@hollab-io/indexing-client";
import type { Address } from "viem";
import { useQuery } from "@tanstack/react-query";

import type { DataVisibilityValue } from "./useContentRef";
import { DataVisibility } from "./useContentRef";
import { useEncryptedStorage } from "./useEncryptedStorage";
import { okrFieldNameHash } from "./useOkrObjectives";
import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type OkrsByRole = {
    roleId: bigint;
    objectives: OkrObjective[];
};

export function useOrgOkrs(params: {
    roleRegistryAddress: Address | undefined;
    orgId: bigint | undefined;
    circleId: bigint | undefined;
    quarter: string;
}) {
    const { roleRegistryAddress, orgId, circleId, quarter } = params;
    const { fetchAndDecrypt } = useEncryptedStorage();

    return useQuery<OkrsByRole[]>({
        queryKey: ["orgOkrs", roleRegistryAddress, quarter],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !roleRegistryAddress || orgId === undefined) return [];

            const fieldHash = okrFieldNameHash(quarter);
            const refs: ContentRef[] = (
                await client.listContentRefsByField(roleRegistryAddress, fieldHash)
            ).items;

            const results = await Promise.all(
                refs.map(async (ref): Promise<OkrsByRole | null> => {
                    const visibility = ref.visibility as DataVisibilityValue;
                    try {
                        const text = await fetchAndDecrypt({
                            rootHash: ref.contentHash,
                            visibility: visibility ?? DataVisibility.Public,
                            orgId,
                            circleId: circleId ?? BigInt(0),
                            roleId: BigInt(ref.entityId),
                        });
                        const objectives = JSON.parse(text) as OkrObjective[];
                        return { roleId: BigInt(ref.entityId), objectives };
                    } catch {
                        return null;
                    }
                }),
            );

            return results.filter((r): r is OkrsByRole => r !== null);
        },
        enabled: Boolean(roleRegistryAddress) && orgId !== undefined,
    });
}

/** "Q{1..4}-YYYY" for any Date. */
export function quarterFromDate(d: Date): string {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q}-${d.getFullYear()}`;
}
