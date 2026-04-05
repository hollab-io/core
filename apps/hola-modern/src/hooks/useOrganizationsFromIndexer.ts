import type { Organization } from "@hollab-io/indexing-client";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { useCallback, useEffect, useState } from "react";

const indexerUrl = import.meta.env.VITE_INDEXER_URL as string;
const client = indexerUrl ? createIndexingClient(indexerUrl) : null;
console.log("indexerUrl", indexerUrl);

export type { Organization };

export function useOrganizationsFromIndexer(creatorAddress: string | null) {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        if (!client || !creatorAddress) {
            setOrganizations([]);
            return;
        }
        setLoading(true);
        try {
            const result = await client.listOrganizationsByCreator(creatorAddress);
            setOrganizations(result.items);
        } catch {
            // indexer unreachable — silently keep empty list
        } finally {
            setLoading(false);
        }
    }, [creatorAddress]);

    useEffect(() => {
        void fetch();
    }, [fetch]);

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
                        setOrganizations(items);
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
        [creatorAddress],
    );

    return { organizations, loading, refetch: fetch, pollUntil };
}

/** Stable singleton ref so App.tsx can share one instance. */
export function getIndexingClient() {
    return client;
}
