import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { holLabContractActions } from "@hollab-io/viem-extension";
import { useCallback } from "react";

export function useGovernanceMeeting() {
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
            governanceMeetingAddress: `0x${string}`;
            circleId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            const actions = await getContractActions();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (actions.governanceMeeting.write as any)({
                address: params.governanceMeetingAddress,
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
            governanceMeetingAddress: `0x${string}`;
            meetingId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            const actions = await getContractActions();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (actions.governanceMeeting.write as any)({
                address: params.governanceMeetingAddress,
                functionName: "completeMeeting",
                account: params.walletAddress,
                args: [params.meetingId],
            });
            return txHash;
        },
        [getContractActions],
    );

    const linkProposal = useCallback(
        async (params: {
            governanceMeetingAddress: `0x${string}`;
            meetingId: bigint;
            proposalId: bigint;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            const actions = await getContractActions();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (actions.governanceMeeting.write as any)({
                address: params.governanceMeetingAddress,
                functionName: "linkProposal",
                account: params.walletAddress,
                args: [params.meetingId, params.proposalId],
            });
            return txHash;
        },
        [getContractActions],
    );

    return { conveneMeeting, completeMeeting, linkProposal };
}
