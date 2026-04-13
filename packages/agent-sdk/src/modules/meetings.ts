import type { IndexingClient } from "@hollab-io/indexing-client";
import { meetingFactoryAbi } from "@hollab-io/contracts/actions";

import type {
    HollabAgentConfig,
    RecordOutputInput,
    StartMeetingResult,
    TxResult,
} from "../types.js";

/**
 * Meetings module.
 * Start/end syncs and proposal reviews, record outputs.
 */
export class MeetingsModule {
    constructor(private config: HollabAgentConfig) {}

    /** Start a new team sync (tactical meeting). */
    async startSync(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
    ): Promise<StartMeetingResult> {
        return this._startMeeting(meetingFactoryAddress, orgId, 0);
    }

    /** Start a new proposal review (governance meeting). */
    async startProposalReview(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
    ): Promise<StartMeetingResult> {
        return this._startMeeting(meetingFactoryAddress, orgId, 1);
    }

    /** End a meeting (sync or proposal review). */
    async end(
        meetingFactoryAddress: `0x${string}`,
        meetingId: bigint,
        orgId: bigint,
        kind: 0 | 1,
    ): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;

        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "endMeeting",
            args: [meetingId, orgId, kind],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Record an output from a team sync (action, project, request, or information). */
    async recordOutput(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        input: RecordOutputInput,
    ): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;
        const zeroAddress = "0x0000000000000000000000000000000000000000" as `0x${string}`;

        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "recordOutput",
            args: [
                input.meetingId,
                orgId,
                input.outputType,
                input.description,
                input.assignedTo ?? zeroAddress,
                input.roleId ?? 0n,
            ],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** List team syncs (tactical meetings) for a contract. */
    async listSyncs(
        contractAddress: `0x${string}`,
    ): ReturnType<IndexingClient["listTacticalMeetingsByContract"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listTacticalMeetingsByContract(contractAddress);
    }

    /** List proposal reviews (governance meetings) for a contract. */
    async listProposalReviews(
        contractAddress: `0x${string}`,
    ): ReturnType<IndexingClient["listGovernanceMeetingsByContract"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listGovernanceMeetingsByContract(contractAddress);
    }

    /** List outputs from a specific meeting. */
    async listOutputs(
        contractAddress: `0x${string}`,
        meetingId: string,
    ): ReturnType<IndexingClient["listMeetingOutputs"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listMeetingOutputs(contractAddress, meetingId);
    }

    private async _startMeeting(
        meetingFactoryAddress: `0x${string}`,
        orgId: bigint,
        kind: 0 | 1,
    ): Promise<StartMeetingResult> {
        const { walletClient, publicClient } = this.config;

        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "startMeeting",
            args: [orgId, kind],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        let meetingId = 0n;
        for (const log of receipt.logs) {
            if (log.topics.length >= 2 && log.topics[1]) {
                meetingId = BigInt(log.topics[1]);
                break;
            }
        }

        return { txHash, meetingId };
    }
}
