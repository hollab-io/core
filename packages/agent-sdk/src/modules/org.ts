import type { IndexingClient } from "@hollab-io/indexing-client";
import { organizationFactoryAbi, organizationInstanceAbi } from "@hollab-io/contracts/actions";
import { decodeEventLog } from "viem";

import type { CreateOrgResult, HollabAgentConfig, TxResult } from "../types.js";

/**
 * Organization management module.
 *
 * Post-refactor: per-org state (members, admins, join requests, agent links)
 * lives on an OrganizationInstance clone — the factory is a thin directory.
 * Write helpers take the instance address directly; callers who only have an
 * orgId can resolve it via `resolveInstance(orgId)`.
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

        // Parse OrganizationCreated(orgId, subname, creator, instance) off the receipt.
        let orgId = 0n;
        let instance: `0x${string}` = "0x0000000000000000000000000000000000000000";
        for (const log of receipt.logs) {
            try {
                const decoded = decodeEventLog({
                    abi: organizationFactoryAbi,
                    data: log.data,
                    topics: log.topics as unknown as [`0x${string}`, ...`0x${string}`[]],
                });
                if (decoded.eventName === "OrganizationCreated") {
                    const args = decoded.args as {
                        _orgId: bigint;
                        _instance: `0x${string}`;
                    };
                    orgId = args._orgId;
                    instance = args._instance;
                    break;
                }
            } catch {
                // non-matching log — skip
            }
        }

        return { txHash, orgId, instance };
    }

    /**
     * Resolve an orgId to its OrganizationInstance clone address.
     * Returns address(0) if the org doesn't exist.
     */
    async resolveInstance(orgId: bigint): Promise<`0x${string}`> {
        const { publicClient, orgFactoryAddress } = this.config;
        return (await publicClient.readContract({
            abi: organizationFactoryAbi,
            address: orgFactoryAddress,
            functionName: "getOrganization",
            args: [orgId],
        })) as `0x${string}`;
    }

    /** Add a member to an organization. Admin-only. */
    async addMember(instance: `0x${string}`, member: `0x${string}`): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;
        const txHash = await walletClient.writeContract({
            abi: organizationInstanceAbi,
            address: instance,
            functionName: "addMember",
            args: [member],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Remove a member from an organization. Admin-only. */
    async removeMember(instance: `0x${string}`, member: `0x${string}`): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;
        const txHash = await walletClient.writeContract({
            abi: organizationInstanceAbi,
            address: instance,
            functionName: "removeMember",
            args: [member],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Submit a join request from the connected wallet. */
    async requestToJoin(instance: `0x${string}`, message: string): Promise<TxResult> {
        const { walletClient, publicClient } = this.config;
        const txHash = await walletClient.writeContract({
            abi: organizationInstanceAbi,
            address: instance,
            functionName: "requestToJoin",
            args: [message],
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { txHash };
    }

    /** Query organization details from the indexer. */
    async get(orgId: string): ReturnType<IndexingClient["getOrganization"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.getOrganization(orgId);
    }

    /** List all organizations, optionally filtered by creator. */
    async list(creator?: `0x${string}`): ReturnType<IndexingClient["listOrganizations"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        if (creator) {
            return client.listOrganizationsByCreator(creator);
        }
        return client.listOrganizations();
    }

    /** List members of an organization. */
    async listMembers(orgId: string): ReturnType<IndexingClient["listOrgMembersByOrg"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listOrgMembersByOrg(this.config.orgFactoryAddress, orgId);
    }
}
