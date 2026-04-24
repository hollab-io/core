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
 * Contract bounds for the per-org proposal expiry window. Mirrors
 * MeetingFactory.MIN_PROPOSAL_MAX_AGE / MAX_PROPOSAL_MAX_AGE — keep in sync
 * if either constant changes.
 */
export const MIN_PROPOSAL_MAX_AGE_SECONDS = 60 * 60; // 1 hour
export const MAX_PROPOSAL_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

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

// ── Read: elected-lock state for a circle's officers ───────────────────────

export type CircleOfficerLocks = {
    facilitatorLocked: boolean;
    secretaryLocked: boolean;
};

/**
 * Reads `isFacilitatorElected(circleId)` and `isSecretaryElected(circleId)`
 * in parallel from the given MeetingFactory clone. Once a Facilitator/Secretary
 * Election adopts for the circle, the corresponding admin bootstrap setter
 * locks — surface that in the UI so users don't learn via a revert.
 */
export function useCircleOfficerLocks(
    meetingFactoryAddress: `0x${string}` | undefined,
    circleId: bigint | undefined,
): { locks: CircleOfficerLocks; isLoading: boolean } {
    const { chainConfig } = useChain();

    const query = useQuery({
        queryKey: [
            "circleOfficerLocks",
            chainConfig.chain.id,
            meetingFactoryAddress,
            circleId?.toString(),
        ],
        enabled: !!meetingFactoryAddress && circleId !== undefined,
        queryFn: async (): Promise<CircleOfficerLocks> => {
            if (!meetingFactoryAddress || circleId === undefined) {
                return { facilitatorLocked: false, secretaryLocked: false };
            }
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });
            const [facilitatorLocked, secretaryLocked] = await Promise.all([
                publicClient.readContract({
                    address: meetingFactoryAddress,
                    abi: meetingFactoryAbi,
                    functionName: "isFacilitatorElected",
                    args: [circleId],
                }),
                publicClient.readContract({
                    address: meetingFactoryAddress,
                    abi: meetingFactoryAbi,
                    functionName: "isSecretaryElected",
                    args: [circleId],
                }),
            ]);
            return {
                facilitatorLocked: Boolean(facilitatorLocked),
                secretaryLocked: Boolean(secretaryLocked),
            };
        },
        // Lock state only flips once per election adoption — safe to cache.
        staleTime: 60 * 1000,
    });

    return {
        locks: query.data ?? { facilitatorLocked: false, secretaryLocked: false },
        isLoading: query.isLoading,
    };
}

// ── Bootstrap facilitator / secretary (admin only, pre-election) ───────────

export type SetCircleOfficerParams = {
    meetingFactoryAddress: `0x${string}`;
    circleId: bigint;
    holder: `0x${string}`;
};

/**
 * Admin-only bootstrap setter for a circle's Facilitator. Locks once a
 * FacilitatorElection adopts for the circle; subsequent changes must go
 * through governance. Reverts surface via the mutation's error state.
 */
export function useSetCircleFacilitator() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: SetCircleOfficerParams) => {
            if (!address) throw new Error("Connect a wallet to set the facilitator.");
            const txHash = await send(
                [
                    {
                        to: params.meetingFactoryAddress,
                        abi: meetingFactoryAbi,
                        functionName: "setCircleFacilitator",
                        args: [params.circleId, params.holder],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: () => {
            // Circle snapshot refreshes on CircleFacilitatorSet — invalidate reads.
            queryClient.invalidateQueries({ queryKey: ["circles"] });
        },
    });
}

/** Admin-only bootstrap setter for a circle's Secretary. Mirrors Facilitator. */
export function useSetCircleSecretary() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: SetCircleOfficerParams) => {
            if (!address) throw new Error("Connect a wallet to set the secretary.");
            const txHash = await send(
                [
                    {
                        to: params.meetingFactoryAddress,
                        abi: meetingFactoryAbi,
                        functionName: "setCircleSecretary",
                        args: [params.circleId, params.holder],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["circles"] });
        },
    });
}

// ── Set proposal max age (admin only) ───────────────────────────────────────

export type SetProposalMaxAgeParams = {
    meetingFactoryAddress: `0x${string}`;
    /** New window in seconds. Must be in [MIN, MAX]_PROPOSAL_MAX_AGE_SECONDS. */
    maxAgeSeconds: number;
};

/**
 * Admin-only per-org setter for the proposal expiry window. The contract
 * enforces `org.isAdmin(msg.sender)` and the [1h, 30d] range — we still
 * clamp client-side to give a cleaner error than a revert.
 */
export function useSetProposalMaxAge() {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();
    const { chainConfig } = useChain();

    return useMutation({
        mutationFn: async (params: SetProposalMaxAgeParams) => {
            if (!address) throw new Error("Connect a wallet to update the expiry window.");
            const seconds = Math.floor(params.maxAgeSeconds);
            if (seconds < MIN_PROPOSAL_MAX_AGE_SECONDS || seconds > MAX_PROPOSAL_MAX_AGE_SECONDS) {
                throw new Error(
                    `Expiry window must be between 1 hour and 30 days. Got ${seconds}s.`,
                );
            }
            const txHash = await send(
                [
                    {
                        to: params.meetingFactoryAddress,
                        abi: meetingFactoryAbi,
                        functionName: "setProposalMaxAge",
                        args: [BigInt(seconds)],
                    },
                ],
                address,
            );
            return { txHash };
        },
        onSuccess: (_data, params) => {
            queryClient.invalidateQueries({
                queryKey: ["proposalMaxAge", chainConfig.chain.id, params.meetingFactoryAddress],
            });
        },
    });
}
