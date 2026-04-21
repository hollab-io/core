/**
 * Write-side mutations for the on-chain proposal + objection lifecycle
 * shipped on 2026-04-15 (MeetingFactory v2). Pairs with the read hooks
 * in useProposalsFromIndexer — each mutation invalidates the cached
 * queries so the UI reflects the new state after the tx is indexed.
 *
 * Contract boundary: MeetingFactory (the per-org governance process).
 */
import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, http, keccak256, stringToHex, zeroHash } from "viem";
import { useAccount } from "wagmi";

import { useChain } from "../context/ChainContext";
import { useSendTransaction } from "./useSendTransaction";

type Meeting = {
    /** The per-org MeetingFactory clone address. */
    governanceMeetingAddress: `0x${string}`;
    /** The indexer's composite id used to key proposal/objection queries: `<address>-<id>`. */
    processAddress: `0x${string}`;
};

/** Hash free-text concern client-side; text stays off-chain. */
function hashConcern(text: string | undefined, fallback?: `0x${string}`): `0x${string}` {
    if (fallback) return fallback;
    if (!text || !text.trim()) return zeroHash;
    return keccak256(stringToHex(text.trim()));
}

/** Invalidate the read hooks that back the proposal/objection UI. */
function invalidateProposalQueries(
    queryClient: ReturnType<typeof useQueryClient>,
    processAddress: `0x${string}`,
    proposalId: string,
) {
    queryClient.invalidateQueries({ queryKey: ["publicOpenProposals"] });
    queryClient.invalidateQueries({
        queryKey: ["publicProposal", `${processAddress}-${proposalId}`],
    });
    queryClient.invalidateQueries({ queryKey: ["publicObjections", processAddress, proposalId] });
}

// ── Raise objection ─────────────────────────────────────────────────────────

export type RaiseObjectionParams = {
    meeting: Meeting;
    proposalId: bigint;
    /**
     * The role the objector is representing (§5.3 Representation Rule).
     * Must be a role the caller leads in the proposal's circle, OR `0n` when
     * the caller is the circle's elected Facilitator/Secretary.
     */
    objectorRoleId: bigint;
    /** Free-text concern, hashed client-side. Pass `concernHash` to use a precomputed ref. */
    concernText?: string;
    concernHash?: `0x${string}`;
};

export function useRaiseObjection() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: RaiseObjectionParams) => {
            if (!address) throw new Error("Connect a wallet to raise an objection.");
            const concernHash = hashConcern(params.concernText, params.concernHash);
            const txHash = await send(
                [
                    {
                        to: params.meeting.governanceMeetingAddress,
                        abi: meetingFactoryAbi,
                        functionName: "raiseObjection",
                        args: [params.proposalId, params.objectorRoleId, concernHash],
                    },
                ],
                address,
            );
            return { txHash, concernHash };
        },
        onSuccess: (_data, params) => {
            invalidateProposalQueries(
                queryClient,
                params.meeting.processAddress,
                params.proposalId.toString(),
            );
        },
    });
}

// ── Resolve objection ───────────────────────────────────────────────────────

export type ResolveObjectionParams = {
    meeting: Meeting;
    proposalId: bigint;
    objectionId: bigint;
};

export function useResolveObjection() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: ResolveObjectionParams) => {
            if (!address) throw new Error("Connect a wallet to resolve an objection.");
            const txHash = await send(
                [
                    {
                        to: params.meeting.governanceMeetingAddress,
                        abi: meetingFactoryAbi,
                        functionName: "resolveObjection",
                        args: [params.objectionId],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: (_data, params) => {
            invalidateProposalQueries(
                queryClient,
                params.meeting.processAddress,
                params.proposalId.toString(),
            );
        },
    });
}

// ── Adopt proposal ──────────────────────────────────────────────────────────

export type AdoptProposalParams = {
    meeting: Meeting;
    proposalId: bigint;
};

export function useAdoptProposal() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: AdoptProposalParams) => {
            if (!address) throw new Error("Connect a wallet to adopt the proposal.");
            const txHash = await send(
                [
                    {
                        to: params.meeting.governanceMeetingAddress,
                        abi: meetingFactoryAbi,
                        functionName: "adoptProposal",
                        args: [params.proposalId],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: (_data, params) => {
            invalidateProposalQueries(
                queryClient,
                params.meeting.processAddress,
                params.proposalId.toString(),
            );
        },
    });
}

// ── Discard proposal (proposer or circle Facilitator, §5.3.4) ─────────────

export type DiscardProposalParams = {
    meeting: Meeting;
    proposalId: bigint;
};

export function useDiscardProposal() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: DiscardProposalParams) => {
            if (!address) throw new Error("Connect a wallet to discard the proposal.");
            const txHash = await send(
                [
                    {
                        to: params.meeting.governanceMeetingAddress,
                        abi: meetingFactoryAbi,
                        functionName: "discardProposal",
                        args: [params.proposalId],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: (_data, params) => {
            invalidateProposalQueries(
                queryClient,
                params.meeting.processAddress,
                params.proposalId.toString(),
            );
        },
    });
}

// ── Discard expired (permissionless) ────────────────────────────────────────

export type DiscardExpiredProposalParams = {
    meeting: Meeting;
    proposalId: bigint;
};

export function useDiscardExpiredProposal() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: DiscardExpiredProposalParams) => {
            if (!address) throw new Error("Connect a wallet to discard the proposal.");
            const txHash = await send(
                [
                    {
                        to: params.meeting.governanceMeetingAddress,
                        abi: meetingFactoryAbi,
                        functionName: "discardExpiredProposal",
                        args: [params.proposalId],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: (_data, params) => {
            invalidateProposalQueries(
                queryClient,
                params.meeting.processAddress,
                params.proposalId.toString(),
            );
        },
    });
}

// ── Derivations ─────────────────────────────────────────────────────────────

/**
 * Fallback value used while the on-chain `proposalMaxAge` read is in flight.
 * Matches `MeetingFactory.DEFAULT_PROPOSAL_MAX_AGE` so behavior is consistent
 * with a freshly-initialized clone that has not been reconfigured.
 * See specs/99-agent-native-divergence.md — the per-org value is authoritative
 * and can be read via `useProposalMaxAge(meetingFactoryAddress)`.
 */
export const DEFAULT_PROPOSAL_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function isProposalExpired(
    submittedAt: string | bigint | number,
    maxAgeSeconds: number,
    nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
    const submitted = typeof submittedAt === "bigint" ? Number(submittedAt) : Number(submittedAt);
    return nowSeconds - submitted > maxAgeSeconds;
}

export function secondsUntilExpiry(
    submittedAt: string | bigint | number,
    maxAgeSeconds: number,
    nowSeconds = Math.floor(Date.now() / 1000),
): number {
    const submitted = typeof submittedAt === "bigint" ? Number(submittedAt) : Number(submittedAt);
    return maxAgeSeconds - (nowSeconds - submitted);
}

/**
 * Reads the per-org `proposalMaxAge` from the given MeetingFactory clone.
 * Value is authoritative; falls back to {@link DEFAULT_PROPOSAL_MAX_AGE_SECONDS}
 * during the initial load.
 */
export function useProposalMaxAge(meetingFactoryAddress: `0x${string}` | undefined): {
    maxAgeSeconds: number;
    isLoading: boolean;
} {
    const { chainConfig } = useChain();

    const query = useQuery({
        queryKey: ["proposalMaxAge", chainConfig.chain.id, meetingFactoryAddress],
        enabled: !!meetingFactoryAddress,
        queryFn: async () => {
            if (!meetingFactoryAddress) return DEFAULT_PROPOSAL_MAX_AGE_SECONDS;
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });
            const raw = await publicClient.readContract({
                address: meetingFactoryAddress,
                abi: meetingFactoryAbi,
                functionName: "proposalMaxAge",
            });
            return Number(raw);
        },
        // proposalMaxAge changes via admin tx, which is rare; cache for 5 min.
        staleTime: 5 * 60 * 1000,
    });

    return {
        maxAgeSeconds: query.data ?? DEFAULT_PROPOSAL_MAX_AGE_SECONDS,
        isLoading: query.isLoading,
    };
}
