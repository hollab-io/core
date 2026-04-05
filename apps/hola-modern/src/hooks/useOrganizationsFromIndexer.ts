import type { Organization } from "@hollab-io/indexing-client";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

const indexerUrl = import.meta.env.VITE_INDEXER_URL as string;
const client = indexerUrl ? createIndexingClient(indexerUrl) : null;

export type { Organization };

export function useOrganizationsFromIndexer(creatorAddress: string | null) {
    const queryClient = useQueryClient();

    const { data: organizations = [], isLoading: loading } = useQuery({
        queryKey: ["organizations", creatorAddress],
        queryFn: async () => {
            if (!client || !creatorAddress) return [];
            const result = await client.listOrganizationsByCreator(creatorAddress);
            return result.items;
        },
        enabled: Boolean(client && creatorAddress),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["organizations", creatorAddress] });
    }, [queryClient, creatorAddress]);

    /**
     * Poll every `intervalMs` until `predicate` returns true or `timeoutMs` elapses.
     * Resolves with the first matching org list that satisfies the predicate.
     */
    const pollUntil = useCallback(
        (
            predicate: (orgs: Organization[]) => boolean,
            intervalMs = 2000,
            timeoutMs = 60_000,
        ): Promise<Organization[]> => {
            return new Promise((resolve, reject) => {
                if (!client || !creatorAddress) {
                    reject(new Error("Indexer not configured"));
                    return;
                }

                const deadline = Date.now() + timeoutMs;

                const tick = async () => {
                    try {
                        const result = await client.listOrganizationsByCreator(creatorAddress);
                        const items = result.items;
                        queryClient.setQueryData(["organizations", creatorAddress], items);
                        if (predicate(items)) {
                            resolve(items);
                            return;
                        }
                    } catch {
                        // keep polling on transient errors
                    }

                    if (Date.now() >= deadline) {
                        reject(new Error("Timed out waiting for indexer"));
                        return;
                    }

                    setTimeout(tick, intervalMs);
                };

                void tick();
            });
        },
        [creatorAddress, queryClient],
    );

    return { organizations, loading, refetch, pollUntil };
}

/** Stable singleton ref so other hooks can share the client. */
export function getIndexingClient() {
    return client;
}
