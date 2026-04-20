import { organizationInstanceAbi } from "@hollab-io/viem-extension";
import { useAccount } from "wagmi";

import { useSendTransaction } from "./useSendTransaction";

/** Add members via OrganizationInstance.addMember (org admin only). */
export function useOrgMemberActions() {
    const { address } = useAccount();
    const { send } = useSendTransaction();

    const addOrgMembers = async (params: {
        instanceAddress: `0x${string}`;
        memberAddresses: `0x${string}`[];
        walletAddress: `0x${string}`;
    }): Promise<`0x${string}`> => {
        const account = (address ?? params.walletAddress) as `0x${string}`;
        const calls = params.memberAddresses.map((member) => ({
            to: params.instanceAddress,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            abi: organizationInstanceAbi as any,
            functionName: "addMember" as const,
            args: [member] as const,
        }));
        return send(calls, account);
    };

    return { addOrgMembers };
}
