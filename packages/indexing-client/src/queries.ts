// GraphQL fragments & query strings for the Ponder API.
// Field sets match ponder.schema.ts exactly.

const PAGE_INFO = `pageInfo { startCursor endCursor hasPreviousPage hasNextPage }`;

export const ORGANIZATION_FIELDS = `
    id subname name creator governor token timelock
    circleRegistry roleRegistry governanceProcess
    anchorCircleId tokenName tokenSymbol tokenTotalSupply
    governorName votingDelay votingPeriod proposalThreshold quorumNumerator
    circleCount roleCount createdAt updatedAt
`;

export const CIRCLE_FIELDS = `
    id circleId orgId registryAddress name purpose isAnchor
    parentCircleId roleId facilitator secretary circleRep
    circleLeads roleIds subCircleIds policyIds updatedAt
`;

export const ROLE_FIELDS = `
    id roleId orgId registryAddress circleId name purpose
    domains accountabilities leads isExpandedToCircle expandedCircleId updatedAt
`;

export const POLICY_FIELDS = `
    id policyId orgId registryAddress circleId name body updatedAt
`;

export const PROPOSAL_FIELDS = `
    id proposalId processAddress circleId proposer proposerRoleId
    tension status daoProposalId submittedAt resolvedAt txHash
`;

export const OBJECTION_FIELDS = `
    id objectionId processAddress proposalId objector
    status raisedAt resolvedAt txHash
`;

export const DAO_PROPOSAL_FIELDS = `
    id proposalId governorAddress proposer description
    voteStart voteEnd status etaSeconds createdAt txHash
`;

export const VOTE_FIELDS = `
    id proposalId governorAddress voter support weight reason castAt txHash
`;

export const TREASURY_DEPOSIT_FIELDS = `
    id treasuryAddress sender token amount depositedAt txHash
`;

// ─── Single-item queries ──────────────────────────────────────────────────────

export const GET_ORGANIZATION = `
    query GetOrganization($id: String!) {
        organization(id: $id) { ${ORGANIZATION_FIELDS} }
    }
`;

export const GET_CIRCLE = `
    query GetCircle($id: String!) {
        circle(id: $id) { ${CIRCLE_FIELDS} }
    }
`;

export const GET_ROLE = `
    query GetRole($id: String!) {
        role(id: $id) { ${ROLE_FIELDS} }
    }
`;

export const GET_POLICY = `
    query GetPolicy($id: String!) {
        policy(id: $id) { ${POLICY_FIELDS} }
    }
`;

export const GET_PROPOSAL = `
    query GetProposal($id: String!) {
        proposal(id: $id) { ${PROPOSAL_FIELDS} }
    }
`;

export const GET_DAO_PROPOSAL = `
    query GetDaoProposal($id: String!) {
        daoProposal(id: $id) { ${DAO_PROPOSAL_FIELDS} }
    }
`;

// ─── List queries ─────────────────────────────────────────────────────────────

export const LIST_ORGANIZATIONS = `
    query ListOrganizations($limit: Int, $after: String, $before: String) {
        organizations(limit: $limit, after: $after, before: $before, orderBy: "createdAt", orderDirection: "desc") {
            items { ${ORGANIZATION_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_CIRCLES_BY_ORG = `
    query ListCirclesByOrg($orgId: String!, $limit: Int, $after: String, $before: String) {
        circles(where: { orgId: $orgId }, limit: $limit, after: $after, before: $before) {
            items { ${CIRCLE_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_ROLES_BY_CIRCLE = `
    query ListRolesByCircle($registryAddress: String!, $circleId: String!, $limit: Int, $after: String, $before: String) {
        roles(where: { registryAddress: $registryAddress, circleId: $circleId }, limit: $limit, after: $after, before: $before) {
            items { ${ROLE_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_POLICIES_BY_CIRCLE = `
    query ListPoliciesByCircle($registryAddress: String!, $circleId: String!, $limit: Int, $after: String, $before: String) {
        policies(where: { registryAddress: $registryAddress, circleId: $circleId }, limit: $limit, after: $after, before: $before) {
            items { ${POLICY_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_PROPOSALS_BY_CIRCLE = `
    query ListProposalsByCircle($processAddress: String!, $circleId: String!, $limit: Int, $after: String, $before: String) {
        proposals(where: { processAddress: $processAddress, circleId: $circleId }, limit: $limit, after: $after, before: $before, orderBy: "submittedAt", orderDirection: "desc") {
            items { ${PROPOSAL_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_OBJECTIONS_BY_PROPOSAL = `
    query ListObjectionsByProposal($processAddress: String!, $proposalId: String!, $limit: Int, $after: String, $before: String) {
        objections(where: { processAddress: $processAddress, proposalId: $proposalId }, limit: $limit, after: $after, before: $before) {
            items { ${OBJECTION_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_DAO_PROPOSALS_BY_GOVERNOR = `
    query ListDaoProposalsByGovernor($governorAddress: String!, $limit: Int, $after: String, $before: String) {
        daoProposals(where: { governorAddress: $governorAddress }, limit: $limit, after: $after, before: $before, orderBy: "createdAt", orderDirection: "desc") {
            items { ${DAO_PROPOSAL_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_VOTES_BY_PROPOSAL = `
    query ListVotesByProposal($governorAddress: String!, $proposalId: String!, $limit: Int, $after: String, $before: String) {
        votes(where: { governorAddress: $governorAddress, proposalId: $proposalId }, limit: $limit, after: $after, before: $before) {
            items { ${VOTE_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;

export const LIST_DEPOSITS_BY_TREASURY = `
    query ListDepositsByTreasury($treasuryAddress: String!, $limit: Int, $after: String, $before: String) {
        treasuryDeposits(where: { treasuryAddress: $treasuryAddress }, limit: $limit, after: $after, before: $before, orderBy: "depositedAt", orderDirection: "desc") {
            items { ${TREASURY_DEPOSIT_FIELDS} }
            ${PAGE_INFO}
        }
    }
`;
