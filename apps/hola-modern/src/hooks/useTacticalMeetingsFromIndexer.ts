import type {
    MeetingComponentSet,
    MeetingOutput,
    TacticalMeeting,
} from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { TacticalMeeting, MeetingOutput };

type TacticalData = {
    components: MeetingComponentSet | null;
    meetings: TacticalMeeting[];
    outputs: MeetingOutput[];
};

export function useTacticalMeetingsFromIndexer(orgId: string | null) {
    const queryClient = useQueryClient();

    const { data, isLoading: loading } = useQuery<TacticalData>({
        queryKey: ["tacticalMeetings", orgId],
        queryFn: async (): Promise<TacticalData> => {
            const client = getIndexingClient();
            if (!client || !orgId) return { components: null, meetings: [], outputs: [] };

            const componentsResult = await client.listMeetingComponentsByOrg(orgId);
            const comp = componentsResult.items[0] ?? null;

            if (!comp?.meetingFactory) {
                return { components: comp, meetings: [], outputs: [] };
            }

            const [meetingsResult, outputsResult] = await Promise.all([
                client.listTacticalMeetingsByContract(comp.meetingFactory),
                client.listMeetingOutputsByContract(comp.meetingFactory),
            ]);

            return {
                components: comp,
                meetings: meetingsResult.items,
                outputs: outputsResult.items,
            };
        },
        enabled: Boolean(orgId),
    });

    const components = data?.components ?? null;
    const meetings = data?.meetings ?? [];
    const outputs = data?.outputs ?? [];

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["tacticalMeetings", orgId] });
    }, [queryClient, orgId]);

    const pollForNewMeeting = useCallback(
        (prevCount: number, timeoutMs = 60_000): Promise<TacticalMeeting[]> => {
            const client = getIndexingClient();
            return new Promise((resolve, reject) => {
                if (!client || !components?.meetingFactory) {
                    reject(new Error("Indexer not configured"));
                    return;
                }
                const deadline = Date.now() + timeoutMs;
                const contractAddr = components.meetingFactory;

                const tick = async () => {
                    try {
                        const result = await client.listTacticalMeetingsByContract(contractAddr);
                        const items = result.items;
                        if (items.length > prevCount) {
                            // Update the cache with new data
                            queryClient.setQueryData<TacticalData>(
                                ["tacticalMeetings", orgId],
                                (old) => (old ? { ...old, meetings: items } : undefined),
                            );
                            resolve(items);
                            return;
                        }
                    } catch {
                        // keep polling
                    }
                    if (Date.now() >= deadline) {
                        reject(new Error("Timed out waiting for meeting to appear in indexer"));
                        return;
                    }
                    setTimeout(tick, 2000);
                };

                void tick();
            });
        },
        [components, orgId, queryClient],
    );

    const fetchOutputs = useCallback(
        async (meetingId: string): Promise<MeetingOutput[]> => {
            const client = getIndexingClient();
            if (!client || !components?.meetingFactory) return [];
            try {
                const result = await client.listMeetingOutputs(
                    components.meetingFactory,
                    meetingId,
                );
                return result.items;
            } catch {
                return [];
            }
        },
        [components],
    );

    const mf = components?.meetingFactory as `0x${string}` | undefined;
    return {
        tacticalMeetingAddress: mf,
        governanceMeetingAddress: mf,
        actionVotingAddress: components?.actionVoting as `0x${string}` | undefined,
        roleDataRegistryAddress: components?.roleDataRegistry as `0x${string}` | undefined,
        meetings,
        outputs,
        loading,
        refetch,
        pollForNewMeeting,
        fetchOutputs,
    };
}
