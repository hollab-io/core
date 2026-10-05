import type { ContentRefEvent, ProposalEvent, RoleChange } from "../types/events.types.js";

/**
 * Watches on-chain governance events and dispatches them to registered
 * handlers. (The Ponder indexer is the queryable audit trail; this no longer
 * mirrors events to off-chain storage.)
 */
export interface IEventIndexer {
    /** Start watching for new events, optionally from a specific block. */
    start(fromBlock?: bigint): Promise<void>;

    /** Stop watching for events. */
    stop(): Promise<void>;

    /** Manually sync all events for an org from a specific block. */
    syncOrg(orgId: bigint, fromBlock?: bigint): Promise<void>;

    /** Register a handler for proposal events. */
    onProposalSubmitted(handler: (event: ProposalEvent) => void): void;

    /** Register a handler for role change events. */
    onRoleChanged(handler: (event: RoleChange) => void): void;

    /** Register a handler for ContentRefSet events */
    onContentRefSet(handler: (event: ContentRefEvent) => void): void;
}
