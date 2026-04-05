import type { Organization } from "@hollab-io/indexing-client";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Check,
    Clock,
    Loader2,
    Network,
    RotateCcw,
    Trash2,
    TriangleAlert,
    UserCheck,
    UserPlus,
    Users,
    Wallet,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";

import type { JoinRequestEntry } from "../hooks/useJoinRequest";
import { useCircleRegistry } from "../hooks/useCircleRegistry";
import { useJoinRequest } from "../hooks/useJoinRequest";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";
import OrganizationChart from "./OrganizationChart";

// ─── viem ENS client (Sepolia) ────────────────────────────────────────────────
const ensClient = createPublicClient({ chain: sepolia, transport: http() });

// ─── Types ────────────────────────────────────────────────────────────────────
type EntryStatus = "resolving" | "resolved" | "invalid" | "failed";

type MemberEntry = {
    id: string;
    raw: string;
    address: string | null;
    ens: string | null;
    status: EntryStatus;
    error?: string;
};

type Props = { org: Organization; isDarkMode: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function looksLikeEns(v: string) {
    return v.includes(".") && !v.startsWith("0x");
}

async function resolveEns(raw: string): Promise<{ address: string }> {
    const name = normalize(raw);
    const address = await ensClient.getEnsAddress({ name });
    if (!address) throw new Error("Name not found");
    return { address };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 340, damping: 28 } as const;
const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Sub-component: entry row ─────────────────────────────────────────────────
function EntryRow({
    entry,
    onRemove,
    onRetry,
}: {
    entry: MemberEntry;
    onRemove: (id: string) => void;
    onRetry: (id: string) => void;
}) {
    const isFailed = entry.status === "failed" || entry.status === "invalid";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={SPRING}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5
                border transition-colors
                ${
                    isFailed
                        ? "border-red-400/20 bg-red-500/[0.06]"
                        : entry.status === "resolving"
                          ? "border-white/[0.05] bg-white/[0.02]"
                          : "border-emerald-400/15 bg-emerald-500/[0.06]"
                }`}
        >
            {/* Status icon */}
            <div className="shrink-0">
                {entry.status === "resolving" && (
                    <Loader2 size={13} className="animate-spin text-slate-500" strokeWidth={2} />
                )}
                {entry.status === "resolved" && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={SPRING}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20"
                    >
                        <Check size={9} className="text-emerald-400" strokeWidth={2.5} />
                    </motion.div>
                )}
                {isFailed && <TriangleAlert size={13} className="text-red-400" strokeWidth={2} />}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                {entry.ens && (
                    <p className="text-[12px] font-semibold text-slate-200">{entry.ens}</p>
                )}
                {entry.address ? (
                    <p className="truncate font-mono text-[11px] text-slate-500">
                        {entry.address.slice(0, 6)}…{entry.address.slice(-4)}
                    </p>
                ) : (
                    <p className="truncate text-[12px] text-slate-400">{entry.raw}</p>
                )}
                {entry.error && <p className="text-[11px] text-red-400">{entry.error}</p>}
            </div>

            {/* Actions */}
            {isFailed && (
                <button
                    type="button"
                    onClick={() => onRetry(entry.id)}
                    className="shrink-0 rounded-full p-1.5 text-slate-500 hover:text-slate-300"
                    aria-label="Retry"
                >
                    <RotateCcw size={12} />
                </button>
            )}
            <button
                type="button"
                onClick={() => onRemove(entry.id)}
                className="shrink-0 rounded-full p-1.5 text-slate-600 hover:text-red-400"
                aria-label="Remove"
            >
                <Trash2 size={12} />
            </button>
        </motion.div>
    );
}

// ─── Add-members panel ────────────────────────────────────────────────────────
function AddMembersPanel({
    org,
    addOrgMembers,
    onClose,
}: {
    org: Organization;
    addOrgMembers: (params: {
        circleRegistryAddress: `0x${string}`;
        memberAddresses: `0x${string}`[];
        walletAddress: `0x${string}`;
    }) => Promise<`0x${string}`>;
    onClose: () => void;
}) {
    const { authenticatedWalletAddress, inviteMember } = useWorkspaceSnapshot();
    const [inputValue, setInputValue] = useState("");
    const [entries, setEntries] = useState<MemberEntry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const resolveEntry = useCallback(async (id: string, raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;

        if (isAddress(trimmed)) {
            setEntries((prev) =>
                prev.map((e) => (e.id === id ? { ...e, address: trimmed, status: "resolved" } : e)),
            );
            return;
        }

        if (looksLikeEns(trimmed)) {
            try {
                const { address } = await resolveEns(trimmed);
                setEntries((prev) =>
                    prev.map((e) =>
                        e.id === id ? { ...e, address, ens: trimmed, status: "resolved" } : e,
                    ),
                );
            } catch {
                setEntries((prev) =>
                    prev.map((e) =>
                        e.id === id ? { ...e, status: "failed", error: "ENS name not found" } : e,
                    ),
                );
            }
            return;
        }

        setEntries((prev) =>
            prev.map((e) =>
                e.id === id
                    ? { ...e, status: "invalid", error: "Not a valid address or ENS name" }
                    : e,
            ),
        );
    }, []);

    const addRaw = useCallback(
        (raws: string[]) => {
            const valid = raws.map((r) => r.trim()).filter(Boolean);
            if (!valid.length) return;
            const newEntries: MemberEntry[] = valid.map((raw) => ({
                id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                raw,
                address: null,
                ens: null,
                status: "resolving",
            }));
            setEntries((prev) => [...prev, ...newEntries]);
            newEntries.forEach((e) => resolveEntry(e.id, e.raw));
        },
        [resolveEntry],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addRaw([inputValue]);
                setInputValue("");
            }
        },
        [inputValue, addRaw],
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            const text = e.clipboardData.getData("text");
            if (/[\n,;]/.test(text)) {
                e.preventDefault();
                const parts = text.split(/[\n,;]+/).filter(Boolean);
                if (parts.length > 1) {
                    addRaw(parts);
                    setInputValue("");
                }
            }
        },
        [addRaw],
    );

    const handleRemove = useCallback((id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }, []);

    const handleRetry = useCallback(
        (id: string) => {
            const entry = entries.find((e) => e.id === id);
            if (!entry) return;
            setEntries((prev) =>
                prev.map((e) =>
                    e.id === id ? { ...e, status: "resolving", error: undefined } : e,
                ),
            );
            resolveEntry(id, entry.raw);
        },
        [entries, resolveEntry],
    );

    const canSubmit = entries.length > 0 && entries.every((e) => e.status === "resolved");

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || !authenticatedWalletAddress) return;
        setIsSubmitting(true);
        try {
            const addresses = entries
                .filter((e) => e.address)
                .map((e) => e.address as `0x${string}`);

            await addOrgMembers({
                circleRegistryAddress: org.circleRegistry as `0x${string}`,
                memberAddresses: addresses,
                walletAddress: authenticatedWalletAddress as `0x${string}`,
            });

            for (const entry of entries) {
                if (entry.address) {
                    inviteMember({
                        name: entry.ens ?? entry.address,
                        walletAddress: entry.address,
                    });
                }
            }
            onClose();
        } catch {
            // keep panel open on failure so user can retry
        } finally {
            setIsSubmitting(false);
        }
    }, [
        canSubmit,
        authenticatedWalletAddress,
        entries,
        addOrgMembers,
        org.circleRegistry,
        inviteMember,
        onClose,
    ]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={SPRING}
                className="w-full max-w-md rounded-[1.75rem]
                    border border-white/[0.08]
                    bg-[#0a0a0f]
                    shadow-[0_32px_80px_rgba(0,0,0,0.6)]
                    p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Structure
                        </p>
                        <h2 className="mt-1 text-lg font-bold tracking-[-0.02em] text-white">
                            Add members
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-white/[0.07] p-2 text-slate-500
                            transition-colors hover:border-white/[0.12] hover:text-slate-300"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="mb-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="Wallet address or ENS name, press Enter"
                        autoFocus
                        className="w-full rounded-xl
                            border border-white/[0.08]
                            bg-white/[0.04]
                            px-4 py-3 text-[13px]
                            text-white placeholder:text-slate-600
                            outline-none
                            transition-all duration-200
                            focus:border-[#3481FF]/40 focus:ring-1 focus:ring-[#3481FF]/20"
                    />
                    <p className="mt-1.5 text-[11px] text-slate-600">
                        Paste multiple addresses separated by commas or newlines.
                    </p>
                </div>

                {entries.length > 0 && (
                    <AnimatePresence mode="popLayout">
                        <div className="mb-4 space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                            {entries.map((entry) => (
                                <EntryRow
                                    key={entry.id}
                                    entry={entry}
                                    onRemove={handleRemove}
                                    onRetry={handleRetry}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl
                        border border-[#3481FF]/30
                        bg-[#3481FF]/15
                        py-3 text-sm font-semibold text-white
                        transition-all duration-300
                        hover:bg-[#3481FF]/22 hover:border-[#3481FF]/45
                        disabled:cursor-not-allowed disabled:opacity-40
                        active:scale-[0.98]"
                >
                    {isSubmitting ? (
                        <Loader2 size={15} className="animate-spin" />
                    ) : (
                        <>
                            <UserPlus size={15} strokeWidth={1.75} />
                            Add {entries.filter((e) => e.status === "resolved").length || ""} member
                            {entries.filter((e) => e.status === "resolved").length !== 1 ? "s" : ""}
                        </>
                    )}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function shortenWallet(address: string) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

// ─── Main view ───────────────────────────────────────────────────────────────
export default function StructureView({ org, isDarkMode }: Props) {
    const { authenticatedWalletAddress, snapshot, organization } = useWorkspaceSnapshot();
    const { addOrgMembers } = useCircleRegistry();
    const { getPendingRequests, approveWithTokens, rejectRequest } = useJoinRequest();
    const [tab, setTab] = useState<"members" | "chart" | "requests">("members");
    const [showAddMembers, setShowAddMembers] = useState(false);

    const members = useMemo(() => {
        const rolesByPartnerId = new Map<string, string[]>();
        snapshot.roles.forEach((role) => {
            role.memberIds.forEach((id) => {
                const list = rolesByPartnerId.get(id) ?? [];
                list.push(role.title);
                rolesByPartnerId.set(id, list);
            });
        });
        return snapshot.partners
            .map((p) => ({ ...p, roles: rolesByPartnerId.get(p.id) ?? [] }))
            .sort((a, b) => {
                const sa = a.status === "invited" ? 1 : 0;
                const sb = b.status === "invited" ? 1 : 0;
                return sa !== sb ? sa - sb : a.name.localeCompare(b.name);
            });
    }, [snapshot.partners, snapshot.roles]);

    // ── Join requests (admin only) ────────────────────────────────────────────
    const isAdmin = Boolean(
        authenticatedWalletAddress &&
            org.creator &&
            authenticatedWalletAddress.toLowerCase() === org.creator.toLowerCase(),
    );
    const [joinRequests, setJoinRequests] = useState<JoinRequestEntry[]>([]);
    const [approvingId, setApprovingId] = useState<bigint | null>(null);
    const [rejectingId, setRejectingId] = useState<bigint | null>(null);
    const [requestActionError, setRequestActionError] = useState<string | null>(null);

    const loadJoinRequests = useCallback(async () => {
        if (!isAdmin || !org.id) return;
        try {
            const requests = await getPendingRequests(BigInt(org.id));
            setJoinRequests(requests);
        } catch {
            // silent — contract may not be deployed yet
        }
    }, [isAdmin, org.id, getPendingRequests]);

    useEffect(() => {
        void loadJoinRequests();
    }, [loadJoinRequests]);

    const handleApprove = async (req: JoinRequestEntry) => {
        setApprovingId(req.id);
        setRequestActionError(null);
        try {
            await approveWithTokens({
                requestId: req.id,
                requester: req.requester,
                govTokenAddress: org.token as `0x${string}`,
            });
            setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
        } catch (err) {
            setRequestActionError(err instanceof Error ? err.message : "Transaction failed");
        } finally {
            setApprovingId(null);
        }
    };

    const handleReject = async (req: JoinRequestEntry) => {
        setRejectingId(req.id);
        setRequestActionError(null);
        try {
            await rejectRequest({ requestId: req.id });
            setJoinRequests((prev) => prev.filter((r) => r.id !== req.id));
        } catch (err) {
            setRequestActionError(err instanceof Error ? err.message : "Transaction failed");
        } finally {
            setRejectingId(null);
        }
    };

    // 56px = app top header. This container fills the rest of the viewport exactly —
    // no min-h, no flex growth — so clicking a bubble can never resize it.
    return (
        <div className="flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 56px)" }}>
            {/* ── Header — constrained, shrinks to its natural size ── */}
            <div className="shrink-0 mx-auto w-full max-w-[900px] px-5 pb-5 pt-8 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EXPO }}
                    className="flex items-end justify-between gap-4"
                >
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Structure
                        </p>
                        <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-white">
                            People & circles
                        </h1>
                    </div>

                    {/* Tab switcher */}
                    <div
                        className="flex items-center gap-px rounded-full
                        border border-white/[0.08] bg-white/[0.04] p-[3px]"
                    >
                        {(
                            ["members", "chart", ...(isAdmin ? ["requests"] : [])] as (
                                | "members"
                                | "chart"
                                | "requests"
                            )[]
                        ).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5
                                    text-[11px] font-semibold capitalize tracking-wide
                                    transition-all duration-300
                                    ${
                                        tab === t
                                            ? "bg-white/[0.08] text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                {t === "members" ? (
                                    <Users size={11} strokeWidth={2} />
                                ) : t === "chart" ? (
                                    <Network size={11} strokeWidth={2} />
                                ) : (
                                    <UserCheck size={11} strokeWidth={2} />
                                )}
                                {t}
                                {t === "requests" && joinRequests.length > 0 && (
                                    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3481FF] px-1 text-[9px] font-bold text-white">
                                        {joinRequests.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* ── Content — fills remaining height, strictly clamped ── */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    {tab === "members" ? (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: EXPO }}
                            className="absolute inset-0 overflow-y-auto"
                        >
                            <div className="mx-auto w-full max-w-[900px] px-5 pb-32 sm:px-8">
                                {/* Add member button */}
                                <button
                                    type="button"
                                    onClick={() => setShowAddMembers(true)}
                                    className="mb-5 flex w-full items-center gap-2.5 rounded-2xl
                                        border border-dashed border-white/[0.08]
                                        bg-white/[0.02]
                                        px-4 py-3 text-[13px] text-slate-400
                                        transition-colors hover:border-white/[0.14] hover:text-slate-200"
                                >
                                    <UserPlus size={14} strokeWidth={1.75} />
                                    Add member by wallet or ENS
                                    <ArrowRight size={13} className="ml-auto" />
                                </button>

                                {/* Member grid */}
                                {members.length > 0 ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {members.map((member, i) => {
                                            const isOwner =
                                                organization &&
                                                member.id === organization.ownerPartnerId;
                                            const isYou =
                                                authenticatedWalletAddress &&
                                                member.walletAddress?.toLowerCase() ===
                                                    authenticatedWalletAddress.toLowerCase();
                                            return (
                                                <motion.article
                                                    key={member.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{
                                                        duration: 0.4,
                                                        delay: i * 0.04,
                                                        ease: EXPO,
                                                    }}
                                                    className="rounded-xl
                                                        border border-white/[0.06]
                                                        bg-white/[0.03]
                                                        p-4"
                                                >
                                                    <div className="mb-3 flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full
                                                                    border border-white/[0.1]
                                                                    bg-white/[0.06]"
                                                            >
                                                                <img
                                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatarSeed ?? member.name}`}
                                                                    alt={`Avatar for ${member.name}`}
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[13px] font-bold text-white leading-tight">
                                                                    {member.name}
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 truncate">
                                                                    {member.walletAddress
                                                                        ? shortenWallet(
                                                                              member.walletAddress,
                                                                          )
                                                                        : "Starter member"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1.5">
                                                            {isOwner && (
                                                                <span className="rounded-full bg-[#3481FF]/[0.15] px-2 py-0.5 text-[10px] font-semibold text-[#3481FF]">
                                                                    Owner
                                                                </span>
                                                            )}
                                                            {isYou && (
                                                                <span className="rounded-full bg-emerald-500/[0.12] px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                                                    You
                                                                </span>
                                                            )}
                                                            {member.status === "invited" && (
                                                                <span className="rounded-full bg-amber-500/[0.12] px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                                                    Invited
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(member.roles.length
                                                            ? member.roles
                                                            : ["Unassigned"]
                                                        ).map((role) => (
                                                            <span
                                                                key={`${member.id}-${role}`}
                                                                className="rounded-full border border-white/[0.07]
                                                                    bg-white/[0.04]
                                                                    px-2.5 py-0.5 text-[10px] font-medium text-slate-400"
                                                            >
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {member.walletAddress && (
                                                        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-600">
                                                            <Wallet
                                                                size={10}
                                                                strokeWidth={1.75}
                                                                aria-hidden="true"
                                                            />
                                                            <span className="font-mono">
                                                                {shortenWallet(
                                                                    member.walletAddress,
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </motion.article>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div
                                        className="flex flex-col items-center gap-3 rounded-2xl
                                        border border-dashed border-white/[0.06] bg-white/[0.015]
                                        px-4 py-12 text-center"
                                    >
                                        <Users
                                            size={20}
                                            className="text-slate-700"
                                            strokeWidth={1.5}
                                        />
                                        <p className="text-xs leading-relaxed text-slate-600">
                                            No members yet. Add partners by wallet address or ENS
                                            name.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : tab === "chart" ? (
                        /* Chart — absolute fill, hard overflow:hidden, pill nav clearance via padding */
                        <motion.div
                            key="chart"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease: EXPO }}
                            className="absolute inset-0 overflow-hidden px-3 pb-[88px] pt-0 sm:px-4"
                        >
                            <div
                                className="h-full overflow-hidden rounded-[1.5rem]
                                border border-white/[0.06]
                                shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                            >
                                <OrganizationChart isDarkMode={isDarkMode} />
                            </div>
                        </motion.div>
                    ) : (
                        /* Requests */
                        <motion.div
                            key="requests"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: EXPO }}
                            className="absolute inset-0 overflow-y-auto"
                        >
                            <div className="mx-auto w-full max-w-[900px] px-5 pb-32 pt-2 sm:px-8">
                                {requestActionError && (
                                    <p className="mb-3 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-[12px] text-red-400">
                                        {requestActionError}
                                    </p>
                                )}
                                <AnimatePresence initial={false}>
                                    {joinRequests.length ? (
                                        <div className="flex flex-col gap-2">
                                            {joinRequests.map((req) => {
                                                const isApproving = approvingId === req.id;
                                                const isRejecting = rejectingId === req.id;
                                                const isBusy = isApproving || isRejecting;
                                                return (
                                                    <motion.article
                                                        key={req.id.toString()}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{
                                                            opacity: 0,
                                                            x: -16,
                                                            transition: { duration: 0.2 },
                                                        }}
                                                        transition={{ duration: 0.25 }}
                                                        className="flex items-start gap-4 rounded-xl
                                                        border border-white/[0.06] bg-white/[0.03]
                                                        px-4 py-3.5"
                                                    >
                                                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] text-slate-500">
                                                            <UserCheck
                                                                size={14}
                                                                strokeWidth={1.75}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-mono text-[12px] font-semibold text-white">
                                                                {shortenWallet(req.requester)}
                                                            </p>
                                                            {req.message ? (
                                                                <p className="mt-1 text-[12px] leading-relaxed text-slate-500 line-clamp-2">
                                                                    {req.message}
                                                                </p>
                                                            ) : (
                                                                <p className="mt-1 text-[12px] italic text-slate-600">
                                                                    No message
                                                                </p>
                                                            )}
                                                            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-600">
                                                                <Clock
                                                                    size={10}
                                                                    strokeWidth={1.75}
                                                                />
                                                                <span>
                                                                    {new Date(
                                                                        Number(req.submittedAt) *
                                                                            1000,
                                                                    ).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-shrink-0 items-center gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() =>
                                                                    void handleApprove(req)
                                                                }
                                                                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold
                                                                transition-all duration-300 active:scale-[0.97]
                                                                ${isBusy ? "cursor-not-allowed opacity-50 bg-emerald-500/[0.08] text-emerald-500" : "bg-emerald-500/[0.12] text-emerald-400 hover:bg-emerald-500/[0.18]"}`}
                                                            >
                                                                {isApproving ? (
                                                                    <Loader2
                                                                        size={12}
                                                                        className="animate-spin"
                                                                    />
                                                                ) : (
                                                                    <Check
                                                                        size={12}
                                                                        strokeWidth={2.5}
                                                                    />
                                                                )}
                                                                {isApproving
                                                                    ? "Approving…"
                                                                    : "Approve"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={isBusy}
                                                                onClick={() =>
                                                                    void handleReject(req)
                                                                }
                                                                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold
                                                                transition-all duration-300 active:scale-[0.97]
                                                                ${isBusy ? "cursor-not-allowed opacity-50 bg-rose-500/[0.08] text-rose-500" : "bg-rose-500/[0.1] text-rose-400 hover:bg-rose-500/[0.15]"}`}
                                                            >
                                                                {isRejecting ? (
                                                                    <Loader2
                                                                        size={12}
                                                                        className="animate-spin"
                                                                    />
                                                                ) : (
                                                                    <X
                                                                        size={12}
                                                                        strokeWidth={2.5}
                                                                    />
                                                                )}
                                                                {isRejecting
                                                                    ? "Rejecting…"
                                                                    : "Reject"}
                                                            </button>
                                                        </div>
                                                    </motion.article>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="rounded-xl border border-dashed border-white/[0.07] bg-white/[0.02] px-4 py-10 text-center text-[12px] text-slate-600"
                                        >
                                            No pending join requests.
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showAddMembers && (
                    <AddMembersPanel
                        org={org}
                        addOrgMembers={addOrgMembers}
                        onClose={() => setShowAddMembers(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
