import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { useCallback } from "react";
import { useAccount } from "wagmi";

import { useSendTransaction } from "./useSendTransaction";

/** IMeetingFactory.MeetingKind.Governance */
const MEETING_KIND_GOVERNANCE = 1;

export function useGovernanceMeeting() {
    const { address } = useAccount();
    const { send } = useSendTransaction();

    const account = () => (address ?? "0x") as `0x${string}`;

    const conveneMeeting = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            orgId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "startMeeting",
                        args: [params.orgId, MEETING_KIND_GOVERNANCE],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, address],
    );

    const completeMeeting = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            meetingId: bigint;
            orgId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> =>
            send(
                [
                    {
                        to: params.governanceMeetingAddress,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        abi: meetingFactoryAbi as any,
                        functionName: "endMeeting",
                        args: [params.meetingId, params.orgId, MEETING_KIND_GOVERNANCE],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, address],
    );

    const linkProposal = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            meetingId: bigint;
            orgId: bigint;
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
                        args: [params.meetingId, params.orgId, params.proposalId],
                    },
                ],
                account(),
            ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [send, address],
    );

    return { conveneMeeting, completeMeeting, linkProposal };
}
