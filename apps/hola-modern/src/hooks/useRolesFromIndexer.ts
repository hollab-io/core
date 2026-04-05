import type { Role } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Role };

/**
 * Fetches on-chain roles from the indexer for a given organization.
 */
export function useRolesFromIndexer(orgId: string | null) {
    const queryClient = useQueryClient();

    const { data: roles = [], isLoading: loading } = useQuery({
        queryKey: ["roles", orgId],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !orgId) return [];
            const result = await client.listRolesByOrg(orgId);
            return result.items;
        },
        enabled: Boolean(orgId),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["roles", orgId] });
    }, [queryClient, orgId]);

    return { roles, loading, refetch };
}
