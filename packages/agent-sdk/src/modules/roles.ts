import type { IndexingClient } from "@hollab-io/indexing-client";

import type { HollabAgentConfig } from "../types.js";

/**
 * Roles query module.
 * Reads role data from the indexer. Role mutations go through the governance module.
 */
export class RolesModule {
    constructor(private config: HollabAgentConfig) {}

    /** Get a single role by ID. */
    async get(roleId: string): ReturnType<IndexingClient["getRole"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.getRole(roleId);
    }

    /** List all roles in an organization. */
    async listByOrg(orgId: string): ReturnType<IndexingClient["listRolesByOrg"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listRolesByOrg(orgId);
    }

    /** List roles in a specific circle/team. */
    async listByCircle(
        registryAddress: `0x${string}`,
        circleId: string,
    ): ReturnType<IndexingClient["listRolesByCircle"]> {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listRolesByCircle(registryAddress, circleId);
    }
}
