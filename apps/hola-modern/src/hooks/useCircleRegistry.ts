import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { circleRegistryAbi } from "@hollab-io/viem-extension";

import { useSendTransaction } from "./useSendTransaction";

export function useCircleRegistry() {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();

    const addOrgMembers = async (params: {
        circleRegistryAddress: `0x${string}`;
        memberAddresses: `0x${string}`[];
        walletAddress: `0x${string}`;
    }): Promise<`0x${string}`> => {
        const account = (primaryWallet?.address ?? params.walletAddress) as `0x${string}`;
        return send(
            [
                {
                    to: params.circleRegistryAddress,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    abi: circleRegistryAbi as any,
                    functionName: "addOrgMembers",
                    args: [params.memberAddresses],
                },
            ],
            account,
        );
    };

    return { addOrgMembers };
}
