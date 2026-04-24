// Ponder returns bigint columns as strings over GraphQL.
// Hex columns come back as lowercase `0x…` strings.
type BigIntStr = string;
type HexStr = string;

export type RegistryIndex = {
    registryAddress: HexStr;
    orgId: BigIntStr;
    factoryAddress: HexStr;
};

export type Organization = {
    id: BigIntStr;
    subname: string;
    name: string;
    creator: HexStr;
    token: HexStr;
    /** OrganizationInstance clone — one-stop address for membership, join, admin, agent links. */
    instanceAddress: HexStr;
    circleRegistry: HexStr;
    roleRegistry: HexStr;
    governanceProcess: HexStr;
    anchorCircleId: BigIntStr;
    tokenName: string;
    tokenSymbol: string;
    tokenTotalSupply: BigIntStr;
    circleCount: BigIntStr;
    roleCount: BigIntStr;
    memberCount: BigIntStr;
    purpose: string;
    createdAt: BigIntStr;
    updatedAt: BigIntStr;
};

export type Circle = {
    id: string;
    circleId: BigIntStr;
    orgId: BigIntStr;
    registryAddress: HexStr;
    name: string;
    purpose: string;
    isAnchor: boolean;
    parentCircleId: BigIntStr;
    roleId: BigIntStr;
    facilitator: HexStr;
    secretary: HexStr;
    circleRep: HexStr;
    circleLeads: HexStr[];
    roleIds: BigIntStr[];
    subCircleIds: BigIntStr[];
    policyIds: BigIntStr[];
    updatedAt: BigIntStr;
};

export type Role = {
    id: string;
    roleId: BigIntStr;
    orgId: BigIntStr;
    registryAddress: HexStr;
    circleId: BigIntStr;
    name: string;
    purpose: string;
    domains: string[];
    accountabilities: string[];
    leads: HexStr[];
    isExpandedToCircle: boolean;
    expandedCircleId: BigIntStr;
    updatedAt: BigIntStr;
};

export type Policy = {
    id: string;
    policyId: BigIntStr;
    orgId: BigIntStr;
    registryAddress: HexStr;
    circleId: BigIntStr;
    name: string;
    body: string;
    updatedAt: BigIntStr;
};

/** 0=Draft 1=Active 2=Integrating 3=Adopted 4=Withdrawn 5=Discarded 6=Escalated */
export type ProposalStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Proposal = {
    id: string;
    proposalId: BigIntStr;
    processAddress: HexStr;
    orgId: BigIntStr;
    circleId: BigIntStr;
    proposer: HexStr;
    proposerRoleId: BigIntStr;
    /** Content-address of off-chain tension text (CIDv1 / 0G root / keccak). */
    tensionHash: HexStr;
    /**
     * Plaintext tension, populated when the proposer used
     * `createProposalWithTension`. `keccak256(tensionText) === tensionHash`
     * when non-null. `null` means the proposer committed only a hash; consumers
     * must resolve the text via the storage backend (IPFS / 0G) indicated by
     * `tensionHash`, or fall back to a "no description" display.
     */
    tensionText: string | null;
    /** uint8 mirroring HolacracyTypes.ChangeType — see `ChangeType` in `@hollab-io/agent-sdk`. */
    changeType: number;
    /** ABI-encoded change payload; same shape executeGovernance accepts. */
    changeData: HexStr;
    /** ID of the entity created/affected on adoption. Null until adopted. */
    changeResultId: BigIntStr | null;
    status: ProposalStatus;
    submittedAt: BigIntStr;
    resolvedAt: BigIntStr | null;
    /** Address that adopted or discarded the proposal. Null until resolved. */
    resolvedBy: HexStr | null;
    txHash: HexStr;
};

/** 0=Raised 1=Testing 2=Valid 3=Invalid 4=Resolved 5=Abandoned */
export type ObjectionStatus = 0 | 1 | 2 | 3 | 4 | 5;

export type Objection = {
    id: string;
    objectionId: BigIntStr;
    processAddress: HexStr;
    proposalId: BigIntStr;
    objector: HexStr;
    /** Role the objector is representing (§5.3). 0 when the caller used the facilitator/secretary bypass. */
    objectorRoleId: BigIntStr;
    /** Content-address of off-chain concern text. */
    concernHash: HexStr;
    status: ObjectionStatus;
    raisedAt: BigIntStr;
    resolvedAt: BigIntStr | null;
    /** Objector (withdrawal) or circle Facilitator (§5.3.3). Null until resolved. */
    resolvedBy: HexStr | null;
    txHash: HexStr;
};

// ─── Tactical meetings ────────────────────────────────────────────────────────

export type TacticalMeeting = {
    id: string;
    meetingId: BigIntStr;
    contractAddress: HexStr;
    circleId: BigIntStr;
    orgId: BigIntStr;
    convenedBy: HexStr;
    createdAt: BigIntStr;
    completedAt: BigIntStr | null;
    txHash: HexStr;
};

/** 0=NextAction 1=Project 2=Request 3=Information */
export type OutputType = 0 | 1 | 2 | 3;

export type MeetingOutput = {
    id: string;
    outputId: BigIntStr;
    contractAddress: HexStr;
    meetingId: BigIntStr;
    outputType: OutputType;
    description: string;
    assignedTo: HexStr;
    roleId: BigIntStr;
    createdAt: BigIntStr;
    txHash: HexStr;
};

export type ChecklistItem = {
    id: string;
    itemId: BigIntStr;
    contractAddress: HexStr;
    roleId: BigIntStr;
    label: string;
    isActive: boolean;
    createdAt: BigIntStr;
    txHash: HexStr;
};

export type Metric = {
    id: string;
    metricId: BigIntStr;
    contractAddress: HexStr;
    roleId: BigIntStr;
    label: string;
    isActive: boolean;
    createdAt: BigIntStr;
    txHash: HexStr;
};

// ─── Governance meetings ──────────────────────────────────────────────────────

export type GovernanceMeeting = {
    id: string;
    meetingId: BigIntStr;
    contractAddress: HexStr;
    circleId: BigIntStr;
    orgId: BigIntStr;
    convenedBy: HexStr;
    createdAt: BigIntStr;
    completedAt: BigIntStr | null;
    txHash: HexStr;
};

export type GovernanceMeetingLink = {
    id: string;
    contractAddress: HexStr;
    meetingId: BigIntStr;
    proposalId: BigIntStr;
    linkedAt: BigIntStr;
    txHash: HexStr;
};

// ─── Action voting ────────────────────────────────────────────────────────────

export type ActionVote = {
    id: string;
    voteId: BigIntStr;
    contractAddress: HexStr;
    circleId: BigIntStr;
    outputId: BigIntStr;
    proposer: HexStr;
    reason: string;
    snapshotBlock: BigIntStr;
    deadline: BigIntStr;
    forVotes: BigIntStr;
    againstVotes: BigIntStr;
    abstainVotes: BigIntStr;
    createdAt: BigIntStr;
    txHash: HexStr;
};

/** 0=Against 1=For 2=Abstain */
export type ActionVoteSupport = 0 | 1 | 2;

export type ActionVoteCast = {
    id: string;
    contractAddress: HexStr;
    voteId: BigIntStr;
    voter: HexStr;
    support: ActionVoteSupport;
    weight: BigIntStr;
    castAt: BigIntStr;
    txHash: HexStr;
};

export type ContentRef = {
    id: string;
    registryAddress: HexStr;
    entityType: HexStr;
    entityId: BigIntStr;
    fieldName: HexStr;
    contentHash: HexStr;
    visibility: number;
    updatedAt: BigIntStr;
    txHash: HexStr;
};

export type MeetingComponentSet = {
    id: string;
    orgId: BigIntStr;
    meetingFactory: HexStr;
    actionVoting: HexStr;
    roleDataRegistry: HexStr;
    deployedAt: BigIntStr;
    txHash: HexStr;
};

// ─── Org members ─────────────────────────────────────────────────────────────

export type OrgMember = {
    id: string;
    registryAddress: HexStr;
    orgId: BigIntStr;
    memberAddress: HexStr;
    addedAt: BigIntStr;
    txHash: HexStr;
};

// ─── Join requests ────────────────────────────────────────────────────────────

/** 0=Pending 1=Approved 2=Rejected */
export type JoinRequestStatus = 0 | 1 | 2;

export type JoinRequest = {
    id: string;
    requestId: BigIntStr;
    contractAddress: HexStr;
    requester: HexStr;
    orgId: BigIntStr;
    message: string;
    status: JoinRequestStatus;
    submittedAt: BigIntStr;
    resolvedAt: BigIntStr | null;
    txHash: HexStr;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export type PageInfo = {
    startCursor: string | null;
    endCursor: string | null;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
};

export type PaginatedResult<T> = {
    items: T[];
    pageInfo: PageInfo;
};

// ─── Query options ────────────────────────────────────────────────────────────

export type PaginationOptions = {
    limit?: number;
    after?: string;
    before?: string;
};
