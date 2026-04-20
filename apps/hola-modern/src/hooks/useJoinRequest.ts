/**
 * useJoinRequest — interact with org-level join requests on the per-org
 * OrganizationInstance clone (post factory-to-instance refactor).
 *
 * Outsiders call instance.requestToJoin(message).
 * Org admins call approveWithTokens({ instanceAddress, requester, govToken })
 *   which batches instance.approveJoinRequest(requester) + ERC-20
 *   transfer(requester, 100 tokens) into a single ZeroDev UserOp (or two
 *   sequential EOA txs as fallback).
 *
 * Read operations (pending requests list) are served by the Ponder indexer.
 * Only hasPendingRequest is checked on-chain (lightweight single-slot read).
 */
import type { Abi, Address } from "viem";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { organizationInstanceAbi } from "@hollab-io/viem-extension";
import { useCallback } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { useAccount } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const TOKENS_PER_APPROVAL = 100n * 10n ** 18n; // 100 tokens

// ── ABIs ───────────────────────────────────────────────────────────────────────

const erc20Abi = [
    {
        type: "function",
        name: "transfer",
        stateMutability: "nonpayable",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
] as const satisfies Abi;

// ── Types ──────────────────────────────────────────────────────────────────────

export type JoinRequestStatus = 0 | 1 | 2; // Pending | Approved | Rejected

export type JoinRequestEntry = {
    id: bigint;
    requester: Address;
    orgId: bigint;
    message: string;
    status: JoinRequestStatus;
    submittedAt: bigint;
    resolvedAt: bigint;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useJoinRequest() {
    const { address: connectedAddress } = useAccount();
    const { send } = useSendTransaction();
    const { chainConfig } = useChain();

    const publicClient = createPublicClient({
        chain: chainConfig.chain,
        transport: http(chainConfig.chain.rpcUrls.default.http[0]),
    });
    const account = () => (connectedAddress ?? "0x") as Address;

    // ── Write ──────────────────────────────────────────────────────────────────

    const requestToJoin = async (params: {
        instanceAddress: Address;
        message: string;
    }): Promise<`0x${string}`> => {
        if (params.instanceAddress === ZERO_ADDRESS) {
            throw new Error("Organization instance address missing.");
        }
        return send(
            [
                {
                    to: params.instanceAddress,
                    abi: organizationInstanceAbi as Abi,
                    functionName: "requestToJoin",
                    args: [params.message],
                },
            ],
            account(),
        );
    };

    /**
     * Approve a join request AND transfer 100 governance tokens in one shot.
     * With ZeroDev: single UserOp. Without ZeroDev: two sequential EOA txs.
     */
    const approveWithTokens = async (params: {
        instanceAddress: Address;
        requester: Address;
        govTokenAddress: Address;
    }): Promise<`0x${string}`> => {
        if (!isAddress(params.requester)) throw new Error("Invalid requester address");
        return send(
            [
                {
                    to: params.instanceAddress,
                    abi: organizationInstanceAbi as Abi,
                    functionName: "approveJoinRequest",
                    args: [params.requester],
                },
                {
                    to: params.govTokenAddress,
                    abi: erc20Abi as Abi,
                    functionName: "transfer",
                    args: [params.requester, TOKENS_PER_APPROVAL],
                },
            ],
            account(),
        );
    };

    const rejectRequest = async (params: {
        instanceAddress: Address;
        requester: Address;
    }): Promise<`0x${string}`> =>
        send(
            [
                {
                    to: params.instanceAddress,
                    abi: organizationInstanceAbi as Abi,
                    functionName: "rejectJoinRequest",
                    args: [params.requester],
                },
            ],
            account(),
        );

    // ── Read (indexer for lists, on-chain for lightweight checks) ─────────────

    const getPendingRequests = useCallback(
        async (orgId: bigint): Promise<JoinRequestEntry[]> => {
            if (!chainConfig.indexerUrl) return [];
            try {
                const client = createIndexingClient(chainConfig.indexerUrl);
                const result = await client.listPendingJoinRequestsByOrg(orgId.toString());
                return result.items.map((r) => ({
                    id: BigInt(r.requestId),
                    requester: r.requester as Address,
                    orgId: BigInt(r.orgId),
                    message: r.message,
                    status: r.status as JoinRequestStatus,
                    submittedAt: BigInt(r.submittedAt),
                    resolvedAt: r.resolvedAt ? BigInt(r.resolvedAt) : 0n,
                }));
            } catch {
                return [];
            }
        },
        [chainConfig.indexerUrl],
    );

    const walletAddress = connectedAddress;
    const hasPendingRequest = useCallback(
        async (instanceAddress: Address): Promise<boolean> => {
            if (!walletAddress) return false;
            if (instanceAddress === ZERO_ADDRESS) return false;
            return (await publicClient.readContract({
                address: instanceAddress,
                abi: organizationInstanceAbi,
                functionName: "hasPendingRequest",
                args: [walletAddress],
            })) as boolean;
        },
        [walletAddress, publicClient],
    );

    return {
        requestToJoin,
        approveWithTokens,
        rejectRequest,
        getPendingRequests,
        hasPendingRequest,
    };
}
