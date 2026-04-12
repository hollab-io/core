/**
 * useContentRef — content hashing and on-chain ContentRef reads.
 *
 * Provides:
 *  - computeContentHash(text) — keccak256 of UTF-8 bytes
 *  - fieldNameHash(name)      — keccak256 of field name string
 *  - useReadContentRef()      — reads a ContentRef from RoleRegistry
 */
import type { Address } from "viem";
import { roleRegistryAbi } from "@hollab-io/viem-extension";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, keccak256, toBytes } from "viem";

import { useChain } from "../context/ChainContext";

/** Hash arbitrary text content to bytes32 (same as keccak256(abi.encodePacked(text)) in Solidity) */
export function computeContentHash(text: string): `0x${string}` {
    return keccak256(toBytes(text));
}

/** Hash a field name string to bytes32 for use as a ContentRef key */
export function fieldNameHash(name: string): `0x${string}` {
    return keccak256(toBytes(name));
}

/** DataVisibility enum values matching HolacracyTypes.DataVisibility */
export const DataVisibility = {
    Public: 0,
    OrgEncrypted: 1,
    RoleEncrypted: 2,
} as const;

export type DataVisibilityValue = (typeof DataVisibility)[keyof typeof DataVisibility];

export type ContentRef = {
    contentHash: `0x${string}`;
    visibility: DataVisibilityValue;
};

/** Read a ContentRef from RoleRegistry for a given role + field name */
export function useReadContentRef(
    roleRegistryAddress: Address | undefined,
    roleId: bigint | undefined,
    fieldName: string | undefined,
) {
    const { chainConfig } = useChain();

    return useQuery({
        queryKey: ["contentRef", roleRegistryAddress, roleId?.toString(), fieldName],
        queryFn: async () => {
            const client = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });

            const ref = await client.readContract({
                abi: roleRegistryAbi,
                address: roleRegistryAddress!,
                functionName: "getRoleContentRef",
                args: [roleId!, fieldNameHash(fieldName!)],
            });

            return ref as { contentHash: `0x${string}`; visibility: number };
        },
        enabled: !!roleRegistryAddress && roleId !== undefined && !!fieldName,
    });
}
