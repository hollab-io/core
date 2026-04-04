import { GraphQLClient } from "graphql-request";

import type {
    Circle,
    DaoProposal,
    Objection,
    Organization,
    PaginatedResult,
    PaginationOptions,
    Policy,
    Proposal,
    Role,
    TreasuryDeposit,
    Vote,
} from "./types.js";
import {
    GET_CIRCLE,
    GET_DAO_PROPOSAL,
    GET_ORGANIZATION,
    GET_POLICY,
    GET_PROPOSAL,
    GET_ROLE,
    LIST_CIRCLES_BY_ORG,
    LIST_DAO_PROPOSALS_BY_GOVERNOR,
    LIST_DEPOSITS_BY_TREASURY,
    LIST_OBJECTIONS_BY_PROPOSAL,
    LIST_ORGANIZATIONS,
    LIST_POLICIES_BY_CIRCLE,
    LIST_PROPOSALS_BY_CIRCLE,
    LIST_ROLES_BY_CIRCLE,
    LIST_VOTES_BY_PROPOSAL,
} from "./queries.js";

export function createIndexingClient(url: string) {
    const gql = new GraphQLClient(url);

    return {
        // ── Organizations ───────────────────────────────────────────────────────
        async getOrganization(id: string): Promise<Organization | null> {
            const data = await gql.request<{ organization: Organization | null }>(
                GET_ORGANIZATION,
                { id },
            );
            return data.organization;
        },

        async listOrganizations(
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Organization>> {
            const data = await gql.request<{ organizations: PaginatedResult<Organization> }>(
                LIST_ORGANIZATIONS,
                opts,
            );
            return data.organizations;
        },

        // ── Circles ─────────────────────────────────────────────────────────────
        async getCircle(id: string): Promise<Circle | null> {
            const data = await gql.request<{ circle: Circle | null }>(GET_CIRCLE, { id });
            return data.circle;
        },

        async listCirclesByOrg(
            orgId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Circle>> {
            const data = await gql.request<{ circles: PaginatedResult<Circle> }>(
                LIST_CIRCLES_BY_ORG,
                { orgId, ...opts },
            );
            return data.circles;
        },

        // ── Roles ───────────────────────────────────────────────────────────────
        async getRole(id: string): Promise<Role | null> {
            const data = await gql.request<{ role: Role | null }>(GET_ROLE, { id });
            return data.role;
        },

        async listRolesByCircle(
            registryAddress: string,
            circleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Role>> {
            const data = await gql.request<{ roles: PaginatedResult<Role> }>(LIST_ROLES_BY_CIRCLE, {
                registryAddress,
                circleId,
                ...opts,
            });
            return data.roles;
        },

        // ── Policies ────────────────────────────────────────────────────────────
        async getPolicy(id: string): Promise<Policy | null> {
            const data = await gql.request<{ policy: Policy | null }>(GET_POLICY, { id });
            return data.policy;
        },

        async listPoliciesByCircle(
            registryAddress: string,
            circleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Policy>> {
            const data = await gql.request<{ policies: PaginatedResult<Policy> }>(
                LIST_POLICIES_BY_CIRCLE,
                { registryAddress, circleId, ...opts },
            );
            return data.policies;
        },

        // ── Holacracy proposals ─────────────────────────────────────────────────
        async getProposal(id: string): Promise<Proposal | null> {
            const data = await gql.request<{ proposal: Proposal | null }>(GET_PROPOSAL, { id });
            return data.proposal;
        },

        async listProposalsByCircle(
            processAddress: string,
            circleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Proposal>> {
            const data = await gql.request<{ proposals: PaginatedResult<Proposal> }>(
                LIST_PROPOSALS_BY_CIRCLE,
                { processAddress, circleId, ...opts },
            );
            return data.proposals;
        },

        async listObjectionsByProposal(
            processAddress: string,
            proposalId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Objection>> {
            const data = await gql.request<{ objections: PaginatedResult<Objection> }>(
                LIST_OBJECTIONS_BY_PROPOSAL,
                { processAddress, proposalId, ...opts },
            );
            return data.objections;
        },

        // ── DAO governance ──────────────────────────────────────────────────────
        async getDaoProposal(id: string): Promise<DaoProposal | null> {
            const data = await gql.request<{ daoProposal: DaoProposal | null }>(GET_DAO_PROPOSAL, {
                id,
            });
            return data.daoProposal;
        },

        async listDaoProposalsByGovernor(
            governorAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<DaoProposal>> {
            const data = await gql.request<{ daoProposals: PaginatedResult<DaoProposal> }>(
                LIST_DAO_PROPOSALS_BY_GOVERNOR,
                { governorAddress, ...opts },
            );
            return data.daoProposals;
        },

        async listVotesByProposal(
            governorAddress: string,
            proposalId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Vote>> {
            const data = await gql.request<{ votes: PaginatedResult<Vote> }>(
                LIST_VOTES_BY_PROPOSAL,
                { governorAddress, proposalId, ...opts },
            );
            return data.votes;
        },

        // ── Treasury ────────────────────────────────────────────────────────────
        async listDepositsByTreasury(
            treasuryAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<TreasuryDeposit>> {
            const data = await gql.request<{ treasuryDeposits: PaginatedResult<TreasuryDeposit> }>(
                LIST_DEPOSITS_BY_TREASURY,
                { treasuryAddress, ...opts },
            );
            return data.treasuryDeposits;
        },
    };
}

export type IndexingClient = ReturnType<typeof createIndexingClient>;
