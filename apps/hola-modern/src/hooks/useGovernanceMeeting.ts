import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { governanceMeetingAbi } from "@hollab-io/viem-extension";
import { useCallback } from "react";

import { useSendTransaction } from "./useSendTransaction";

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
                        abi: governanceMeetingAbi as any,
                        functionName: "conveneMeeting",
                        args: [params.circleId],
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
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: governanceMeetingAbi as any,
                        functionName: "completeMeeting",
                        args: [params.meetingId],
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
            proposalId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: governanceMeetingAbi as any,
                        functionName: "linkProposal",
                        args: [params.meetingId, params.proposalId],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, primaryWallet],
    );

    return { conveneMeeting, completeMeeting, linkProposal };
}
