import type { IndexingClient } from "@hollab-io/indexing-client";
import { actionVotingAbi } from "@hollab-io/contracts/actions";

import type {
    CastVoteInput,
    CreateVoteInput,
    CreateVoteResult,
    HollabAgentConfig,
    TxResult,
} from "../types.js";

/**
 * Voting module.
 * Create and cast votes on meeting outputs.
 */
export class VotingModule {
    constructor(private config: HollabAgentConfig) {}

    /** Create a new vote on a meeting output. */
    async create(votingAddress: `0x${string}`, input: CreateVoteInput): Promise<CreateVoteResult> {
        const { walletClient, publicClient } = this.config;

        const txHash = await walletClient.writeContract({
            abi: actionVotingAbi,
            address: votingAddress,
            functionName: "createVote",
            args: [input.circleId, input.outputId, input.reason, BigInt(input.duration)],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        let voteId = 0n;
        for (const log of receipt.logs) {
            if (log.topics.length >= 2 && log.topics[1]) {
                voteId = BigInt(log.topics[1]);
                break;
            }
        }

        return { txHash, voteId };
    }

    /** Cast a vote (For, Against, or Abstain). */
    async cast(votingAddress: `0x${string}`, input: CastVoteInput): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;

        const txHash = await walletClient.writeContract({
            abi: actionVotingAbi,
            address: votingAddress,
            functionName: "castVote",
            args: [input.voteId, input.support],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Grant collaborator voting weight to an external address. */
    async grantCollaboratorWeight(
        votingAddress: `0x${string}`,
        circleId: bigint,
        collaborator: `0x${string}`,
        weight: bigint,
    ): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;

        const txHash = await walletClient.writeContract({
            abi: actionVotingAbi,
            address: votingAddress,
            functionName: "grantCollaboratorWeight",
            args: [circleId, collaborator, weight],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** List votes for a circle from the indexer. */
    async listByCircle(
        contractAddress: `0x${string}`,
        circleId: string,
    ): ReturnType<IndexingClient["listActionVotesByCircle"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listActionVotesByCircle(contractAddress, circleId);
    }

    /** List individual vote casts for a specific vote. */
    async listCasts(
        contractAddress: `0x${string}`,
        voteId: string,
    ): ReturnType<IndexingClient["listActionVoteCasts"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listActionVoteCasts(contractAddress, voteId);
    }
}
