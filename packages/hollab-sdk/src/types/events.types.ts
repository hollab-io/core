/** Base event from chain indexer */
export interface IndexedEvent {
    blockNumber: bigint;
    transactionHash: string;
    logIndex: number;
    timestamp: number;
}

/** Proposal-related event */
export interface ProposalEvent extends IndexedEvent {
    type:
        | "ProposalSubmitted"
        | "ProposalActivated"
        | "ProposalAdopted"
        | "ProposalWithdrawn"
        | "ProposalDiscarded";
    proposalId: bigint;
    circleId?: bigint;
    proposer?: string;
}

/** Role change event */
export interface RoleChange extends IndexedEvent {
    type: "RoleCreated" | "RoleUpdated" | "RoleRemoved" | "RoleLeadAssigned" | "RoleLeadUnassigned";
    roleId: bigint;
    circleId?: bigint;
    lead?: string;
    name?: string;
}

/** Circle change event */
export interface CircleChange extends IndexedEvent {
    type:
        | "AnchorCircleCreated"
        | "SubCircleCreated"
        | "CircleRoleCreated"
        | "ElectedRoleSet"
        | "CircleLeadAdded"
        | "CircleLeadRemoved"
        | "PolicyAdded"
        | "PolicyRemoved"
        | "RoleLeadAssignedViaCircle";
    circleId: bigint;
    parentCircleId?: bigint;
    roleId?: bigint;
    lead?: string;
    policyId?: bigint;
    name?: string;
}

/** Content ref event from any contract */
export interface ContentRefEvent extends IndexedEvent {
    type: "ContentRefSet";
    entityType: string;
    entityId: bigint;
    fieldName: string;
    contentHash: string;
    visibility: number;
}

/** Event indexer configuration */
export interface EventIndexerConfig {
    /** RPC URL for the chain */
    rpcUrl: string;
    /** Contract addresses to index */
    contracts: {
        roleRegistry: `0x${string}`;
    };
    /** Organization ID to scope events */
    orgId: bigint;
    /** Block chunk size for historical sync */
    chunkSize?: number;
}
