import type { Tension, TensionTarget } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Tension, TensionTarget };

/**
 * Fetches open tensions submitted to an organization's tension board.
 * Anyone (including non-members) can submit tensions.
 */
export function useTensionBoard(orgId: string | null) {
    const queryClient = useQueryClient();

    const { data: tensions = [], isLoading: loading } = useQuery({
        queryKey: ["tensions", orgId],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !orgId) return [];
            const result = await client.listOpenTensionsByOrg(orgId);
            return result.items;
        },
        enabled: Boolean(orgId),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["tensions", orgId] });
    }, [queryClient, orgId]);

    return { tensions, loading, refetch };
}
