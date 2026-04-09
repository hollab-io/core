import type { TacticalMeeting } from "@hollab-io/indexing-client";
import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createPublicClient, decodeEventLog, http } from "viem";
import { useAccount } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

/** Maps to HolacracyTypes.OutputType enum on-chain */
export const OutputType = {
    NextAction: 0,
    Project: 1,
    Request: 2,
    Information: 3,
} as const;

export type OutputTypeValue = (typeof OutputType)[keyof typeof OutputType];

/** IMeetingFactory.MeetingKind.Tactical */
const MEETING_KIND_TACTICAL = 0;

export type ConveneMeetingParams = {
    tacticalMeetingAddress: `0x${string}`;
    orgId: bigint;
    walletAddress: `0x${string}`;
};

export type ConveneMeetingResult = {
    txHash: `0x${string}`;
    meeting: TacticalMeeting;
};

export function useConveneTacticalMeeting() {
    const { send } = useSendTransaction();
    const { chainConfig } = useChain();
    const queryClient = useQueryClient();

    return useMutation<ConveneMeetingResult, Error, ConveneMeetingParams>({
        mutationFn: async (params) => {
            // 1. Send startMeeting tx
            const txHash = await send(
                [
                    {
                        to: params.tacticalMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "startMeeting",
                        args: [params.orgId, MEETING_KIND_TACTICAL],
                    },
                ],
                params.walletAddress,
            );

            // 2. Wait for receipt
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            // 3. Parse MeetingStarted event
            let meetingId: bigint | null = null;
            let startedBy: `0x${string}` = "0x0000000000000000000000000000000000000000";
            let timestamp: bigint = BigInt(Math.floor(Date.now() / 1000));

            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: meetingFactoryAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "MeetingStarted") {
                        const args = decoded.args as {
                            _meetingId: bigint;
                            _orgId: bigint;
                            _kind: number;
                            _startedBy: `0x${string}`;
                            _timestamp: bigint;
                        };
                        meetingId = args._meetingId;
                        startedBy = args._startedBy;
                        timestamp = args._timestamp;
                        break;
                    }
                } catch {
                    // not our event
                }
            }

            if (meetingId === null) {
                throw new Error("Meeting started but could not find MeetingStarted event");
            }

            const contractAddr = params.tacticalMeetingAddress.toLowerCase() as `0x${string}`;
            const meeting: TacticalMeeting = {
                id: `${contractAddr}-${meetingId}`,
                meetingId: meetingId.toString(),
                contractAddress: contractAddr,
                circleId: "0",
                orgId: params.orgId.toString(),
                convenedBy: startedBy,
                createdAt: timestamp.toString(),
                completedAt: null,
                txHash,
            };

            return { txHash, meeting };
        },

        onSuccess: ({ meeting }, params) => {
            const orgId = params.orgId.toString();
            // Inject the new meeting into the tactical meetings cache
            queryClient.setQueryData(
                ["tacticalMeetings", orgId],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (old: any) => {
                    if (!old) return old;
                    return {
                        ...old,
                        meetings: [meeting, ...old.meetings],
                    };
                },
            );
        },
    });
}

/** Low-level hooks for completing meetings and recording outputs (used in batch flows) */
export function useTacticalMeeting() {
    const { address } = useAccount();
    const { send } = useSendTransaction();

    const account = () => (address ?? "0x") as `0x${string}`;

    const completeMeeting = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            meetingId: bigint;
            orgId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.tacticalMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "endMeeting",
                        args: [params.meetingId, params.orgId, MEETING_KIND_TACTICAL],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, address],
    );

    const recordOutput = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            meetingId: bigint;
            orgId: bigint;
            outputType: OutputTypeValue;
            description: string;
            assignedTo: `0x${string}`;
            roleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.tacticalMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "recordOutput",
                        args: [
                            params.meetingId,
                            params.orgId,
                            params.outputType,
                            params.description,
                            params.assignedTo,
                            params.roleId,
                        ],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, address],
    );

    return { completeMeeting, recordOutput };
}
