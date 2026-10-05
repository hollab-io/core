/**
 * useSetOkrs — propose updating the OKR blob for a (role, quarter) pair.
 *
 * OKR changes go through governance: the caller uploads the new objectives
 * to IPFS and raises an AmendRoleWithRefs proposal that re-points the role's
 * on-chain content ref for fieldName=keccak256("okr:{quarter}") to the new
 * blob. Proposal adoption requires zero open objections (standard IDM).
 *
 * The caller (msg.sender) must be a lead of `proposerRoleId`.
 */
import type { OkrObjective } from "@hollab-io/hollab-sdk";
import { meetingFactoryAbi, roleRegistryAbi } from "@hollab-io/contracts/actions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPublicClient, http, keccak256, toBytes } from "viem";
import { useAccount } from "wagmi";

import type { DataVisibilityValue } from "./useContentRef";
import { useChain } from "../context/ChainContext";
import { DataVisibility } from "./useContentRef";
import { useEncryptedStorage } from "./useEncryptedStorage";
import { ChangeType, encodeAmendRoleWithRefs } from "./useExecuteGovernance";
import { okrFieldNameHash } from "./useOkrObjectives";
import { useSendTransaction } from "./useSendTransaction";

export type SetOkrsParams = {
    meetingFactoryAddress: `0x${string}`;
    roleRegistryAddress: `0x${string}`;
    orgId: bigint;
    circleId: bigint;
    roleId: bigint;
    /** Role the proposer is representing (must be a lead). Defaults to the amended role. */
    proposerRoleId?: bigint;
    quarter: string;
    objectives: OkrObjective[];
    visibility?: DataVisibilityValue;
    /** Free-text tension — only the hash is stored on-chain */
    tension?: string;
};

export type SetOkrsResult = {
    txHash: `0x${string}`;
    contentHash: `0x${string}`;
};

export function useSetOkrs() {
    const { address } = useAccount();
    const { encryptAndUpload } = useEncryptedStorage();
    const { send } = useSendTransaction();
    const { chainConfig } = useChain();
    const queryClient = useQueryClient();

    return useMutation<SetOkrsResult, Error, SetOkrsParams>({
        mutationFn: async (params) => {
            if (!address) throw new Error("Wallet not connected");

            const visibility = params.visibility ?? DataVisibility.OrgEncrypted;
            const proposerRoleId = params.proposerRoleId ?? params.roleId;

            // 1. Read current role state so the proposal leaves everything
            //    other than the OKR content ref unchanged.
            const publicClient = createPublicClient({
                chain: chainConfig.chain,
                transport: http(chainConfig.chain.rpcUrls.default.http[0]),
            });
            const role = await publicClient.readContract({
                abi: roleRegistryAbi,
                address: params.roleRegistryAddress,
                functionName: "getRole",
                args: [params.roleId],
            });

            // 2. Serialize + upload + encrypt.
            const text = JSON.stringify(params.objectives);
            const { contentHash } = await encryptAndUpload.mutateAsync({
                text,
                visibility,
                orgId: params.orgId,
                circleId: params.circleId,
                roleId: params.roleId,
            });

            // 3. Build AmendRoleWithRefs payload with existing role fields + new OKR ref.
            const encodedData = encodeAmendRoleWithRefs({
                roleId: params.roleId,
                name: role.name,
                purpose: role.purpose,
                domains: [...role.domains],
                accountabilities: [...role.accountabilities],
                fieldNames: [okrFieldNameHash(params.quarter)],
                refs: [{ contentHash, visibility }],
            });

            const tensionText =
                params.tension ?? `OKR update for role ${params.roleId} ${params.quarter}`;
            const tensionHash = keccak256(toBytes(tensionText));

            // 4. Submit the proposal. Adoption is a separate step (done by any
            //    member once objections are resolved).
            const txHash = await send(
                [
                    {
                        to: params.meetingFactoryAddress,
                        abi: meetingFactoryAbi,
                        functionName: "createProposal",
                        args: [
                            params.orgId,
                            params.circleId,
                            proposerRoleId,
                            tensionHash,
                            ChangeType.AmendRoleWithRefs,
                            encodedData,
                        ],
                    },
                ],
                address,
            );

            return { txHash, contentHash };
        },
        onSuccess: (_result, params) => {
            queryClient.invalidateQueries({
                queryKey: [
                    "okrs",
                    params.roleRegistryAddress,
                    params.roleId.toString(),
                    params.quarter,
                ],
            });
            queryClient.invalidateQueries({ queryKey: ["publicOpenProposals"] });
        },
    });
}
