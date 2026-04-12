/**
 * useJoinRequest — interact with org-level join requests in OrganizationFactory.
 *
 * Outsiders call requestToJoin(orgId, message).
 * Org admins call approveWithTokens(orgId, requester, govToken)
 *   which batches approveJoinRequest(orgId, requester) + ERC-20 transfer(requester, 100 tokens)
 *   into a single ZeroDev UserOp (or two sequential EOA txs as fallback).
 *
 * Read operations (pending requests list) are served by the Ponder indexer.
 * Only hasPendingRequest is checked on-chain (lightweight single-slot read).
 */
import type { Abi, Address } from "viem";
import { createIndexingClient } from "@hollab-io/indexing-client";
import { useCallback } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { useAccount } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

const TOKENS_PER_APPROVAL = 100n * 10n ** 18n; // 100 tokens

// ── ABIs ───────────────────────────────────────────────────────────────────────

export const organizationFactoryJoinAbi = [
    {
        type: "function",
        name: "requestToJoin",
        stateMutability: "nonpayable",
        inputs: [
            { name: "orgId", type: "uint256" },
            { name: "message", type: "string" },
        ],
        outputs: [{ name: "requestId", type: "uint256" }],
    },
    {
        type: "function",
        name: "approveJoinRequest",
        stateMutability: "nonpayable",
        inputs: [
            { name: "orgId", type: "uint256" },
            { name: "requester", type: "address" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "rejectJoinRequest",
        stateMutability: "nonpayable",
        inputs: [
            { name: "orgId", type: "uint256" },
            { name: "requester", type: "address" },
        ],
        outputs: [],
    },
    {
        type: "function",
        name: "hasPendingRequest",
        stateMutability: "view",
        inputs: [
            { name: "requester", type: "address" },
            { name: "orgId", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        type: "event",
        name: "JoinRequested",
        inputs: [
            { name: "requestId", type: "uint256", indexed: true },
            { name: "requester", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
            { name: "message", type: "string", indexed: false },
        ],
    },
    {
        type: "event",
        name: "JoinApproved",
        inputs: [
            { name: "requestId", type: "uint256", indexed: true },
            { name: "requester", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
        ],
    },
    {
        type: "event",
        name: "JoinRejected",
        inputs: [
            { name: "requestId", type: "uint256", indexed: true },
            { name: "requester", type: "address", indexed: true },
            { name: "orgId", type: "uint256", indexed: true },
        ],
    },
] as const satisfies Abi;

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

    const organizationFactoryAddress = chainConfig.orgFactoryAddress;
    const publicClient = createPublicClient({
        chain: chainConfig.chain,
        transport: http(chainConfig.chain.rpcUrls.default.http[0]),
    });
    const account = () => (connectedAddress ?? "0x") as Address;

    // ── Write ──────────────────────────────────────────────────────────────────

    const requestToJoin = async (params: {
        orgId: bigint;
        message: string;
    }): Promise<`0x${string}`> => {
        if (organizationFactoryAddress === ZERO_ADDRESS) {
            throw new Error("OrganizationFactory contract not deployed on this chain yet.");
        }
        return send(
            [
                {
                    to: organizationFactoryAddress,
                    abi: organizationFactoryJoinAbi as Abi,
                    functionName: "requestToJoin",
                    args: [params.orgId, params.message],
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
        orgId: bigint;
        requester: Address;
        govTokenAddress: Address;
    }): Promise<`0x${string}`> => {
        if (!isAddress(params.requester)) throw new Error("Invalid requester address");
        return send(
            [
                {
                    to: organizationFactoryAddress,
                    abi: organizationFactoryJoinAbi as Abi,
                    functionName: "approveJoinRequest",
                    args: [params.orgId, params.requester],
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
        orgId: bigint;
        requester: Address;
    }): Promise<`0x${string}`> =>
        send(
            [
                {
                    to: organizationFactoryAddress,
                    abi: organizationFactoryJoinAbi as Abi,
                    functionName: "rejectJoinRequest",
                    args: [params.orgId, params.requester],
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
        async (orgId: bigint): Promise<boolean> => {
            if (!walletAddress) return false;
            if (organizationFactoryAddress === ZERO_ADDRESS) return false;
            return (await publicClient.readContract({
                address: organizationFactoryAddress,
                abi: organizationFactoryJoinAbi as Abi,
                functionName: "hasPendingRequest",
                args: [walletAddress, orgId],
            })) as boolean;
        },
        [walletAddress, organizationFactoryAddress, publicClient],
    );

    return {
        requestToJoin,
        approveWithTokens,
        rejectRequest,
        getPendingRequests,
        hasPendingRequest,
    };
}
