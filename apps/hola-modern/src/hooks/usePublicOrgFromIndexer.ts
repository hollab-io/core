import type { Organization } from "@hollab-io/indexing-client";
import { useQuery } from "@tanstack/react-query";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Organization };

export function usePublicOrgFromIndexer(orgId: string | null) {
    return useQuery({
        queryKey: ["publicOrg", orgId],
        queryFn: async (): Promise<Organization | null> => {
            const client = getIndexingClient();
            if (!client || !orgId) return null;
            return (await client.getOrganization(orgId)) ?? null;
        },
        enabled: Boolean(orgId),
    });
}
