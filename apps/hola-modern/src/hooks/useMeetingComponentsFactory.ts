import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { meetingComponentsFactoryAbi } from "@hollab-io/contracts/actions";
import { useCallback } from "react";

import { useChain } from "../context/ChainContext";

export function useMeetingComponentsFactory() {
    const { primaryWallet } = useDynamicContext();
    const { chainConfig } = useChain();

    const factoryAddress = chainConfig.meetingFactoryAddress;

    const deployMeetingComponents = useCallback(
        async (params: {
            orgId: bigint;
            circleRegistry: `0x${string}`;
            roleRegistry: `0x${string}`;
            governanceProcess: `0x${string}`;
            govToken: `0x${string}`;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            if (
                !factoryAddress ||
                factoryAddress === "0x0000000000000000000000000000000000000000"
            ) {
                throw new Error("Meeting components factory address not configured for this chain");
            }
            if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
                throw new Error("No Ethereum wallet connected");
            }

            const walletClient = await primaryWallet.getWalletClient();
            if (!walletClient) throw new Error("Could not get wallet client");

            const txHash = await walletClient.writeContract({
                abi: meetingComponentsFactoryAbi,
                address: factoryAddress,
                functionName: "deploy",
                account: params.walletAddress,
                chain: chainConfig.chain,
                args: [
                    params.orgId,
                    params.circleRegistry,
                    params.roleRegistry,
                    params.governanceProcess,
                    params.govToken,
                ],
            });

            return txHash;
        },
        [primaryWallet, factoryAddress, chainConfig.chain],
    );

    return {
        deployMeetingComponents,
        factoryConfigured: Boolean(
            factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000",
        ),
    };
}
