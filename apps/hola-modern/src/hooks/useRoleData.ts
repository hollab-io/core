/**
 * useRoleData — read/write per-role checklist items and metrics via the
 * RoleDataRegistry clone. Reads go through the Ponder indexer; writes call
 * RoleDataRegistry directly (role-lead or admin authorization).
 */
import type { ChecklistItem, Metric } from "@hollab-io/indexing-client";
import type { Address } from "viem";
import { roleDataRegistryAbi } from "@hollab-io/contracts/actions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { getIndexingClient } from "./useOrganizationsFromIndexer";
import { useSendTransaction } from "./useSendTransaction";

export type { ChecklistItem, Metric };

// ── Reads ─────────────────────────────────────────────────────────────────────

export function useChecklistItems(
    registryAddress: Address | undefined,
    roleId: bigint | undefined,
) {
    const roleKey = roleId !== undefined ? roleId.toString() : null;
    return useQuery<ChecklistItem[]>({
        queryKey: ["checklistItems", registryAddress, roleKey],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !registryAddress || roleKey === null) return [];
            const result = await client.listChecklistItemsByRole(registryAddress, roleKey);
            return result.items.filter((item) => item.isActive);
        },
        enabled: Boolean(registryAddress && roleKey !== null),
    });
}

export function useMetrics(registryAddress: Address | undefined, roleId: bigint | undefined) {
    const roleKey = roleId !== undefined ? roleId.toString() : null;
    return useQuery<Metric[]>({
        queryKey: ["metrics", registryAddress, roleKey],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !registryAddress || roleKey === null) return [];
            const result = await client.listMetricsByRole(registryAddress, roleKey);
            return result.items.filter((item) => item.isActive);
        },
        enabled: Boolean(registryAddress && roleKey !== null),
    });
}

export function useChecklistItemsByContract(registryAddress: Address | undefined) {
    return useQuery<ChecklistItem[]>({
        queryKey: ["checklistItems", registryAddress, "all"],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !registryAddress) return [];
            const result = await client.listChecklistItemsByContract(registryAddress);
            return result.items.filter((item) => item.isActive);
        },
        enabled: Boolean(registryAddress),
    });
}

export function useMetricsByContract(registryAddress: Address | undefined) {
    return useQuery<Metric[]>({
        queryKey: ["metrics", registryAddress, "all"],
        queryFn: async () => {
            const client = getIndexingClient();
            if (!client || !registryAddress) return [];
            const result = await client.listMetricsByContract(registryAddress);
            return result.items.filter((item) => item.isActive);
        },
        enabled: Boolean(registryAddress),
    });
}

// ── Writes ────────────────────────────────────────────────────────────────────

export function useAddChecklistItem(registryAddress: Address | undefined) {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { roleId: bigint; label: string }) => {
            if (!address || !registryAddress) throw new Error("Wallet or registry missing");
            return send(
                [
                    {
                        to: registryAddress,
                        abi: roleDataRegistryAbi,
                        functionName: "addChecklistItem",
                        args: [params.roleId, params.label],
                    },
                ],
                address,
            );
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ["checklistItems", registryAddress, params.roleId.toString()],
            });
        },
    });
}

export function useRemoveChecklistItem(registryAddress: Address | undefined) {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { itemId: bigint; roleId: bigint }) => {
            if (!address || !registryAddress) throw new Error("Wallet or registry missing");
            return send(
                [
                    {
                        to: registryAddress,
                        abi: roleDataRegistryAbi,
                        functionName: "removeChecklistItem",
                        args: [params.itemId],
                    },
                ],
                address,
            );
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ["checklistItems", registryAddress, params.roleId.toString()],
            });
        },
    });
}

export function useAddMetric(registryAddress: Address | undefined) {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { roleId: bigint; label: string }) => {
            if (!address || !registryAddress) throw new Error("Wallet or registry missing");
            return send(
                [
                    {
                        to: registryAddress,
                        abi: roleDataRegistryAbi,
                        functionName: "addMetric",
                        args: [params.roleId, params.label],
                    },
                ],
                address,
            );
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ["metrics", registryAddress, params.roleId.toString()],
            });
        },
    });
}

export function useRemoveMetric(registryAddress: Address | undefined) {
    const { address } = useAccount();
    const { send } = useSendTransaction();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (params: { metricId: bigint; roleId: bigint }) => {
            if (!address || !registryAddress) throw new Error("Wallet or registry missing");
            return send(
                [
                    {
                        to: registryAddress,
                        abi: roleDataRegistryAbi,
                        functionName: "removeMetric",
                        args: [params.metricId],
                    },
                ],
                address,
            );
        },
        onSuccess: (_, params) => {
            queryClient.invalidateQueries({
                queryKey: ["metrics", registryAddress, params.roleId.toString()],
            });
        },
    });
}
