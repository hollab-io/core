import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { holLabContractActions } from "@hollab-io/viem-extension";
import { useCallback } from "react";

export function useCircleRegistry() {
    const { primaryWallet } = useDynamicContext();

    const addOrgMember = useCallback(
        async (params: {
            circleRegistryAddress: `0x${string}`;
            memberAddress: `0x${string}`;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
                throw new Error("No Ethereum wallet connected");
            }

            const walletClient = await primaryWallet.getWalletClient();
            if (!walletClient) throw new Error("Could not get wallet client");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contractActions = holLabContractActions()(walletClient as any);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (contractActions.circleRegistry.write as any)({
                address: params.circleRegistryAddress,
                functionName: "addOrgMember",
                account: params.walletAddress,
                args: [params.memberAddress],
            });

            return txHash;
        },
        [primaryWallet],
    );

    const addOrgMembers = useCallback(
        async (params: {
            circleRegistryAddress: `0x${string}`;
            memberAddresses: `0x${string}`[];
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
                throw new Error("No Ethereum wallet connected");
            }

            const walletClient = await primaryWallet.getWalletClient();
            if (!walletClient) throw new Error("Could not get wallet client");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const contractActions = holLabContractActions()(walletClient as any);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash = await (contractActions.circleRegistry.write as any)({
                address: params.circleRegistryAddress,
                functionName: "addOrgMembers",
                account: params.walletAddress,
                args: [params.memberAddresses],
            });

            return txHash;
        },
        [primaryWallet],
    );

    return { addOrgMember, addOrgMembers };
}
