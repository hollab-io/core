import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { holLabContractActions } from "@hollab-io/viem-extension";
import { useCallback } from "react";

/** Maps to HolacracyTypes.OutputType enum on-chain */
export const OutputType = {
    NextAction: 0,
    Project: 1,
    Request: 2,
    Information: 3,
} as const;

export type OutputTypeValue = (typeof OutputType)[keyof typeof OutputType];

export function useTacticalMeeting() {
    const { primaryWallet } = useDynamicContext();

    const getContractActions = useCallback(async () => {
        if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
            throw new Error("No Ethereum wallet connected");
        }
        const walletClient = await primaryWallet.getWalletClient();
        if (!walletClient) throw new Error("Could not get wallet client");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return holLabContractActions()(walletClient as any);
    }, [primaryWallet]);

    const conveneMeeting = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            circleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            const actions = await getContractActions();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (actions.tacticalMeeting.write as any)({
                address: params.tacticalMeetingAddress,
                functionName: "conveneMeeting",
                account: params.walletAddress,
                args: [params.circleId],
            });
            return txHash;
        },
        [getContractActions],
    );

    const completeMeeting = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            meetingId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            const actions = await getContractActions();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (actions.tacticalMeeting.write as any)({
                address: params.tacticalMeetingAddress,
                functionName: "completeMeeting",
                account: params.walletAddress,
                args: [params.meetingId],
            });
            return txHash;
        },
        [getContractActions],
    );

    const recordOutput = useCallback(
        async (params: {
            tacticalMeetingAddress: `0x${string}`;
            meetingId: bigint;
            outputType: OutputTypeValue;
            description: string;
            assignedTo: `0x${string}`;
            roleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            const actions = await getContractActions();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (actions.tacticalMeeting.write as any)({
                address: params.tacticalMeetingAddress,
                functionName: "recordOutput",
                account: params.walletAddress,
                args: [
                    params.meetingId,
                    params.outputType,
                    params.description,
                    params.assignedTo,
                    params.roleId,
                ],
            });
            return txHash;
        },
        [getContractActions],
    );

    return { conveneMeeting, completeMeeting, recordOutput };
}
