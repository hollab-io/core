import { onchainTable } from "ponder";

// ─── Registry index ───────────────────────────────────────────────────────────
// Maps any per-org clone address (circleRegistry, roleRegistry, governanceProcess)
// back to its orgId + factory so handlers can call the DataProvider.

export const registryIndex = onchainTable("registry_index", (t) => ({
    registryAddress: t.hex().primaryKey(),
    orgId: t.bigint().notNull(),
    factoryAddress: t.hex().notNull(),
}));

// ─── Organizations ────────────────────────────────────────────────────────────
// Snapshot from DataProvider.getOrganizationOverview — refreshed on every
// structural change to the org.

export const organization = onchainTable("organization", (t) => ({
    id: t.bigint().primaryKey(), // orgId
    subname: t.text().notNull(),
    name: t.text().notNull(),
    creator: t.hex().notNull(),
    governor: t.hex().notNull(),
    token: t.hex().notNull(),
    timelock: t.hex().notNull(),
    circleRegistry: t.hex().notNull(),
    roleRegistry: t.hex().notNull(),
    governanceProcess: t.hex().notNull(),
    anchorCircleId: t.bigint().notNull(),
    tokenName: t.text().notNull(),
    tokenSymbol: t.text().notNull(),
    tokenTotalSupply: t.bigint().notNull(),
    governorName: t.text().notNull(),
    votingDelay: t.bigint().notNull(),
    votingPeriod: t.bigint().notNull(),
    proposalThreshold: t.bigint().notNull(),
    quorumNumerator: t.bigint().notNull(),
    circleCount: t.bigint().notNull(),
    roleCount: t.bigint().notNull(),
    memberCount: t.bigint().notNull(),
    purpose: t.text().notNull(),
    createdAt: t.bigint().notNull(),
    updatedAt: t.bigint().notNull(),
}));

// ─── Circles ──────────────────────────────────────────────────────────────────
// Snapshot from CircleSnapshot. Leads and IDs are stored as JSON arrays.
// Refreshed on every CircleRegistry or RoleRegistry event.

export const circle = onchainTable("circle", (t) => ({
    id: t.text().primaryKey(), // "<registryAddress>-<circleId>"
    circleId: t.bigint().notNull(),
    orgId: t.bigint().notNull(),
    registryAddress: t.hex().notNull(),
    name: t.text().notNull(),
    purpose: t.text().notNull(),
    isAnchor: t.boolean().notNull(),
    parentCircleId: t.bigint().notNull(), // 0 for anchor
    roleId: t.bigint().notNull(), // 0 for anchor
    // Elected roles
    facilitator: t.hex().notNull(),
    secretary: t.hex().notNull(),
    circleRep: t.hex().notNull(),
    // JSON arrays — avoids join tables while keeping normalised reads simple
    circleLeads: t.json().notNull(), // address[]
    roleIds: t.json().notNull(), // bigint[] (as strings)
    subCircleIds: t.json().notNull(), // bigint[]
    policyIds: t.json().notNull(), // bigint[]
    updatedAt: t.bigint().notNull(),
}));

// ─── Roles ────────────────────────────────────────────────────────────────────
// Snapshot from RoleSnapshot.

export const role = onchainTable("role", (t) => ({
    id: t.text().primaryKey(), // "<registryAddress>-<roleId>"
    roleId: t.bigint().notNull(),
    orgId: t.bigint().notNull(),
    registryAddress: t.hex().notNull(),
    circleId: t.bigint().notNull(),
    name: t.text().notNull(),
    purpose: t.text().notNull(),
    domains: t.json().notNull(), // string[]
    accountabilities: t.json().notNull(), // string[]
    leads: t.json().notNull(), // address[]
    isExpandedToCircle: t.boolean().notNull(),
    expandedCircleId: t.bigint().notNull(), // 0 if not expanded
    updatedAt: t.bigint().notNull(),
}));

// ─── Policies ─────────────────────────────────────────────────────────────────

export const policy = onchainTable("policy", (t) => ({
    id: t.text().primaryKey(), // "<registryAddress>-<policyId>"
    policyId: t.bigint().notNull(),
    orgId: t.bigint().notNull(),
    registryAddress: t.hex().notNull(),
    circleId: t.bigint().notNull(),
    name: t.text().notNull(),
    body: t.text().notNull(),
    updatedAt: t.bigint().notNull(),
}));

// ─── Holacracy proposals ──────────────────────────────────────────────────────
// Event-sourced — full lifecycle history.

export const proposal = onchainTable("proposal", (t) => ({
    id: t.text().primaryKey(), // "<processAddress>-<proposalId>"
    proposalId: t.bigint().notNull(),
    processAddress: t.hex().notNull(),
    circleId: t.bigint().notNull(),
    proposer: t.hex().notNull(),
    proposerRoleId: t.bigint().notNull(),
    tension: t.text().notNull(),
    // 0=Draft 1=Active 2=Integrating 3=Adopted 4=Withdrawn 5=Discarded 6=Escalated
    status: t.integer().notNull(),
    daoProposalId: t.bigint(),
    submittedAt: t.bigint().notNull(),
    resolvedAt: t.bigint(),
    txHash: t.hex().notNull(),
}));

export const objection = onchainTable("objection", (t) => ({
    id: t.text().primaryKey(), // "<processAddress>-<objectionId>"
    objectionId: t.bigint().notNull(),
    processAddress: t.hex().notNull(),
    proposalId: t.bigint().notNull(),
    objector: t.hex().notNull(),
    // 0=Raised 1=Testing 2=Valid 3=Invalid 4=Resolved 5=Abandoned
    status: t.integer().notNull(),
    raisedAt: t.bigint().notNull(),
    resolvedAt: t.bigint(),
    txHash: t.hex().notNull(),
}));

// ─── DAO governance ───────────────────────────────────────────────────────────
// Event-sourced — full vote history.

export const daoProposal = onchainTable("dao_proposal", (t) => ({
    id: t.text().primaryKey(), // "<governorAddress>-<proposalId>"
    proposalId: t.bigint().notNull(),
    governorAddress: t.hex().notNull(),
    proposer: t.hex().notNull(),
    description: t.text().notNull(),
    voteStart: t.bigint().notNull(),
    voteEnd: t.bigint().notNull(),
    // 0=Pending 1=Active 2=Canceled 3=Defeated 4=Succeeded 5=Queued 6=Expired 7=Executed
    status: t.integer().notNull(),
    etaSeconds: t.bigint(),
    createdAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

export const vote = onchainTable("vote", (t) => ({
    id: t.text().primaryKey(), // "<governorAddress>-<proposalId>-<voter>"
    proposalId: t.bigint().notNull(),
    governorAddress: t.hex().notNull(),
    voter: t.hex().notNull(),
    // 0=Against 1=For 2=Abstain
    support: t.integer().notNull(),
    weight: t.bigint().notNull(),
    reason: t.text().notNull(),
    castAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// ─── Meeting component sets ───────────────────────────────────────────────────
// One row per MeetingComponentsFactory.deploy() — {MeetingFactory, ActionVoting} per org.

export const meetingComponentSet = onchainTable("meeting_component_set", (t) => ({
    id: t.text().primaryKey(), // "<orgId>-<txHash>"
    orgId: t.bigint().notNull(),
    meetingFactory: t.hex().notNull(),
    actionVoting: t.hex().notNull(),
    deployedAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// Flat reverse-index: any meeting contract address → orgId + setId.
// Lets handlers resolve orgId with a single DB lookup instead of an on-chain call.
export const meetingContractIndex = onchainTable("meeting_contract_index", (t) => ({
    contractAddress: t.hex().primaryKey(),
    orgId: t.bigint().notNull(),
    setId: t.text().notNull(),
}));

// ─── Tactical meetings ────────────────────────────────────────────────────────
// Event-sourced lifecycle: convened → completed.

export const tacticalMeeting = onchainTable("tactical_meeting", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<meetingId>"
    meetingId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    circleId: t.bigint().notNull(),
    orgId: t.bigint().notNull(),
    convenedBy: t.hex().notNull(),
    createdAt: t.bigint().notNull(),
    completedAt: t.bigint(),
    txHash: t.hex().notNull(),
}));

// Outputs recorded during a tactical meeting (next actions, projects, etc.)
// 0=NextAction 1=Project 2=Request 3=Information
export const meetingOutput = onchainTable("meeting_output", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<outputId>"
    outputId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    meetingId: t.bigint().notNull(),
    outputType: t.integer().notNull(),
    description: t.text().notNull(),
    assignedTo: t.hex().notNull(),
    roleId: t.bigint().notNull(),
    createdAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// Role-level recurring checklist items (soft-deleted on remove).
export const checklistItem = onchainTable("checklist_item", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<itemId>"
    itemId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    roleId: t.bigint().notNull(),
    label: t.text().notNull(),
    isActive: t.boolean().notNull(),
    createdAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// Role-level metrics (soft-deleted on remove).
export const metric = onchainTable("metric", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<metricId>"
    metricId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    roleId: t.bigint().notNull(),
    label: t.text().notNull(),
    isActive: t.boolean().notNull(),
    createdAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// ─── Governance meetings ──────────────────────────────────────────────────────

export const governanceMeeting = onchainTable("governance_meeting", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<meetingId>"
    meetingId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    circleId: t.bigint().notNull(),
    orgId: t.bigint().notNull(),
    convenedBy: t.hex().notNull(),
    createdAt: t.bigint().notNull(),
    completedAt: t.bigint(),
    txHash: t.hex().notNull(),
}));

// Proposals processed within a governance meeting.
export const governanceMeetingLink = onchainTable("governance_meeting_link", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<meetingId>-<proposalId>"
    contractAddress: t.hex().notNull(),
    meetingId: t.bigint().notNull(),
    proposalId: t.bigint().notNull(),
    linkedAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// ─── Org members ─────────────────────────────────────────────────────────────
// On-chain membership — one row per (circleRegistry, memberAddress) pair.
// Deleted when OrgMemberRemoved fires.

export const orgMember = onchainTable("org_member", (t) => ({
    id: t.text().primaryKey(), // "<registryAddress>-<memberAddress>"
    registryAddress: t.hex().notNull(),
    orgId: t.bigint().notNull(),
    memberAddress: t.hex().notNull(),
    addedAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// ─── Join requests ────────────────────────────────────────────────────────────
// Outsiders submit requestToJoin(orgId, message). Admin approves/rejects.
// status: 0=Pending 1=Approved 2=Rejected

export const joinRequest = onchainTable("join_request", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<requestId>"
    requestId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    requester: t.hex().notNull(),
    orgId: t.bigint().notNull(),
    message: t.text().notNull(),
    status: t.integer().notNull(), // 0=Pending 1=Approved 2=Rejected
    submittedAt: t.bigint().notNull(),
    resolvedAt: t.bigint(),
    txHash: t.hex().notNull(),
}));

// ─── Action voting ────────────────────────────────────────────────────────────
// Lightweight votes on tactical meeting outputs. Vote tallies are updated live.

export const actionVote = onchainTable("action_vote", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<voteId>"
    voteId: t.bigint().notNull(),
    contractAddress: t.hex().notNull(),
    orgId: t.bigint().notNull(),
    circleId: t.bigint().notNull(),
    outputId: t.bigint().notNull(),
    proposer: t.hex().notNull(),
    reason: t.text().notNull(),
    snapshotBlock: t.bigint().notNull(),
    deadline: t.bigint().notNull(),
    forVotes: t.bigint().notNull(),
    againstVotes: t.bigint().notNull(),
    abstainVotes: t.bigint().notNull(),
    createdAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));

// Individual ballots — one row per voter per vote.
// 0=Against 1=For 2=Abstain
export const actionVoteCast = onchainTable("action_vote_cast", (t) => ({
    id: t.text().primaryKey(), // "<contractAddress>-<voteId>-<voter>"
    contractAddress: t.hex().notNull(),
    voteId: t.bigint().notNull(),
    voter: t.hex().notNull(),
    support: t.integer().notNull(),
    weight: t.bigint().notNull(),
    castAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));
