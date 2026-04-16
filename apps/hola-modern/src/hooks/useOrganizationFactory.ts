import type { MeetingComponentSet, Organization } from "@hollab-io/indexing-client";
import { meetingComponentsFactoryAbi } from "@hollab-io/contracts/actions";
import { organizationFactoryAbi } from "@hollab-io/viem-extension";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, decodeEventLog, http } from "viem";
import { useAccount } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

function deriveSubname(orgName: string): string {
    return orgName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

function deriveTokenSymbol(orgName: string): string {
    const symbol = orgName
        .trim()
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .join("")
        .toUpperCase()
        .slice(0, 5);
    return symbol || "ORG";
}

const orgReadAbi = [
    {
        type: "function",
        name: "getOrganization",
        stateMutability: "view",
        inputs: [{ name: "_orgId", type: "uint256" }],
        outputs: [
            {
                name: "_org",
                type: "tuple",
                components: [
                    { name: "id", type: "uint256" },
                    { name: "name", type: "string" },
                    { name: "subname", type: "string" },
                    { name: "creator", type: "address" },
                    { name: "roleRegistry", type: "address" },
                    { name: "circleRegistry", type: "address" },
                    { name: "governanceProcess", type: "address" },
                    { name: "meetingFactory", type: "address" },
                    { name: "accessManager", type: "address" },
                    { name: "anchorCircleId", type: "uint256" },
                    { name: "createdAt", type: "uint256" },
                    { name: "token", type: "address" },
                ],
            },
        ],
    },
] as const;

const erc20MetaAbi = [
    {
        type: "function",
        name: "name",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "string" }],
    },
    {
        type: "function",
        name: "symbol",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "string" }],
    },
    {
        type: "function",
        name: "totalSupply",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
] as const;

export type DeployParams = {
    name: string;
    purpose: string;
    walletAddress: `0x${string}`;
};

export type DeployResult = {
    txHash: `0x${string}`;
    organization: Organization;
    meetingComponents: {
        meetingFactory: `0x${string}`;
        actionVoting: `0x${string}`;
    } | null;
    batched: boolean;
};

export function useDeployOrganization() {
    const { address } = useAccount();
    const { sendBatch } = useSendTransaction();
    const { chainConfig } = useChain();
    const queryClient = useQueryClient();

    return useMutation<DeployResult, Error, DeployParams>({
        mutationFn: async (params) => {
            const subname = deriveSubname(params.name);
            if (subname.length < 3) {
                throw new Error(
                    "Organization name too short — needs at least 3 alphanumeric characters.",
                );
            }

            const account = (address ?? params.walletAddress) as `0x${string}`;
            const meetingFactoryAddr = chainConfig.meetingFactoryAddress;
            const meetingBatchEnabled =
                Boolean(meetingFactoryAddr) &&
                meetingFactoryAddr !== "0x0000000000000000000000000000000000000000";

            // 1. Build the batch: createOrganization [+ meetingComponentsFactory.deploy].
            //    Because MeetingComponentsFactory.deploy looks up the org by subname (not
            //    by an auto-incrementing orgId), the second call is race-free: the subname
            //    is known at call-encoding time and resolves to the org created in call 1.
            const calls = [
                {
                    to: chainConfig.orgFactoryAddress,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    abi: organizationFactoryAbi as any,
                    functionName: "createOrganization",
                    args: [
                        subname,
                        params.purpose,
                        {
                            tokenName: `${params.name} Token`,
                            tokenSymbol: deriveTokenSymbol(params.name),
                            initialHolders: [params.walletAddress],
                            initialAmounts: [1_000_000n * 10n ** 18n],
                        },
                    ],
                },
            ];

            if (meetingBatchEnabled) {
                calls.push({
                    to: meetingFactoryAddr,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    abi: meetingComponentsFactoryAbi as any,
                    functionName: "deploy",
                    args: [subname, chainConfig.orgFactoryAddress],
                });
            }

            const { receipts, batched } = await sendBatch(calls, account);

            // 2. Parse events across all receipts
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });

            let orgId: bigint | null = null;
            let meetingFactoryOut: `0x${string}` | null = null;
            let actionVotingOut: `0x${string}` | null = null;

            for (const receipt of receipts) {
                for (const log of receipt.logs) {
                    // Try OrganizationCreated
                    try {
                        const decoded = decodeEventLog({
                            abi: organizationFactoryAbi,
                            data: log.data,
                            topics: log.topics,
                        });
                        if (decoded.eventName === "OrganizationCreated") {
                            orgId = (decoded.args as { _orgId: bigint })._orgId;
                            continue;
                        }
                    } catch {
                        // not an org factory event
                    }
                    // Try MeetingComponentsDeployed
                    try {
                        const decoded = decodeEventLog({
                            abi: meetingComponentsFactoryAbi,
                            data: log.data,
                            topics: log.topics,
                        });
                        if (decoded.eventName === "MeetingComponentsDeployed") {
                            const args = decoded.args as {
                                _meetingFactory: `0x${string}`;
                                _actionVoting: `0x${string}`;
                            };
                            meetingFactoryOut = args._meetingFactory;
                            actionVotingOut = args._actionVoting;
                        }
                    } catch {
                        // not a meeting components event
                    }
                }
            }

            if (orgId === null) {
                throw new Error(
                    "Organization created but could not find OrganizationCreated event",
                );
            }

            const txHash = receipts[0]?.transactionHash ?? ("0x" as `0x${string}`);

            // 4. Read org struct + token metadata from chain
            const orgData = await publicClient.readContract({
                address: chainConfig.orgFactoryAddress,
                abi: orgReadAbi,
                functionName: "getOrganization",
                args: [orgId],
            });

            let tokenName = "";
            let tokenSymbol = "";
            let tokenTotalSupply = "0";

            const zero = "0x0000000000000000000000000000000000000000";
            if (orgData.token.toLowerCase() !== zero) {
                const [name, symbol, supply] = await Promise.all([
                    publicClient.readContract({
                        address: orgData.token,
                        abi: erc20MetaAbi,
                        functionName: "name",
                    }),
                    publicClient.readContract({
                        address: orgData.token,
                        abi: erc20MetaAbi,
                        functionName: "symbol",
                    }),
                    publicClient.readContract({
                        address: orgData.token,
                        abi: erc20MetaAbi,
                        functionName: "totalSupply",
                    }),
                ]);
                tokenName = name;
                tokenSymbol = symbol;
                tokenTotalSupply = supply.toString();
            }

            // 5. Build Organization object
            const organization: Organization = {
                id: orgData.id.toString(),
                subname: orgData.subname,
                name: orgData.name,
                creator: orgData.creator,
                token: orgData.token,
                circleRegistry: orgData.circleRegistry,
                roleRegistry: orgData.roleRegistry,
                governanceProcess: orgData.governanceProcess,
                anchorCircleId: orgData.anchorCircleId.toString(),
                tokenName,
                tokenSymbol,
                tokenTotalSupply,
                circleCount: "0",
                roleCount: "0",
                memberCount: "1",
                purpose: params.purpose,
                createdAt: orgData.createdAt.toString(),
                updatedAt: orgData.createdAt.toString(),
            };

            const meetingComponents =
                meetingFactoryOut && actionVotingOut
                    ? { meetingFactory: meetingFactoryOut, actionVoting: actionVotingOut }
                    : null;

            return { txHash, organization, meetingComponents, batched };
        },

        onSuccess: ({ organization, meetingComponents }) => {
            // Optimistically prepend the new org into the cached org list
            const chainId = chainConfig.chain.id;
            queryClient.setQueryData<Organization[]>(
                ["organizations:onchain:all", chainId],
                (prev) => (prev ? [organization, ...prev] : [organization]),
            );

            // Optimistically seed the tacticalMeetings cache so Governance/Tactical
            // views find the components immediately without a second transaction.
            if (meetingComponents) {
                const componentSet: MeetingComponentSet = {
                    id: `${organization.id}-${Date.now()}`,
                    orgId: organization.id,
                    meetingFactory: meetingComponents.meetingFactory,
                    actionVoting: meetingComponents.actionVoting,
                    deployedAt: Math.floor(Date.now() / 1000).toString(),
                    txHash: "0x",
                };

                queryClient.setQueryData(
                    ["tacticalMeetings", organization.id],
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
            }
        },
    });
}
