import type { Organization } from "@hollab-io/indexing-client";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { DEFAULT_CHAIN_ID, getChainConfig } from "../config/chains";
import { useChain } from "../context/ChainContext";

export type { Organization };

// ── Per-chain client cache ───────────────────────────────────────────────────
const clientCache = new Map<number, ReturnType<typeof createIndexingClient>>();

function getOrCreateClient(chainId: number) {
    let client = clientCache.get(chainId);
    if (client) return client;

    const url = getChainConfig(chainId).indexerUrl;
    if (!url) return null;

    client = createIndexingClient(url);
    clientCache.set(chainId, client);
    return client;
}

export function useOrganizationsFromIndexer(creatorAddress: string | null) {
    const queryClient = useQueryClient();
    const { activeChainId } = useChain();
    const client = getOrCreateClient(activeChainId);

    const { data: organizations = [], isLoading: loading } = useQuery({
        queryKey: ["organizations", creatorAddress, activeChainId],
        queryFn: async () => {
            if (!client || !creatorAddress) return [];
            const result = await client.listOrganizationsByCreator(creatorAddress);
            return result.items;
        },
        enabled: Boolean(client && creatorAddress),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({
            queryKey: ["organizations", creatorAddress, activeChainId],
        });
    }, [queryClient, creatorAddress, activeChainId]);

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
                        queryClient.setQueryData(
                            ["organizations", creatorAddress, activeChainId],
                            items,
                        );
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
        [creatorAddress, queryClient, client, activeChainId],
    );

    return { organizations, loading, refetch, pollUntil };
}

/** Stable singleton ref so other hooks can share the client for the active chain. */
export function getIndexingClient() {
    // For non-React callers, read from the default chain.
    // React hooks should use useChain() + getOrCreateClient() instead.
    const stored =
        typeof localStorage !== "undefined" ? localStorage.getItem("hollab:activeChainId") : null;
    const chainId = stored ? Number(stored) : DEFAULT_CHAIN_ID;
    return getOrCreateClient(chainId);
}
