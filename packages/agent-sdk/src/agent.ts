import type { HollabAgentConfig } from "./types.js";
import { CirclesModule } from "./modules/circles.js";
import { GovernanceModule } from "./modules/governance.js";
import { MeetingsModule } from "./modules/meetings.js";
import { OrgModule } from "./modules/org.js";
import { RolesModule } from "./modules/roles.js";
import { VotingModule } from "./modules/voting.js";

/**
 * HollabAgent — unified SDK for agents and systems to integrate with hollab.eth.
 *
 * Provides a high-level, framework-agnostic API for the full governance lifecycle:
 * creating organizations, managing roles and teams, running syncs and proposal reviews,
 * executing structure changes, and voting on outputs.
 *
 * @example
 * ```ts
 * import { HollabAgent } from "@hollab-io/agent-sdk";
 * import { createWalletClient, createPublicClient, http } from "viem";
 * import { sepolia } from "viem/chains";
 * import { privateKeyToAccount } from "viem/accounts";
 *
 * const account = privateKeyToAccount("0x...");
 * const agent = new HollabAgent({
 *     walletClient: createWalletClient({ account, chain: sepolia, transport: http() }),
 *     publicClient: createPublicClient({ chain: sepolia, transport: http() }),
 *     indexerUrl: "https://indexer.hollab.eth/graphql",
 *     orgFactoryAddress: "0x...",
 * });
 *
 * // Read org structure
 * const org = await agent.org.get(orgId);
 * const roles = await agent.roles.listByOrg(orgId);
 *
 * // Execute governance
 * const { resultId } = await agent.governance.createRole(meetingFactory, orgId, {
 *     circleId: 1n,
 *     name: "Marketing Lead",
 *     purpose: "Drive community growth",
 *     accountabilities: ["Social media", "Content strategy"],
 * });
 * ```
 */
export class HollabAgent {
    /** Organization operations (create, join, members). */
    readonly org: OrgModule;
    /** Role queries (list, get). Mutations go through governance. */
    readonly roles: RolesModule;
    /** Circle/team queries (list, get). */
    readonly circles: CirclesModule;
    /** Meeting operations (start/end syncs and proposal reviews, record outputs). */
    readonly meetings: MeetingsModule;
    /** Governance execution (create/amend/remove roles, elections). */
    readonly governance: GovernanceModule;
    /** Voting operations (create votes, cast votes, manage collaborator weight). */
    readonly voting: VotingModule;

    /** The wallet address this agent operates as. */
    readonly address: `0x${string}`;

    constructor(config: HollabAgentConfig) {
        this.address = config.walletClient.account.address;
        this.org = new OrgModule(config);
        this.roles = new RolesModule(config);
        this.circles = new CirclesModule(config);
        this.meetings = new MeetingsModule(config);
        this.governance = new GovernanceModule(config);
        this.voting = new VotingModule(config);
    }
}
