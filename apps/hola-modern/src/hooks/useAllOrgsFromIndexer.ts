import type { Organization } from "@hollab-io/indexing-client";
import { useQuery } from "@tanstack/react-query";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Organization };

/**
 * Wallet-less org directory fetch. Goes through the indexer only — no RPC —
 * so it is safe to mount on public routes.
 */
export function useAllOrgsFromIndexer() {
    return useQuery({
        queryKey: ["publicAllOrgs"],
        queryFn: async (): Promise<Organization[]> => {
            const client = getIndexingClient();
            if (!client) return [];
            const result = await client.listOrganizations({ limit: 100 });
            return result.items;
        },
    });
}
