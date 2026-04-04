import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { motion } from "framer-motion";
import { ArrowRight, Building2, CheckCircle2, LogOut, Network, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import DynamicAuthControl from "../components/DynamicAuthControl";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const EXPO = [0.16, 1, 0.3, 1] as const;
const SPRING = "cubic-bezier(0.32,0.72,0,1)";

function shortenWallet(address: string) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const FEATURES = [
    {
        icon: "◎",
        title: "Org chart",
        body: "Circles, roles, and structural relationships visible immediately.",
    },
    {
        icon: "◈",
        title: "Governance",
        body: "Proposals, elections, and tactical meetings ready to use.",
    },
    {
        icon: "◉",
        title: "Execution",
        body: "Actions, OKRs, projects, and calendar linked into one model.",
    },
] as const;

export default function OrganizationOnboarding() {
    const {
        authenticatedUserEmail,
        authenticatedWalletAddress,
        circleMap,
        createOrganization,
        roleMap,
        snapshot,
    } = useWorkspaceSnapshot();
    const { handleLogOut } = useDynamicContext();

    const [organizationName, setOrganizationName] = useState("");
    const [ownerName, setOwnerName] = useState("");
    const [purpose, setPurpose] = useState(
        "Create a transparent Holacracy workspace where circles, governance, tactical meetings, and execution all live together.",
    );

    const defaultOwnerName = useMemo(() => {
        if (authenticatedUserEmail) return authenticatedUserEmail.split("@")[0] ?? "";
        if (authenticatedWalletAddress)
            return `Owner ${authenticatedWalletAddress.slice(2, 6).toUpperCase()}`;
        return "";
    }, [authenticatedUserEmail, authenticatedWalletAddress]);

    const stats = useMemo(
        () => [
            { label: "circles", value: Object.keys(circleMap).length },
            { label: "roles", value: Object.keys(roleMap).length },
            { label: "members", value: snapshot.partners.length },
        ],
        [circleMap, roleMap, snapshot.partners.length],
    );

    const canCreate =
        Boolean(authenticatedWalletAddress) &&
        organizationName.trim().length > 2 &&
        (ownerName.trim().length > 1 || defaultOwnerName.length > 1);

    return (
        <div className="relative w-full">
            {/* Dark-mode ambient mesh */}
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[480px] opacity-0 dark:opacity-100"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(52,129,255,0.09) 0%, transparent 65%)",
                    transition: `opacity 0.5s ${SPRING}`,
                }}
            />

            {/* Centered column */}
            <div className="relative mx-auto flex w-full max-w-[480px] flex-col items-center gap-8 pb-16 pt-10">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, ease: EXPO }}
                    className="flex w-full flex-col items-center text-center"
                >
                    {/* Brand mark */}
                    <div className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-[1rem]
                        bg-gradient-to-br from-[#3481FF] to-[#1a5fd4]
                        shadow-[0_6px_24px_rgba(52,129,255,0.38)]">
                        <span className="text-[22px] font-bold text-white">H</span>
                    </div>

                    <span className="mb-3 inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/[0.1]
                        bg-white/80 dark:bg-white/[0.04]
                        px-3 py-1
                        text-[10px] font-semibold uppercase tracking-[0.2em]
                        text-slate-500 dark:text-slate-500
                        shadow-sm backdrop-blur-sm">
                        Organization setup
                    </span>

                    <h1 className="text-[28px] font-bold leading-[1.2] tracking-[-0.03em] text-slate-900 dark:text-white">
                        Create your workspace
                    </h1>
                    <p className="mt-2.5 max-w-[340px] text-[14px] leading-relaxed text-slate-500 dark:text-slate-500">
                        Fill in the details below — your starter structure deploys instantly onchain.
                    </p>
                </motion.div>

                {/* ── Wallet status ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.08, ease: EXPO }}
                    className="w-full"
                >
                    {authenticatedWalletAddress ? (
                        /* Connected state */
                        <div className="rounded-2xl
                            border border-emerald-200/70 dark:border-emerald-500/[0.2]
                            bg-emerald-50/80 dark:bg-emerald-500/[0.06]
                            px-4 py-3">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={16} strokeWidth={1.75}
                                    className="flex-shrink-0 text-emerald-500" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-500">
                                        Wallet connected
                                    </p>
                                    <p className="mt-0.5 truncate font-mono text-[12px] text-slate-600 dark:text-slate-400">
                                        {authenticatedWalletAddress}
                                    </p>
                                </div>
                                <span className="flex-shrink-0 rounded-full border border-emerald-200 dark:border-emerald-500/20
                                    bg-white/80 dark:bg-emerald-500/10
                                    px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    {shortenWallet(authenticatedWalletAddress)}
                                </span>
                            </div>
                            <div className="mt-3 border-t border-emerald-200/60 dark:border-emerald-500/[0.15] pt-3">
                                <button
                                    type="button"
                                    onClick={handleLogOut}
                                    className="group flex items-center gap-2
                                        text-[12px] font-semibold text-slate-500 dark:text-slate-500
                                        transition-colors duration-200 hover:text-slate-800 dark:hover:text-slate-300"
                                >
                                    <LogOut size={13} strokeWidth={2}
                                        className="transition-transform duration-300 group-hover:-translate-x-0.5"
                                        aria-hidden="true" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Disconnected state */
                        <div className="rounded-2xl
                            border border-slate-200/80 dark:border-white/[0.08]
                            bg-white/70 dark:bg-white/[0.03]
                            px-4 py-4">
                            <div className="mb-3 flex items-center gap-2.5">
                                <Wallet size={15} strokeWidth={1.5}
                                    className="text-slate-400 dark:text-slate-600" aria-hidden="true" />
                                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-500">
                                    Connect a wallet to continue
                                </p>
                            </div>
                            <DynamicAuthControl />
                        </div>
                    )}
                </motion.div>

                {/* ── Form card — double bezel ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, delay: 0.15, ease: EXPO }}
                    className="w-full"
                >
                    {/* Outer shell */}
                    <div className="rounded-[1.75rem]
                        border border-slate-200/80 dark:border-white/[0.08]
                        bg-white/60 dark:bg-white/[0.03]
                        p-[5px]
                        shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_32px_rgba(0,0,0,0.4)]
                        backdrop-blur-xl">
                        {/* Inner core */}
                        <form
                            className="rounded-[calc(1.75rem-5px)]
                                bg-white dark:bg-[#0e0e12]
                                shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]
                                px-6 py-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!authenticatedWalletAddress || !canCreate) return;
                                createOrganization({
                                    name: organizationName,
                                    ownerName: ownerName.trim() || defaultOwnerName,
                                    ownerWalletAddress: authenticatedWalletAddress,
                                    purpose,
                                });
                            }}
                        >
                            {/* Form header */}
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl
                                    bg-[#3481FF]/10 dark:bg-[#3481FF]/15 text-[#3481FF]">
                                    <Building2 size={17} strokeWidth={1.75} aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
                                        Founder profile
                                    </p>
                                    <p className="text-[14px] font-bold tracking-tight text-slate-900 dark:text-white">
                                        Organization details
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Org name */}
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                                        Organization name
                                    </label>
                                    <input
                                        type="text"
                                        value={organizationName}
                                        onChange={(e) => setOrganizationName(e.target.value)}
                                        placeholder="Hollab Protocol"
                                        autoComplete="organization"
                                        className="w-full rounded-xl
                                            border border-slate-200 dark:border-white/[0.08]
                                            bg-slate-50 dark:bg-white/[0.04]
                                            px-4 py-3
                                            text-[14px] font-medium
                                            text-slate-900 dark:text-white
                                            placeholder:text-slate-400 dark:placeholder:text-slate-600
                                            outline-none
                                            transition-all duration-300
                                            focus:border-[#3481FF] dark:focus:border-[#3481FF]/60
                                            focus:bg-white dark:focus:bg-white/[0.06]
                                            focus:ring-4 focus:ring-[#3481FF]/[0.12] dark:focus:ring-[#3481FF]/[0.1]"
                                        style={{ transitionTimingFunction: SPRING }}
                                    />
                                </div>

                                {/* Your name */}
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                                        Your name
                                    </label>
                                    <input
                                        type="text"
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        placeholder={defaultOwnerName || "Elena Moroz"}
                                        autoComplete="name"
                                        className="w-full rounded-xl
                                            border border-slate-200 dark:border-white/[0.08]
                                            bg-slate-50 dark:bg-white/[0.04]
                                            px-4 py-3
                                            text-[14px] font-medium
                                            text-slate-900 dark:text-white
                                            placeholder:text-slate-400 dark:placeholder:text-slate-600
                                            outline-none
                                            transition-all duration-300
                                            focus:border-[#3481FF] dark:focus:border-[#3481FF]/60
                                            focus:bg-white dark:focus:bg-white/[0.06]
                                            focus:ring-4 focus:ring-[#3481FF]/[0.12] dark:focus:ring-[#3481FF]/[0.1]"
                                        style={{ transitionTimingFunction: SPRING }}
                                    />
                                </div>

                                {/* Purpose */}
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-slate-600 dark:text-slate-400">
                                        Workspace purpose
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={purpose}
                                        onChange={(e) => setPurpose(e.target.value)}
                                        className="w-full resize-none rounded-xl
                                            border border-slate-200 dark:border-white/[0.08]
                                            bg-slate-50 dark:bg-white/[0.04]
                                            px-4 py-3
                                            text-[14px] font-medium leading-relaxed
                                            text-slate-900 dark:text-white
                                            outline-none
                                            transition-all duration-300
                                            focus:border-[#3481FF] dark:focus:border-[#3481FF]/60
                                            focus:bg-white dark:focus:bg-white/[0.06]
                                            focus:ring-4 focus:ring-[#3481FF]/[0.12] dark:focus:ring-[#3481FF]/[0.1]"
                                        style={{ transitionTimingFunction: SPRING }}
                                    />
                                </div>
                            </div>

                            {/* Stats row */}
                            <div className="mt-5 flex items-center gap-2">
                                {stats.map((s) => (
                                    <div
                                        key={s.label}
                                        className="flex flex-1 flex-col items-center rounded-xl
                                            border border-slate-100 dark:border-white/[0.06]
                                            bg-slate-50/80 dark:bg-white/[0.03]
                                            py-2.5"
                                    >
                                        <span className="text-[18px] font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                                            {s.value}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
                                            {s.label}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA — button-in-button pattern */}
                            <button
                                type="submit"
                                disabled={!canCreate}
                                className={`group mt-5 flex w-full items-center justify-between rounded-xl px-5 py-3.5
                                    text-[14px] font-bold tracking-tight
                                    transition-all duration-500 active:scale-[0.98]
                                    ${canCreate
                                        ? "bg-[#3481FF] text-white shadow-[0_8px_28px_rgba(52,129,255,0.35)] hover:shadow-[0_10px_36px_rgba(52,129,255,0.45)] hover:bg-[#2570f0]"
                                        : "cursor-not-allowed bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-600"
                                    }`}
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Network size={16} strokeWidth={2} aria-hidden="true" />
                                    Create workspace
                                </div>
                                {/* Trailing icon — button-in-button */}
                                <span className={`flex h-7 w-7 items-center justify-center rounded-full
                                    transition-all duration-500
                                    ${canCreate
                                        ? "bg-white/20 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-[1.08]"
                                        : "bg-slate-200/50 dark:bg-white/[0.04]"
                                    }`}
                                    style={{ transitionTimingFunction: SPRING }}
                                >
                                    <ArrowRight size={13} strokeWidth={2.5} aria-hidden="true" />
                                </span>
                            </button>

                            {!canCreate && (
                                <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-600">
                                    {!authenticatedWalletAddress
                                        ? "Connect your wallet first"
                                        : "Enter an organization name to continue"}
                                </p>
                            )}
                        </form>
                    </div>
                </motion.div>

                {/* ── Feature cards ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: EXPO }}
                    className="w-full"
                >
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
                        What's included in the starter structure
                    </p>
                    <div className="grid gap-2">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="flex items-start gap-3.5 rounded-2xl
                                    border border-slate-200/60 dark:border-white/[0.06]
                                    bg-white/60 dark:bg-white/[0.02]
                                    px-4 py-3.5
                                    backdrop-blur-sm"
                            >
                                <span className="mt-0.5 flex-shrink-0 text-[16px] text-[#3481FF] opacity-80">
                                    {f.icon}
                                </span>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                                        {f.title}
                                    </p>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-500">
                                        {f.body}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

            </div>
        </div>
    );
}
