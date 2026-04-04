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
    governor: HexStr;
    token: HexStr;
    timelock: HexStr;
    circleRegistry: HexStr;
    roleRegistry: HexStr;
    governanceProcess: HexStr;
    anchorCircleId: BigIntStr;
    tokenName: string;
    tokenSymbol: string;
    tokenTotalSupply: BigIntStr;
    governorName: string;
    votingDelay: BigIntStr;
    votingPeriod: BigIntStr;
    proposalThreshold: BigIntStr;
    quorumNumerator: BigIntStr;
    circleCount: BigIntStr;
    roleCount: BigIntStr;
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
    circleId: BigIntStr;
    proposer: HexStr;
    proposerRoleId: BigIntStr;
    tension: string;
    status: ProposalStatus;
    daoProposalId: BigIntStr | null;
    submittedAt: BigIntStr;
    resolvedAt: BigIntStr | null;
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
    status: ObjectionStatus;
    raisedAt: BigIntStr;
    resolvedAt: BigIntStr | null;
    txHash: HexStr;
};

/** 0=Pending 1=Active 2=Canceled 3=Defeated 4=Succeeded 5=Queued 6=Expired 7=Executed */
export type DaoProposalStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DaoProposal = {
    id: string;
    proposalId: BigIntStr;
    governorAddress: HexStr;
    proposer: HexStr;
    description: string;
    voteStart: BigIntStr;
    voteEnd: BigIntStr;
    status: DaoProposalStatus;
    etaSeconds: BigIntStr | null;
    createdAt: BigIntStr;
    txHash: HexStr;
};

/** 0=Against 1=For 2=Abstain */
export type VoteSupport = 0 | 1 | 2;

export type Vote = {
    id: string;
    proposalId: BigIntStr;
    governorAddress: HexStr;
    voter: HexStr;
    support: VoteSupport;
    weight: BigIntStr;
    reason: string;
    castAt: BigIntStr;
    txHash: HexStr;
};

export type TreasuryDeposit = {
    id: string;
    treasuryAddress: HexStr;
    sender: HexStr;
    token: HexStr | null;
    amount: BigIntStr;
    depositedAt: BigIntStr;
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
