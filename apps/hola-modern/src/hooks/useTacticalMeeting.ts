import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { useCallback } from "react";

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

export function useTacticalMeeting() {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();

    const account = () => (primaryWallet?.address ?? "0x") as `0x${string}`;

    const conveneMeeting = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            circleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.tacticalMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "startMeeting",
                        args: [params.circleId, MEETING_KIND_TACTICAL],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, primaryWallet],
    );

    const completeMeeting = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            meetingId: bigint;
            circleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.tacticalMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "endMeeting",
                        args: [params.meetingId, params.circleId, MEETING_KIND_TACTICAL],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, primaryWallet],
    );

    const recordOutput = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            meetingId: bigint;
            circleId: bigint;
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
                            params.circleId,
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
        [send, primaryWallet],
    );

    return { conveneMeeting, completeMeeting, recordOutput };
}
