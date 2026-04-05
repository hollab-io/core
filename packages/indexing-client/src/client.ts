import { GraphQLClient } from "graphql-request";

import type {
    ActionVote,
    ActionVoteCast,
    ChecklistItem,
    Circle,
    DaoProposal,
    GovernanceMeeting,
    GovernanceMeetingLink,
    JoinRequest,
    MeetingComponentSet,
    MeetingOutput,
    Metric,
    Objection,
    Organization,
    OrgMember,
    PaginatedResult,
    PaginationOptions,
    Policy,
    Proposal,
    Role,
    TacticalMeeting,
    Tension,
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
    LIST_ACTION_VOTE_CASTS,
    LIST_ACTION_VOTES_BY_CIRCLE,
    LIST_CHECKLIST_ITEMS_BY_ROLE,
    LIST_CIRCLES_BY_ORG,
    LIST_DAO_PROPOSALS_BY_GOVERNOR,
    LIST_DEPOSITS_BY_TREASURY,
    LIST_GOVERNANCE_MEETING_LINKS,
    LIST_GOVERNANCE_MEETINGS_BY_CIRCLE,
    LIST_GOVERNANCE_MEETINGS_BY_CONTRACT,
    LIST_MEETING_COMPONENTS_BY_ORG,
    LIST_MEETING_OUTPUTS,
    LIST_MEETING_OUTPUTS_BY_CONTRACT,
    LIST_METRICS_BY_ROLE,
    LIST_OBJECTIONS_BY_PROPOSAL,
    LIST_OPEN_TENSIONS_BY_ORG,
    LIST_ORG_MEMBERS,
    LIST_ORG_MEMBERS_BY_ADDRESS,
    LIST_ORGANIZATIONS,
    LIST_ORGANIZATIONS_BY_CREATOR,
    LIST_PENDING_JOIN_REQUESTS_BY_ORG,
    LIST_POLICIES_BY_CIRCLE,
    LIST_PROPOSALS_BY_CIRCLE,
    LIST_ROLES_BY_CIRCLE,
    LIST_ROLES_BY_ORG,
    LIST_TACTICAL_MEETINGS_BY_CIRCLE,
    LIST_TACTICAL_MEETINGS_BY_CONTRACT,
    LIST_TENSIONS_BY_ORG,
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

        async listOrganizationsByCreator(
            creator: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Organization>> {
            const data = await gql.request<{ organizations: PaginatedResult<Organization> }>(
                LIST_ORGANIZATIONS_BY_CREATOR,
                { creator: creator.toLowerCase(), ...opts },
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

        async listRolesByOrg(
            orgId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Role>> {
            const data = await gql.request<{ roles: PaginatedResult<Role> }>(LIST_ROLES_BY_ORG, {
                orgId,
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

        // ── Tactical meetings ───────────────────────────────────────────────────
        async listTacticalMeetingsByCircle(
            contractAddress: string,
            circleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<TacticalMeeting>> {
            const data = await gql.request<{
                tacticalMeetings: PaginatedResult<TacticalMeeting>;
            }>(LIST_TACTICAL_MEETINGS_BY_CIRCLE, { contractAddress, circleId, ...opts });
            return data.tacticalMeetings;
        },

        async listTacticalMeetingsByContract(
            contractAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<TacticalMeeting>> {
            const data = await gql.request<{
                tacticalMeetings: PaginatedResult<TacticalMeeting>;
            }>(LIST_TACTICAL_MEETINGS_BY_CONTRACT, { contractAddress, ...opts });
            return data.tacticalMeetings;
        },

        async listMeetingOutputs(
            contractAddress: string,
            meetingId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<MeetingOutput>> {
            const data = await gql.request<{ meetingOutputs: PaginatedResult<MeetingOutput> }>(
                LIST_MEETING_OUTPUTS,
                { contractAddress, meetingId, ...opts },
            );
            return data.meetingOutputs;
        },

        async listMeetingOutputsByContract(
            contractAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<MeetingOutput>> {
            const data = await gql.request<{ meetingOutputs: PaginatedResult<MeetingOutput> }>(
                LIST_MEETING_OUTPUTS_BY_CONTRACT,
                { contractAddress, ...opts },
            );
            return data.meetingOutputs;
        },

        async listChecklistItemsByRole(
            contractAddress: string,
            roleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<ChecklistItem>> {
            const data = await gql.request<{ checklistItems: PaginatedResult<ChecklistItem> }>(
                LIST_CHECKLIST_ITEMS_BY_ROLE,
                { contractAddress, roleId, ...opts },
            );
            return data.checklistItems;
        },

        async listMetricsByRole(
            contractAddress: string,
            roleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Metric>> {
            const data = await gql.request<{ metrics: PaginatedResult<Metric> }>(
                LIST_METRICS_BY_ROLE,
                { contractAddress, roleId, ...opts },
            );
            return data.metrics;
        },

        // ── Governance meetings ─────────────────────────────────────────────────
        async listGovernanceMeetingsByContract(
            contractAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<GovernanceMeeting>> {
            const data = await gql.request<{
                governanceMeetings: PaginatedResult<GovernanceMeeting>;
            }>(LIST_GOVERNANCE_MEETINGS_BY_CONTRACT, { contractAddress, ...opts });
            return data.governanceMeetings;
        },

        async listGovernanceMeetingsByCircle(
            contractAddress: string,
            circleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<GovernanceMeeting>> {
            const data = await gql.request<{
                governanceMeetings: PaginatedResult<GovernanceMeeting>;
            }>(LIST_GOVERNANCE_MEETINGS_BY_CIRCLE, { contractAddress, circleId, ...opts });
            return data.governanceMeetings;
        },

        async listGovernanceMeetingLinks(
            contractAddress: string,
            meetingId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<GovernanceMeetingLink>> {
            const data = await gql.request<{
                governanceMeetingLinks: PaginatedResult<GovernanceMeetingLink>;
            }>(LIST_GOVERNANCE_MEETING_LINKS, { contractAddress, meetingId, ...opts });
            return data.governanceMeetingLinks;
        },

        // ── Meeting components ─────────────────────────────────────────────────
        async listMeetingComponentsByOrg(
            orgId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<MeetingComponentSet>> {
            const data = await gql.request<{
                meetingComponentSets: PaginatedResult<MeetingComponentSet>;
            }>(LIST_MEETING_COMPONENTS_BY_ORG, { orgId, ...opts });
            return data.meetingComponentSets;
        },

        // ── Action voting ───────────────────────────────────────────────────────
        async listActionVotesByCircle(
            contractAddress: string,
            circleId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<ActionVote>> {
            const data = await gql.request<{ actionVotes: PaginatedResult<ActionVote> }>(
                LIST_ACTION_VOTES_BY_CIRCLE,
                { contractAddress, circleId, ...opts },
            );
            return data.actionVotes;
        },

        async listActionVoteCasts(
            contractAddress: string,
            voteId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<ActionVoteCast>> {
            const data = await gql.request<{ actionVoteCasts: PaginatedResult<ActionVoteCast> }>(
                LIST_ACTION_VOTE_CASTS,
                { contractAddress, voteId, ...opts },
            );
            return data.actionVoteCasts;
        },

        // ── Org members ─────────────────────────────────────────────────────────
        async listOrgMembers(
            registryAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<OrgMember>> {
            const data = await gql.request<{ orgMembers: PaginatedResult<OrgMember> }>(
                LIST_ORG_MEMBERS,
                { registryAddress: registryAddress.toLowerCase(), ...opts },
            );
            return data.orgMembers;
        },

        async listOrgMembersByAddress(
            memberAddress: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<OrgMember>> {
            const data = await gql.request<{ orgMembers: PaginatedResult<OrgMember> }>(
                LIST_ORG_MEMBERS_BY_ADDRESS,
                { memberAddress: memberAddress.toLowerCase(), ...opts },
            );
            return data.orgMembers;
        },

        // ── Join requests ───────────────────────────────────────────────────────
        async listPendingJoinRequestsByOrg(
            orgId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<JoinRequest>> {
            const data = await gql.request<{ joinRequests: PaginatedResult<JoinRequest> }>(
                LIST_PENDING_JOIN_REQUESTS_BY_ORG,
                { orgId, ...opts },
            );
            return data.joinRequests;
        },

        // ── Tension board ──────────────────────────────────────────────────────
        async listOpenTensionsByOrg(
            orgId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Tension>> {
            const data = await gql.request<{ tensions: PaginatedResult<Tension> }>(
                LIST_OPEN_TENSIONS_BY_ORG,
                { orgId, ...opts },
            );
            return data.tensions;
        },

        async listTensionsByOrg(
            orgId: string,
            opts: PaginationOptions = {},
        ): Promise<PaginatedResult<Tension>> {
            const data = await gql.request<{ tensions: PaginatedResult<Tension> }>(
                LIST_TENSIONS_BY_ORG,
                { orgId, ...opts },
            );
            return data.tensions;
        },
    };
}

export type IndexingClient = ReturnType<typeof createIndexingClient>;
