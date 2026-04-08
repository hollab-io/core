import type { Organization } from "@hollab-io/indexing-client";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createPublicClient, http } from "viem";

import { DEFAULT_CHAIN_ID, getChainConfig } from "../config/chains";
import { useChain } from "../context/ChainContext";

export type { Organization };

const PAGE_SIZE = 50n;
const clientCache = new Map<number, ReturnType<typeof createIndexingClient>>();

function getOrCreateClient(chainId: number) {
    let client = clientCache.get(chainId);
    if (client) return client;
    const url = getChainConfig(chainId).indexerUrl;
    if (!url) return null;
    client = createIndexingClient(url);
    clientCache.set(chainId, client);
    return client;
}
const organizationReadAbi = [
    {
        type: "function",
        name: "organizationCount",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "_count", type: "uint256" }],
    },
    {
        type: "function",
        name: "getOrganizations",
        stateMutability: "view",
        inputs: [
            { name: "_offset", type: "uint256" },
            { name: "_limit", type: "uint256" },
        ],
        outputs: [
            {
                name: "_orgs",
                type: "tuple[]",
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
                    { name: "governor", type: "address" },
                    { name: "token", type: "address" },
                    { name: "timelock", type: "address" },
                ],
            },
        ],
    },
] as const;

const circleReadAbi = [
    {
        type: "function",
        name: "getOrgMembers",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "_members", type: "address[]" }],
    },
    {
        type: "function",
        name: "getCircle",
        stateMutability: "view",
        inputs: [{ name: "_circleId", type: "uint256" }],
        outputs: [
            {
                name: "_circle",
                type: "tuple",
                components: [
                    { name: "id", type: "uint256" },
                    { name: "parentCircleId", type: "uint256" },
                    { name: "roleId", type: "uint256" },
                    { name: "name", type: "string" },
                    { name: "purpose", type: "string" },
                    { name: "isAnchor", type: "bool" },
                    { name: "exists", type: "bool" },
                ],
            },
        ],
    },
] as const;

function mapOrg(org: {
    id: bigint;
    name: string;
    subname: string;
    creator: `0x${string}`;
    roleRegistry: `0x${string}`;
    circleRegistry: `0x${string}`;
    governanceProcess: `0x${string}`;
    anchorCircleId: bigint;
    governor: `0x${string}`;
    token: `0x${string}`;
    timelock: `0x${string}`;
    createdAt: bigint;
}): Organization {
    return {
        id: org.id.toString(),
        subname: org.subname,
        name: org.name,
        creator: org.creator,
        governor: org.governor,
        token: org.token,
        timelock: org.timelock,
        circleRegistry: org.circleRegistry,
        roleRegistry: org.roleRegistry,
        governanceProcess: org.governanceProcess,
        anchorCircleId: org.anchorCircleId.toString(),
        tokenName: "",
        tokenSymbol: "",
        tokenTotalSupply: "0",
        governorName: org.subname,
        votingDelay: "0",
        votingPeriod: "0",
        proposalThreshold: "0",
        quorumNumerator: "0",
        circleCount: "0",
        roleCount: "0",
        memberCount: "0",
        purpose: "",
        createdAt: org.createdAt.toString(),
        updatedAt: org.createdAt.toString(),
    };
}

async function listOrganizationsOnchain(chainId: number): Promise<Organization[]> {
    const chainConfig = getChainConfig(chainId);
    const rpcUrl = chainConfig.chain.rpcUrls.default.http[0];
    const publicClient = createPublicClient({
        chain: chainConfig.chain,
        transport: http(rpcUrl),
    });

    const total = (await publicClient.readContract({
        address: chainConfig.orgFactoryAddress,
        abi: organizationReadAbi,
        functionName: "organizationCount",
    })) as bigint;

    if (total === 0n) return [];

    const items: Organization[] = [];
    for (let offset = 0n; offset < total; offset += PAGE_SIZE) {
        const orgs = (await publicClient.readContract({
            address: chainConfig.orgFactoryAddress,
            abi: organizationReadAbi,
            functionName: "getOrganizations",
            args: [offset, PAGE_SIZE],
        })) as readonly Parameters<typeof mapOrg>[0][];
        for (const org of orgs) {
            if (org.id === 0n) continue;

            let memberCount = "0";
            let purpose = "";
            try {
                const members = (await publicClient.readContract({
                    address: org.circleRegistry,
                    abi: circleReadAbi,
                    functionName: "getOrgMembers",
                })) as readonly `0x${string}`[];
                memberCount = members.length.toString();

                const anchorCircle = (await publicClient.readContract({
                    address: org.circleRegistry,
                    abi: circleReadAbi,
                    functionName: "getCircle",
                    args: [org.anchorCircleId],
                })) as { purpose: string };
                purpose = anchorCircle.purpose;
            } catch {
                // Keep fallback values when one of the optional reads fails.
            }

            const mapped = mapOrg(org);
            mapped.memberCount = memberCount;
            mapped.purpose = purpose;
            items.push(mapped);
        }
    }

    // Newest first to preserve current UX assumptions.
    return items.sort((a, b) => Number(b.id) - Number(a.id));
}

export function useOrganizationsFromIndexer(creatorAddress: string | null) {
    const queryClient = useQueryClient();
    const { activeChainId } = useChain();

    const { data: allOrganizations = [], isLoading: loading } = useQuery({
        queryKey: ["organizations:onchain:all", activeChainId],
        queryFn: async () => {
            return listOrganizationsOnchain(activeChainId);
        },
        enabled: Boolean(activeChainId),
    });

    const organizations = creatorAddress
        ? allOrganizations.filter(
              (org) => org.creator.toLowerCase() === creatorAddress.toLowerCase(),
          )
        : [];

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({
            queryKey: ["organizations:onchain:all", activeChainId],
        });
    }, [queryClient, activeChainId]);

    /**
     * Poll every `intervalMs` until `predicate` returns true or `timeoutMs` elapses.
     * Resolves with the first matching org list that satisfies the predicate.
     */
    const pollUntil = useCallback(
        (
            predicate: (orgs: Organization[]) => boolean,
            intervalMs = 2000,
            timeoutMs = 60_000,
        ): Promise<Organization[]> => {
            return new Promise((resolve, reject) => {
                if (!creatorAddress) {
                    reject(new Error("Wallet not connected"));
                    return;
                }

                const deadline = Date.now() + timeoutMs;

                const tick = async () => {
                    try {
                        const all = await listOrganizationsOnchain(activeChainId);
                        const items = all.filter(
                            (org) => org.creator.toLowerCase() === creatorAddress.toLowerCase(),
                        );
                        queryClient.setQueryData(["organizations:onchain:all", activeChainId], all);
                        if (predicate(items)) {
                            resolve(items);
                            return;
                        }
                    } catch {
                        // keep polling on transient errors
                    }

                    if (Date.now() >= deadline) {
                        reject(new Error("Timed out waiting for onchain org update"));
                        return;
                    }

                    setTimeout(tick, intervalMs);
                };

                void tick();
            });
        },
        [creatorAddress, queryClient, activeChainId],
    );

    return { organizations, allOrganizations, loading, refetch, pollUntil };
}

/** Stable singleton ref so other hooks can share the client for the active chain. */
export function getIndexingClient() {
    const stored =
        typeof localStorage !== "undefined" ? localStorage.getItem("hollab:activeChainId") : null;
    const chainId = stored ? Number(stored) : DEFAULT_CHAIN_ID;
    return getOrCreateClient(chainId);
}
