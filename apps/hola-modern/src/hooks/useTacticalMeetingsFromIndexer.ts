import type {
    MeetingComponentSet,
    MeetingOutput,
    TacticalMeeting,
} from "@hollab-io/indexing-client";
import { useCallback, useEffect, useState } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { TacticalMeeting, MeetingOutput };

export function useTacticalMeetingsFromIndexer(orgId: string | null) {
    const [components, setComponents] = useState<MeetingComponentSet | null>(null);
    const [meetings, setMeetings] = useState<TacticalMeeting[]>([]);
    const [outputs, setOutputs] = useState<MeetingOutput[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
        const client = getIndexingClient();
        if (!client || !orgId) {
            setComponents(null);
            setMeetings([]);
            setOutputs([]);
            return;
        }

        setLoading(true);
        try {
            const componentsResult = await client.listMeetingComponentsByOrg(orgId);
            const comp = componentsResult.items[0] ?? null;
            setComponents(comp);

            if (comp?.tacticalMeeting) {
                const [meetingsResult, outputsResult] = await Promise.all([
                    client.listTacticalMeetingsByContract(comp.tacticalMeeting),
                    client.listMeetingOutputsByContract(comp.tacticalMeeting),
                ]);
                setMeetings(meetingsResult.items);
                setOutputs(outputsResult.items);
            }
        } catch {
            // indexer unreachable
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        void fetch();
    }, [fetch]);

    const pollForNewMeeting = useCallback(
        (prevCount: number, timeoutMs = 60_000): Promise<TacticalMeeting[]> => {
            const client = getIndexingClient();
            return new Promise((resolve, reject) => {
                if (!client || !components?.tacticalMeeting) {
                    reject(new Error("Indexer not configured"));
                    return;
                }
                const deadline = Date.now() + timeoutMs;
                const contractAddr = components.tacticalMeeting;

                const tick = async () => {
                    try {
                        const result = await client.listTacticalMeetingsByContract(contractAddr);
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
                        reject(new Error("Timed out waiting for meeting to appear in indexer"));
                        return;
                    }
                    setTimeout(tick, 2000);
                };

                void tick();
            });
        },
        [components],
    );

    const fetchOutputs = useCallback(
        async (meetingId: string): Promise<MeetingOutput[]> => {
            const client = getIndexingClient();
            if (!client || !components?.tacticalMeeting) return [];
            try {
                const result = await client.listMeetingOutputs(
                    components.tacticalMeeting,
                    meetingId,
                );
                return result.items;
            } catch {
                return [];
            }
        },
        [components],
    );

    return {
        tacticalMeetingAddress: components?.tacticalMeeting as `0x${string}` | undefined,
        governanceMeetingAddress: components?.governanceMeeting as `0x${string}` | undefined,
        actionVotingAddress: components?.actionVoting as `0x${string}` | undefined,
        meetings,
        outputs,
        loading,
        refetch: fetch,
        pollForNewMeeting,
        fetchOutputs,
    };
}
