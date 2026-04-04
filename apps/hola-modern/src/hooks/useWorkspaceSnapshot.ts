import type {
    DeclaredByRole,
    GovernanceChangeRecord,
    GovernanceMeetingPhase,
    GovernanceMeetingRecord,
    OrganizationRecord,
    PartnerRecord,
    TacticalMeetingRecord,
    WorkspaceSnapshot,
} from "@hollab-io/viem-extension";
import type { PropsWithChildren } from "react";
import {
    createCircleMap,
    createPartnerMap,
    createRoleMap,
    getMockWorkspaceSnapshot,
} from "@hollab-io/viem-extension";
import { createContext, createElement, useCallback, useContext, useMemo, useState } from "react";

import { DEFAULT_PROJECT_BOARD_CIRCLE_ID } from "../config/workspace";

type ProjectRecord = WorkspaceSnapshot["projects"][number];
type PersistedPartnerRecord = PartnerRecord;
type PolicyRecord = WorkspaceSnapshot["policies"][number];
type GovernanceProposalRecord = WorkspaceSnapshot["governanceProposals"][number];
type GovernanceObjectionRecord = WorkspaceSnapshot["governanceObjections"][number];
type GovernanceElectionRecord = WorkspaceSnapshot["governanceElections"][number];
type GovernanceNominationRecord = WorkspaceSnapshot["governanceNominations"][number];
type ProcessBreakdownRecord = WorkspaceSnapshot["processBreakdowns"][number];
type GovernanceAuditEntryRecord = WorkspaceSnapshot["governanceAuditTrail"][number];

type CreateGovernanceProposalInput = {
    circleId: string;
    proposerRoleId: string;
    tension: string;
    example: string;
    explanation: string;
    content: GovernanceChangeRecord;
    isAsync?: boolean;
    meetingId?: string;
};

type RaiseGovernanceObjectionInput = {
    proposalId: string;
    objectorRoleId: string;
    concern: string;
    isConstitutionalViolation: boolean;
    impactOnCircle: boolean;
    impactOnRepresentedRole: boolean;
    createdByProposal: boolean;
    noTimeToAdapt: boolean;
};

type DeclareProcessBreakdownInput = {
    circleId: string;
    declaredByRole: DeclaredByRole;
    reason: string;
    additionalCircleLeadId?: string;
};

type CreateOrganizationInput = {
    name: string;
    ownerName: string;
    ownerWalletAddress: string;
    purpose?: string;
};

type InviteMemberInput = {
    email?: string;
    name: string;
    walletAddress: string;
};

const CUSTOM_PROJECTS_STORAGE_KEY = "hola-modern:workspace:custom-projects";
const CUSTOM_PARTNERS_STORAGE_KEY = "hola-modern:workspace:custom-partners";
/** @deprecated migrated to ORGANIZATIONS_STORAGE_KEY */
const ORGANIZATION_STORAGE_KEY = "hola-modern:workspace:organization";
const ORGANIZATIONS_STORAGE_KEY = "hola-modern:workspace:organizations";
const ACTIVE_ORG_ID_STORAGE_KEY = "hola-modern:workspace:active-org-id";
const CURRENT_PARTNER_STORAGE_KEY = "hola-modern:workspace:current-partner-id";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isValidProjectRecord(value: unknown): value is ProjectRecord {
    return (
        isObjectRecord(value) &&
        typeof value.id === "string" &&
        typeof value.circleId === "string" &&
        typeof value.roleId === "string" &&
        typeof value.title === "string" &&
        ["future", "waiting", "current", "top", "done"].includes(
            typeof value.stage === "string" ? value.stage : "",
        ) &&
        typeof value.accentToken === "string" &&
        (value.ownerId === undefined || typeof value.ownerId === "string") &&
        (value.subtitle === undefined || typeof value.subtitle === "string") &&
        (value.sourceMeetingId === undefined || typeof value.sourceMeetingId === "string")
    );
}

function isValidPartnerRecord(value: unknown): value is PersistedPartnerRecord {
    return (
        isObjectRecord(value) &&
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        typeof value.avatarSeed === "string" &&
        (value.walletAddress === undefined || typeof value.walletAddress === "string") &&
        (value.email === undefined || typeof value.email === "string") &&
        (value.status === undefined ||
            (typeof value.status === "string" && ["active", "invited"].includes(value.status))) &&
        (value.invitedById === undefined || typeof value.invitedById === "string") &&
        (value.invitedAt === undefined || typeof value.invitedAt === "string") &&
        (value.joinedAt === undefined || typeof value.joinedAt === "string")
    );
}

function isValidOrganizationRecord(value: unknown): value is OrganizationRecord {
    return (
        isObjectRecord(value) &&
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        typeof value.slug === "string" &&
        typeof value.purpose === "string" &&
        typeof value.ownerPartnerId === "string" &&
        typeof value.ownerWalletAddress === "string" &&
        typeof value.createdAt === "string"
    );
}

function readPersistedProjects() {
    if (typeof window === "undefined") {
        return [] as ProjectRecord[];
    }

    try {
        const rawValue = window.localStorage.getItem(CUSTOM_PROJECTS_STORAGE_KEY);

        if (!rawValue) {
            return [];
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        return Array.isArray(parsedValue) ? parsedValue.filter(isValidProjectRecord) : [];
    } catch {
        return [];
    }
}

function readPersistedPartners() {
    if (typeof window === "undefined") {
        return [] as PersistedPartnerRecord[];
    }

    try {
        const rawValue = window.localStorage.getItem(CUSTOM_PARTNERS_STORAGE_KEY);

        if (!rawValue) {
            return [];
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        return Array.isArray(parsedValue) ? parsedValue.filter(isValidPartnerRecord) : [];
    } catch {
        return [];
    }
}

function readPersistedOrganizations(): OrganizationRecord[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(ORGANIZATIONS_STORAGE_KEY);
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.filter(isValidOrganizationRecord);
        }
        // Migrate from legacy single-org format
        const rawLegacy = window.localStorage.getItem(ORGANIZATION_STORAGE_KEY);
        if (rawLegacy) {
            const parsed: unknown = JSON.parse(rawLegacy);
            if (isValidOrganizationRecord(parsed)) {
                const migrated = [parsed];
                window.localStorage.setItem(ORGANIZATIONS_STORAGE_KEY, JSON.stringify(migrated));
                window.localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
                return migrated;
            }
        }
    } catch {}
    return [];
}

function readPersistedActiveOrgId(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACTIVE_ORG_ID_STORAGE_KEY) ?? null;
}

function readPersistedCurrentPartnerId() {
    if (typeof window === "undefined") {
        return undefined;
    }

    const rawValue = window.localStorage.getItem(CURRENT_PARTNER_STORAGE_KEY);

    return rawValue && rawValue.trim() ? rawValue : undefined;
}

function mergeProjects(baseProjects: ProjectRecord[], customProjects: ProjectRecord[]) {
    const projectsById = new Map(baseProjects.map((project) => [project.id, project]));

    customProjects.forEach((project) => {
        projectsById.set(project.id, project);
    });

    return Array.from(projectsById.values());
}

function mergePartners(basePartners: PartnerRecord[], customPartners: PersistedPartnerRecord[]) {
    const partnersById = new Map(basePartners.map((partner) => [partner.id, partner]));

    customPartners.forEach((partner) => {
        partnersById.set(partner.id, partner);
    });

    return Array.from(partnersById.values());
}

function getCustomPartnersForPersistence(partners: PersistedPartnerRecord[]) {
    const basePartnerIds = new Set(
        getMockWorkspaceSnapshot().partners.map((partner) => partner.id),
    );

    return partners.filter((partner) => !basePartnerIds.has(partner.id));
}

function persistPartners(partners: PersistedPartnerRecord[]) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(
        CUSTOM_PARTNERS_STORAGE_KEY,
        JSON.stringify(getCustomPartnersForPersistence(partners)),
    );
}

function persistOrganizations(organizations: OrganizationRecord[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ORGANIZATIONS_STORAGE_KEY, JSON.stringify(organizations));
}

function persistActiveOrgId(orgId: string | null) {
    if (typeof window === "undefined") return;
    if (orgId) {
        window.localStorage.setItem(ACTIVE_ORG_ID_STORAGE_KEY, orgId);
    } else {
        window.localStorage.removeItem(ACTIVE_ORG_ID_STORAGE_KEY);
    }
}

function persistCurrentPartnerId(partnerId: string) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(CURRENT_PARTNER_STORAGE_KEY, partnerId);
}

function normalizeWalletAddress(address: string) {
    return address.trim().toLowerCase();
}

function createOrganizationSlug(name: string) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
}

function createWalletPartnerId(walletAddress: string) {
    return `partner-${normalizeWalletAddress(walletAddress).slice(2, 10)}`;
}

function buildGovernanceAuditEntry(
    circleId: string,
    actorId: string,
    title: string,
    summary: string,
    refs: Partial<
        Pick<GovernanceAuditEntryRecord, "proposalId" | "meetingId" | "electionId" | "breakdownId">
    > = {},
): GovernanceAuditEntryRecord {
    return {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        circleId,
        actorId,
        title,
        summary,
        occurredAt: new Date().toISOString(),
        ...refs,
    };
}

function getTopElectionCandidate(
    election: GovernanceElectionRecord,
    nominations: GovernanceNominationRecord[],
) {
    const relevantNominations = nominations.filter((nomination) =>
        election.nominationIds.includes(nomination.id),
    );
    const scoreByCandidate = new Map<string, number>();

    relevantNominations.forEach((nomination) => {
        const candidateId = nomination.changedTo ?? nomination.candidateId;
        scoreByCandidate.set(candidateId, (scoreByCandidate.get(candidateId) ?? 0) + 1);
    });

    return Array.from(scoreByCandidate.entries()).sort((left, right) => right[1] - left[1])[0]?.[0];
}

type WorkspaceContextValue = {
    activeGovernanceMeeting: GovernanceMeetingRecord | null;
    activeGovernanceMeetingId: string | null;
    activeMeeting: TacticalMeetingRecord | null;
    activeMeetingId: string | null;
    activeOrganizationId: string | null;
    authenticatedUserEmail: string | null;
    authenticatedWalletAddress: string | null;
    activateGovernanceProposal: (proposalId: string) => void;
    addProject: (project: WorkspaceSnapshot["projects"][number]) => void;
    adoptGovernanceProposal: (proposalId: string) => boolean;
    advanceGovernanceElection: (electionId: string) => void;
    circleMap: ReturnType<typeof createCircleMap>;
    closeGovernanceMeeting: () => void;
    closeMeeting: () => void;
    createOrganization: (input: CreateOrganizationInput) => OrganizationRecord | null;
    createGovernanceProposal: (
        input: CreateGovernanceProposalInput,
    ) => GovernanceProposalRecord | null;
    declareProcessBreakdown: (input: DeclareProcessBreakdownInput) => ProcessBreakdownRecord | null;
    discardGovernanceProposal: (proposalId: string, reason: string) => void;
    governanceMeetingMap: Record<string, GovernanceMeetingRecord>;
    inviteMember: (input: InviteMemberInput) => PersistedPartnerRecord | null;
    meetingMap: Record<string, TacticalMeetingRecord>;
    organization: OrganizationRecord | undefined;
    organizations: OrganizationRecord[];
    openGovernanceMeeting: (meetingId: string) => void;
    openMeeting: (meetingId: string) => void;
    partnerMap: ReturnType<typeof createPartnerMap>;
    policyMap: Record<string, PolicyRecord>;
    projectBoardCircleId: string;
    raiseGovernanceObjection: (
        input: RaiseGovernanceObjectionInput,
    ) => GovernanceObjectionRecord | null;
    resolveGovernanceIntegration: (proposalId: string, resolution: string) => void;
    restoreProcessBreakdown: (breakdownId: string) => void;
    roleMap: ReturnType<typeof createRoleMap>;
    setGovernanceMeetingPhase: (meetingId: string, phase: GovernanceMeetingPhase) => void;

    setActiveOrganizationId: (id: string | null) => void;
    setProjectBoardCircleId: (circleId: string) => void;
    snapshot: WorkspaceSnapshot;
    syncAuthenticatedIdentity: (input: {
        email?: string | null;
        walletAddress?: string | null;
    }) => void;
    startGovernanceIntegration: (proposalId: string) => void;
    toggleActionCompletion: (actionId: string) => void;
    withdrawGovernanceProposal: (proposalId: string, meetingId?: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: PropsWithChildren) {
    const [organizations, setOrganizations] = useState<OrganizationRecord[]>(() =>
        readPersistedOrganizations(),
    );
    const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(() => {
        const orgs = readPersistedOrganizations();
        const savedId = readPersistedActiveOrgId();
        if (savedId && orgs.some((o) => o.id === savedId)) return savedId;
        if (orgs.length === 1) return orgs[0]!.id;
        return null;
    });

    const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>(() => {
        const baseSnapshot = getMockWorkspaceSnapshot();
        const orgs = readPersistedOrganizations();
        const savedId = readPersistedActiveOrgId();
        const resolvedId =
            savedId && orgs.some((o) => o.id === savedId)
                ? savedId
                : orgs.length === 1
                  ? orgs[0]!.id
                  : null;
        const activeOrg = resolvedId ? orgs.find((o) => o.id === resolvedId) : undefined;
        const persistedPartners = readPersistedPartners();
        const persistedCurrentPartnerId = readPersistedCurrentPartnerId();

        return {
            ...baseSnapshot,
            currentPartnerId:
                persistedCurrentPartnerId ??
                activeOrg?.ownerPartnerId ??
                baseSnapshot.currentPartnerId,
            organization: activeOrg,
            partners: mergePartners(baseSnapshot.partners, persistedPartners),
            projects: mergeProjects(baseSnapshot.projects, readPersistedProjects()),
        };
    });
    const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
    const [activeGovernanceMeetingId, setActiveGovernanceMeetingId] = useState<string | null>(null);
    const [projectBoardCircleId, setProjectBoardCircleId] = useState(
        DEFAULT_PROJECT_BOARD_CIRCLE_ID,
    );
    const [authenticatedWalletAddress, setAuthenticatedWalletAddress] = useState<string | null>(
        null,
    );
    const [authenticatedUserEmail, setAuthenticatedUserEmail] = useState<string | null>(null);

    const partnerMap = useMemo(() => createPartnerMap(snapshot), [snapshot]);
    const circleMap = useMemo(() => createCircleMap(snapshot), [snapshot]);
    const roleMap = useMemo(() => createRoleMap(snapshot), [snapshot]);
    const policyMap = useMemo(
        () => Object.fromEntries(snapshot.policies.map((policy) => [policy.id, policy])),
        [snapshot.policies],
    );
    const meetingMap = useMemo(
        () => Object.fromEntries(snapshot.meetings.map((meeting) => [meeting.id, meeting])),
        [snapshot.meetings],
    );
    const governanceMeetingMap = useMemo(
        () =>
            Object.fromEntries(snapshot.governanceMeetings.map((meeting) => [meeting.id, meeting])),
        [snapshot.governanceMeetings],
    );
    const activeMeeting = activeMeetingId ? (meetingMap[activeMeetingId] ?? null) : null;
    const activeGovernanceMeeting = activeGovernanceMeetingId
        ? (governanceMeetingMap[activeGovernanceMeetingId] ?? null)
        : null;

    const openMeeting = useCallback((meetingId: string) => {
        setActiveMeetingId(meetingId);
    }, []);

    const closeMeeting = useCallback(() => {
        setActiveMeetingId(null);
    }, []);

    const openGovernanceMeeting = useCallback((meetingId: string) => {
        setActiveGovernanceMeetingId(meetingId);
    }, []);

    const closeGovernanceMeeting = useCallback(() => {
        setActiveGovernanceMeetingId(null);
    }, []);

    const toggleActionCompletion = useCallback((actionId: string) => {
        setSnapshot((currentSnapshot) => ({
            ...currentSnapshot,
            actions: currentSnapshot.actions.map((action) => {
                if (action.id !== actionId) {
                    return action;
                }

                const completed = !action.completed;

                return {
                    ...action,
                    completed,
                    completedAt: completed ? new Date().toISOString() : undefined,
                };
            }),
        }));
    }, []);

    const addProject = useCallback((project: ProjectRecord) => {
        const persistedProjects = readPersistedProjects();
        const nextPersistedProjects = mergeProjects(persistedProjects, [project]);

        if (typeof window !== "undefined") {
            window.localStorage.setItem(
                CUSTOM_PROJECTS_STORAGE_KEY,
                JSON.stringify(nextPersistedProjects),
            );
        }

        setSnapshot((currentSnapshot) => ({
            ...currentSnapshot,
            projects: mergeProjects(currentSnapshot.projects, [project]),
        }));
    }, []);

    const syncAuthenticatedIdentity = useCallback(
        (input: { email?: string | null; walletAddress?: string | null }) => {
            const normalizedWallet = input.walletAddress
                ? normalizeWalletAddress(input.walletAddress)
                : null;
            const normalizedEmail = input.email?.trim() || null;

            setAuthenticatedWalletAddress(normalizedWallet);
            setAuthenticatedUserEmail(normalizedEmail);

            if (!normalizedWallet) {
                return;
            }

            setSnapshot((currentSnapshot) => {
                const matchingPartner = currentSnapshot.partners.find(
                    (partner) =>
                        partner.walletAddress &&
                        normalizeWalletAddress(partner.walletAddress) === normalizedWallet,
                );

                if (!matchingPartner) {
                    return currentSnapshot;
                }

                const nextPartners: PersistedPartnerRecord[] = currentSnapshot.partners.map(
                    (partner): PersistedPartnerRecord =>
                        partner.id === matchingPartner.id
                            ? {
                                  ...partner,
                                  email: normalizedEmail ?? partner.email,
                                  joinedAt:
                                      partner.status === "invited" && !partner.joinedAt
                                          ? new Date().toISOString()
                                          : partner.joinedAt,
                                  status: "active",
                                  walletAddress: normalizedWallet,
                              }
                            : partner,
                );

                persistPartners(nextPartners);
                persistCurrentPartnerId(matchingPartner.id);

                return {
                    ...currentSnapshot,
                    currentPartnerId: matchingPartner.id,
                    partners: nextPartners,
                };
            });
        },
        [],
    );

    const createOrganization = useCallback(
        (input: CreateOrganizationInput) => {
            const normalizedName = input.name.trim();
            const normalizedOwnerName = input.ownerName.trim();
            const normalizedWallet = normalizeWalletAddress(input.ownerWalletAddress);

            if (!normalizedName || !normalizedOwnerName || !normalizedWallet) {
                return null;
            }

            const now = new Date().toISOString();
            const organizationId = `org-${Date.now()}`;
            let nextOrganization: OrganizationRecord | null = null;

            setSnapshot((currentSnapshot) => {
                const existingOwner = currentSnapshot.partners.find(
                    (partner) =>
                        partner.walletAddress &&
                        normalizeWalletAddress(partner.walletAddress) === normalizedWallet,
                );
                const ownerPartnerId = existingOwner?.id ?? createWalletPartnerId(normalizedWallet);
                const ownerPartner: PersistedPartnerRecord = {
                    avatarSeed: normalizedOwnerName,
                    email: authenticatedUserEmail ?? existingOwner?.email,
                    id: ownerPartnerId,
                    joinedAt: now,
                    name: normalizedOwnerName,
                    status: "active",
                    walletAddress: normalizedWallet,
                };
                const organization: OrganizationRecord = {
                    createdAt: now,
                    id: organizationId,
                    name: normalizedName,
                    ownerPartnerId,
                    ownerWalletAddress: normalizedWallet,
                    purpose:
                        input.purpose?.trim() ||
                        "Run circles, governance, and tactical work in one shared organizational workspace.",
                    slug: createOrganizationSlug(normalizedName) || organizationId,
                };
                const partners = mergePartners(currentSnapshot.partners, [ownerPartner]);
                const roles = currentSnapshot.roles.map((role) =>
                    role.id === "ceo" && !role.memberIds.includes(ownerPartnerId)
                        ? { ...role, memberIds: [ownerPartnerId, ...role.memberIds] }
                        : role,
                );

                persistPartners(partners);
                persistCurrentPartnerId(ownerPartnerId);
                nextOrganization = organization;

                return {
                    ...currentSnapshot,
                    currentPartnerId: ownerPartnerId,
                    organization,
                    partners,
                    roles,
                    updatedAt: now,
                };
            });

            if (nextOrganization) {
                const newOrg = nextOrganization;
                setOrganizations((prev) => {
                    const next = [...prev, newOrg];
                    persistOrganizations(next);
                    return next;
                });
                setActiveOrganizationIdState(organizationId);
                persistActiveOrgId(organizationId);
            }

            return nextOrganization;
        },
        [authenticatedUserEmail],
    );

    const setActiveOrganizationId = useCallback(
        (orgId: string | null) => {
            setActiveOrganizationIdState(orgId);
            persistActiveOrgId(orgId);
            const org = orgId ? organizations.find((o) => o.id === orgId) : undefined;
            setSnapshot((current) => ({ ...current, organization: org }));
        },
        [organizations],
    );

    const inviteMember = useCallback((input: InviteMemberInput) => {
        const normalizedName = input.name.trim();
        const normalizedWallet = normalizeWalletAddress(input.walletAddress);
        const normalizedEmail = input.email?.trim() || undefined;

        if (!normalizedName || !normalizedWallet) {
            return null;
        }

        let nextPartnerRecord: PersistedPartnerRecord | null = null;

        setSnapshot((currentSnapshot) => {
            const existingPartner = currentSnapshot.partners.find(
                (partner) =>
                    partner.walletAddress &&
                    normalizeWalletAddress(partner.walletAddress) === normalizedWallet,
            );
            const nextPartner: PersistedPartnerRecord = {
                avatarSeed: normalizedName,
                email: normalizedEmail ?? existingPartner?.email,
                id: existingPartner?.id ?? createWalletPartnerId(normalizedWallet),
                invitedAt: existingPartner?.invitedAt ?? new Date().toISOString(),
                invitedById: currentSnapshot.currentPartnerId,
                joinedAt: existingPartner?.joinedAt,
                name: normalizedName,
                status: existingPartner?.status === "active" ? "active" : "invited",
                walletAddress: normalizedWallet,
            };
            const partners = mergePartners(currentSnapshot.partners, [nextPartner]);

            persistPartners(partners);
            nextPartnerRecord = nextPartner;

            return {
                ...currentSnapshot,
                partners,
                updatedAt: new Date().toISOString(),
            };
        });

        return nextPartnerRecord;
    }, []);

    const createGovernanceProposal = useCallback(
        (input: CreateGovernanceProposalInput) => {
            const normalizedTension = input.tension.trim();
            const normalizedExample = input.example.trim();
            const normalizedExplanation = input.explanation.trim();

            if (
                !input.circleId ||
                !input.proposerRoleId ||
                !normalizedTension ||
                !normalizedExample ||
                !normalizedExplanation ||
                !input.content.title.trim() ||
                !input.content.summary.trim() ||
                !input.content.payload.trim()
            ) {
                return null;
            }

            const proposal: GovernanceProposalRecord = {
                id: `proposal-${Date.now()}`,
                circleId: input.circleId,
                proposerId: snapshot.currentPartnerId,
                proposerRoleId: input.proposerRoleId,
                tension: normalizedTension,
                example: normalizedExample,
                explanation: normalizedExplanation,
                content: {
                    ...input.content,
                    title: input.content.title.trim(),
                    summary: input.content.summary.trim(),
                    payload: input.content.payload.trim(),
                },
                status: "draft",
                objectionIds: [],
                isAsync: input.isAsync ?? true,
                meetingId: input.meetingId,
                createdAt: new Date().toISOString(),
            };

            setSnapshot((currentSnapshot) => ({
                ...currentSnapshot,
                governanceProposals: [proposal, ...currentSnapshot.governanceProposals],
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal created",
                        proposal.content.title,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            }));

            return proposal;
        },
        [snapshot.currentPartnerId],
    );

    const activateGovernanceProposal = useCallback((proposalId: string) => {
        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal || proposal.status === "adopted" || proposal.status === "discarded") {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId ? { ...entry, status: "active" } : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal activated",
                        proposal.content.title,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const raiseGovernanceObjection = useCallback(
        (input: RaiseGovernanceObjectionInput) => {
            const normalizedConcern = input.concern.trim();
            const meetsCriteria =
                input.isConstitutionalViolation ||
                (input.impactOnCircle &&
                    input.impactOnRepresentedRole &&
                    input.createdByProposal &&
                    input.noTimeToAdapt);

            if (
                !input.proposalId ||
                !input.objectorRoleId ||
                !normalizedConcern ||
                !meetsCriteria
            ) {
                return null;
            }

            const objection: GovernanceObjectionRecord = {
                id: `objection-${Date.now()}`,
                proposalId: input.proposalId,
                objectorId: snapshot.currentPartnerId,
                objectorRoleId: input.objectorRoleId,
                concern: normalizedConcern,
                isConstitutionalViolation: input.isConstitutionalViolation,
                impactOnCircle: input.impactOnCircle,
                impactOnRepresentedRole: input.impactOnRepresentedRole,
                createdByProposal: input.createdByProposal,
                noTimeToAdapt: input.noTimeToAdapt,
                status: "raised",
                createdAt: new Date().toISOString(),
            };

            setSnapshot((currentSnapshot) => {
                const proposal = currentSnapshot.governanceProposals.find(
                    (entry) => entry.id === input.proposalId,
                );

                if (!proposal) {
                    return currentSnapshot;
                }

                return {
                    ...currentSnapshot,
                    governanceObjections: [objection, ...currentSnapshot.governanceObjections],
                    governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                        entry.id === input.proposalId
                            ? {
                                  ...entry,
                                  status: "objected",
                                  objectionIds: [...entry.objectionIds, objection.id],
                              }
                            : entry,
                    ),
                    governanceAuditTrail: [
                        buildGovernanceAuditEntry(
                            proposal.circleId,
                            currentSnapshot.currentPartnerId,
                            "Objection raised",
                            normalizedConcern,
                            { proposalId: proposal.id },
                        ),
                        ...currentSnapshot.governanceAuditTrail,
                    ],
                };
            });

            return objection;
        },
        [snapshot.currentPartnerId],
    );

    const startGovernanceIntegration = useCallback((proposalId: string) => {
        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId ? { ...entry, status: "integrating" } : entry,
                ),
                governanceObjections: currentSnapshot.governanceObjections.map((objection) =>
                    objection.proposalId === proposalId &&
                    ["raised", "testing"].includes(objection.status)
                        ? { ...objection, status: "valid" }
                        : objection,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Integration started",
                        `Integration work started for ${proposal.content.title}.`,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const resolveGovernanceIntegration = useCallback((proposalId: string, resolution: string) => {
        const normalizedResolution =
            resolution.trim() || "Integrated through governance processing.";

        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId ? { ...entry, status: "active" } : entry,
                ),
                governanceObjections: currentSnapshot.governanceObjections.map((objection) =>
                    objection.proposalId === proposalId &&
                    ["raised", "testing", "valid"].includes(objection.status)
                        ? { ...objection, status: "resolved", resolution: normalizedResolution }
                        : objection,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Objections resolved",
                        normalizedResolution,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const adoptGovernanceProposal = useCallback((proposalId: string) => {
        let wasAdopted = false;

        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );
            const hasUnresolvedObjections = currentSnapshot.governanceObjections.some(
                (objection) =>
                    objection.proposalId === proposalId &&
                    ["raised", "testing", "valid"].includes(objection.status),
            );

            if (!proposal || hasUnresolvedObjections) {
                return currentSnapshot;
            }

            wasAdopted = true;

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId
                        ? { ...entry, status: "adopted", resolvedAt: new Date().toISOString() }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal adopted",
                        proposal.content.title,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });

        return wasAdopted;
    }, []);

    const withdrawGovernanceProposal = useCallback((proposalId: string, meetingId?: string) => {
        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId
                        ? {
                              ...entry,
                              status: "withdrawn",
                              meetingId: meetingId ?? entry.meetingId,
                              resolvedAt: new Date().toISOString(),
                          }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal withdrawn",
                        meetingId
                            ? "Async processing stopped and the proposal was moved into a governance meeting."
                            : "Async processing stopped and the proposal was withdrawn.",
                        { proposalId: proposal.id, meetingId },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const discardGovernanceProposal = useCallback((proposalId: string, reason: string) => {
        const normalizedReason = reason.trim() || "Discarded during governance processing.";

        setSnapshot((currentSnapshot) => {
            const proposal = currentSnapshot.governanceProposals.find(
                (entry) => entry.id === proposalId,
            );

            if (!proposal) {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                governanceProposals: currentSnapshot.governanceProposals.map((entry) =>
                    entry.id === proposalId
                        ? { ...entry, status: "discarded", resolvedAt: new Date().toISOString() }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        proposal.circleId,
                        currentSnapshot.currentPartnerId,
                        "Proposal discarded",
                        normalizedReason,
                        { proposalId: proposal.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const setGovernanceMeetingPhase = useCallback(
        (meetingId: string, phase: GovernanceMeetingPhase) => {
            setSnapshot((currentSnapshot) => {
                const meeting = currentSnapshot.governanceMeetings.find(
                    (entry) => entry.id === meetingId,
                );

                if (!meeting) {
                    return currentSnapshot;
                }

                return {
                    ...currentSnapshot,
                    governanceMeetings: currentSnapshot.governanceMeetings.map((entry) =>
                        entry.id === meetingId
                            ? {
                                  ...entry,
                                  phase,
                                  startedAt: entry.startedAt ?? new Date().toISOString(),
                              }
                            : entry,
                    ),
                    governanceAuditTrail: [
                        buildGovernanceAuditEntry(
                            meeting.circleId,
                            currentSnapshot.currentPartnerId,
                            "Governance meeting phase changed",
                            `${meeting.title} is now in ${phase.replace("-", " ")}.`,
                            { meetingId: meeting.id },
                        ),
                        ...currentSnapshot.governanceAuditTrail,
                    ],
                };
            });
        },
        [],
    );

    const advanceGovernanceElection = useCallback((electionId: string) => {
        const statusOrder: GovernanceElectionRecord["status"][] = [
            "nominating",
            "sharing",
            "changing",
            "proposing",
            "objection-round",
            "complete",
        ];

        setSnapshot((currentSnapshot) => {
            const election = currentSnapshot.governanceElections.find(
                (entry) => entry.id === electionId,
            );

            if (!election || election.status === "complete") {
                return currentSnapshot;
            }

            const currentIndex = statusOrder.indexOf(election.status);
            const nextStatus = statusOrder[Math.min(currentIndex + 1, statusOrder.length - 1)];
            const topCandidateId =
                election.proposedCandidateId ??
                getTopElectionCandidate(election, currentSnapshot.governanceNominations);
            const electedAt =
                nextStatus === "complete" ? new Date().toISOString() : election.electedAt;

            return {
                ...currentSnapshot,
                governanceElections: currentSnapshot.governanceElections.map((entry) =>
                    entry.id === electionId
                        ? {
                              ...entry,
                              status: nextStatus,
                              proposedCandidateId:
                                  nextStatus === "proposing" ||
                                  nextStatus === "objection-round" ||
                                  nextStatus === "complete"
                                      ? topCandidateId
                                      : entry.proposedCandidateId,
                              electedId:
                                  nextStatus === "complete" ? topCandidateId : entry.electedId,
                              electedAt,
                              expiresAt:
                                  nextStatus === "complete"
                                      ? new Date(
                                            Date.now() + entry.termSeconds * 1000,
                                        ).toISOString()
                                      : entry.expiresAt,
                          }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        election.circleId,
                        currentSnapshot.currentPartnerId,
                        nextStatus === "complete" ? "Election completed" : "Election advanced",
                        nextStatus === "complete"
                            ? `${election.targetRoleLabel} assigned to ${topCandidateId ?? "a candidate"}.`
                            : `${election.targetRoleLabel} election moved into ${nextStatus.replace("-", " ")}.`,
                        { electionId: election.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const declareProcessBreakdown = useCallback(
        (input: DeclareProcessBreakdownInput) => {
            const normalizedReason = input.reason.trim();

            if (!input.circleId || !normalizedReason) {
                return null;
            }

            const breakdown: ProcessBreakdownRecord = {
                id: `breakdown-${Date.now()}`,
                circleId: input.circleId,
                declaredById: snapshot.currentPartnerId,
                declaredByRole: input.declaredByRole,
                reason: normalizedReason,
                status: "active",
                additionalCircleLeadId: input.additionalCircleLeadId,
                declaredAt: new Date().toISOString(),
            };

            setSnapshot((currentSnapshot) => ({
                ...currentSnapshot,
                processBreakdowns: [breakdown, ...currentSnapshot.processBreakdowns],
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        breakdown.circleId,
                        currentSnapshot.currentPartnerId,
                        "Process breakdown declared",
                        normalizedReason,
                        { breakdownId: breakdown.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            }));

            return breakdown;
        },
        [snapshot.currentPartnerId],
    );

    const restoreProcessBreakdown = useCallback((breakdownId: string) => {
        setSnapshot((currentSnapshot) => {
            const breakdown = currentSnapshot.processBreakdowns.find(
                (entry) => entry.id === breakdownId,
            );

            if (!breakdown || breakdown.status === "restored") {
                return currentSnapshot;
            }

            return {
                ...currentSnapshot,
                processBreakdowns: currentSnapshot.processBreakdowns.map((entry) =>
                    entry.id === breakdownId
                        ? { ...entry, status: "restored", restoredAt: new Date().toISOString() }
                        : entry,
                ),
                governanceAuditTrail: [
                    buildGovernanceAuditEntry(
                        breakdown.circleId,
                        currentSnapshot.currentPartnerId,
                        "Process restored",
                        "Governance due process was restored for the affected circle.",
                        { breakdownId: breakdown.id },
                    ),
                    ...currentSnapshot.governanceAuditTrail,
                ],
            };
        });
    }, []);

    const contextValue = useMemo<WorkspaceContextValue>(
        () => ({
            activeGovernanceMeeting,
            activeGovernanceMeetingId,
            activeMeeting,
            activeMeetingId,
            activeOrganizationId,
            authenticatedUserEmail,
            authenticatedWalletAddress,
            activateGovernanceProposal,
            addProject,
            adoptGovernanceProposal,
            advanceGovernanceElection,
            circleMap,
            closeGovernanceMeeting,
            closeMeeting,
            createOrganization,
            createGovernanceProposal,
            declareProcessBreakdown,
            discardGovernanceProposal,
            governanceMeetingMap,
            inviteMember,
            meetingMap,
            organization: snapshot.organization,
            organizations,
            openGovernanceMeeting,
            openMeeting,
            partnerMap,
            policyMap,
            projectBoardCircleId,
            raiseGovernanceObjection,
            resolveGovernanceIntegration,
            restoreProcessBreakdown,
            roleMap,
            setActiveOrganizationId,
            setGovernanceMeetingPhase,
            setProjectBoardCircleId,
            snapshot,
            syncAuthenticatedIdentity,
            startGovernanceIntegration,
            toggleActionCompletion,
            withdrawGovernanceProposal,
        }),
        [
            activeGovernanceMeeting,
            activeGovernanceMeetingId,
            activeMeeting,
            activeMeetingId,
            activeOrganizationId,
            authenticatedUserEmail,
            authenticatedWalletAddress,
            activateGovernanceProposal,
            addProject,
            adoptGovernanceProposal,
            advanceGovernanceElection,
            circleMap,
            closeGovernanceMeeting,
            closeMeeting,
            createOrganization,
            createGovernanceProposal,
            declareProcessBreakdown,
            discardGovernanceProposal,
            governanceMeetingMap,
            inviteMember,
            meetingMap,
            openGovernanceMeeting,
            openMeeting,
            partnerMap,
            policyMap,
            projectBoardCircleId,
            raiseGovernanceObjection,
            resolveGovernanceIntegration,
            restoreProcessBreakdown,
            organizations,
            roleMap,
            setActiveOrganizationId,
            setGovernanceMeetingPhase,
            setProjectBoardCircleId,
            snapshot,
            syncAuthenticatedIdentity,
            startGovernanceIntegration,
            toggleActionCompletion,
            withdrawGovernanceProposal,
        ],
    );

    return createElement(WorkspaceContext.Provider, { value: contextValue }, children);
}

export function useWorkspaceSnapshot() {
    const context = useContext(WorkspaceContext);

    if (!context) {
        throw new Error("useWorkspaceSnapshot must be used within a WorkspaceProvider");
    }

    return context;
}
