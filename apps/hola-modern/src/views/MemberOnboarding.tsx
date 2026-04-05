import type { Organization } from "@hollab-io/indexing-client";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Check,
    ClipboardList,
    Loader2,
    RotateCcw,
    Trash2,
    TriangleAlert,
    Users,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

import { useCircleRegistry } from "../hooks/useCircleRegistry";

// ─── viem client ─────────────────────────────────────────────────────────────
const ensClient = createPublicClient({
    chain: mainnet,
    transport: http(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "resolving" | "resolved" | "invalid" | "failed";

type MemberEntry = {
    id: string;
    raw: string;
    address: string | null;
    ens: string | null;
    avatar: string | null;
    status: Status;
    error?: string;
};

type InputState =
    | { kind: "idle" }
    | { kind: "resolving" }
    | { kind: "address"; address: string }
    | { kind: "ens-ok"; ens: string; address: string; avatar: string | null }
    | { kind: "error"; message: string };

type Props = {
    org: Organization;
    onComplete: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function looksLikeEns(v: string) {
    return v.includes(".") && !v.startsWith("0x");
}

async function resolveEns(raw: string): Promise<{ address: string; avatar: string | null }> {
    const name = normalize(raw);
    const address = await ensClient.getEnsAddress({ name });
    if (!address) throw new Error("Name not found");
    let avatar: string | null = null;
    try {
        avatar = await ensClient.getEnsAvatar({ name });
    } catch {
        /* avatar is optional */
    }
    return { address, avatar };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const spring = { type: "spring", stiffness: 340, damping: 28 } as const;
const springEntry = { type: "spring", stiffness: 400, damping: 32 } as const;

function StatusDot({ status }: { status: Status }) {
    if (status === "resolving")
        return <Loader2 size={13} className="animate-spin text-slate-500" strokeWidth={2} />;
    if (status === "resolved")
        return (
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={spring}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20"
            >
                <Check size={9} className="text-emerald-400" strokeWidth={2.5} />
            </motion.div>
        );
    return (
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500/15">
            <TriangleAlert size={9} className="text-red-400" strokeWidth={2.5} />
        </div>
    );
}

function EntryRow({
    entry,
    onRemove,
    onRetry,
}: {
    entry: MemberEntry;
    onRemove: (id: string) => void;
    onRetry: (id: string) => void;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 12, filter: "blur(4px)" }}
            transition={springEntry}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
        >
            <div className="min-w-0 flex-1">
                {entry.ens && (
                    <p className="truncate text-[13px] font-semibold text-white">{entry.ens}</p>
                )}
                <p
                    className={`truncate font-mono ${
                        entry.ens ? "text-[11px] text-slate-600" : "text-[13px] text-slate-300"
                    }`}
                >
                    {entry.status === "resolved" && entry.address
                        ? `${entry.address.slice(0, 10)}…${entry.address.slice(-8)}`
                        : entry.raw.length > 24
                          ? `${entry.raw.slice(0, 12)}…${entry.raw.slice(-8)}`
                          : entry.raw}
                </p>
                {entry.status === "failed" && (
                    <p className="mt-0.5 text-[11px] text-red-400">{entry.error}</p>
                )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-1.5">
                <StatusDot status={entry.status} />
                {entry.status === "failed" && (
                    <button
                        type="button"
                        onClick={() => onRetry(entry.id)}
                        className="rounded-lg p-1 text-slate-600 transition-colors hover:text-slate-300"
                        aria-label="Retry"
                    >
                        <RotateCcw size={12} strokeWidth={2} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => onRemove(entry.id)}
                    className="rounded-lg p-1 text-slate-700 transition-colors hover:text-red-400"
                    aria-label="Remove"
                >
                    <Trash2 size={12} strokeWidth={2} />
                </button>
            </div>
        </motion.div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MemberOnboarding({ org, onComplete }: Props) {
    const [input, setInput] = useState("");
    const [inputState, setInputState] = useState<InputState>({ kind: "idle" });
    const [entries, setEntries] = useState<MemberEntry[]>([]);
    const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error">("idle");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { primaryWallet } = useDynamicContext();
    const { addOrgMembers } = useCircleRegistry();

    const resolvedCount = entries.filter((e) => e.status === "resolved").length;

    const handleLaunch = async () => {
        const resolvedAddresses = entries
            .filter((e) => e.status === "resolved" && e.address)
            .map((e) => e.address as `0x${string}`);

        if (resolvedAddresses.length === 0 || !primaryWallet) {
            onComplete();
            return;
        }

        setSubmitState("submitting");
        setSubmitError(null);

        try {
            await addOrgMembers({
                circleRegistryAddress: org.circleRegistry as `0x${string}`,
                memberAddresses: resolvedAddresses,
                walletAddress: primaryWallet.address as `0x${string}`,
            });
            onComplete();
        } catch (err) {
            setSubmitState("error");
            setSubmitError(err instanceof Error ? err.message : "Transaction failed");
        }
    };

    // ── Resolve a single entry by id ──────────────────────────────────────────
    const resolveEntry = useCallback(async (id: string, raw: string) => {
        const trimmed = raw.trim();

        if (isAddress(trimmed)) {
            setEntries((prev) =>
                prev.map((e) => (e.id === id ? { ...e, address: trimmed, status: "resolved" } : e)),
            );
            return;
        }

        if (looksLikeEns(trimmed)) {
            try {
                const { address, avatar } = await resolveEns(trimmed);
                setEntries((prev) =>
                    prev.map((e) =>
                        e.id === id
                            ? { ...e, address, ens: trimmed, avatar, status: "resolved" }
                            : e,
                    ),
                );
            } catch {
                setEntries((prev) =>
                    prev.map((e) =>
                        e.id === id
                            ? { ...e, status: "failed", error: "Name not found or unreachable" }
                            : e,
                    ),
                );
            }
            return;
        }

        setEntries((prev) =>
            prev.map((e) =>
                e.id === id
                    ? { ...e, status: "invalid" as Status, error: "Not a valid address or ENS" }
                    : e,
            ),
        );
    }, []);

    // ── Batch-add raws (dedup against existing entries) ───────────────────────
    const addRaws = useCallback(
        (raws: string[]) => {
            const filtered = raws
                .map((r) => r.trim())
                .filter((r) => r.length > 0)
                .filter(
                    (r) =>
                        !entries.some(
                            (e) =>
                                e.raw.toLowerCase() === r.toLowerCase() ||
                                (e.address && e.address.toLowerCase() === r.toLowerCase()),
                        ),
                );

            if (filtered.length === 0) return;

            const newEntries: MemberEntry[] = filtered.map((raw) => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                raw,
                address: null,
                ens: null,
                avatar: null,
                status: "resolving",
            }));

            setEntries((prev) => [...prev, ...newEntries]);
            setInput("");
            setInputState({ kind: "idle" });

            // Resolve all in parallel
            newEntries.forEach((e) => void resolveEntry(e.id, e.raw));
        },
        [entries, resolveEntry],
    );

    // ── Live preview while typing ─────────────────────────────────────────────
    useEffect(() => {
        const trimmed = input.trim();

        if (!trimmed) {
            setInputState({ kind: "idle" });
            return;
        }

        if (isAddress(trimmed)) {
            setInputState({ kind: "address", address: trimmed });
            return;
        }

        if (!looksLikeEns(trimmed)) {
            setInputState({ kind: "idle" });
            return;
        }

        // Looks like ENS — debounce resolve
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setInputState({ kind: "resolving" });

        debounceRef.current = setTimeout(async () => {
            try {
                const { address, avatar } = await resolveEns(trimmed);
                setInputState({ kind: "ens-ok", ens: trimmed, address, avatar });
            } catch {
                setInputState({ kind: "error", message: "Name not found" });
            }
        }, 550);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [input]);

    // ── Paste handler — split on newline / comma / semicolon ─────────────────
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text");
        const parts = text
            .split(/[\n,;]+/)
            .map((p) => p.trim())
            .filter(Boolean);
        if (parts.length > 1) {
            e.preventDefault();
            addRaws(parts);
        }
        // single value → fall through to normal paste
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && input.trim()) {
            e.preventDefault();
            // If ENS is already resolved in preview, use that
            if (inputState.kind === "ens-ok") {
                const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const entry: MemberEntry = {
                    id,
                    raw: inputState.ens,
                    address: inputState.address,
                    ens: inputState.ens,
                    avatar: inputState.avatar,
                    status: "resolved",
                };
                setEntries((prev) => [...prev, entry]);
                setInput("");
                setInputState({ kind: "idle" });
            } else {
                addRaws([input]);
            }
        }
    };

    const handleRetry = (id: string) => {
        const entry = entries.find((e) => e.id === id);
        if (!entry) return;
        setEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: "resolving", error: undefined } : e)),
        );
        void resolveEntry(id, entry.raw);
    };

    const handleRemove = (id: string) => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
    };

    const handleAddClick = () => {
        if (!input.trim()) return;
        if (inputState.kind === "ens-ok") {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            setEntries((prev) => [
                ...prev,
                {
                    id,
                    raw: inputState.ens,
                    address: inputState.address,
                    ens: inputState.ens,
                    avatar: inputState.avatar,
                    status: "resolved",
                },
            ]);
            setInput("");
            setInputState({ kind: "idle" });
        } else {
            addRaws([input]);
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const addButtonReady =
        inputState.kind === "address" ||
        inputState.kind === "ens-ok" ||
        (input.trim().length > 0 && inputState.kind !== "resolving" && inputState.kind !== "error");

    const ctaLabel =
        resolvedCount > 0
            ? `Launch with ${resolvedCount} member${resolvedCount === 1 ? "" : "s"}`
            : "Launch workspace";

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#07070a]">
            {/* Ambient glow — fixed, GPU-composited */}
            <div
                className="pointer-events-none fixed inset-0"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 60% 50% at 10% 10%, rgba(52,129,255,0.08) 0%, transparent 65%)," +
                        "radial-gradient(ellipse 45% 40% at 90% 85%, rgba(99,102,241,0.05) 0%, transparent 60%)",
                }}
            />

            <div className="relative mx-auto grid min-h-[100dvh] max-w-[860px] grid-cols-1 gap-0 px-5 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:px-8">
                {/* ── Left column ─────────────────────────────────────────── */}
                <div className="flex flex-col justify-center py-16 lg:sticky lg:top-0 lg:h-[100dvh]">
                    <motion.div
                        initial={{ opacity: 0, x: -20, filter: "blur(8px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Org badge */}
                        <div className="mb-8 flex items-center gap-2.5">
                            <div
                                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[0.75rem] text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(52,129,255,0.35)]"
                                style={{
                                    background: "linear-gradient(135deg, #3481FF, #1a5fd4)",
                                }}
                            >
                                {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-[13px] font-semibold text-white">{org.name}</p>
                                <p className="text-[11px] text-slate-600">
                                    {org.subname}.hollab.eth
                                </p>
                            </div>
                        </div>

                        <h1 className="text-[34px] font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-[40px]">
                            Invite your
                            <br />
                            team
                        </h1>
                        <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-slate-500">
                            Add members by wallet address or ENS name. Paste a list to add several
                            at once.
                        </p>

                        {/* Live member count */}
                        <AnimatePresence>
                            {entries.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={spring}
                                    className="mt-7 flex items-center gap-2"
                                >
                                    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5">
                                        <Users
                                            size={12}
                                            className="text-slate-500"
                                            strokeWidth={2}
                                        />
                                        <span className="text-[12px] font-semibold tabular-nums text-slate-300">
                                            {resolvedCount}
                                            <span className="text-slate-600">
                                                /{entries.length}
                                            </span>
                                        </span>
                                        <span className="text-[12px] text-slate-600">resolved</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* CTA — shown on desktop in left col */}
                        <div className="mt-10 hidden flex-col gap-3 lg:flex">
                            <button
                                type="button"
                                onClick={handleLaunch}
                                disabled={submitState === "submitting"}
                                className="group flex w-full items-center justify-between rounded-full bg-[#3481FF] py-[5px] pl-6 pr-[5px] text-[13px] font-bold text-white shadow-[0_6px_24px_rgba(52,129,255,0.35)] transition-all duration-500 hover:bg-[#2570f0] hover:shadow-[0_8px_32px_rgba(52,129,255,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                            >
                                {submitState === "submitting" ? "Confirm in wallet…" : ctaLabel}
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.2] transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
                                    {submitState === "submitting" ? (
                                        <Loader2
                                            size={14}
                                            strokeWidth={2}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <ArrowRight size={14} strokeWidth={2} />
                                    )}
                                </div>
                            </button>
                            {submitState === "error" && submitError && (
                                <p className="px-1 text-center text-[12px] text-red-400">
                                    {submitError}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={onComplete}
                                className="text-center text-[12px] text-slate-700 transition-colors hover:text-slate-400"
                            >
                                Skip for now
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* ── Right column ─────────────────────────────────────────── */}
                <div className="flex flex-col justify-center py-8 lg:py-16">
                    <motion.div
                        initial={{ opacity: 0, x: 16, filter: "blur(8px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col gap-3"
                    >
                        {/* ── Input ──────────────────────────────────────────── */}
                        <div
                            className={`rounded-2xl border p-[3px] transition-all duration-300 ${
                                inputState.kind === "ens-ok"
                                    ? "border-emerald-500/30 shadow-[0_0_0_3px_rgba(16,185,129,0.07)]"
                                    : inputState.kind === "error"
                                      ? "border-red-500/25 shadow-[0_0_0_3px_rgba(239,68,68,0.06)]"
                                      : "border-white/[0.07] focus-within:border-[#3481FF]/40 focus-within:shadow-[0_0_0_3px_rgba(52,129,255,0.08)]"
                            }`}
                        >
                            <div className="flex items-center rounded-[calc(1rem-3px)] bg-[#0d0d12]">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                    placeholder="0x… or name.eth — paste multiple"
                                    autoFocus
                                    className="min-w-0 flex-1 bg-transparent px-4 py-3.5 font-mono text-[13px] text-white placeholder:text-slate-700 outline-none"
                                />

                                {/* Inline status indicator */}
                                <div className="flex flex-shrink-0 items-center pr-2">
                                    {inputState.kind === "resolving" && (
                                        <div className="px-2">
                                            <Loader2
                                                size={14}
                                                className="animate-spin text-slate-500"
                                                strokeWidth={2}
                                            />
                                        </div>
                                    )}
                                    {inputState.kind === "ens-ok" && (
                                        <motion.div
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={spring}
                                            className="mr-1 flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1"
                                        >
                                            <Check
                                                size={10}
                                                className="text-emerald-400"
                                                strokeWidth={2.5}
                                            />
                                            <span className="font-mono text-[11px] text-emerald-400">
                                                {inputState.address.slice(0, 8)}…
                                            </span>
                                        </motion.div>
                                    )}
                                    {inputState.kind === "address" && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={spring}
                                            className="mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15"
                                        >
                                            <Check
                                                size={10}
                                                className="text-emerald-400"
                                                strokeWidth={2.5}
                                            />
                                        </motion.div>
                                    )}
                                    {inputState.kind === "error" && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={spring}
                                            className="mr-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15"
                                        >
                                            <X
                                                size={10}
                                                className="text-red-400"
                                                strokeWidth={2.5}
                                            />
                                        </motion.div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleAddClick}
                                        disabled={!addButtonReady}
                                        className={`rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-300 active:scale-[0.96] ${
                                            addButtonReady
                                                ? "bg-[#3481FF] text-white shadow-[0_2px_10px_rgba(52,129,255,0.4)] hover:bg-[#2570f0]"
                                                : "cursor-not-allowed bg-white/[0.04] text-slate-700"
                                        }`}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Error text */}
                        <AnimatePresence>
                            {inputState.kind === "error" && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="px-1 text-[12px] text-red-400"
                                >
                                    {inputState.message}
                                </motion.p>
                            )}
                        </AnimatePresence>

                        {/* Paste hint */}
                        {entries.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-2 px-1"
                            >
                                <ClipboardList
                                    size={11}
                                    className="flex-shrink-0 text-slate-700"
                                    strokeWidth={2}
                                />
                                <p className="text-[11px] text-slate-700">
                                    Paste a comma- or newline-separated list to add several at once
                                </p>
                            </motion.div>
                        )}

                        {/* ── Member list ────────────────────────────────────── */}
                        <motion.div layout className="flex flex-col gap-2">
                            <AnimatePresence initial={false}>
                                {entries.map((entry) => (
                                    <EntryRow
                                        key={entry.id}
                                        entry={entry}
                                        onRemove={handleRemove}
                                        onRetry={handleRetry}
                                    />
                                ))}
                            </AnimatePresence>
                        </motion.div>

                        {/* CTA — shown on mobile below list */}
                        <div className="mt-4 flex flex-col gap-3 lg:hidden">
                            <button
                                type="button"
                                onClick={handleLaunch}
                                disabled={submitState === "submitting"}
                                className="group flex w-full items-center justify-between rounded-full bg-[#3481FF] py-[5px] pl-6 pr-[5px] text-[13px] font-bold text-white shadow-[0_6px_24px_rgba(52,129,255,0.35)] transition-all duration-500 hover:bg-[#2570f0] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitState === "submitting" ? "Confirm in wallet…" : ctaLabel}
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.2] transition-all duration-300 group-hover:scale-105">
                                    {submitState === "submitting" ? (
                                        <Loader2
                                            size={14}
                                            strokeWidth={2}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <ArrowRight size={14} strokeWidth={2} />
                                    )}
                                </div>
                            </button>
                            {submitState === "error" && submitError && (
                                <p className="px-1 text-center text-[12px] text-red-400">
                                    {submitError}
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={onComplete}
                                className="text-center text-[12px] text-slate-700 transition-colors hover:text-slate-400"
                            >
                                Skip for now
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
