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
    token: t.hex().notNull(),
    circleRegistry: t.hex().notNull(),
    roleRegistry: t.hex().notNull(),
    governanceProcess: t.hex().notNull(),
    anchorCircleId: t.bigint().notNull(),
    tokenName: t.text().notNull(),
    tokenSymbol: t.text().notNull(),
    tokenTotalSupply: t.bigint().notNull(),
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
// Event-sourced — full lifecycle history. The on-chain MeetingFactory only
// records commitments (created / adopted / discarded / objected / resolved);
// IDM rounds, clarifying questions, and integration discussion live in the
// meeting room. See specs/05-governance-process.md "On-chain Commitments
// Surface" and packages/contracts/src/contracts/MeetingFactory.sol.

export const proposal = onchainTable("proposal", (t) => ({
    id: t.text().primaryKey(), // "<processAddress>-<proposalId>"
    proposalId: t.bigint().notNull(),
    processAddress: t.hex().notNull(),
    orgId: t.bigint().notNull(),
    circleId: t.bigint().notNull(),
    proposer: t.hex().notNull(),
    proposerRoleId: t.bigint().notNull(),
    // Content-address of the off-chain tension text (CIDv1 / 0G root /
    // keccak256). The text itself stays off-chain — the chain only commits
    // to the hash. Resolvers need to fetch from the storage backend
    // indicated by the hash prefix (IPFS, 0G, or plain keccak).
    tensionHash: t.hex().notNull(),
    // ChangeType uint8 — see HolacracyTypes.ChangeType in contracts.
    // 0=CreateRole 1=AmendRole 2=RemoveRole 3=CreatePolicy 4=AmendPolicy
    // 5=RemovePolicy 6=MoveRole 7=Election 8=CreateRoleWithRefs
    // 9=AmendRoleWithRefs 10=CreatePolicyWithRefs 11=AmendPolicyWithRefs
    changeType: t.integer().notNull(),
    // ABI-encoded change payload — same shape executeGovernance accepts.
    // Stored on-chain so adopters don't need to re-supply it (key UX
    // difference vs. an event-sourced hash-only design).
    changeData: t.hex().notNull(),
    // 0=Draft 1=Active 2=Integrating 3=Adopted 4=Withdrawn 5=Discarded 6=Escalated
    // The MVP only uses 0/3/5.
    status: t.integer().notNull(),
    // ID of the entity created/affected on adoption (roleId for role changes).
    // Null until adopted.
    changeResultId: t.bigint(),
    submittedAt: t.bigint().notNull(),
    resolvedAt: t.bigint(),
    resolvedBy: t.hex(),
    txHash: t.hex().notNull(),
}));

export const objection = onchainTable("objection", (t) => ({
    id: t.text().primaryKey(), // "<processAddress>-<objectionId>"
    objectionId: t.bigint().notNull(),
    processAddress: t.hex().notNull(),
    proposalId: t.bigint().notNull(),
    objector: t.hex().notNull(),
    // Content-address of the objection concern text (off-chain).
    concernHash: t.hex().notNull(),
    // 0=Raised 1=Testing 2=Valid 3=Invalid 4=Resolved 5=Abandoned
    // The MVP only uses 0/4.
    status: t.integer().notNull(),
    raisedAt: t.bigint().notNull(),
    resolvedAt: t.bigint(),
    // The address that resolved this objection — either the original
    // objector (withdrawal) or an org admin (integration confirmed).
    // Null until resolved.
    resolvedBy: t.hex(),
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
