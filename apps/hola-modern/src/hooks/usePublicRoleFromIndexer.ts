import type { Role } from "@hollab-io/indexing-client";
import { useQuery } from "@tanstack/react-query";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Role };

export function usePublicRoleFromIndexer(roleId: string | null) {
    return useQuery({
        queryKey: ["publicRole", roleId],
        queryFn: async (): Promise<Role | null> => {
            const client = getIndexingClient();
            if (!client || !roleId) return null;
            return (await client.getRole(roleId)) ?? null;
        },
        enabled: Boolean(roleId),
    });
}
