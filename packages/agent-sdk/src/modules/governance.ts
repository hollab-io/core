import { meetingFactoryAbi } from "@hollab-io/contracts/actions";

import type {
    AmendRoleInput,
    CreateRoleInput,
    ElectionInput,
    ExecuteGovernanceResult,
    HollabAgentConfig,
} from "../types.js";
import {
    encodeAmendRole,
    encodeCreateRole,
    encodeElection,
    encodeRemoveRole,
} from "../encoding.js";
import { ChangeType } from "../types.js";

/**
 * Governance module.
 * Execute structure changes through the onchain governance process.
 * All structural changes (create/amend/remove roles, elections) must go through this module.
 */
export class GovernanceModule {
    constructor(private config: HollabAgentConfig) {}

    /** Create a new role through the governance process. */
    async createRole(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        input: CreateRoleInput,
    ): Promise<ExecuteGovernanceResult> {
        return this.execute(
            meetingFactoryAddress,
            orgId,
            ChangeType.CreateRole,
            encodeCreateRole(input),
        );
    }

    /** Amend an existing role through the governance process. */
    async amendRole(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        input: AmendRoleInput,
    ): Promise<ExecuteGovernanceResult> {
        return this.execute(
            meetingFactoryAddress,
            orgId,
            ChangeType.AmendRole,
            encodeAmendRole(input),
        );
    }

    /** Remove a role through the governance process. */
    async removeRole(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        roleId: bigint,
    ): Promise<ExecuteGovernanceResult> {
        return this.execute(
            meetingFactoryAddress,
            orgId,
            ChangeType.RemoveRole,
            encodeRemoveRole(roleId),
        );
    }

    /** Assign a role lead through the governance election process. */
    async electLead(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        input: ElectionInput,
    ): Promise<ExecuteGovernanceResult> {
        return this.execute(
            meetingFactoryAddress,
            orgId,
            ChangeType.Election,
            encodeElection(input.roleId, input.lead),
        );
    }

    /** Execute a raw governance change. Use the typed methods above for common operations. */
    async execute(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        changeType: number,
        data: `0x${string}`,
    ): Promise<ExecuteGovernanceResult> {
        const { walletClient, publicClient } = this.config;

        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "executeGovernance",
            args: [orgId, changeType, data],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        let resultId = 0n;
        for (const log of receipt.logs) {
            if (log.topics.length >= 4 && log.topics[3]) {
                resultId = BigInt(log.topics[3]);
                break;
            }
        }

        return { txHash, resultId };
    }

    /** List proposals for a circle from the indexer. */
    async listProposals(processAddress: `0x${string}`, circleId: string) {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listProposalsByCircle(processAddress, circleId);
    }
}
