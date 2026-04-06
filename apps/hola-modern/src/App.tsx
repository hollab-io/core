import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, CheckSquare, LogIn, Network, Scale, Users } from "lucide-react";
import { useEffect, useState } from "react";

import type { AppTabId } from "./config/navigation";
import ChainSwitcher from "./components/ChainSwitcher";
import DynamicAuthControl from "./components/DynamicAuthControl";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./context/ThemeContext";
import { useCirclesFromIndexer } from "./hooks/useCirclesFromIndexer";
import { useGovernanceMeetingsFromIndexer } from "./hooks/useGovernanceMeetingsFromIndexer";
import { useOrganizationsFromIndexer } from "./hooks/useOrganizationsFromIndexer";
import { useOrgMembersFromIndexer } from "./hooks/useOrgMembersFromIndexer";
import { useRolesFromIndexer } from "./hooks/useRolesFromIndexer";
import { useTacticalMeetingsFromIndexer } from "./hooks/useTacticalMeetingsFromIndexer";
import { useWorkspaceSnapshot } from "./hooks/useWorkspaceSnapshot";
import ActionItemsView from "./views/ActionItemsView";
import ConstitutionView from "./views/ConstitutionView";
import GovernanceMeetingRoom from "./views/GovernanceMeetingRoom";
import GovernanceView from "./views/GovernanceView";
import JoinOrganizationPanel from "./views/JoinOrganizationPanel";
import OrganizationsHome from "./views/OrganizationsHome";
import StructureView from "./views/StructureView";
import TacticalMeetingRoom from "./views/TacticalMeetingRoom";
import TacticalView from "./views/TacticalView";
import Welcome from "./views/Welcome";

const SPRING = "cubic-bezier(0.32,0.72,0,1)";
const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const NAV = [
    { id: "tactical" as AppTabId, icon: Users, label: "Tactical" },
    { id: "governance" as AppTabId, icon: Scale, label: "Governance" },
    { id: "actions" as AppTabId, icon: CheckSquare, label: "Actions" },
    { id: "structure" as AppTabId, icon: Network, label: "Structure" },
    { id: "constitution" as AppTabId, icon: BookOpen, label: "Constitution" },
] as const;

function App() {
    const { isDark } = useTheme();
    const {
        activeOrganizationId,
        setActiveOrganizationId,
        authenticatedWalletAddress,
        syncIndexedCircles,
        syncIndexedMembers,
        syncIndexedRoles,
    } = useWorkspaceSnapshot();
    const { organizations, pollUntil } = useOrganizationsFromIndexer(authenticatedWalletAddress);
    const activeOrg = organizations.find((o) => o.id === activeOrganizationId) ?? null;
    const { members: indexedMembers } = useOrgMembersFromIndexer(activeOrg?.circleRegistry);
    const { circles: indexedCircles } = useCirclesFromIndexer(activeOrganizationId);
    const { roles: indexedRoles } = useRolesFromIndexer(activeOrganizationId);
    const {
        tacticalMeetingAddress,
        governanceMeetingAddress,
        meetings: indexedMeetings,
        outputs: indexedOutputs,
        pollForNewMeeting,
        refetch: refetchMeetings,
        fetchOutputs,
    } = useTacticalMeetingsFromIndexer(activeOrganizationId);
    const { meetings: indexedGovernanceMeetings, pollForNewMeeting: pollForNewGovernanceMeeting } =
        useGovernanceMeetingsFromIndexer(governanceMeetingAddress);
    const [activeTab, setActiveTab] = useState<AppTabId>("constitution");
    // When true, StructureView should auto-open the add-members panel
    const [autoOpenInvite, setAutoOpenInvite] = useState(false);
    // Org IDs that have completed (or skipped) member onboarding this session
    const [onboardedOrgIds, setOnboardedOrgIds] = useState<Set<string>>(() => new Set());
    // Org IDs selected from Discover (user is not yet a member)
    const [guestOrgIds, setGuestOrgIds] = useState<Set<string>>(() => new Set());

    // Skip invite onboarding if the org already has more than 1 member (creator + others)
    const isOnboarding = Boolean(
        activeOrganizationId &&
            !onboardedOrgIds.has(activeOrganizationId) &&
            !guestOrgIds.has(activeOrganizationId) &&
            (activeOrg ? Number(activeOrg.memberCount) <= 1 : true),
    );
    const completeOnboarding = () => {
        if (activeOrganizationId) {
            setOnboardedOrgIds((prev) => new Set([...prev, activeOrganizationId]));
        }
    };
    // Navigate to an org from Discover — bypasses onboarding, shows join banner
    const handlePreview = (id: string) => {
        setActiveOrganizationId(id);
        setGuestOrgIds((prev) => new Set([...prev, id]));
    };
    const isGuest = Boolean(activeOrganizationId && guestOrgIds.has(activeOrganizationId));
    const [showGuestJoin, setShowGuestJoin] = useState(false);
    const [showPublicConstitution, setShowPublicConstitution] = useState(false);

    // Sync on-chain org members into the workspace partner list
    useEffect(() => {
        if (indexedMembers.length > 0) {
            syncIndexedMembers(indexedMembers);
        }
    }, [indexedMembers, syncIndexedMembers]);

    // Sync on-chain circles into the workspace
    useEffect(() => {
        if (indexedCircles.length > 0) {
            syncIndexedCircles(indexedCircles);
        }
    }, [indexedCircles, syncIndexedCircles]);

    // Sync on-chain roles into the workspace (after members so partner IDs are available)
    useEffect(() => {
        if (indexedRoles.length > 0) {
            syncIndexedRoles(indexedRoles);
        }
    }, [indexedRoles, syncIndexedRoles]);

    // Skip onboarding screen — just mark it complete
    useEffect(() => {
        if (isOnboarding && activeOrg) {
            completeOnboarding();
        }
    }, [isOnboarding, activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!authenticatedWalletAddress) {
        if (showPublicConstitution) {
            return (
                <div className="relative flex h-screen w-full flex-col overflow-hidden bg-white dark:bg-[#050505] text-slate-900 dark:text-white font-sans">
                    <header
                        className="relative z-10 flex h-[56px] shrink-0 items-center gap-3
                            border-b border-slate-200/60 dark:border-white/[0.05] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl px-4"
                    >
                        <button
                            type="button"
                            onClick={() => setShowPublicConstitution(false)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                                border border-slate-200 dark:border-white/[0.07] text-slate-400 dark:text-slate-500
                                transition-colors hover:border-slate-300 dark:hover:border-white/[0.14] hover:text-slate-600 dark:hover:text-slate-300"
                            aria-label="Back"
                        >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path
                                    d="M7.5 2L3.5 6L7.5 10"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        <p className="text-[14px] font-semibold leading-none tracking-[-0.02em] text-slate-900 dark:text-white">
                            Constitution
                        </p>
                        <div className="flex-1" />
                        <ThemeToggle />
                        <DynamicAuthControl />
                    </header>
                    <main className="custom-scrollbar relative z-10 min-w-0 flex-1 overflow-auto">
                        <ConstitutionView />
                    </main>
                </div>
            );
        }
        return <Welcome onShowConstitution={() => setShowPublicConstitution(true)} />;
    }

    if (!activeOrganizationId) {
        return (
            <div className="relative flex h-screen w-full overflow-hidden bg-white dark:bg-[#050505]">
                <div className="grain-overlay hidden dark:block" aria-hidden="true" />
                <main className="custom-scrollbar relative z-10 min-w-0 flex-1 overflow-auto">
                    <OrganizationsHome
                        organizations={organizations}
                        onSelect={setActiveOrganizationId}
                        onSelectNew={setActiveOrganizationId}
                        onPreview={handlePreview}
                        pollUntil={pollUntil}
                    />
                </main>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case "tactical":
                return (
                    <TacticalView
                        tacticalMeetingAddress={tacticalMeetingAddress}
                        indexedMeetings={indexedMeetings}
                        pollForNewMeeting={pollForNewMeeting}
                        refetchMeetings={refetchMeetings}
                        activeOrg={activeOrg}
                    />
                );
            case "governance":
                return (
                    <GovernanceView
                        governanceMeetingAddress={governanceMeetingAddress}
                        indexedGovernanceMeetings={indexedGovernanceMeetings}
                        pollForNewGovernanceMeeting={pollForNewGovernanceMeeting}
                        refetchMeetingComponents={refetchMeetings}
                    />
                );
            case "actions":
                return <ActionItemsView outputs={indexedOutputs} meetings={indexedMeetings} />;
            case "structure":
                return (
                    <StructureView
                        org={activeOrg!}
                        isDarkMode={isDark}
                        autoOpenInvite={autoOpenInvite}
                        onInviteOpened={() => setAutoOpenInvite(false)}
                    />
                );
            case "constitution":
                return <ConstitutionView />;
        }
    };

    return (
        <div
            className="relative flex h-screen w-full flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#050505] dark:text-white font-sans"
            style={{
                transition:
                    "background-color 0.5s cubic-bezier(0.32,0.72,0,1), color 0.5s cubic-bezier(0.32,0.72,0,1)",
            }}
        >
            {/* Ambient mesh — dark only */}
            <div
                className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 40% at 80% 90%, rgba(52,129,255,0.07) 0%, transparent 60%), " +
                        "radial-gradient(ellipse 45% 35% at 20% 10%, rgba(99,102,241,0.05) 0%, transparent 55%)",
                }}
            />

            {/* Grain */}
            <div className="grain-overlay hidden dark:block" aria-hidden="true" />

            {/* ── Top header ── */}
            <header
                className="relative z-10 flex h-[56px] shrink-0 items-center gap-3
                    border-b border-slate-200/60 dark:border-white/[0.05] bg-white/80 dark:bg-[#050505]/80 backdrop-blur-2xl px-4"
            >
                {/* Back to orgs */}
                <button
                    type="button"
                    onClick={() => setActiveOrganizationId(null)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                        border border-slate-200 dark:border-white/[0.07] text-slate-400 dark:text-slate-500
                        transition-colors hover:border-slate-300 dark:hover:border-white/[0.14] hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label="Back to organizations"
                >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                            d="M7.5 2L3.5 6L7.5 10"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                {/* Org info */}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold leading-none tracking-[-0.02em] text-slate-900 dark:text-white">
                        {activeOrg?.name ?? "Organization"}
                    </p>
                    {activeOrg && (
                        <p className="mt-0.5 truncate text-[11px] leading-none text-slate-400 dark:text-slate-600">
                            {activeOrg.subname}.hollab.eth
                        </p>
                    )}
                </div>

                {/* Right: theme + chain + auth */}
                <ThemeToggle />
                <ChainSwitcher />
                <DynamicAuthControl />
            </header>

            {/* ── Guest join banner ── */}
            <AnimatePresence>
                {isGuest && !showGuestJoin && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 flex items-center justify-between gap-4
                            border-b border-[#3481FF]/15 bg-[#3481FF]/[0.06]
                            px-5 py-2.5"
                    >
                        <p className="text-[12px] text-slate-500 dark:text-slate-400">
                            You're browsing as a guest.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowGuestJoin(true)}
                            className="flex items-center gap-1.5 rounded-full
                                border border-[#3481FF]/30 bg-[#3481FF]/[0.12]
                                px-3.5 py-1.5 text-[11px] font-semibold text-[#3481FF]
                                transition-all duration-300
                                hover:bg-[#3481FF]/[0.2] hover:border-[#3481FF]/50"
                        >
                            <LogIn size={11} strokeWidth={2} />
                            Request to join
                        </button>
                    </motion.div>
                )}
                {isGuest && showGuestJoin && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="relative z-10 overflow-hidden border-b border-slate-200/60 dark:border-white/[0.06]"
                    >
                        <div className="px-4 py-4">
                            <JoinOrganizationPanel
                                onClose={() => setShowGuestJoin(false)}
                                prefilled={
                                    activeOrg
                                        ? {
                                              id: BigInt(activeOrg.id),
                                              name: activeOrg.name,
                                              subname: activeOrg.subname,
                                              creator: activeOrg.creator as `0x${string}`,
                                          }
                                        : undefined
                                }
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Content ── */}
            <main className="custom-scrollbar relative z-10 min-w-0 flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: EXPO }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* ── Floating pill nav ── */}
            <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2" aria-label="Navigation">
                <nav
                    className="flex items-center gap-px rounded-full
                        border border-slate-200/80 dark:border-white/[0.1]
                        bg-white/90 dark:bg-[#0c0c12]/90 backdrop-blur-2xl
                        p-[4px]
                        shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                    {NAV.map(({ id, icon: Icon, label }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setActiveTab(id)}
                                className={`relative flex items-center gap-2 rounded-full
                                    px-4 py-2.5
                                    text-[12px] font-semibold tracking-wide
                                    transition-all duration-500
                                    ${
                                        isActive
                                            ? "bg-slate-900/[0.08] dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-white/[0.1]"
                                            : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                    }`}
                                style={{ transitionTimingFunction: SPRING }}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <Icon
                                    size={14}
                                    strokeWidth={isActive ? 2 : 1.75}
                                    className={
                                        isActive
                                            ? "text-slate-900 dark:text-white"
                                            : "text-slate-400 dark:text-slate-500"
                                    }
                                />
                                <span
                                    className={`transition-all duration-300 ${isActive ? "max-w-[80px] opacity-100" : "max-w-0 overflow-hidden opacity-0 sm:max-w-[80px] sm:opacity-100"}`}
                                >
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Meeting overlays */}
            <TacticalMeetingRoom
                onNavigateToTab={setActiveTab}
                tacticalMeetingAddress={tacticalMeetingAddress}
                indexedMeetings={indexedMeetings}
                allOutputs={indexedOutputs}
                fetchOutputs={fetchOutputs}
                refetchMeetings={refetchMeetings}
            />
            <GovernanceMeetingRoom
                governanceMeetingAddress={governanceMeetingAddress}
                circleRegistryAddress={activeOrg?.circleRegistry as `0x${string}` | undefined}
                indexedGovernanceMeetings={indexedGovernanceMeetings}
            />
        </div>
    );
}

export default App;
