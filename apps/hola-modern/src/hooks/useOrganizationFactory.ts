import type { Organization } from "@hollab-io/indexing-client";
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
};

export function useDeployOrganization() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
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

            // 1. Send the transaction
            const txHash = await send(
                [
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
                ],
                account,
            );

            // 2. Wait for the receipt
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            // 3. Parse OrganizationCreated event to get orgId
            let orgId: bigint | null = null;
            for (const log of receipt.logs) {
                try {
                    const decoded = decodeEventLog({
                        abi: organizationFactoryAbi,
                        data: log.data,
                        topics: log.topics,
                    });
                    if (decoded.eventName === "OrganizationCreated") {
                        orgId = (decoded.args as { _orgId: bigint })._orgId;
                        break;
                    }
                } catch {
                    // not our event
                }
            }

            if (orgId === null) {
                throw new Error(
                    "Organization created but could not find OrganizationCreated event",
                );
            }

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

            return { txHash, organization };
        },

        onSuccess: ({ organization }) => {
            // Optimistically prepend the new org into the cached org list
            const chainId = chainConfig.chain.id;
            queryClient.setQueryData<Organization[]>(
                ["organizations:onchain:all", chainId],
                (prev) => (prev ? [organization, ...prev] : [organization]),
            );
        },
    });
}
