import type { OrgMember } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { OrgMember };

/**
 * Fetches on-chain org members from the indexer (OrganizationFactory + orgId scope).
 */
export function useOrgMembersFromIndexer(
    orgFactoryAddress: string | undefined,
    orgId: string | undefined,
) {
    const queryClient = useQueryClient();

    const { data: members = [], isLoading: loading } = useQuery({
        queryKey: ["orgMembers", orgFactoryAddress, orgId],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !orgFactoryAddress || !orgId) return [];
            const result = await client.listOrgMembersByOrg(orgFactoryAddress, orgId);
            return result.items;
        },
        enabled: Boolean(orgFactoryAddress && orgId),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({
            queryKey: ["orgMembers", orgFactoryAddress, orgId],
        });
    }, [queryClient, orgFactoryAddress, orgId]);

    return { members, loading, refetch };
}
