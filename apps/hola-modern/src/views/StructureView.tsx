import type { Organization } from "@hollab-io/indexing-client";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Check,
    Loader2,
    Network,
    RotateCcw,
    Trash2,
    TriangleAlert,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";

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
function AddMembersPanel({ onClose }: { onClose: () => void }) {
    const { inviteMember } = useWorkspaceSnapshot();
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
        if (!canSubmit) return;
        setIsSubmitting(true);
        for (const entry of entries) {
            if (entry.address) {
                inviteMember({
                    name: entry.ens ?? entry.address,
                    walletAddress: entry.address,
                });
            }
        }
        setIsSubmitting(false);
        onClose();
    }, [canSubmit, entries, inviteMember, onClose]);

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

// ─── Main view ───────────────────────────────────────────────────────────────
export default function StructureView({ org: _org, isDarkMode }: Props) {
    const { snapshot } = useWorkspaceSnapshot();
    const [tab, setTab] = useState<"members" | "chart">("members");
    const [showAddMembers, setShowAddMembers] = useState(false);

    const partners = snapshot.partners;

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
                        {(["members", "chart"] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5
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
                                ) : (
                                    <Network size={11} strokeWidth={2} />
                                )}
                                {t}
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

                                {/* Member list */}
                                <div className="space-y-1.5">
                                    {partners.length > 0 ? (
                                        partners.map((partner, i) => (
                                            <motion.div
                                                key={partner.id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.4,
                                                    delay: i * 0.04,
                                                    ease: EXPO,
                                                }}
                                                className="flex items-center gap-3.5 rounded-xl
                                                    border border-white/[0.05] bg-white/[0.02]
                                                    px-4 py-3"
                                            >
                                                <div
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center
                                                        rounded-full text-[11px] font-bold text-white"
                                                    style={{
                                                        background: `hsl(${
                                                            parseInt(
                                                                (
                                                                    partner.walletAddress ??
                                                                    partner.id
                                                                ).slice(2, 4),
                                                                16,
                                                            ) *
                                                            (360 / 255)
                                                        }, 45%, 35%)`,
                                                    }}
                                                >
                                                    {partner.name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium text-slate-200">
                                                        {partner.name}
                                                    </p>
                                                    {partner.walletAddress && (
                                                        <p className="font-mono text-[11px] text-slate-600">
                                                            {partner.walletAddress.slice(0, 6)}…
                                                            {partner.walletAddress.slice(-4)}
                                                        </p>
                                                    )}
                                                </div>
                                                <span
                                                    className={`shrink-0 rounded-full border px-2 py-0.5
                                                    text-[10px] font-semibold
                                                    ${
                                                        partner.status === "active"
                                                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-400"
                                                            : "border-amber-400/20 bg-amber-500/10 text-amber-400"
                                                    }`}
                                                >
                                                    {partner.status ?? "active"}
                                                </span>
                                            </motion.div>
                                        ))
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
                                                No members yet. Add partners by wallet address or
                                                ENS name.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
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
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {showAddMembers && <AddMembersPanel onClose={() => setShowAddMembers(false)} />}
            </AnimatePresence>
        </div>
    );
}
