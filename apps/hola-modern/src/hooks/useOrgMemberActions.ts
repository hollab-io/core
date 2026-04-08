import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { organizationFactoryAbi } from "@hollab-io/viem-extension";

import { useSendTransaction } from "./useSendTransaction";

/** Add members via OrganizationFactory.addOrgMember (org admin only). */
export function useOrgMemberActions() {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();

    const addOrgMembers = async (params: {
        orgFactoryAddress: `0x${string}`;
        orgId: bigint;
        memberAddresses: `0x${string}`[];
        walletAddress: `0x${string}`;
    }): Promise<`0x${string}`> => {
        const account = (primaryWallet?.address ?? params.walletAddress) as `0x${string}`;
        const calls = params.memberAddresses.map((member) => ({
            to: params.orgFactoryAddress,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            abi: organizationFactoryAbi as any,
            functionName: "addOrgMember" as const,
            args: [params.orgId, member] as const,
        }));
        return send(calls, account);
    };

    return { addOrgMembers };
}
