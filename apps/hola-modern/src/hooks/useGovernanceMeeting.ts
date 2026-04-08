import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { useCallback } from "react";

import { useSendTransaction } from "./useSendTransaction";

/** IMeetingFactory.MeetingKind.Governance */
const MEETING_KIND_GOVERNANCE = 1;

export function useGovernanceMeeting() {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();

    const account = () => (primaryWallet?.address ?? "0x") as `0x${string}`;

    const conveneMeeting = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            circleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "startMeeting",
                        args: [params.circleId, MEETING_KIND_GOVERNANCE],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, primaryWallet],
    );

    const completeMeeting = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            meetingId: bigint;
            circleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "endMeeting",
                        args: [params.meetingId, params.circleId, MEETING_KIND_GOVERNANCE],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, primaryWallet],
    );

    const linkProposal = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            meetingId: bigint;
            circleId: bigint;
            proposalId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "linkProposal",
                        args: [params.meetingId, params.circleId, params.proposalId],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, primaryWallet],
    );

    return { conveneMeeting, completeMeeting, linkProposal };
}
