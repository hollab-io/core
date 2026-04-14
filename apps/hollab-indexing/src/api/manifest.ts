/**
 * Pure manifest assembly functions — testable without a live Ponder runtime.
 *
 * The route handlers in index.ts do the DB queries and call these functions.
 * These functions take plain row objects and options and return the manifest
 * JSON shapes defined in packages/agent-sdk/docs/agent-manifest-v1.md.
 *
 * No imports from "ponder:api" or "ponder:schema" — those virtual modules only
 * exist at Ponder runtime and break Vitest.
 */

// ── Row types (mirror the relevant subset of ponder.schema.ts) ───────────────
// We duplicate only the fields we consume so this file has zero runtime deps
// on ponder. The calling code (index.ts) passes fully-typed schema rows — the
// subset types here just guard the manifest functions.

export type OrgRow = {
    id: bigint;
    subname: string;
    name: string;
    purpose: string;
    creator: string;
    createdAt: bigint;
    token: string;
    circleRegistry: string;
    roleRegistry: string;
    governanceProcess: string;
};

export type CircleRow = {
    circleId: bigint;
    name: string;
    purpose: string;
    parentCircleId: bigint;
    isAnchor: boolean;
    roleIds: unknown; // JSON — string[] at runtime
    subCircleIds: unknown; // JSON — string[]
};

export type RoleRow = {
    roleId: bigint;
    name: string;
    purpose: string;
    domains: unknown; // JSON — string[]
    accountabilities: unknown; // JSON — string[]
    circleId: bigint;
    leads: unknown; // JSON — string[]
};

export type MemberRow = {
    memberAddress: string;
    addedAt: bigint;
};

export type ComponentSetRow = {
    meetingFactory: string;
    actionVoting: string;
    deployedAt: bigint;
};

export type ManifestOpts = {
    chainId: number;
    origin: string | null;
};

// ── Assembly ─────────────────────────────────────────────────────────────────

/**
 * Assemble the v1 org manifest object from plain DB row arrays.
 *
 * componentSets may have multiple rows (one per `MeetingComponentsFactory.deploy`
 * call for this org). The function picks the most recently deployed one.
 * If componentSets is empty, `contracts.meetingFactory` and
 * `contracts.actionVoting` are `null` — never `undefined` so JSON.stringify
 * does not silently drop the keys.
 *
 * Input rows are assumed to already be ordered (circles by circleId asc,
 * roles by roleId asc, members by addedAt asc) — the caller (index.ts) does
 * the ordering at the DB level.
 */
export function assembleOrgManifest(
    org: OrgRow,
    circles: CircleRow[],
    roles: RoleRow[],
    members: MemberRow[],
    componentSets: ComponentSetRow[],
    opts: ManifestOpts,
): OrgManifest {
    // Pick the most recently deployed component set.
    const componentSet = [...componentSets].sort((a, b) =>
        a.deployedAt > b.deployedAt ? -1 : a.deployedAt < b.deployedAt ? 1 : 0,
    )[0];

    const { chainId, origin } = opts;

    return {
        version: 1,
        chainId,
        org: {
            id: org.id.toString(),
            ensName: `${org.subname}.hollab.eth`,
            name: org.name,
            mission: org.purpose,
            creator: org.creator,
            createdAt: Number(org.createdAt),
            memberCount: members.length,
            circleCount: circles.length,
            roleCount: roles.length,
        },
        contracts: {
            circleRegistry: org.circleRegistry,
            roleRegistry: org.roleRegistry,
            governanceProcess: org.governanceProcess,
            meetingFactory: componentSet?.meetingFactory ?? null,
            actionVoting: componentSet?.actionVoting ?? null,
            govToken: org.token,
        },
        circles: circles.map((c) => ({
            id: c.circleId.toString(),
            name: c.name,
            purpose: c.purpose,
            parentId: c.parentCircleId.toString(),
            isAnchor: c.isAnchor,
            roleIds: c.roleIds,
            subCircleIds: c.subCircleIds,
        })),
        roles: roles.map((r) => ({
            id: r.roleId.toString(),
            name: r.name,
            purpose: r.purpose,
            domains: r.domains,
            accountabilities: r.accountabilities,
            circleId: r.circleId.toString(),
            leads: r.leads,
        })),
        members: members.map((m) => ({
            address: m.memberAddress,
            joinedAt: Number(m.addedAt),
        })),
        openProposals: [],
        indexer: {
            endpoint: origin,
            type: "ponder" as const,
            graphql: origin ? `${origin}/graphql` : null,
        },
    };
}

/**
 * Assemble the discovery index (`/agents/index.json`).
 * Input orgs are assumed to be ordered by id asc by the caller.
 */
export function assembleOrgIndex(
    orgs: Pick<OrgRow, "id" | "subname" | "name" | "purpose">[],
    opts: ManifestOpts,
): OrgIndex {
    const { chainId, origin } = opts;
    return {
        version: 1,
        chainId,
        indexer: { endpoint: origin, type: "ponder" as const },
        orgs: orgs.map((o) => ({
            id: o.id.toString(),
            ensName: `${o.subname}.hollab.eth`,
            name: o.name,
            mission: o.purpose,
            manifest: `/agents/${o.id.toString()}.json`,
        })),
    };
}

// ── Return types ─────────────────────────────────────────────────────────────

export type OrgManifest = {
    version: number;
    chainId: number;
    org: {
        id: string;
        ensName: string;
        name: string;
        mission: string;
        creator: string;
        createdAt: number;
        memberCount: number;
        circleCount: number;
        roleCount: number;
    };
    contracts: {
        circleRegistry: string;
        roleRegistry: string;
        governanceProcess: string;
        meetingFactory: string | null;
        actionVoting: string | null;
        govToken: string;
    };
    circles: {
        id: string;
        name: string;
        purpose: string;
        parentId: string;
        isAnchor: boolean;
        roleIds: unknown;
        subCircleIds: unknown;
    }[];
    roles: {
        id: string;
        name: string;
        purpose: string;
        domains: unknown;
        accountabilities: unknown;
        circleId: string;
        leads: unknown;
    }[];
    members: { address: string; joinedAt: number }[];
    openProposals: never[];
    indexer: {
        endpoint: string | null;
        type: "ponder";
        graphql: string | null;
    };
};

export type OrgIndex = {
    version: number;
    chainId: number;
    indexer: { endpoint: string | null; type: "ponder" };
    orgs: {
        id: string;
        ensName: string;
        name: string;
        mission: string;
        manifest: string;
    }[];
};
