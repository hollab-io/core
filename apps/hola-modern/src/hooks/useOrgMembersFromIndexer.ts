import type { OrgMember } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { OrgMember };

/**
 * Fetches on-chain org members from the indexer scoped to the per-org
 * OrganizationInstance clone (the authoritative membership registry).
 */
export function useOrgMembersFromIndexer(
    instanceAddress: string | undefined,
    orgId: string | undefined,
) {
    const queryClient = useQueryClient();

    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ["orgMembers", instanceAddress, orgId],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !instanceAddress || !orgId) return [];
            const result = await client.listOrgMembersByOrg(instanceAddress, orgId);
            return result.items;
        },
        enabled: Boolean(instanceAddress && orgId),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({
            queryKey: ["orgMembers", instanceAddress, orgId],
        });
    }, [queryClient, instanceAddress, orgId]);

    return { members, loading, refetch };
}
