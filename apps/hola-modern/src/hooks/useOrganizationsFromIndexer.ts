import type { Organization } from "@hollab-io/indexing-client";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { organizationFactoryAbi, organizationInstanceAbi } from "@hollab-io/viem-extension";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { createPublicClient, http } from "viem";

import { DEFAULT_CHAIN_ID, getChainConfig } from "../config/chains";
import { useChain } from "../context/ChainContext";

export type { Organization };

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

function mapSummary(
    instanceAddress: `0x${string}`,
    summary: {
        id: bigint;
        name: string;
        subname: string;
        creator: `0x${string}`;
        roleRegistry: `0x${string}`;
        circleRegistry: `0x${string}`;
        governanceProcess: `0x${string}`;
        anchorCircleId: bigint;
        token: `0x${string}`;
        createdAt: bigint;
    },
): Organization {
    return {
        id: summary.id.toString(),
        subname: summary.subname,
        name: summary.name,
        creator: summary.creator,
        token: summary.token,
        instanceAddress,
        circleRegistry: summary.circleRegistry,
        roleRegistry: summary.roleRegistry,
        governanceProcess: summary.governanceProcess,
        anchorCircleId: summary.anchorCircleId.toString(),
        tokenName: "",
        tokenSymbol: "",
        tokenTotalSupply: "0",
        circleCount: "0",
        roleCount: "0",
        memberCount: "0",
        purpose: "",
        createdAt: summary.createdAt.toString(),
        updatedAt: summary.createdAt.toString(),
    };
}

// Fallback when the indexer is unavailable: walk the factory's id → instance
// directory and read summary() off each clone. Post-refactor the factory no
// longer has a bulk getOrganizations view, so this is N+1 — acceptable for
// a failure-mode path the UI rarely hits.
async function listOrganizationsOnchain(chainId: number): Promise<Organization[]> {
    const chainConfig = getChainConfig(chainId);
    const rpcUrl = chainConfig.chain.rpcUrls.default.http[0];
    const publicClient = createPublicClient({
        chain: chainConfig.chain,
        transport: http(rpcUrl),
    });

    const total = (await publicClient.readContract({
        address: chainConfig.orgFactoryAddress,
        abi: organizationFactoryAbi,
        functionName: "organizationCount",
    })) as bigint;

    if (total === 0n) return [];

    const items: Organization[] = [];
    for (let id = 1n; id <= total; id++) {
        const instanceAddress = (await publicClient.readContract({
            address: chainConfig.orgFactoryAddress,
            abi: organizationFactoryAbi,
            functionName: "getOrganization",
            args: [id],
        })) as `0x${string}`;
        if (instanceAddress === "0x0000000000000000000000000000000000000000") continue;

        const summary = await publicClient.readContract({
            address: instanceAddress,
            abi: organizationInstanceAbi,
            functionName: "summary",
        });
        items.push(mapSummary(instanceAddress, summary));
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

    return { organizations, allOrganizations, loading, refetch };
}

/** Stable singleton ref so other hooks can share the client for the active chain. */
export function getIndexingClient() {
    const stored =
        typeof localStorage !== "undefined" ? localStorage.getItem("hollab:activeChainId") : null;
    const chainId = stored ? Number(stored) : DEFAULT_CHAIN_ID;
    return getOrCreateClient(chainId);
}
