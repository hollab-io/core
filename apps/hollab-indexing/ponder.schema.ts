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

// ─── Treasury ─────────────────────────────────────────────────────────────────

export const treasuryDeposit = onchainTable("treasury_deposit", (t) => ({
    id: t.text().primaryKey(), // "<txHash>-<logIndex>"
    treasuryAddress: t.hex().notNull(),
    sender: t.hex().notNull(),
    token: t.hex(), // null = native ETH
    amount: t.bigint().notNull(),
    depositedAt: t.bigint().notNull(),
    txHash: t.hex().notNull(),
}));
