/**
 * useExecuteGovernance — executes adopted governance proposals on-chain.
 *
 * In Holacracy, structural changes (create/amend/remove roles) can ONLY happen
 * through the governance process. This hook calls MeetingFactory.executeGovernance()
 * which forwards the change to RoleRegistry.
 */
import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, encodeAbiParameters, http } from "viem";
import { useAccount, useWalletClient } from "wagmi";

import { useChain } from "../context/ChainContext";

/** Maps to HolacracyTypes.ChangeType enum in the contract */
export const ChangeType = {
    CreateRole: 0,
    AmendRole: 1,
    RemoveRole: 2,
    CreatePolicy: 3,
    AmendPolicy: 4,
    RemovePolicy: 5,
    MoveRole: 6,
    Election: 7,
    CreateRoleWithRefs: 8,
    AmendRoleWithRefs: 9,
    CreatePolicyWithRefs: 10,
    AmendPolicyWithRefs: 11,
} as const;

export type ChangeTypeValue = (typeof ChangeType)[keyof typeof ChangeType];

export type ExecuteGovernanceParams = {
    meetingFactoryAddress: `0x${string}`;
    orgId: bigint;
    changeType: ChangeTypeValue;
    /** ABI-encoded data for the change. Use the encode* helpers below. */
    data: `0x${string}`;
};

export type ExecuteGovernanceResult = {
    txHash: `0x${string}`;
    resultId: bigint;
};

// ── Encoding helpers ─────────────────────────────────────────────────────────

const roleParamTypes = [
    { type: "uint256" as const },
    { type: "string" as const },
    { type: "string" as const },
    { type: "string[]" as const },
    { type: "string[]" as const },
] as const;

/** Encode a CreateRole change: abi.encode(circleId, name, purpose, domains[], accountabilities[]) */
export function encodeCreateRole(params: {
    circleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
}): `0x${string}` {
    return encodeAbiParameters(roleParamTypes, [
        params.circleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
    ]);
}

/** Encode an AmendRole change: abi.encode(roleId, name, purpose, domains[], accountabilities[]) */
export function encodeAmendRole(params: {
    roleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
}): `0x${string}` {
    return encodeAbiParameters(roleParamTypes, [
        params.roleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
    ]);
}

/** Encode a RemoveRole change: abi.encode(roleId) */
export function encodeRemoveRole(roleId: bigint): `0x${string}` {
    return encodeAbiParameters([{ type: "uint256" }], [roleId]);
}

/** Encode an Election change (assign role lead): abi.encode(roleId, lead) */
export function encodeElection(roleId: bigint, lead: `0x${string}`): `0x${string}` {
    return encodeAbiParameters([{ type: "uint256" }, { type: "address" }], [roleId, lead]);
}

// ── WithRefs encoding helpers ───────────────────────────────────────────────

type ContentRefInput = {
    contentHash: `0x${string}`;
    visibility: number; // 0 = Public, 1 = OrgEncrypted, 2 = RoleEncrypted
};

const roleWithRefsParamTypes = [
    { type: "uint256" as const },
    { type: "string" as const },
    { type: "string" as const },
    { type: "string[]" as const },
    { type: "string[]" as const },
    { type: "bytes32[]" as const },
    {
        type: "tuple[]" as const,
        components: [
            { type: "bytes32" as const, name: "contentHash" },
            { type: "uint8" as const, name: "visibility" },
        ],
    },
] as const;

/** Encode a CreateRoleWithRefs change */
export function encodeCreateRoleWithRefs(params: {
    circleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
    fieldNames: `0x${string}`[];
    refs: ContentRefInput[];
}): `0x${string}` {
    return encodeAbiParameters(roleWithRefsParamTypes, [
        params.circleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
        params.fieldNames,
        params.refs.map((r) => ({ contentHash: r.contentHash, visibility: r.visibility })),
    ]);
}

/** Encode an AmendRoleWithRefs change */
export function encodeAmendRoleWithRefs(params: {
    roleId: bigint;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
    fieldNames: `0x${string}`[];
    refs: ContentRefInput[];
}): `0x${string}` {
    return encodeAbiParameters(roleWithRefsParamTypes, [
        params.roleId,
        params.name,
        params.purpose,
        params.domains,
        params.accountabilities,
        params.fieldNames,
        params.refs.map((r) => ({ contentHash: r.contentHash, visibility: r.visibility })),
    ]);
}

// ── Mutation hook ────────────────────────────────────────────────────────────

export function useExecuteGovernance() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { chainConfig } = useChain();
    const queryClient = useQueryClient();

    return useMutation<ExecuteGovernanceResult, Error, ExecuteGovernanceParams>({
        mutationFn: async (params) => {
            if (!walletClient || !address) {
                throw new Error("No wallet connected");
            }

            const txHash = await walletClient.writeContract({
                abi: meetingFactoryAbi,
                address: params.meetingFactoryAddress,
                functionName: "executeGovernance",
                account: address,
                chain: chainConfig.chain,
                args: [params.orgId, params.changeType, params.data],
            });

            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });

            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

            // Parse GovernanceExecuted event for the resultId (3rd indexed topic)
            let resultId = 0n;
            for (const log of receipt.logs) {
                if (log.topics.length >= 4 && log.topics[3]) {
                    resultId = BigInt(log.topics[3]);
                    break;
                }
            }

            return { txHash, resultId };
        },

        onSuccess: (_, params) => {
            const orgId = params.orgId.toString();
            void queryClient.invalidateQueries({ queryKey: ["roles", orgId] });
            void queryClient.invalidateQueries({ queryKey: ["circles", orgId] });
        },
    });
}
