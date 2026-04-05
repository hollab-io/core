import type { OrgMember } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { OrgMember };

/**
 * Fetches on-chain org members from the indexer for a given circleRegistry address.
 * Returns wallet-level records (no names/avatars — those come from localStorage enrichment).
 */
export function useOrgMembersFromIndexer(registryAddress: string | undefined) {
    const queryClient = useQueryClient();

    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ["orgMembers", registryAddress],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !registryAddress) return [];
            const result = await client.listOrgMembers(registryAddress);
            return result.items;
        },
        enabled: Boolean(registryAddress),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["orgMembers", registryAddress] });
    }, [queryClient, registryAddress]);

    return { members, loading, refetch };
}
