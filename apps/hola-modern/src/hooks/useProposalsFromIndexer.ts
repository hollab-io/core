/**
 * Read-only proposal hooks for the public (wallet-less) tree.
 *
 * Every hook delegates to the typed GraphQL `indexing-client` — no RPC,
 * no wagmi. Safe to mount above the auth gate. Writes live in a separate
 * (authed) hook file so PublicProposalView stays zero-wagmi.
 */
import type { Objection, Proposal } from "@hollab-io/indexing-client";
import { useQuery } from "@tanstack/react-query";

import { getIndexingClient } from "./useOrganizationsFromIndexer";

export type { Objection, Proposal };

/** All open (Draft) proposals for an org, oldest first. */
export function useOpenProposalsByOrg(orgId: string | null) {
    return useQuery({
        queryKey: ["publicOpenProposals", orgId],
        queryFn: async (): Promise<Proposal[]> => {
            const client = getIndexingClient();
            if (!client || !orgId) return [];
            const result = await client.listOpenProposalsByOrg(orgId, { limit: 50 });
            return result.items;
        },
        enabled: Boolean(orgId),
    });
}

/**
 * Single proposal by composite id (`<processAddress>-<proposalId>`).
 * The public permalink only knows orgId + proposalId, so `PublicProposalView`
 * resolves the processAddress via a separate org lookup and combines them.
 */
export function useProposalFromIndexer(id: string | null) {
    return useQuery({
        queryKey: ["publicProposal", id],
        queryFn: async (): Promise<Proposal | null> => {
            const client = getIndexingClient();
            if (!client || !id) return null;
            return (await client.getProposal(id)) ?? null;
        },
        enabled: Boolean(id),
    });
}

export function useObjectionsByProposal(
    processAddress: string | null | undefined,
    proposalId: string | null | undefined,
) {
    return useQuery({
        queryKey: ["publicObjections", processAddress, proposalId],
        queryFn: async (): Promise<Objection[]> => {
            const client = getIndexingClient();
            if (!client || !processAddress || !proposalId) return [];
            const result = await client.listObjectionsByProposal(processAddress, proposalId, {
                limit: 50,
            });
            return result.items;
        },
        enabled: Boolean(processAddress && proposalId),
    });
}
