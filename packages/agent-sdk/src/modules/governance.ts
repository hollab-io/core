import type { IndexingClient } from "@hollab-io/indexing-client";
import { meetingFactoryAbi } from "@hollab-io/contracts/actions";
import { decodeEventLog, keccak256, stringToHex, zeroHash } from "viem";

import type { ChangeTypeValue, HollabAgentConfig } from "../types.js";

/**
 * Input for createProposal. `tensionText` is hashed with keccak256 before
 * submission — the raw text stays off-chain; only its hash is committed.
 * Pass `tensionHash` directly if the content is stored on IPFS/0G and you
 * already have the address.
 */
export type CreateProposalInput = {
    orgId: bigint;
    circleId: bigint;
    /** 0 if the proposer is not currently a role lead. */
    proposerRoleId?: bigint;
    tensionText?: string;
    tensionHash?: `0x${string}`;
    changeType: ChangeTypeValue;
    changeData: `0x${string}`;
};

export type CreateProposalResult = { txHash: `0x${string}`; proposalId: bigint };
export type AdoptProposalResult = { txHash: `0x${string}`; resultId: bigint };
export type RaiseObjectionResult = { txHash: `0x${string}`; objectionId: bigint };

/**
 * Governance module.
 *
 * Structural changes (create/amend/remove roles, elections) flow through the
 * on-chain proposal lifecycle: createProposal → adoptProposal. The contract
 * does not expose a "do both at once" shortcut; callers wanting that
 * ergonomic either batch the two writes (viem multicall, wallet_sendCalls)
 * or issue them sequentially.
 */
export class GovernanceModule {
    constructor(private config: HollabAgentConfig) {}

    /** List proposals for a circle from the indexer. */
    async listProposals(
        processAddress: `0x${string}`,
        circleId: string,
    ): ReturnType<IndexingClient["listProposalsByCircle"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listProposalsByCircle(processAddress, circleId);
    }

    /*//////////////////////////////////////////////////////////////
                       PROPOSAL LIFECYCLE
    //////////////////////////////////////////////////////////////*/

    /**
     * Create a Draft proposal on-chain. Any org member may call.
     * The contract stores the full `changeData` so `adoptProposal` later
     * does not need it re-supplied.
     */
    async createProposal(
        meetingFactoryAddress: `0x${string}`,
        input: CreateProposalInput,
    ): Promise<CreateProposalResult> {
        const { walletClient, publicClient } = this.config;
        const tensionHash =
            input.tensionHash ??
            (input.tensionText ? keccak256(stringToHex(input.tensionText)) : zeroHash);

        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "createProposal",
            args: [
                input.orgId,
                input.circleId,
                input.proposerRoleId ?? 0n,
                tensionHash,
                input.changeType,
                input.changeData,
            ],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        const proposalId = findIdFromEvent(receipt.logs, "ProposalCreated", "_proposalId");
        return { txHash, proposalId };
    }

    /**
     * Adopt a Draft proposal, applying its change to the RoleRegistry.
     * Org admin only. Returns the resultId (roleId for role changes).
     */
    async adoptProposal(
        meetingFactoryAddress: `0x${string}`,
        proposalId: bigint,
    ): Promise<AdoptProposalResult> {
        const { walletClient, publicClient } = this.config;
        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "adoptProposal",
            args: [proposalId],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        const resultId = findResultIdFromAdoptedEvent(receipt.logs);
        return { txHash, resultId };
    }

    /** Discard a Draft proposal. Org admin only. */
    async discardProposal(
        meetingFactoryAddress: `0x${string}`,
        proposalId: bigint,
    ): Promise<{ txHash: `0x${string}` }> {
        const { walletClient, publicClient } = this.config;
        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "discardProposal",
            args: [proposalId],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Raise an objection against a Draft proposal. Any org member. */
    async raiseObjection(
        meetingFactoryAddress: `0x${string}`,
        proposalId: bigint,
        concern: { text?: string; hash?: `0x${string}` },
    ): Promise<RaiseObjectionResult> {
        const { walletClient, publicClient } = this.config;
        const concernHash =
            concern.hash ?? (concern.text ? keccak256(stringToHex(concern.text)) : zeroHash);
        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "raiseObjection",
            args: [proposalId, concernHash],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        const objectionId = findIdFromEvent(receipt.logs, "ObjectionRaised", "_objectionId");
        return { txHash, objectionId };
    }

    /** Resolve a Raised objection. Original objector or org admin. */
    async resolveObjection(
        meetingFactoryAddress: `0x${string}`,
        objectionId: bigint,
    ): Promise<{ txHash: `0x${string}` }> {
        const { walletClient, publicClient } = this.config;
        const txHash = await walletClient.writeContract({
            abi: meetingFactoryAbi,
            address: meetingFactoryAddress,
            functionName: "resolveObjection",
            args: [objectionId],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** List open (Draft) proposals for an org from the indexer. */
    async listOpenProposalsByOrg(
        orgId: bigint,
    ): ReturnType<IndexingClient["listOpenProposalsByOrg"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listOpenProposalsByOrg(orgId.toString());
    }

    /** Get a single proposal by its composite id (`<processAddress>-<proposalId>`). */
    async getProposal(id: string): ReturnType<IndexingClient["getProposal"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.getProposal(id);
    }
}

// ── Log parsing helpers ────────────────────────────────────────────────────

type ReceiptLog = {
    address: `0x${string}`;
    topics: readonly `0x${string}`[];
    data: `0x${string}`;
};

/**
 * Generic "find the first event with matching name and return the named arg
 * as a bigint". Used for ProposalCreated._proposalId and
 * ObjectionRaised._objectionId — both are the first indexed topic on their
 * respective events, so this is a single decode per receipt in the happy path.
 */
function findIdFromEvent(
    logs: readonly ReceiptLog[],
    eventName: "ProposalCreated" | "ObjectionRaised",
    argName: "_proposalId" | "_objectionId",
): bigint {
    for (const log of logs) {
        try {
            const decoded = decodeEventLog({
                abi: meetingFactoryAbi,
                data: log.data,
                topics: log.topics as unknown as [`0x${string}`, ...`0x${string}`[]],
            });
            if (decoded.eventName === eventName) {
                const args = decoded.args as Record<string, unknown>;
                return args[argName] as bigint;
            }
        } catch {
            // Not a MeetingFactory event — skip.
        }
    }
    throw new Error(`${eventName} event not found in receipt logs`);
}

function findResultIdFromAdoptedEvent(logs: readonly ReceiptLog[]): bigint {
    for (const log of logs) {
        try {
            const decoded = decodeEventLog({
                abi: meetingFactoryAbi,
                data: log.data,
                topics: log.topics as unknown as [`0x${string}`, ...`0x${string}`[]],
            });
            if (decoded.eventName === "ProposalAdopted") {
                return (decoded.args as { _resultId: bigint })._resultId;
            }
        } catch {
            /* skip non-matching logs */
        }
    }
    throw new Error("ProposalAdopted event not found in receipt logs");
}
