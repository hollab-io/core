import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { meetingComponentsFactoryAbi } from "@hollab-io/contracts/actions";
import { useCallback } from "react";

const MEETING_COMPONENTS_FACTORY_ADDRESS = import.meta.env
    .VITE_MEETING_COMPONENTS_FACTORY_ADDRESS as `0x${string}` | undefined;

export function useMeetingComponentsFactory() {
    const { primaryWallet } = useDynamicContext();

    const deployMeetingComponents = useCallback(
        async (params: {
            orgId: bigint;
            circleRegistry: `0x${string}`;
            roleRegistry: `0x${string}`;
            governanceProcess: `0x${string}`;
            govToken: `0x${string}`;
            walletAddress: `0x${string}`;
        }): Promise<`0x${string}`> => {
            if (!MEETING_COMPONENTS_FACTORY_ADDRESS) {
                throw new Error("Meeting components factory address not configured");
            }
            if (!primaryWallet || !isEthereumWallet(primaryWallet)) {
                throw new Error("No Ethereum wallet connected");
            }

            const walletClient = await primaryWallet.getWalletClient();
            if (!walletClient) throw new Error("Could not get wallet client");

            const txHash = await walletClient.writeContract({
                abi: meetingComponentsFactoryAbi,
                address: MEETING_COMPONENTS_FACTORY_ADDRESS,
                functionName: "deploy",
                account: params.walletAddress,
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
        [primaryWallet],
    );

    return {
        deployMeetingComponents,
        factoryConfigured: Boolean(MEETING_COMPONENTS_FACTORY_ADDRESS),
    };
}
