import type { Circle } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Circle };

/**
 * Fetches on-chain circles from the indexer for a given organization.
 */
export function useCirclesFromIndexer(orgId: string | null) {
    const queryClient = useQueryClient();

    const { data: circles = [], isLoading: loading } = useQuery({
        queryKey: ["circles", orgId],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !orgId) return [];
            const result = await client.listCirclesByOrg(orgId);
            return result.items;
        },
        enabled: Boolean(orgId),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["circles", orgId] });
    }, [queryClient, orgId]);

    return { circles, loading, refetch };
}
