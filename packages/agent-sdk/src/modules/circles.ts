import type { HollabAgentConfig } from "../types.js";

/**
 * Circles (teams) query module.
 * Reads circle/team data from the indexer.
 */
export class CirclesModule {
    constructor(private config: HollabAgentConfig) {}

    /** Get a single circle/team by ID. */
    async get(circleId: string) {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.getCircle(circleId);
    }

    /** List all circles/teams in an organization. */
    async listByOrg(orgId: string) {
        const { createIndexingClient } = await import("@hollab-io/indexing-client");
        const client = createIndexingClient(this.config.indexerUrl);
        return client.listCirclesByOrg(orgId);
    }
}
