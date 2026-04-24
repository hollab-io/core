/**
 * ERC-8004 agent identity helpers.
 *
 * A member can bind an agent NFT they own to their org identity via
 * `OrganizationInstance.linkAgentIdentity(agentRegistry, agentId)`. The
 * contract verifies ownership (`ownerOf(agentId) == msg.sender`) and that
 * the caller is a member. See specs/99-agent-native-divergence.md §4.
 */
import { organizationInstanceAbi } from "@hollab-io/viem-extension";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, http } from "viem";
import { useAccount } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export type AgentIdentity = {
    agentRegistry: `0x${string}`;
    agentId: bigint;
    linked: boolean;
};

export type LinkAgentIdentityParams = {
    instanceAddress: `0x${string}`;
    agentRegistry: `0x${string}`;
    agentId: bigint;
};

/** Reads the ERC-8004 identity linked to `account` on the given org instance. */
export function useAgentIdentity(
    instanceAddress: `0x${string}` | undefined,
    account: `0x${string}` | undefined,
) {
    const { chainConfig } = useChain();

    const query = useQuery({
        queryKey: ["agentIdentity", chainConfig.chain.id, instanceAddress, account],
        enabled: !!instanceAddress && !!account,
        queryFn: async (): Promise<AgentIdentity> => {
            if (!instanceAddress || !account) {
                return { agentRegistry: ZERO_ADDRESS, agentId: 0n, linked: false };
            }
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });
            const [agentRegistry, agentId] = await publicClient.readContract({
                address: instanceAddress,
                abi: organizationInstanceAbi,
                functionName: "getAgentIdentity",
                args: [account],
            });
            return {
                agentRegistry: agentRegistry as `0x${string}`,
                agentId: agentId as bigint,
                linked: agentRegistry !== ZERO_ADDRESS,
            };
        },
        staleTime: 60 * 1000,
    });

    return {
        identity: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}

/**
 * Links an ERC-8004 agent NFT held by the caller to their org identity.
 * The contract reverts if caller !owner(agentId) or caller is not a member.
 */
export function useLinkAgentIdentity() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();
    const { chainConfig } = useChain();

    return useMutation({
        mutationFn: async (params: LinkAgentIdentityParams) => {
            if (!address) throw new Error("Connect a wallet to link an agent identity.");
            const txHash = await send(
                [
                    {
                        to: params.instanceAddress,
                        abi: organizationInstanceAbi,
                        functionName: "linkAgentIdentity",
                        args: [params.agentRegistry, params.agentId],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: (_data, params) => {
            queryClient.invalidateQueries({
                queryKey: ["agentIdentity", chainConfig.chain.id, params.instanceAddress, address],
            });
        },
    });
}
