import type { MeetingComponentSet } from "@hollab-io/indexing-client";
import { meetingComponentsFactoryAbi } from "@hollab-io/contracts/actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, decodeEventLog, http } from "viem";
import { useWalletClient } from "wagmi";

import { useChain } from "../context/ChainContext";

export type DeployMeetingComponentsParams = {
    orgId: string;
    subname: string;
    walletAddress: `0x${string}`;
};

export type DeployMeetingComponentsResult = {
    txHash: `0x${string}`;
    meetingFactory: `0x${string}`;
    actionVoting: `0x${string}`;
};

export function useDeployMeetingComponents() {
    const { data: walletClient } = useWalletClient();
    const { chainConfig } = useChain();
    const queryClient = useQueryClient();

    const factoryAddress = chainConfig.meetingFactoryAddress;
    const factoryConfigured = Boolean(
        factoryAddress && factoryAddress !== "0x0000000000000000000000000000000000000000",
    );

    const mutation = useMutation<
        DeployMeetingComponentsResult,
        Error,
        DeployMeetingComponentsParams
    >({
        mutationFn: async (params) => {
            if (!factoryConfigured) {
                throw new Error("Meeting components factory address not configured for this chain");
            }
            if (!walletClient) {
                throw new Error("No wallet connected");
            }

            // 1. Send the deploy transaction
            const txHash = await walletClient.writeContract({
                abi: meetingComponentsFactoryAbi,
                address: factoryAddress,
                functionName: "deploy",
                account: params.walletAddress,
                chain: chainConfig.chain,
                args: [params.subname, chainConfig.orgFactoryAddress],
            });

            // 2. Wait for receipt
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            // 3. Parse MeetingComponentsDeployed event
            let meetingFactory: `0x${string}` | null = null;
            let actionVoting: `0x${string}` | null = null;

            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: meetingComponentsFactoryAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "MeetingComponentsDeployed") {
                        const args = decoded.args as {
                            _orgId: bigint;
                            _meetingFactory: `0x${string}`;
                            _actionVoting: `0x${string}`;
                        };
                        meetingFactory = args._meetingFactory;
                        actionVoting = args._actionVoting;
                        break;
                    }
                } catch {
                    // not our event
                }
            }

            if (!meetingFactory || !actionVoting) {
                throw new Error(
                    "Meeting components deployed but could not find MeetingComponentsDeployed event",
                );
            }

            return { txHash, meetingFactory, actionVoting };
        },

        onSuccess: ({ meetingFactory, actionVoting }, params) => {
            const orgId = params.orgId;

            // Optimistically inject the component set into the tactical meetings cache
            // so both TacticalView and GovernanceView see it immediately.
            const componentSet: MeetingComponentSet = {
                id: `${orgId}-${Date.now()}`,
                orgId,
                meetingFactory,
                actionVoting,
                deployedAt: Math.floor(Date.now() / 1000).toString(),
                txHash: "0x",
            };

            queryClient.setQueryData(
                ["tacticalMeetings", orgId],
                (
                    old:
                        | {
                              components: MeetingComponentSet | null;
                              meetings?: unknown[];
                              outputs?: unknown[];
                          }
                        | undefined,
                ) => ({
                    components: componentSet,
                    meetings: old?.meetings ?? [],
                    outputs: old?.outputs ?? [],
                }),
            );
        },
    });

    return { ...mutation, factoryConfigured };
}
