import type { GovernanceMeeting, GovernanceMeetingLink } from "@hollab-io/indexing-client";
import { useCallback, useEffect, useState } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { GovernanceMeeting, GovernanceMeetingLink };

export function useGovernanceMeetingsFromIndexer(
    governanceMeetingAddress: `0x${string}` | undefined,
) {
    const [meetings, setMeetings] = useState<GovernanceMeeting[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        const client = getIndexingClient();
        if (!client || !governanceMeetingAddress) {
            setMeetings([]);
            return;
        }

        setLoading(true);
        try {
            const result = await client.listGovernanceMeetingsByContract(governanceMeetingAddress);
            setMeetings(result.items);
        } catch {
            // indexer unreachable
        } finally {
            setLoading(false);
        }
    }, [governanceMeetingAddress]);

    useEffect(() => {
        void fetch();
    }, [fetch]);

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
                        setMeetings(items);
                        if (items.length > prevCount) {
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
        [governanceMeetingAddress],
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
        refetch: fetch,
        pollForNewMeeting,
        fetchMeetingLinks,
    };
}
