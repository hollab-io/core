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

/** Treasury-related event */
export interface TreasuryEvent extends IndexedEvent {
    type: "Deposited" | "TokenDeposited" | "CallScheduled" | "CallExecuted" | "Cancelled";
    operationId?: string;
    sender?: string;
    token?: string;
    amount?: bigint;
    target?: string;
    value?: bigint;
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

/** Event indexer configuration */
export interface EventIndexerConfig {
    /** RPC URL for the chain */
    rpcUrl: string;
    /** Contract addresses to index */
    contracts: {
        circleRegistry: `0x${string}`;
        roleRegistry: `0x${string}`;
        governanceProcess: `0x${string}`;
        circleTreasury: `0x${string}`;
    };
    /** Organization ID to scope events */
    orgId: bigint;
    /** Block chunk size for historical sync */
    chunkSize?: number;
}
