import type { Organization } from "@hollab-io/indexing-client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ExternalLink, LogIn, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

import logoSvg from "../assets/logo.svg";
import ChainSwitcher from "../components/ChainSwitcher";
import DynamicAuthControl from "../components/DynamicAuthControl";
import ThemeToggle from "../components/ThemeToggle";
import { useOrganizationFactory } from "../hooks/useOrganizationFactory";
import { getIndexingClient } from "../hooks/useOrganizationsFromIndexer";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";
import JoinOrganizationPanel from "./JoinOrganizationPanel";

const SPRING = "cubic-bezier(0.32,0.72,0,1)";
const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Props = {
    organizations: Organization[];
    /** Select an existing org — goes straight to dashboard */
    onSelect: (id: string) => void;
    /** Select a freshly-created org — goes through member onboarding */
    onSelectNew: (id: string) => void;
    /** Preview an org from Discover (guest mode — shows join banner inside workspace) */
    onPreview: (id: string) => void;
    pollUntil: (predicate: (orgs: Organization[]) => boolean) => Promise<Organization[]>;
};

const ACCENT_PALETTE = [
    "from-[#3481FF] to-[#1a5fd4]",
    "from-violet-500 to-indigo-500",
    "from-emerald-400 to-teal-600",
    "from-sky-400 to-blue-600",
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-500",
];

function OrgCard({
    org,
    index,
    onSelect,
}: {
    org: Organization;
    index: number;
    onSelect: (id: string) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.12 + index * 0.07, ease: EXPO }}
        >
            {/* Double-bezel outer shell */}
            <button
                type="button"
                onClick={() => onSelect(org.id)}
                className="group w-full rounded-[1.75rem]
                    border border-slate-200/80 dark:border-white/[0.07]
                    bg-white/80 dark:bg-white/[0.03]
                    p-[5px]
                    transition-all duration-700
                    hover:border-[#3481FF]/25
                    hover:shadow-[0_0_40px_rgba(52,129,255,0.1)]
                    active:scale-[0.99]"
                style={{ transitionTimingFunction: SPRING }}
            >
                {/* Inner core */}
                <div
                    className="rounded-[calc(1.75rem-5px)]
                    bg-white dark:bg-[#0c0c10]
                    shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]
                    p-5 text-left"
                >
                    <div className="flex items-start gap-4">
                        {/* Org avatar */}
                        <div className="relative flex-shrink-0">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-[0.875rem]
                                bg-gradient-to-br from-[#3481FF] to-[#1a5fd4]
                                text-[18px] font-bold text-white
                                shadow-[0_4px_16px_rgba(52,129,255,0.4)]"
                            >
                                {org.name.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                                <p
                                    className="truncate text-[14px] font-bold tracking-[-0.02em]
                                    text-slate-900 dark:text-white
                                    transition-colors duration-300 group-hover:text-[#3481FF]"
                                >
                                    {org.name}
                                </p>
                                {/* Button-in-button arrow */}
                                <div
                                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full
                                    bg-slate-100/80 dark:bg-white/[0.05]
                                    ring-1 ring-slate-200/60 dark:ring-white/[0.08]
                                    transition-all duration-500
                                    group-hover:bg-[#3481FF]/20
                                    group-hover:ring-[#3481FF]/30
                                    group-hover:translate-x-0.5 group-hover:-translate-y-px"
                                    style={{ transitionTimingFunction: SPRING }}
                                >
                                    <ArrowRight
                                        size={12}
                                        strokeWidth={2}
                                        className="text-slate-500 transition-colors duration-300 group-hover:text-[#3481FF]"
                                    />
                                </div>
                            </div>
                            {org.purpose ? (
                                <p className="mt-1 text-[12px] leading-relaxed text-slate-500 line-clamp-2">
                                    {org.purpose}
                                </p>
                            ) : (
                                <p className="mt-1 font-mono text-[11px] text-slate-600">
                                    {org.subname}.hollab.eth
                                </p>
                            )}
                            <div className="mt-3 flex items-center gap-3">
                                <span className="flex items-center gap-1 text-[11px] text-slate-700">
                                    <Users size={10} strokeWidth={1.75} />
                                    {org.memberCount} member{org.memberCount !== "1" ? "s" : ""}
                                </span>
                                {org.circleCount !== "0" && (
                                    <span className="text-[11px] text-slate-700">
                                        {org.circleCount} circle{org.circleCount !== "1" ? "s" : ""}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </button>
        </motion.div>
    );
}

export default function OrganizationsHome({
    organizations,
    onSelect,
    onSelectNew,
    onPreview,
    pollUntil,
}: Props) {
    const { authenticatedWalletAddress } = useWorkspaceSnapshot();
    const { deployOrganization } = useOrganizationFactory();

    // ── Discover: all orgs the user is not a member/creator of ───────────────
    const [discoverOrgs, setDiscoverOrgs] = useState<Organization[]>([]);

    useEffect(() => {
        const client = getIndexingClient();
        if (!client) return;

        const myOrgIds = new Set(organizations.map((o) => o.id));

        const load = async () => {
            // Fetch all orgs + user's memberships in parallel
            const [allOrgs, memberships] = await Promise.all([
                client.listOrganizations({ limit: 100 }),
                authenticatedWalletAddress
                    ? client.listOrgMembersByAddress(authenticatedWalletAddress, { limit: 500 })
                    : Promise.resolve({ items: [] }),
            ]);

            memberships.items.forEach((m) => myOrgIds.add(m.orgId));

            setDiscoverOrgs(
                allOrgs.items.filter(
                    (o) =>
                        !myOrgIds.has(o.id) &&
                        o.creator.toLowerCase() !== authenticatedWalletAddress?.toLowerCase(),
                ),
            );
        };

        load().catch(() => {
            /* silent */
        });
    }, [organizations, authenticatedWalletAddress]);

    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);
    const [joinPrefilled, setJoinPrefilled] = useState<
        { id: bigint; name: string; subname: string; creator: `0x${string}` } | undefined
    >(undefined);
    const [orgName, setOrgName] = useState("");
    const [purpose, setPurpose] = useState("");
    const [txState, setTxState] = useState<"idle" | "wallet" | "pending" | "error">("idle");
    const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
    const [txError, setTxError] = useState<string | null>(null);

    const canCreate =
        Boolean(authenticatedWalletAddress) &&
        orgName.trim().length > 2 &&
        (txState === "idle" || txState === "error");

    const handleCreate = async () => {
        if (!authenticatedWalletAddress || orgName.trim().length < 3) return;
        if (txState === "wallet" || txState === "pending") return;

        setTxState("wallet");
        setTxError(null);
        setTxHash(null);

        try {
            const hash = await deployOrganization({
                name: orgName.trim(),
                purpose:
                    purpose.trim() ||
                    "Run circles, governance, and tactical work in one shared organizational workspace.",
                walletAddress: authenticatedWalletAddress as `0x${string}`,
            });

            setTxHash(hash);
            setTxState("pending");

            // Poll the indexer — when the org appears, the tx has confirmed and been indexed
            const prevCount = organizations.length;
            const updated = await pollUntil((orgs) => orgs.length > prevCount);
            const newOrg = updated[0]; // ordered by createdAt desc, so first is newest
            if (newOrg) {
                setShowCreate(false);
                setTxState("idle");
                onSelectNew(newOrg.id);
            }
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Transaction failed. Please try again.";
            setTxState("error");
            setTxError(message);
        }
    };

    const openCreate = () => {
        setOrgName("");
        setPurpose("");
        setTxState("idle");
        setTxError(null);
        setTxHash(null);
        setShowCreate(true);
    };

    return (
        <div className="relative min-h-[100dvh] w-full bg-white dark:bg-[#050505]">
            {/* Fixed ambient mesh — dark only */}
            <div
                className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 55% 40% at 15% 20%, rgba(52,129,255,0.07) 0%, transparent 60%)," +
                        "radial-gradient(ellipse 40% 35% at 85% 75%, rgba(99,102,241,0.05) 0%, transparent 55%)",
                }}
            />

            <div className="relative z-10 mx-auto max-w-[760px] px-4 pb-32 pt-14 sm:px-6">
                {/* ── Hero row ── */}
                <motion.div
                    initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, ease: EXPO }}
                    className="mb-16 flex items-start justify-between gap-6"
                >
                    {/* Left: brand + title */}
                    <div>
                        {/* Eyebrow */}
                        <div className="mb-5 flex items-center gap-2.5">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-[0.5rem]
                                bg-gradient-to-br from-[#3481FF] to-[#1a5fd4]
                                shadow-[0_3px_12px_rgba(52,129,255,0.45)]"
                            >
                                <img src={logoSvg} alt="Hollab" className="h-[22px] w-[22px]" />
                            </div>
                            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-600">
                                HolLab
                            </span>
                        </div>

                        <h1 className="text-[38px] font-bold leading-[1.05] tracking-[-0.045em] text-slate-900 dark:text-white sm:text-[48px]">
                            Workspaces
                        </h1>
                        <p className="mt-2.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-600">
                            Onchain organizations with circles, governance & roles.
                        </p>
                    </div>

                    {/* Right: theme + chain + auth */}
                    <div className="flex flex-shrink-0 items-center gap-3 pt-1">
                        <ThemeToggle />
                        <ChainSwitcher />
                        <DynamicAuthControl />
                    </div>
                </motion.div>

                {/* ── Your workspaces ── */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1, ease: EXPO }}
                    className="mb-16"
                >
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                            Your workspaces
                        </h2>

                        <div className="flex items-center gap-2">
                            {/* Join an existing org */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowJoin((v) => !v);
                                    setShowCreate(false);
                                }}
                                className="group flex items-center gap-2 rounded-full
                                    border border-slate-200 dark:border-white/[0.1]
                                    bg-slate-100/80 dark:bg-white/[0.04]
                                    pl-4 pr-[5px] py-[5px]
                                    text-[12px] font-bold text-slate-600 dark:text-slate-300
                                    transition-all duration-500
                                    hover:border-slate-300 dark:hover:border-white/[0.16] hover:text-slate-900 dark:hover:text-white
                                    active:scale-[0.97]"
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                Join
                                <div
                                    className="flex h-6 w-6 items-center justify-center rounded-full
                                    bg-slate-200/80 dark:bg-white/[0.08]
                                    transition-all duration-300
                                    group-hover:bg-slate-300/80 dark:group-hover:bg-white/[0.14]"
                                >
                                    <LogIn size={11} strokeWidth={2.5} />
                                </div>
                            </button>

                            {/* New workspace — Button-in-Button */}
                            <button
                                type="button"
                                onClick={openCreate}
                                className="group flex items-center gap-0 rounded-full
                                    bg-[#3481FF]
                                    pl-4 pr-[5px] py-[5px]
                                    text-[12px] font-bold text-white
                                    shadow-[0_4px_20px_rgba(52,129,255,0.35)]
                                    transition-all duration-500
                                    hover:shadow-[0_6px_28px_rgba(52,129,255,0.5)]
                                    hover:bg-[#2570f0]
                                    active:scale-[0.97]"
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                New workspace
                                <div
                                    className="ml-2.5 flex h-6 w-6 items-center justify-center rounded-full
                                    bg-white/[0.2]
                                    transition-all duration-500
                                    group-hover:bg-white/[0.25]
                                    group-hover:translate-x-px group-hover:-translate-y-px
                                    group-hover:scale-105"
                                    style={{ transitionTimingFunction: SPRING }}
                                >
                                    <Plus size={12} strokeWidth={2.5} />
                                </div>
                            </button>
                        </div>
                    </div>

                    {organizations.length === 0 ? (
                        /* Empty state — double-bezel */
                        <div
                            className="rounded-[1.75rem]
                            border border-slate-200/80 dark:border-white/[0.06]
                            bg-white/80 dark:bg-white/[0.02]
                            p-[5px]"
                        >
                            <div
                                className="rounded-[calc(1.75rem-5px)]
                                bg-white dark:bg-[#0a0a0e]
                                shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]
                                flex flex-col items-center gap-3 px-6 py-14 text-center"
                            >
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-[1rem]
                                    bg-slate-100 dark:bg-white/[0.04]
                                    ring-1 ring-slate-200 dark:ring-white/[0.07]"
                                >
                                    <span className="text-[20px]">◎</span>
                                </div>
                                <p className="text-[14px] font-semibold text-slate-400">
                                    No workspaces yet
                                </p>
                                <p className="max-w-[280px] text-[12px] leading-relaxed text-slate-600">
                                    Create a workspace to get circles, governance, and tactical work
                                    in one place.
                                </p>
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="mt-2 flex items-center gap-2 rounded-full
                                        border border-[#3481FF]/30
                                        bg-[#3481FF]/[0.1]
                                        px-5 py-2.5 text-[12px] font-semibold text-[#3481FF]
                                        transition-all duration-500
                                        hover:bg-[#3481FF]/[0.16]
                                        hover:border-[#3481FF]/50"
                                    style={{ transitionTimingFunction: SPRING }}
                                >
                                    Create your first workspace
                                    <ArrowRight size={12} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {organizations.map((org, i) => (
                                <OrgCard key={org.id} org={org} index={i} onSelect={onSelect} />
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* ── Join panel ── */}
                <AnimatePresence>
                    {showJoin && (
                        <motion.div
                            key="join-panel"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="mb-10 overflow-hidden"
                        >
                            <JoinOrganizationPanel
                                onClose={() => {
                                    setShowJoin(false);
                                    setJoinPrefilled(undefined);
                                }}
                                prefilled={joinPrefilled}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Discover ── */}
                {discoverOrgs.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2, ease: EXPO }}
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                                    Discover
                                </h2>
                                <p className="mt-0.5 text-[12px] text-slate-700">
                                    Open organizations on the network
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.02] p-[5px]">
                            <div className="rounded-[calc(1.75rem-5px)] bg-white dark:bg-[#0c0c10] shadow-[inset_0_1px_1px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] divide-y divide-slate-100 dark:divide-white/[0.04]">
                                {discoverOrgs.map((org, i) => {
                                    const accent = ACCENT_PALETTE[i % ACCENT_PALETTE.length];
                                    return (
                                        <motion.div
                                            key={org.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                duration: 0.4,
                                                delay: 0.08 + i * 0.04,
                                                ease: EXPO,
                                            }}
                                            className="group flex items-center gap-4 px-5 py-4"
                                        >
                                            {/* Clickable area — navigates into the org as guest */}
                                            <button
                                                type="button"
                                                onClick={() => onPreview(org.id)}
                                                className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                            >
                                                <div
                                                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center
                                                    rounded-[0.75rem] bg-gradient-to-br ${accent}
                                                    text-[15px] font-bold text-white shadow-sm`}
                                                >
                                                    {org.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-[13px] font-bold tracking-[-0.01em] text-slate-900 dark:text-white group-hover:text-[#3481FF] transition-colors duration-200">
                                                            {org.name}
                                                        </p>
                                                    </div>
                                                    {org.purpose ? (
                                                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 line-clamp-1">
                                                            {org.purpose}
                                                        </p>
                                                    ) : (
                                                        <p className="mt-0.5 font-mono text-[11px] text-slate-700">
                                                            {org.subname}.hollab.eth
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Member count */}
                                                <div className="hidden sm:flex flex-shrink-0 items-center gap-1.5 text-[11px] text-slate-600">
                                                    <Users size={11} strokeWidth={1.75} />
                                                    <span>{org.memberCount}</span>
                                                </div>
                                            </button>

                                            {/* Action buttons */}
                                            <div className="flex flex-shrink-0 items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onPreview(org.id)}
                                                    className="flex items-center gap-1.5 rounded-full
                                                    border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03]
                                                    px-3 py-1.5 text-[11px] font-medium text-slate-500
                                                    transition-all duration-300
                                                    hover:border-slate-300 dark:hover:border-white/[0.14] hover:text-slate-700 dark:hover:text-slate-300"
                                                >
                                                    <ExternalLink size={10} strokeWidth={2} />
                                                    Browse
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setJoinPrefilled({
                                                            id: BigInt(org.id),
                                                            name: org.name,
                                                            subname: org.subname,
                                                            creator: org.creator as `0x${string}`,
                                                        });
                                                        setShowJoin(true);
                                                        setShowCreate(false);
                                                    }}
                                                    className="flex items-center gap-1.5 rounded-full
                                                    bg-[#3481FF]/[0.12] border border-[#3481FF]/20
                                                    px-3 py-1.5 text-[11px] font-semibold text-[#3481FF]
                                                    transition-all duration-300
                                                    hover:bg-[#3481FF]/[0.2] hover:border-[#3481FF]/40"
                                                >
                                                    <LogIn size={10} strokeWidth={2.5} />
                                                    Join
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.section>
                )}
            </div>

            {/* ── Create workspace modal ── */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 flex items-center justify-center px-4
                            bg-black/70 backdrop-blur-xl"
                        onClick={() =>
                            txState === "idle" || txState === "error"
                                ? setShowCreate(false)
                                : undefined
                        }
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(8px)" }}
                            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: 12, scale: 0.98, filter: "blur(4px)" }}
                            transition={{ duration: 0.4, ease: EXPO }}
                            className="w-full max-w-[440px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Double-bezel modal */}
                            <div
                                className="rounded-[2rem]
                                border border-slate-200 dark:border-white/[0.1]
                                bg-white/80 dark:bg-white/[0.04]
                                p-[6px]
                                shadow-[0_32px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]"
                            >
                                <div
                                    className="rounded-[calc(2rem-6px)]
                                    bg-white dark:bg-[#0e0e14]
                                    shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]
                                    p-7"
                                >
                                    {/* Modal header */}
                                    <div className="mb-7 flex items-start justify-between">
                                        <div>
                                            <span
                                                className="mb-2 inline-flex rounded-full
                                                border border-[#3481FF]/20
                                                bg-[#3481FF]/[0.08]
                                                px-2.5 py-0.5
                                                text-[10px] font-semibold uppercase tracking-[0.2em]
                                                text-[#3481FF]/80"
                                            >
                                                New workspace
                                            </span>
                                            <h2 className="text-[22px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white">
                                                Create workspace
                                            </h2>
                                            <p className="mt-1 text-[13px] text-slate-500">
                                                Deploys with your starter structure instantly.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowCreate(false)}
                                            disabled={txState === "wallet" || txState === "pending"}
                                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
                                                bg-slate-100 dark:bg-white/[0.05]
                                                ring-1 ring-slate-200 dark:ring-white/[0.08]
                                                text-slate-500
                                                transition-all duration-300
                                                hover:bg-slate-200 dark:hover:bg-white/[0.09] hover:text-slate-700 dark:hover:text-slate-300
                                                disabled:cursor-not-allowed disabled:opacity-40"
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            <X size={14} strokeWidth={2} />
                                        </button>
                                    </div>

                                    {/* Fields */}
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <label
                                                className="mb-2 block text-[10px] font-semibold
                                                uppercase tracking-[0.18em] text-slate-600"
                                            >
                                                Organization name
                                            </label>
                                            {/* Input double-bezel */}
                                            <div
                                                className="rounded-[0.875rem]
                                                border border-slate-200 dark:border-white/[0.07]
                                                bg-slate-50 dark:bg-white/[0.03]
                                                p-[3px]
                                                transition-all duration-300
                                                focus-within:border-[#3481FF]/40
                                                focus-within:shadow-[0_0_0_3px_rgba(52,129,255,0.08)]"
                                            >
                                                <input
                                                    type="text"
                                                    value={orgName}
                                                    onChange={(e) => setOrgName(e.target.value)}
                                                    onKeyDown={(e) =>
                                                        e.key === "Enter" && handleCreate()
                                                    }
                                                    placeholder="Acme DAO…"
                                                    autoFocus
                                                    className="w-full rounded-[calc(0.875rem-3px)]
                                                        bg-white dark:bg-[#0c0c10]
                                                        px-4 py-3 text-[13px] font-medium
                                                        text-slate-900 dark:text-white
                                                        placeholder:text-slate-400 dark:placeholder:text-slate-700
                                                        outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label
                                                className="mb-2 block text-[10px] font-semibold
                                                uppercase tracking-[0.18em] text-slate-600"
                                            >
                                                Purpose{" "}
                                                <span className="normal-case tracking-normal font-normal text-slate-700">
                                                    (optional)
                                                </span>
                                            </label>
                                            <div
                                                className="rounded-[0.875rem]
                                                border border-slate-200 dark:border-white/[0.07]
                                                bg-slate-50 dark:bg-white/[0.03]
                                                p-[3px]
                                                transition-all duration-300
                                                focus-within:border-[#3481FF]/40
                                                focus-within:shadow-[0_0_0_3px_rgba(52,129,255,0.08)]"
                                            >
                                                <input
                                                    type="text"
                                                    value={purpose}
                                                    onChange={(e) => setPurpose(e.target.value)}
                                                    onKeyDown={(e) =>
                                                        e.key === "Enter" && handleCreate()
                                                    }
                                                    placeholder="What does this organization do?"
                                                    className="w-full rounded-[calc(0.875rem-3px)]
                                                        bg-white dark:bg-[#0c0c10]
                                                        px-4 py-3 text-[13px] font-medium
                                                        text-slate-900 dark:text-white
                                                        placeholder:text-slate-400 dark:placeholder:text-slate-700
                                                        outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Tx status */}
                                        {txState === "pending" && txHash && (
                                            <div
                                                className="flex items-center gap-2 rounded-xl
                                                border border-[#3481FF]/20
                                                bg-[#3481FF]/[0.06]
                                                px-4 py-3 text-[12px] text-[#3481FF]"
                                            >
                                                <svg
                                                    className="h-3 w-3 animate-spin flex-shrink-0"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8v8z"
                                                    />
                                                </svg>
                                                <span className="flex-1">Deploying…</span>
                                                <a
                                                    href={`https://etherscan.io/tx/${txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 opacity-70 hover:opacity-100"
                                                >
                                                    <ExternalLink size={10} strokeWidth={2} />
                                                </a>
                                            </div>
                                        )}

                                        {txState === "error" && txError && (
                                            <div
                                                className="rounded-xl
                                                border border-red-500/20
                                                bg-red-500/[0.06]
                                                px-4 py-3 text-[12px] text-red-400"
                                            >
                                                {txError}
                                            </div>
                                        )}

                                        {/* CTA — Button-in-Button */}
                                        <button
                                            type="button"
                                            onClick={handleCreate}
                                            disabled={!canCreate}
                                            className={`group mt-1 flex w-full items-center justify-between
                                                rounded-full py-[5px] pl-6 pr-[5px]
                                                text-[13px] font-bold
                                                transition-all duration-500
                                                active:scale-[0.98]
                                                ${
                                                    canCreate
                                                        ? "bg-[#3481FF] text-white shadow-[0_8px_28px_rgba(52,129,255,0.4)] hover:bg-[#2570f0] hover:shadow-[0_10px_36px_rgba(52,129,255,0.55)]"
                                                        : "cursor-not-allowed bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-700 ring-1 ring-slate-200 dark:ring-white/[0.07]"
                                                }`}
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            {txState === "wallet" && "Confirm in wallet…"}
                                            {txState === "pending" && "Deploying…"}
                                            {txState === "error" && "Retry"}
                                            {txState === "idle" && "Create workspace"}
                                            <div
                                                className={`flex h-9 w-9 items-center justify-center rounded-full
                                                transition-all duration-500
                                                group-hover:translate-x-0.5 group-hover:-translate-y-px
                                                group-hover:scale-105
                                                ${
                                                    canCreate ? "bg-white/[0.2]" : "bg-white/[0.04]"
                                                }`}
                                                style={{ transitionTimingFunction: SPRING }}
                                            >
                                                <ArrowRight size={14} strokeWidth={2} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
