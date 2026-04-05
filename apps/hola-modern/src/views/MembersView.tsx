import type { Organization } from "@hollab-io/indexing-client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Check, Loader2, Mail, Plus, Users, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress } from "viem";

import { useCircleRegistry } from "../hooks/useCircleRegistry";
import { getIndexingClient } from "../hooks/useOrganizationsFromIndexer";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

const SPRING = "cubic-bezier(0.32,0.72,0,1)";

type TxStatus = "idle" | "pending" | "confirmed" | "error";

function shortenWallet(address: string) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const INPUT_CLS = `w-full rounded-xl
    border border-slate-200 dark:border-white/[0.08]
    bg-slate-50 dark:bg-white/[0.04]
    px-4 py-3 text-[13px] font-medium
    text-slate-900 dark:text-white
    placeholder:text-slate-400 dark:placeholder:text-slate-600
    outline-none transition-all duration-300
    focus:border-[#3481FF] dark:focus:border-[#3481FF]/60
    focus:bg-white dark:focus:bg-white/[0.06]
    focus:ring-4 focus:ring-[#3481FF]/[0.1] dark:focus:ring-[#3481FF]/[0.08]`;

type Props = { org: Organization };

export default function MembersView({ org }: Props) {
    const { authenticatedWalletAddress, circleMap, inviteMember, organization, snapshot } =
        useWorkspaceSnapshot();
    const { addOrgMembers } = useCircleRegistry();

    const [inviteName, setInviteName] = useState("");
    const [inviteWallet, setInviteWallet] = useState("");
    const [inviteEmail, setInviteEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [txStatus, setTxStatus] = useState<TxStatus>("idle");
    const [txHash, setTxHash] = useState<string | null>(null);

    // ── On-chain members (from indexer) ──────────────────────────────────────
    const [onChainAddresses, setOnChainAddresses] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!org.circleRegistry) return;
        const client = getIndexingClient();
        if (!client) return;
        client
            .listOrgMembers(org.circleRegistry, { limit: 500 })
            .then((r) =>
                setOnChainAddresses(new Set(r.items.map((m) => m.memberAddress.toLowerCase()))),
            )
            .catch(() => {
                /* silent — indexer may not have caught up yet */
            });
    }, [org.circleRegistry]);

    const members = useMemo(() => {
        const rolesByPartnerId = new Map<string, string[]>();
        snapshot.roles.forEach((role) => {
            role.memberIds.forEach((id) => {
                const list = rolesByPartnerId.get(id) ?? [];
                list.push(role.title);
                rolesByPartnerId.set(id, list);
            });
        });

        // Build base list from local snapshot
        const knownAddresses = new Set(
            snapshot.partners
                .map((p) => p.walletAddress?.toLowerCase())
                .filter(Boolean) as string[],
        );
        const base = snapshot.partners.map((p) => ({
            ...p,
            roles: rolesByPartnerId.get(p.id) ?? [],
        }));

        // Append any on-chain member whose address isn't already in local snapshot
        const extra = Array.from(onChainAddresses)
            .filter((addr) => !knownAddresses.has(addr))
            .map((addr) => ({
                id: addr,
                name: shortenWallet(addr),
                walletAddress: addr,
                email: undefined as string | undefined,
                status: "active" as const,
                avatarSeed: addr,
                invitedAt: undefined as string | undefined,
                joinedAt: undefined as string | undefined,
                roles: [] as string[],
            }));

        return [...base, ...extra].sort((a, b) => {
            const sa = a.status === "invited" ? 1 : 0;
            const sb = b.status === "invited" ? 1 : 0;
            return sa !== sb ? sa - sb : a.name.localeCompare(b.name);
        });
    }, [snapshot.partners, snapshot.roles, onChainAddresses]);

    const activeMembers = members.filter((m) => m.status !== "invited");
    const invitedMembers = members.filter((m) => m.status === "invited");

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        const addr = inviteWallet.trim();
        if (!isAddress(addr)) {
            setErrorMessage("Enter a valid EVM wallet address.");
            return;
        }
        if (!authenticatedWalletAddress) {
            setErrorMessage("Connect your wallet first.");
            return;
        }

        setErrorMessage(null);
        setTxStatus("pending");
        setTxHash(null);

        try {
            const hash = await addOrgMembers({
                circleRegistryAddress: org.circleRegistry as `0x${string}`,
                memberAddresses: [addr as `0x${string}`],
                walletAddress: authenticatedWalletAddress as `0x${string}`,
            });
            setTxHash(hash);
            setTxStatus("confirmed");

            // Update local state after successful on-chain tx
            inviteMember({
                email: inviteEmail || undefined,
                name: inviteName,
                walletAddress: addr,
            });
            setInviteEmail("");
            setInviteName("");
            setInviteWallet("");
        } catch (err) {
            setTxStatus("error");
            setErrorMessage(
                err instanceof Error ? err.message : "Transaction failed. Please try again.",
            );
        }
    };

    if (!organization) {
        return (
            <section className="flex h-full items-center justify-center py-8">
                <div
                    className="w-full max-w-md rounded-[1.75rem]
                    border border-slate-200/70 dark:border-white/[0.07]
                    bg-white dark:bg-[#0e0e12] p-10 text-center"
                >
                    <div
                        className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl
                        bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-slate-600"
                    >
                        <Users size={20} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                        Create an organization first
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                        Member management becomes available once the workspace has been created.
                    </p>
                </div>
            </section>
        );
    }

    const isSubmitting = txStatus === "pending";

    return (
        <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 pb-32 pt-8 sm:px-8">
            {/* Stats row */}
            <div className="grid gap-3 grid-cols-3">
                {[
                    {
                        label: "Active members",
                        value: activeMembers.length,
                        color: "text-[#3481FF]",
                    },
                    {
                        label: "Pending invites",
                        value: invitedMembers.length,
                        color: "text-amber-500",
                    },
                    {
                        label: "Circles",
                        value: Object.keys(circleMap).length,
                        color: "text-emerald-500",
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="rounded-2xl
                        border border-slate-200/70 dark:border-white/[0.07]
                        bg-white dark:bg-[#0e0e12] px-5 py-4"
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">
                            {s.label}
                        </p>
                        <p
                            className={`mt-1 text-[26px] font-bold tabular-nums tracking-tight ${s.color}`}
                        >
                            {s.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                {/* Invite form */}
                <div
                    className="rounded-2xl border border-slate-200/70 dark:border-white/[0.07]
                    bg-white dark:bg-[#0e0e12] p-6"
                >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3481FF] mb-1">
                        Invite
                    </p>
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white mb-5">
                        Add a member by wallet
                    </h2>

                    <form className="flex flex-col gap-3" onSubmit={handleInvite}>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                                Name
                            </label>
                            <input
                                type="text"
                                value={inviteName}
                                onChange={(e) => setInviteName(e.target.value)}
                                placeholder="Mila Ross"
                                disabled={isSubmitting}
                                className={INPUT_CLS}
                                style={{ transitionTimingFunction: SPRING }}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                                Wallet address
                            </label>
                            <input
                                type="text"
                                value={inviteWallet}
                                onChange={(e) => setInviteWallet(e.target.value)}
                                placeholder="0x…"
                                disabled={isSubmitting}
                                className={`${INPUT_CLS} font-mono`}
                                style={{ transitionTimingFunction: SPRING }}
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-500">
                                Email{" "}
                                <span className="normal-case tracking-normal font-normal text-slate-400">
                                    (optional)
                                </span>
                            </label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="person@hollab.io"
                                disabled={isSubmitting}
                                className={INPUT_CLS}
                                style={{ transitionTimingFunction: SPRING }}
                            />
                        </div>

                        {errorMessage && (
                            <div
                                className="rounded-xl border border-rose-200/70 dark:border-rose-500/20
                                bg-rose-50 dark:bg-rose-500/[0.08]
                                px-4 py-3 text-[12px] text-rose-700 dark:text-rose-400"
                            >
                                {errorMessage}
                            </div>
                        )}

                        {txStatus === "confirmed" && txHash && (
                            <div
                                className="rounded-xl border border-emerald-200/70 dark:border-emerald-500/20
                                bg-emerald-50 dark:bg-emerald-500/[0.08]
                                px-4 py-3 text-[12px] text-emerald-700 dark:text-emerald-400"
                            >
                                Member added on-chain.{" "}
                                <span className="font-mono text-[11px]">
                                    {shortenWallet(txHash)}
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!inviteName.trim() || !inviteWallet.trim() || isSubmitting}
                            className={`group mt-1 flex w-full items-center justify-between rounded-xl px-5 py-3
                                text-[13px] font-bold transition-all duration-500 active:scale-[0.98]
                                ${
                                    inviteName.trim() && inviteWallet.trim() && !isSubmitting
                                        ? "bg-[#3481FF] text-white shadow-[0_8px_28px_rgba(52,129,255,0.3)] hover:bg-[#2570f0]"
                                        : "cursor-not-allowed bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-600"
                                }`}
                            style={{ transitionTimingFunction: SPRING }}
                        >
                            <div className="flex items-center gap-2">
                                {isSubmitting ? (
                                    <Loader2
                                        size={15}
                                        strokeWidth={2.5}
                                        className="animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
                                )}
                                {isSubmitting ? "Sending transaction…" : "Invite member"}
                            </div>
                            <span
                                className={`flex h-7 w-7 items-center justify-center rounded-full
                                transition-all duration-500
                                ${
                                    inviteName.trim() && inviteWallet.trim() && !isSubmitting
                                        ? "bg-white/20 group-hover:translate-x-0.5 group-hover:-translate-y-[1px]"
                                        : "bg-slate-200/50 dark:bg-white/[0.04]"
                                }`}
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
                            </span>
                        </button>
                    </form>

                    {/* Connected wallet */}
                    {authenticatedWalletAddress && (
                        <div
                            className="mt-4 flex items-center gap-3 rounded-xl
                            border border-slate-100 dark:border-white/[0.06]
                            bg-slate-50/80 dark:bg-white/[0.03]
                            px-4 py-3"
                        >
                            <Wallet
                                size={13}
                                strokeWidth={1.75}
                                className="flex-shrink-0 text-slate-400 dark:text-slate-600"
                                aria-hidden="true"
                            />
                            <p className="min-w-0 truncate font-mono text-[11px] text-slate-500 dark:text-slate-500">
                                {authenticatedWalletAddress}
                            </p>
                        </div>
                    )}
                </div>

                {/* Pending invites */}
                <div
                    className="rounded-2xl border border-slate-200/70 dark:border-white/[0.07]
                    bg-white dark:bg-[#0e0e12] p-6"
                >
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500 mb-1">
                                Pending
                            </p>
                            <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                                Wallet invitations
                            </h2>
                        </div>
                        <span
                            className="rounded-full border border-amber-200/70 dark:border-amber-500/20
                            bg-amber-50 dark:bg-amber-500/[0.08]
                            px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400"
                        >
                            {invitedMembers.length} pending
                        </span>
                    </div>

                    <div className="flex flex-col gap-2">
                        {invitedMembers.length ? (
                            invitedMembers.map((member) => (
                                <article
                                    key={member.id}
                                    className="flex items-start justify-between gap-3 rounded-xl
                                    border border-slate-100 dark:border-white/[0.06]
                                    bg-slate-50/80 dark:bg-white/[0.03]
                                    px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                            {member.name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-3">
                                            {member.walletAddress && (
                                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-500">
                                                    {shortenWallet(member.walletAddress)}
                                                </span>
                                            )}
                                            {member.email && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600">
                                                    <Mail size={10} aria-hidden="true" />{" "}
                                                    {member.email}
                                                </span>
                                            )}
                                            {member.invitedAt && (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-600">
                                                    <BadgeCheck size={10} aria-hidden="true" />
                                                    {new Date(
                                                        member.invitedAt,
                                                    ).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className="flex-shrink-0 rounded-full
                                        bg-amber-500/10 dark:bg-amber-500/[0.12]
                                        px-2.5 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                                    >
                                        Invited
                                    </span>
                                </article>
                            ))
                        ) : (
                            <div
                                className="rounded-xl border border-dashed border-slate-200 dark:border-white/[0.07]
                                bg-slate-50/50 dark:bg-white/[0.02]
                                px-4 py-6 text-center text-[12px] text-slate-400 dark:text-slate-600"
                            >
                                No pending invitations. Invite the first member on the left.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Active members grid */}
            <div
                className="rounded-2xl border border-slate-200/70 dark:border-white/[0.07]
                bg-white dark:bg-[#0e0e12] p-6"
            >
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3481FF] mb-1">
                            Active
                        </p>
                        <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                            Organization members
                        </h2>
                    </div>
                    <span
                        className="rounded-full border border-slate-200/70 dark:border-white/[0.07]
                        bg-slate-50 dark:bg-white/[0.04]
                        px-3 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-500"
                    >
                        {activeMembers.length} active
                    </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activeMembers.map((member) => {
                        const isOwner = member.id === organization.ownerPartnerId;
                        const isYou =
                            authenticatedWalletAddress &&
                            member.walletAddress?.toLowerCase() ===
                                authenticatedWalletAddress.toLowerCase();
                        return (
                            <article
                                key={member.id}
                                className="rounded-xl
                                border border-slate-100 dark:border-white/[0.06]
                                bg-slate-50/80 dark:bg-white/[0.03]
                                p-4"
                            >
                                <div className="mb-3 flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full
                                            border border-slate-200 dark:border-white/[0.1]
                                            bg-slate-100 dark:bg-white/[0.06]"
                                        >
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatarSeed ?? member.name}`}
                                                alt={`Avatar for ${member.name}`}
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                                                {member.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-500 truncate">
                                                {member.email ??
                                                    (member.walletAddress
                                                        ? shortenWallet(member.walletAddress)
                                                        : "Starter member")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5">
                                        {isOwner && (
                                            <span
                                                className="rounded-full bg-[#3481FF]/[0.1] dark:bg-[#3481FF]/[0.15]
                                                px-2 py-0.5 text-[10px] font-semibold text-[#3481FF]"
                                            >
                                                Owner
                                            </span>
                                        )}
                                        {isYou && (
                                            <span
                                                className="rounded-full bg-emerald-500/[0.1] dark:bg-emerald-500/[0.12]
                                                px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                                            >
                                                You
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {(member.roles.length ? member.roles : ["Unassigned"]).map(
                                        (role) => (
                                            <span
                                                key={`${member.id}-${role}`}
                                                className="rounded-full border border-slate-200/80 dark:border-white/[0.07]
                                                bg-white dark:bg-white/[0.04]
                                                px-2.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400"
                                            >
                                                {role}
                                            </span>
                                        ),
                                    )}
                                </div>

                                {member.walletAddress && (
                                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600">
                                        <Wallet size={10} strokeWidth={1.75} aria-hidden="true" />
                                        <span className="font-mono">
                                            {shortenWallet(member.walletAddress)}
                                        </span>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
