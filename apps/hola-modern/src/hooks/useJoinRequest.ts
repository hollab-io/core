/**
 * useJoinRequest — interact with the JoinRequest contract.
 *
 * Outsiders call requestToJoin(orgId, message).
 * Org admins call approveWithTokens(requestId, requester, govToken)
 *   which batches approve() + ERC-20 transfer(requester, 100 tokens)
 *   into a single ZeroDev UserOp (or two sequential EOA txs as fallback).
 */
import type { Abi, Address } from "viem";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { isAddress } from "viem";

import { getIndexingClient } from "./useOrganizationsFromIndexer";
import { useSendTransaction } from "./useSendTransaction";

// ── Contract addresses ────────────────────────────────────────────────────────
// Set VITE_JOIN_REQUEST_ADDRESS after running DeployJoinRequest.s.sol
export const JOIN_REQUEST_ADDRESS = (import.meta.env.VITE_JOIN_REQUEST_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as Address;

const TOKENS_PER_APPROVAL = 100n * 10n ** 18n; // 100 tokens

// ── ABIs (inline — contract not yet in wagmi codegen) ─────────────────────────

export const joinRequestAbi = [
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
        name: "approve",
        stateMutability: "nonpayable",
        inputs: [{ name: "requestId", type: "uint256" }],
        outputs: [],
    },
    {
        type: "function",
        name: "reject",
        stateMutability: "nonpayable",
        inputs: [{ name: "requestId", type: "uint256" }],
        outputs: [],
    },
    {
        type: "function",
        name: "getRequest",
        stateMutability: "view",
        inputs: [{ name: "requestId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "id", type: "uint256" },
                    { name: "requester", type: "address" },
                    { name: "orgId", type: "uint256" },
                    { name: "message", type: "string" },
                    { name: "status", type: "uint8" },
                    { name: "submittedAt", type: "uint256" },
                    { name: "resolvedAt", type: "uint256" },
                ],
            },
        ],
    },
    {
        type: "function",
        name: "getPendingOrgRequests",
        stateMutability: "view",
        inputs: [{ name: "orgId", type: "uint256" }],
        outputs: [
            {
                name: "result",
                type: "tuple[]",
                components: [
                    { name: "id", type: "uint256" },
                    { name: "requester", type: "address" },
                    { name: "orgId", type: "uint256" },
                    { name: "message", type: "string" },
                    { name: "status", type: "uint8" },
                    { name: "submittedAt", type: "uint256" },
                    { name: "resolvedAt", type: "uint256" },
                ],
            },
        ],
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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useJoinRequest() {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();

    const account = () => (primaryWallet?.address ?? "0x") as Address;

    // ── Write ─────────────────────────────────────────────────────────────────

    const requestToJoin = async (params: {
        orgId: bigint;
        message: string;
    }): Promise<`0x${string}`> => {
        if (JOIN_REQUEST_ADDRESS === "0x0000000000000000000000000000000000000000") {
            throw new Error(
                "JoinRequest contract not deployed yet. Set VITE_JOIN_REQUEST_ADDRESS.",
            );
        }
        return send(
            [
                {
                    to: JOIN_REQUEST_ADDRESS,
                    abi: joinRequestAbi as Abi,
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
        requestId: bigint;
        requester: Address;
        govTokenAddress: Address;
    }): Promise<`0x${string}`> => {
        if (!isAddress(params.requester)) throw new Error("Invalid requester address");
        return send(
            [
                {
                    to: JOIN_REQUEST_ADDRESS,
                    abi: joinRequestAbi as Abi,
                    functionName: "approve",
                    args: [params.requestId],
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

    const rejectRequest = async (params: { requestId: bigint }): Promise<`0x${string}`> =>
        send(
            [
                {
                    to: JOIN_REQUEST_ADDRESS,
                    abi: joinRequestAbi as Abi,
                    functionName: "reject",
                    args: [params.requestId],
                },
            ],
            account(),
        );

    // ── Read (via indexer) ────────────────────────────────────────────────────

    const getPendingRequests = async (orgId: bigint): Promise<JoinRequestEntry[]> => {
        const client = getIndexingClient();
        if (!client) return [];
        const result = await client.listPendingJoinRequestsByOrg(orgId.toString(), { limit: 100 });
        return result.items.map((r) => ({
            id: BigInt(r.requestId),
            requester: r.requester as Address,
            orgId: BigInt(r.orgId),
            message: r.message,
            status: r.status as JoinRequestStatus,
            submittedAt: BigInt(r.submittedAt),
            resolvedAt: BigInt(r.resolvedAt ?? 0),
        }));
    };

    const hasPendingRequest = async (orgId: bigint): Promise<boolean> => {
        if (!primaryWallet?.address) return false;
        const client = getIndexingClient();
        if (!client) return false;
        const result = await client.listPendingJoinRequestsByOrg(orgId.toString(), { limit: 1 });
        return result.items.some(
            (r) => r.requester.toLowerCase() === primaryWallet.address?.toLowerCase(),
        );
    };

    return {
        requestToJoin,
        approveWithTokens,
        rejectRequest,
        getPendingRequests,
        hasPendingRequest,
    };
}
