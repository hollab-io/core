import type { GovernanceMeeting, GovernanceMeetingLink } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { GovernanceMeeting, GovernanceMeetingLink };

export function useGovernanceMeetingsFromIndexer(
    governanceMeetingAddress: `0x${string}` | undefined,
) {
    const queryClient = useQueryClient();

    const { data: meetings = [], isLoading: loading } = useQuery({
        queryKey: ["governanceMeetings", governanceMeetingAddress],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !governanceMeetingAddress) return [];
            const result = await client.listGovernanceMeetingsByContract(governanceMeetingAddress);
            return result.items;
        },
        enabled: Boolean(governanceMeetingAddress),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({
            queryKey: ["governanceMeetings", governanceMeetingAddress],
        });
    }, [queryClient, governanceMeetingAddress]);

    const pollForNewMeeting = useCallback(
        (prevCount: number, timeoutMs = 60_000): Promise<GovernanceMeeting[]> => {
            const client = getIndexingClient();
            return new Promise((resolve, reject) => {
                if (!client || !governanceMeetingAddress) {
                    reject(new Error("Indexer not configured"));
                    return;
                }
                const deadline = Date.now() + timeoutMs;
                const addr = governanceMeetingAddress;

                const tick = async () => {
                    try {
                        const result = await client.listGovernanceMeetingsByContract(addr);
                        const items = result.items;
                        if (items.length > prevCount) {
                            queryClient.setQueryData(
                                ["governanceMeetings", governanceMeetingAddress],
                                items,
                            );
                            resolve(items);
                            return;
                        }
                    } catch {
                        // keep polling
                    }
                    if (Date.now() >= deadline) {
                        reject(new Error("Timed out waiting for governance meeting"));
                        return;
                    }
                    setTimeout(tick, 2000);
                };

                void tick();
            });
        },
        [governanceMeetingAddress, queryClient],
    );

    const fetchMeetingLinks = useCallback(
        async (meetingId: string): Promise<GovernanceMeetingLink[]> => {
            const client = getIndexingClient();
            if (!client || !governanceMeetingAddress) return [];
            try {
                const result = await client.listGovernanceMeetingLinks(
                    governanceMeetingAddress,
                    meetingId,
                );
                return result.items;
            } catch {
                return [];
            }
        },
        [governanceMeetingAddress],
    );

    return {
        meetings,
        loading,
        refetch,
        pollForNewMeeting,
        fetchMeetingLinks,
    };
}
