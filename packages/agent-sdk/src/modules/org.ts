import { organizationFactoryAbi } from "@hollab-io/contracts/actions";

import type { CreateOrgResult, HollabAgentConfig, TxResult } from "../types.js";

/**
 * Organization management module.
 * Handles creating orgs, managing membership, and querying org state.
 */
export class OrgModule {
    constructor(private config: HollabAgentConfig) {}

    /** Create a new organization with a governance token and ENS subname. */
    async create(
        subname: string,
        purpose: string,
        tokenConfig: {
            tokenName: string;
            tokenSymbol: string;
            initialHolders?: readonly `0x${string}`[];
            initialAmounts?: readonly bigint[];
        },
    ): Promise<CreateOrgResult> {
        const { walletClient, publicClient, orgFactoryAddress } = this.config;

        const txHash = await walletClient.writeContract({
            abi: organizationFactoryAbi,
            address: orgFactoryAddress,
            functionName: "createOrganization",
            args: [
                subname,
                purpose,
                {
                    tokenName: tokenConfig.tokenName,
                    tokenSymbol: tokenConfig.tokenSymbol,
                    initialHolders: tokenConfig.initialHolders ?? [],
                    initialAmounts: tokenConfig.initialAmounts ?? [],
                },
            ],
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        let orgId = 0n;
        for (const log of receipt.logs) {
            if (log.topics.length >= 2 && log.topics[1]) {
                orgId = BigInt(log.topics[1]);
                break;
            }
        }

        return { txHash, orgId };
    }

    /** Add a member to an organization. */
    async addMember(orgId: bigint, member: `0x${string}`): Promise<TxResult> {
        const { walletClient, publicClient, orgFactoryAddress } = this.config;

        const txHash = await walletClient.writeContract({
            abi: organizationFactoryAbi,
            address: orgFactoryAddress,
            functionName: "addOrgMember",
            args: [orgId, member],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Remove a member from an organization. */
    async removeMember(orgId: bigint, member: `0x${string}`): Promise<TxResult> {
        const { walletClient, publicClient, orgFactoryAddress } = this.config;

        const txHash = await walletClient.writeContract({
            abi: organizationFactoryAbi,
            address: orgFactoryAddress,
            functionName: "removeOrgMember",
            args: [orgId, member],
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Query organization details from the indexer. */
    async get(orgId: string) {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.getOrganization(orgId);
    }

    /** List all organizations, optionally filtered by creator. */
    async list(creator?: `0x${string}`) {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        if (creator) {
            return client.listOrganizationsByCreator(creator);
        }
        return client.listOrganizations();
    }

    /** List members of an organization. */
    async listMembers(orgId: string) {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listOrgMembersByOrg(this.config.orgFactoryAddress, orgId);
    }
}
