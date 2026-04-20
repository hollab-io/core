import type { IndexingClient } from "@/client.js";
import type {
    ActionVote,
    ActionVoteCast,
    ChecklistItem,
    Circle,
    GovernanceMeeting,
    GovernanceMeetingLink,
    JoinRequest,
    MeetingComponentSet,
    MeetingOutput,
    Metric,
    Objection,
    Organization,
    OrgMember,
    PageInfo,
    PaginatedResult,
    Policy,
    Proposal,
    Role,
    TacticalMeeting,
} from "@/types.js";
import { createIndexingClient } from "@/client.js";
import {
    GET_CIRCLE,
    GET_ORGANIZATION,
    GET_POLICY,
    GET_PROPOSAL,
    GET_ROLE,
    LIST_ACTION_VOTE_CASTS,
    LIST_ACTION_VOTES_BY_CIRCLE,
    LIST_CHECKLIST_ITEMS_BY_ROLE,
    LIST_CIRCLES_BY_ORG,
    LIST_GOVERNANCE_MEETING_LINKS,
    LIST_GOVERNANCE_MEETINGS_BY_CIRCLE,
    LIST_GOVERNANCE_MEETINGS_BY_CONTRACT,
    LIST_MEETING_COMPONENTS_BY_ORG,
    LIST_MEETING_OUTPUTS,
    LIST_MEETING_OUTPUTS_BY_CONTRACT,
    LIST_METRICS_BY_ROLE,
    LIST_OBJECTIONS_BY_PROPOSAL,
    LIST_ORG_MEMBERS,
    LIST_ORG_MEMBERS_BY_ADDRESS,
    LIST_ORG_MEMBERS_BY_ORG,
    LIST_ORGANIZATIONS,
    LIST_ORGANIZATIONS_BY_CREATOR,
    LIST_PENDING_JOIN_REQUESTS_BY_ORG,
    LIST_POLICIES_BY_CIRCLE,
    LIST_PROPOSALS_BY_CIRCLE,
    LIST_ROLES_BY_CIRCLE,
    LIST_ROLES_BY_ORG,
    LIST_TACTICAL_MEETINGS_BY_CIRCLE,
    LIST_TACTICAL_MEETINGS_BY_CONTRACT,
} from "@/queries.js";
import { GraphQLClient } from "graphql-request";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("graphql-request");

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EMPTY_PAGE_INFO: PageInfo = {
    startCursor: null,
    endCursor: null,
    hasPreviousPage: false,
    hasNextPage: false,
};

function paginated<T>(items: T[]): PaginatedResult<T> {
    return { items, pageInfo: EMPTY_PAGE_INFO };
}

const MOCK_ORG: Organization = {
    id: "1",
    subname: "acme",
    name: "Acme DAO",
    creator: "0xabc",
    token: "0xtoken",
    instanceAddress: "0xinstance",
    circleRegistry: "0xcr",
    roleRegistry: "0xrr",
    governanceProcess: "0xgp",
    anchorCircleId: "1",
    tokenName: "Acme",
    tokenSymbol: "ACM",
    tokenTotalSupply: "1000000",
    circleCount: "3",
    roleCount: "10",
    memberCount: "5",
    purpose: "Build things",
    createdAt: "1700000000",
    updatedAt: "1700000001",
};

const MOCK_CIRCLE: Circle = {
    id: "circle-1",
    circleId: "1",
    orgId: "1",
    registryAddress: "0xcr",
    name: "Anchor",
    purpose: "Top-level",
    isAnchor: true,
    parentCircleId: "0",
    roleId: "0",
    facilitator: "0x0",
    secretary: "0x0",
    circleRep: "0x0",
    circleLeads: [],
    roleIds: [],
    subCircleIds: [],
    policyIds: [],
    updatedAt: "1700000000",
};

const MOCK_ROLE: Role = {
    id: "role-1",
    roleId: "1",
    orgId: "1",
    registryAddress: "0xrr",
    circleId: "1",
    name: "Lead Link",
    purpose: "Hold overall purpose",
    domains: [],
    accountabilities: [],
    leads: [],
    isExpandedToCircle: false,
    expandedCircleId: "0",
    updatedAt: "1700000000",
};

const MOCK_POLICY: Policy = {
    id: "policy-1",
    policyId: "1",
    orgId: "1",
    registryAddress: "0xrr",
    circleId: "1",
    name: "Spend Policy",
    body: "Up to $500 without approval",
    updatedAt: "1700000000",
};

const MOCK_PROPOSAL: Proposal = {
    id: "prop-1",
    proposalId: "1",
    processAddress: "0xgp",
    orgId: "1",
    circleId: "1",
    proposer: "0xproposer",
    proposerRoleId: "1",
    tensionHash: "0xabc",
    changeType: 0,
    changeData: "0xdeadbeef",
    changeResultId: null,
    status: 1,
    submittedAt: "1700000000",
    resolvedAt: null,
    resolvedBy: null,
    txHash: "0xtx",
};

const MOCK_ORG_MEMBER: OrgMember = {
    id: "member-1",
    registryAddress: "0xfactory",
    orgId: "1",
    memberAddress: "0xmember",
    addedAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_JOIN_REQUEST: JoinRequest = {
    id: "jr-1",
    requestId: "1",
    contractAddress: "0xfactory",
    requester: "0xrequester",
    orgId: "1",
    message: "Please let me in",
    status: 0,
    submittedAt: "1700000000",
    resolvedAt: null,
    txHash: "0xtx",
};

const MOCK_TACTICAL_MEETING: TacticalMeeting = {
    id: "tm-1",
    meetingId: "1",
    contractAddress: "0xfactory",
    circleId: "1",
    orgId: "1",
    convenedBy: "0xconvener",
    createdAt: "1700000000",
    completedAt: null,
    txHash: "0xtx",
};

const MOCK_MEETING_OUTPUT: MeetingOutput = {
    id: "mo-1",
    outputId: "1",
    contractAddress: "0xfactory",
    meetingId: "1",
    outputType: 0,
    description: "Follow up on deliverable",
    assignedTo: "0xassignee",
    roleId: "1",
    createdAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_GOVERNANCE_MEETING: GovernanceMeeting = {
    id: "gm-1",
    meetingId: "1",
    contractAddress: "0xgov",
    circleId: "1",
    orgId: "1",
    convenedBy: "0xconvener",
    createdAt: "1700000000",
    completedAt: null,
    txHash: "0xtx",
};

const MOCK_GOVERNANCE_MEETING_LINK: GovernanceMeetingLink = {
    id: "gml-1",
    contractAddress: "0xgov",
    meetingId: "1",
    proposalId: "1",
    linkedAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_MEETING_COMPONENT_SET: MeetingComponentSet = {
    id: "mcs-1",
    orgId: "1",
    meetingFactory: "0xmf",
    actionVoting: "0xav",
    roleDataRegistry: "0xrdr",
    deployedAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_CHECKLIST_ITEM: ChecklistItem = {
    id: "ci-1",
    itemId: "1",
    contractAddress: "0xfactory",
    roleId: "1",
    label: "Weekly standup",
    isActive: true,
    createdAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_METRIC: Metric = {
    id: "metric-1",
    metricId: "1",
    contractAddress: "0xfactory",
    roleId: "1",
    label: "Active projects",
    isActive: true,
    createdAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_ACTION_VOTE: ActionVote = {
    id: "av-1",
    voteId: "1",
    contractAddress: "0xvoting",
    circleId: "1",
    outputId: "1",
    proposer: "0xproposer",
    reason: "Important action",
    snapshotBlock: "1000",
    deadline: "1800000000",
    forVotes: "3",
    againstVotes: "1",
    abstainVotes: "0",
    createdAt: "1700000000",
    txHash: "0xtx",
};

const MOCK_ACTION_VOTE_CAST: ActionVoteCast = {
    id: "avc-1",
    contractAddress: "0xvoting",
    voteId: "1",
    voter: "0xvoter",
    support: 1,
    weight: "10",
    castAt: "1700000001",
    txHash: "0xtx",
};

const MOCK_OBJECTION: Objection = {
    id: "obj-1",
    objectionId: "1",
    processAddress: "0xgp",
    proposalId: "1",
    objector: "0xobjector",
    objectorRoleId: "1",
    concernHash: "0xdef",
    status: 0,
    raisedAt: "1700000000",
    resolvedAt: null,
    resolvedBy: null,
    txHash: "0xtx",
};

// ─── Test setup ───────────────────────────────────────────────────────────────

// vi.mock("graphql-request") replaces GraphQLClient with a mock constructor.
// TypeScript still sees the original class types — no type assertions needed
// on the client returned by createIndexingClient.
let mockRequest: ReturnType<typeof vi.fn>;
let client: IndexingClient;

beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = vi.fn();
    vi.mocked(GraphQLClient).mockImplementation(
        () => ({ request: mockRequest }) as unknown as GraphQLClient,
    );
    client = createIndexingClient("http://test-indexer/graphql");
});

// ─── Organizations ────────────────────────────────────────────────────────────

describe("getOrganization", () => {
    it("returns the organization when found", async () => {
        mockRequest.mockResolvedValueOnce({ organization: MOCK_ORG });

        const result = await client.getOrganization("1");

        expect(mockRequest).toHaveBeenCalledWith(GET_ORGANIZATION, { id: "1" });
        expect(result).toEqual(MOCK_ORG);
    });

    it("returns null when the organization does not exist", async () => {
        mockRequest.mockResolvedValueOnce({ organization: null });

        const result = await client.getOrganization("999");

        expect(result).toBeNull();
    });

    it("propagates GraphQL errors", async () => {
        mockRequest.mockRejectedValueOnce(new Error("network error"));

        await expect(client.getOrganization("1")).rejects.toThrow("network error");
    });
});

describe("listOrganizations", () => {
    it("returns paginated organizations with default options", async () => {
        mockRequest.mockResolvedValueOnce({ organizations: paginated([MOCK_ORG]) });

        const result = await client.listOrganizations();

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORGANIZATIONS, {});
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toEqual(MOCK_ORG);
    });

    it("forwards pagination options to the query", async () => {
        mockRequest.mockResolvedValueOnce({ organizations: paginated([]) });

        await client.listOrganizations({ limit: 10, after: "cursor-abc" });

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORGANIZATIONS, {
            limit: 10,
            after: "cursor-abc",
        });
    });

    it("returns hasNextPage from pageInfo", async () => {
        const pageInfo: PageInfo = {
            startCursor: "a",
            endCursor: "z",
            hasPreviousPage: false,
            hasNextPage: true,
        };
        mockRequest.mockResolvedValueOnce({ organizations: { items: [MOCK_ORG], pageInfo } });

        const result = await client.listOrganizations();

        expect(result.pageInfo.hasNextPage).toBe(true);
        expect(result.pageInfo.endCursor).toBe("z");
    });
});

describe("listOrganizationsByCreator", () => {
    it("lowercases the creator address before querying", async () => {
        mockRequest.mockResolvedValueOnce({ organizations: paginated([MOCK_ORG]) });

        await client.listOrganizationsByCreator("0xABC123");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORGANIZATIONS_BY_CREATOR, {
            creator: "0xabc123",
        });
    });

    it("forwards pagination options alongside the lowercased creator", async () => {
        mockRequest.mockResolvedValueOnce({ organizations: paginated([]) });

        await client.listOrganizationsByCreator("0xDEF456", { limit: 5, before: "cursor-z" });

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORGANIZATIONS_BY_CREATOR, {
            creator: "0xdef456",
            limit: 5,
            before: "cursor-z",
        });
    });
});

// ─── Circles ──────────────────────────────────────────────────────────────────

describe("getCircle", () => {
    it("returns the circle when found", async () => {
        mockRequest.mockResolvedValueOnce({ circle: MOCK_CIRCLE });

        const result = await client.getCircle("circle-1");

        expect(mockRequest).toHaveBeenCalledWith(GET_CIRCLE, { id: "circle-1" });
        expect(result).toEqual(MOCK_CIRCLE);
    });

    it("returns null when the circle does not exist", async () => {
        mockRequest.mockResolvedValueOnce({ circle: null });

        expect(await client.getCircle("nope")).toBeNull();
    });
});

describe("listCirclesByOrg", () => {
    it("returns circles for an org", async () => {
        mockRequest.mockResolvedValueOnce({ circles: paginated([MOCK_CIRCLE]) });

        const result = await client.listCirclesByOrg("1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_CIRCLES_BY_ORG, { orgId: "1" });
        expect(result.items).toEqual([MOCK_CIRCLE]);
    });
});

// ─── Roles ────────────────────────────────────────────────────────────────────

describe("getRole", () => {
    it("returns the role when found", async () => {
        mockRequest.mockResolvedValueOnce({ role: MOCK_ROLE });

        const result = await client.getRole("role-1");

        expect(mockRequest).toHaveBeenCalledWith(GET_ROLE, { id: "role-1" });
        expect(result).toEqual(MOCK_ROLE);
    });

    it("returns null when the role does not exist", async () => {
        mockRequest.mockResolvedValueOnce({ role: null });

        expect(await client.getRole("nope")).toBeNull();
    });
});

describe("listRolesByCircle", () => {
    it("passes registryAddress and circleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ roles: paginated([MOCK_ROLE]) });

        const result = await client.listRolesByCircle("0xrr", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ROLES_BY_CIRCLE, {
            registryAddress: "0xrr",
            circleId: "1",
        });
        expect(result.items).toEqual([MOCK_ROLE]);
    });
});

describe("listRolesByOrg", () => {
    it("passes orgId and pagination to the query", async () => {
        mockRequest.mockResolvedValueOnce({ roles: paginated([MOCK_ROLE]) });

        await client.listRolesByOrg("1", { limit: 20 });

        expect(mockRequest).toHaveBeenCalledWith(LIST_ROLES_BY_ORG, { orgId: "1", limit: 20 });
    });
});

// ─── Policies ─────────────────────────────────────────────────────────────────

describe("getPolicy", () => {
    it("returns the policy when found", async () => {
        mockRequest.mockResolvedValueOnce({ policy: MOCK_POLICY });

        const result = await client.getPolicy("policy-1");

        expect(mockRequest).toHaveBeenCalledWith(GET_POLICY, { id: "policy-1" });
        expect(result).toEqual(MOCK_POLICY);
    });

    it("returns null when policy is not found", async () => {
        mockRequest.mockResolvedValueOnce({ policy: null });

        expect(await client.getPolicy("x")).toBeNull();
    });
});

describe("listPoliciesByCircle", () => {
    it("passes registryAddress and circleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ policies: paginated([MOCK_POLICY]) });

        await client.listPoliciesByCircle("0xrr", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_POLICIES_BY_CIRCLE, {
            registryAddress: "0xrr",
            circleId: "1",
        });
    });
});

// ─── Proposals ────────────────────────────────────────────────────────────────

describe("getProposal", () => {
    it("returns the proposal when found", async () => {
        mockRequest.mockResolvedValueOnce({ proposal: MOCK_PROPOSAL });

        const result = await client.getProposal("prop-1");

        expect(mockRequest).toHaveBeenCalledWith(GET_PROPOSAL, { id: "prop-1" });
        expect(result).toEqual(MOCK_PROPOSAL);
    });

    it("returns null when proposal is not found", async () => {
        mockRequest.mockResolvedValueOnce({ proposal: null });

        expect(await client.getProposal("x")).toBeNull();
    });
});

describe("listProposalsByCircle", () => {
    it("passes processAddress and circleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ proposals: paginated([MOCK_PROPOSAL]) });

        await client.listProposalsByCircle("0xgp", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_PROPOSALS_BY_CIRCLE, {
            processAddress: "0xgp",
            circleId: "1",
        });
    });
});

describe("listObjectionsByProposal", () => {
    it("passes processAddress and proposalId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ objections: paginated([MOCK_OBJECTION]) });

        const result = await client.listObjectionsByProposal("0xgp", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_OBJECTIONS_BY_PROPOSAL, {
            processAddress: "0xgp",
            proposalId: "1",
        });
        expect(result.items).toEqual([MOCK_OBJECTION]);
    });
});

// ─── Tactical meetings ────────────────────────────────────────────────────────

describe("listTacticalMeetingsByCircle", () => {
    it("passes contractAddress and circleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ tacticalMeetings: paginated([MOCK_TACTICAL_MEETING]) });

        const result = await client.listTacticalMeetingsByCircle("0xfactory", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_TACTICAL_MEETINGS_BY_CIRCLE, {
            contractAddress: "0xfactory",
            circleId: "1",
        });
        expect(result.items).toEqual([MOCK_TACTICAL_MEETING]);
    });
});

describe("listTacticalMeetingsByContract", () => {
    it("passes only contractAddress to the query", async () => {
        mockRequest.mockResolvedValueOnce({ tacticalMeetings: paginated([MOCK_TACTICAL_MEETING]) });

        await client.listTacticalMeetingsByContract("0xfactory");

        expect(mockRequest).toHaveBeenCalledWith(LIST_TACTICAL_MEETINGS_BY_CONTRACT, {
            contractAddress: "0xfactory",
        });
    });
});

describe("listMeetingOutputs", () => {
    it("passes contractAddress and meetingId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ meetingOutputs: paginated([MOCK_MEETING_OUTPUT]) });

        const result = await client.listMeetingOutputs("0xfactory", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_MEETING_OUTPUTS, {
            contractAddress: "0xfactory",
            meetingId: "1",
        });
        expect(result.items).toEqual([MOCK_MEETING_OUTPUT]);
    });
});

describe("listMeetingOutputsByContract", () => {
    it("passes only contractAddress to the query", async () => {
        mockRequest.mockResolvedValueOnce({ meetingOutputs: paginated([]) });

        await client.listMeetingOutputsByContract("0xfactory");

        expect(mockRequest).toHaveBeenCalledWith(LIST_MEETING_OUTPUTS_BY_CONTRACT, {
            contractAddress: "0xfactory",
        });
    });
});

describe("listChecklistItemsByRole", () => {
    it("passes contractAddress and roleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ checklistItems: paginated([MOCK_CHECKLIST_ITEM]) });

        const result = await client.listChecklistItemsByRole("0xfactory", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_CHECKLIST_ITEMS_BY_ROLE, {
            contractAddress: "0xfactory",
            roleId: "1",
        });
        expect(result.items).toEqual([MOCK_CHECKLIST_ITEM]);
    });
});

describe("listMetricsByRole", () => {
    it("passes contractAddress and roleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ metrics: paginated([MOCK_METRIC]) });

        const result = await client.listMetricsByRole("0xfactory", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_METRICS_BY_ROLE, {
            contractAddress: "0xfactory",
            roleId: "1",
        });
        expect(result.items).toEqual([MOCK_METRIC]);
    });
});

// ─── Governance meetings ──────────────────────────────────────────────────────

describe("listGovernanceMeetingsByContract", () => {
    it("passes contractAddress to the query", async () => {
        mockRequest.mockResolvedValueOnce({
            governanceMeetings: paginated([MOCK_GOVERNANCE_MEETING]),
        });

        const result = await client.listGovernanceMeetingsByContract("0xgov");

        expect(mockRequest).toHaveBeenCalledWith(LIST_GOVERNANCE_MEETINGS_BY_CONTRACT, {
            contractAddress: "0xgov",
        });
        expect(result.items).toEqual([MOCK_GOVERNANCE_MEETING]);
    });
});

describe("listGovernanceMeetingsByCircle", () => {
    it("passes contractAddress and circleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({
            governanceMeetings: paginated([MOCK_GOVERNANCE_MEETING]),
        });

        await client.listGovernanceMeetingsByCircle("0xgov", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_GOVERNANCE_MEETINGS_BY_CIRCLE, {
            contractAddress: "0xgov",
            circleId: "1",
        });
    });
});

describe("listGovernanceMeetingLinks", () => {
    it("passes contractAddress and meetingId to the query", async () => {
        mockRequest.mockResolvedValueOnce({
            governanceMeetingLinks: paginated([MOCK_GOVERNANCE_MEETING_LINK]),
        });

        const result = await client.listGovernanceMeetingLinks("0xgov", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_GOVERNANCE_MEETING_LINKS, {
            contractAddress: "0xgov",
            meetingId: "1",
        });
        expect(result.items).toEqual([MOCK_GOVERNANCE_MEETING_LINK]);
    });
});

// ─── Meeting components ───────────────────────────────────────────────────────

describe("listMeetingComponentsByOrg", () => {
    it("passes orgId to the query", async () => {
        mockRequest.mockResolvedValueOnce({
            meetingComponentSets: paginated([MOCK_MEETING_COMPONENT_SET]),
        });

        const result = await client.listMeetingComponentsByOrg("1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_MEETING_COMPONENTS_BY_ORG, { orgId: "1" });
        expect(result.items).toEqual([MOCK_MEETING_COMPONENT_SET]);
    });
});

// ─── Action voting ────────────────────────────────────────────────────────────

describe("listActionVotesByCircle", () => {
    it("passes contractAddress and circleId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ actionVotes: paginated([MOCK_ACTION_VOTE]) });

        const result = await client.listActionVotesByCircle("0xvoting", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ACTION_VOTES_BY_CIRCLE, {
            contractAddress: "0xvoting",
            circleId: "1",
        });
        expect(result.items).toEqual([MOCK_ACTION_VOTE]);
    });
});

describe("listActionVoteCasts", () => {
    it("passes contractAddress and voteId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ actionVoteCasts: paginated([MOCK_ACTION_VOTE_CAST]) });

        const result = await client.listActionVoteCasts("0xvoting", "1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ACTION_VOTE_CASTS, {
            contractAddress: "0xvoting",
            voteId: "1",
        });
        expect(result.items).toEqual([MOCK_ACTION_VOTE_CAST]);
    });
});

// ─── Org members ──────────────────────────────────────────────────────────────

describe("listOrgMembers", () => {
    it("lowercases the registryAddress before querying", async () => {
        mockRequest.mockResolvedValueOnce({ orgMembers: paginated([MOCK_ORG_MEMBER]) });

        await client.listOrgMembers("0xABCDEF");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORG_MEMBERS, {
            registryAddress: "0xabcdef",
        });
    });

    it("returns paginated org members", async () => {
        mockRequest.mockResolvedValueOnce({ orgMembers: paginated([MOCK_ORG_MEMBER]) });

        const result = await client.listOrgMembers("0xfactory");

        expect(result.items).toEqual([MOCK_ORG_MEMBER]);
    });
});

describe("listOrgMembersByOrg", () => {
    it("lowercases the registryAddress and forwards orgId", async () => {
        mockRequest.mockResolvedValueOnce({ orgMembers: paginated([MOCK_ORG_MEMBER]) });

        await client.listOrgMembersByOrg("0xABCDEF", "42");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORG_MEMBERS_BY_ORG, {
            registryAddress: "0xabcdef",
            orgId: "42",
        });
    });
});

describe("listOrgMembersByAddress", () => {
    it("lowercases the memberAddress before querying", async () => {
        mockRequest.mockResolvedValueOnce({ orgMembers: paginated([MOCK_ORG_MEMBER]) });

        await client.listOrgMembersByAddress("0xDEADBEEF");

        expect(mockRequest).toHaveBeenCalledWith(LIST_ORG_MEMBERS_BY_ADDRESS, {
            memberAddress: "0xdeadbeef",
        });
    });

    it("returns an empty list when address has no memberships", async () => {
        mockRequest.mockResolvedValueOnce({ orgMembers: paginated([]) });

        const result = await client.listOrgMembersByAddress("0x0000");

        expect(result.items).toHaveLength(0);
    });
});

// ─── Join requests ────────────────────────────────────────────────────────────

describe("listPendingJoinRequestsByOrg", () => {
    it("passes orgId to the query", async () => {
        mockRequest.mockResolvedValueOnce({ joinRequests: paginated([MOCK_JOIN_REQUEST]) });

        const result = await client.listPendingJoinRequestsByOrg("1");

        expect(mockRequest).toHaveBeenCalledWith(LIST_PENDING_JOIN_REQUESTS_BY_ORG, {
            orgId: "1",
        });
        expect(result.items).toEqual([MOCK_JOIN_REQUEST]);
    });

    it("returns an empty list when no pending requests exist", async () => {
        mockRequest.mockResolvedValueOnce({ joinRequests: paginated([]) });

        const result = await client.listPendingJoinRequestsByOrg("999");

        expect(result.items).toHaveLength(0);
    });
});

// ─── GraphQLClient construction ───────────────────────────────────────────────

describe("createIndexingClient", () => {
    it("instantiates GraphQLClient with the provided URL", () => {
        createIndexingClient("http://my-indexer:4200/graphql");
        expect(vi.mocked(GraphQLClient)).toHaveBeenCalledWith("http://my-indexer:4200/graphql");
    });
});
