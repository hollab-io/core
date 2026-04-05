/**
 * useTensionBoard — interact with the TensionBoard contract.
 *
 * Anyone (including non-members) can submit a tension for a circle.
 * Org admins can champion, dismiss, or mark tensions as processed.
 */
import type { Tension } from "@hollab-io/indexing-client";
import type { Abi, Address } from "viem";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { getIndexingClient } from "./useOrganizationsFromIndexer";
import { useSendTransaction } from "./useSendTransaction";

export type { Tension };

// ── Contract address ─────────────────────────────────────────────────────────
export const TENSION_BOARD_ADDRESS = (import.meta.env.VITE_TENSION_BOARD_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as Address;

// ── ABI (inline — contract not yet in wagmi codegen) ─────────────────────────

export const tensionBoardAbi = [
    {
        type: "function",
        name: "submitTension",
        stateMutability: "nonpayable",
        inputs: [
            { name: "orgId", type: "uint256" },
            { name: "circleId", type: "uint256" },
            { name: "target", type: "uint8" },
            { name: "title", type: "string" },
            { name: "description", type: "string" },
        ],
        outputs: [{ name: "tensionId", type: "uint256" }],
    },
    {
        type: "function",
        name: "champion",
        stateMutability: "nonpayable",
        inputs: [{ name: "tensionId", type: "uint256" }],
        outputs: [],
    },
    {
        type: "function",
        name: "dismiss",
        stateMutability: "nonpayable",
        inputs: [{ name: "tensionId", type: "uint256" }],
        outputs: [],
    },
    {
        type: "function",
        name: "markProcessed",
        stateMutability: "nonpayable",
        inputs: [{ name: "tensionId", type: "uint256" }],
        outputs: [],
    },
] as const satisfies Abi;

/** 0=Tactical 1=Governance */
export type TensionTarget = 0 | 1;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTensionBoard(orgId: string | null) {
    const { primaryWallet } = useDynamicContext();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    const account = () => (primaryWallet?.address ?? "0x") as Address;

    // ── Query: open tensions for this org ────────────────────────────────────

    const { data: tensions = [], isLoading: loading } = useQuery({
        queryKey: ["tensions", orgId],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !orgId) return [];
            const result = await client.listOpenTensionsByOrg(orgId);
            return result.items;
        },
        enabled: Boolean(orgId),
    });

    const refetch = useCallback(() => {
        return queryClient.invalidateQueries({ queryKey: ["tensions", orgId] });
    }, [queryClient, orgId]);

    // ── Write: submit a tension (anyone can call) ────────────────────────────

    const submitTension = useCallback(
        async (params: {
            orgId: bigint;
            circleId: bigint;
            target: TensionTarget;
            title: string;
            description: string;
        }): Promise<`0x${string}`> => {
            if (TENSION_BOARD_ADDRESS === "0x0000000000000000000000000000000000000000") {
                throw new Error(
                    "TensionBoard contract not deployed yet. Set VITE_TENSION_BOARD_ADDRESS.",
                );
            }
            const hash = await send(
                [
                    {
                        to: TENSION_BOARD_ADDRESS,
                        abi: tensionBoardAbi as Abi,
                        functionName: "submitTension",
                        args: [
                            params.orgId,
                            params.circleId,
                            params.target,
                            params.title,
                            params.description,
                        ],
                    },
                ],
                account(),
            );
            void refetch();
            return hash;
        },
        [send, account, refetch],
    );

    // ── Write: champion a tension (org admin) ────────────────────────────────

    const championTension = useCallback(
        async (tensionId: bigint): Promise<`0x${string}`> => {
            const hash = await send(
                [
                    {
                        to: TENSION_BOARD_ADDRESS,
                        abi: tensionBoardAbi as Abi,
                        functionName: "champion",
                        args: [tensionId],
                    },
                ],
                account(),
            );
            void refetch();
            return hash;
        },
        [send, account, refetch],
    );

    // ── Write: dismiss a tension (org admin) ─────────────────────────────────

    const dismissTension = useCallback(
        async (tensionId: bigint): Promise<`0x${string}`> => {
            const hash = await send(
                [
                    {
                        to: TENSION_BOARD_ADDRESS,
                        abi: tensionBoardAbi as Abi,
                        functionName: "dismiss",
                        args: [tensionId],
                    },
                ],
                account(),
            );
            void refetch();
            return hash;
        },
        [send, account, refetch],
    );

    // ── Write: mark processed (org admin) ────────────────────────────────────

    const markProcessed = useCallback(
        async (tensionId: bigint): Promise<`0x${string}`> => {
            const hash = await send(
                [
                    {
                        to: TENSION_BOARD_ADDRESS,
                        abi: tensionBoardAbi as Abi,
                        functionName: "markProcessed",
                        args: [tensionId],
                    },
                ],
                account(),
            );
            void refetch();
            return hash;
        },
        [send, account, refetch],
    );

    return {
        tensions,
        loading,
        refetch,
        submitTension,
        championTension,
        dismissTension,
        markProcessed,
    };
}
