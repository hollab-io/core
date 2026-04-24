/**
 * FacilitatorsCard — admin bootstrap UI for circle Facilitators + Secretaries.
 *
 * Per specs/99-agent-native-divergence.md §4 these officers are addresses —
 * a human or an autonomous agent can hold the role. The contract setters
 * (`setCircleFacilitator` / `setCircleSecretary`) are admin-gated and lock
 * once a corresponding Election adopts (Holacracy §5.1.2). We surface the
 * setter per-circle and let the contract revert the lock; the UI shows the
 * current holder from the indexer snapshot.
 */
import { ChevronDown, Loader2, Lock, ShieldAlert, UserCog } from "lucide-react";
import { useState } from "react";
import { isAddress } from "viem";

import { isAgentAddress } from "../config/agents";
import { useCirclesFromIndexer } from "../hooks/useCirclesFromIndexer";
import {
    useCircleOfficerLocks,
    useSetCircleFacilitator,
    useSetCircleSecretary,
} from "../hooks/useProposalLifecycle";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export default function FacilitatorsCard({
    orgId,
    meetingFactoryAddress,
}: {
    orgId: string | null;
    meetingFactoryAddress: `0x${string}` | undefined;
}) {
    const { circles, loading } = useCirclesFromIndexer(orgId);
    const [open, setOpen] = useState(false);

    if (!orgId) return null;

    return (
        <section className="mb-8 rounded-[1.5rem] border border-slate-200/80 bg-white/60 p-5 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="group flex w-full items-center justify-between gap-4 text-left"
                aria-expanded={open}
            >
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <UserCog size={12} className="text-slate-500" strokeWidth={1.9} />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Facilitators & secretaries
                        </p>
                    </div>
                    <p className="text-[13.5px] font-medium text-slate-900 dark:text-white">
                        Elected officers per circle · admin bootstrap
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                        Either role may be held by a human or an agent. Admin setter locks once an
                        election is adopted.
                    </p>
                </div>
                <ChevronDown
                    size={14}
                    strokeWidth={1.9}
                    className={`shrink-0 text-slate-500 transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div className="mt-5 space-y-2">
                    {loading && (
                        <div className="flex items-center gap-2 text-[12px] text-slate-500">
                            <Loader2 size={11} className="animate-spin" strokeWidth={2} />
                            Loading circles…
                        </div>
                    )}
                    {!loading && circles.length === 0 && (
                        <p className="text-[12px] text-slate-500">No circles on this org yet.</p>
                    )}
                    {circles.map((c) => (
                        <CircleOfficerRow
                            key={c.id}
                            circleId={c.circleId.toString()}
                            circleName={c.name}
                            facilitator={c.facilitator as `0x${string}`}
                            secretary={c.secretary as `0x${string}`}
                            meetingFactoryAddress={meetingFactoryAddress}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

// ── Single circle row ──────────────────────────────────────────────────────

function CircleOfficerRow({
    circleId,
    circleName,
    facilitator,
    secretary,
    meetingFactoryAddress,
}: {
    circleId: string;
    circleName: string;
    facilitator: `0x${string}`;
    secretary: `0x${string}`;
    meetingFactoryAddress: `0x${string}` | undefined;
}) {
    const { locks } = useCircleOfficerLocks(meetingFactoryAddress, BigInt(circleId));

    return (
        <div className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <p className="mb-2 text-[12px] font-semibold text-slate-900 dark:text-white">
                {circleName}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <OfficerEditor
                    label="Facilitator"
                    circleId={circleId}
                    holder={facilitator}
                    role="facilitator"
                    locked={locks.facilitatorLocked}
                    meetingFactoryAddress={meetingFactoryAddress}
                />
                <OfficerEditor
                    label="Secretary"
                    circleId={circleId}
                    holder={secretary}
                    role="secretary"
                    locked={locks.secretaryLocked}
                    meetingFactoryAddress={meetingFactoryAddress}
                />
            </div>
        </div>
    );
}

function OfficerEditor({
    label,
    circleId,
    holder,
    role,
    locked,
    meetingFactoryAddress,
}: {
    label: string;
    circleId: string;
    holder: `0x${string}`;
    role: "facilitator" | "secretary";
    locked: boolean;
    meetingFactoryAddress: `0x${string}` | undefined;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(holder === ZERO_ADDRESS ? "" : holder);
    const setFacilitator = useSetCircleFacilitator();
    const setSecretary = useSetCircleSecretary();
    const mutation = role === "facilitator" ? setFacilitator : setSecretary;

    const holderIsAgent = holder !== ZERO_ADDRESS && isAgentAddress(holder);
    const unset = holder === ZERO_ADDRESS;

    const submit = () => {
        if (!meetingFactoryAddress || locked) return;
        const trimmed = value.trim();
        if (!isAddress(trimmed)) return;
        mutation.mutate(
            {
                meetingFactoryAddress,
                circleId: BigInt(circleId),
                holder: trimmed as `0x${string}`,
            },
            {
                onSuccess: () => setEditing(false),
            },
        );
    };

    return (
        <div>
            <div className="mb-1.5 flex items-center gap-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {label}
                </p>
                {holderIsAgent && (
                    <span className="rounded-full border border-[#3481FF]/30 bg-[#3481FF]/[0.08] px-1.5 py-px text-[9px] font-semibold text-[#3481FF]">
                        agent
                    </span>
                )}
                {locked && (
                    <span
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-px text-[9px] font-semibold text-emerald-600 dark:text-emerald-300"
                        title="Elected via governance — admin bootstrap is locked"
                    >
                        <Lock size={8} strokeWidth={2.2} />
                        elected
                    </span>
                )}
            </div>

            {!editing ? (
                <div className="flex items-center justify-between gap-2">
                    <span
                        className={`font-mono text-[11px] ${
                            unset
                                ? "text-slate-400 dark:text-slate-500"
                                : "text-slate-700 dark:text-slate-200"
                        }`}
                    >
                        {unset ? "— unset —" : `${holder.slice(0, 6)}…${holder.slice(-4)}`}
                    </span>
                    {!locked ? (
                        <button
                            type="button"
                            onClick={() => {
                                setEditing(true);
                                setValue(holder === ZERO_ADDRESS ? "" : holder);
                                mutation.reset();
                            }}
                            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-[#3481FF]"
                        >
                            {unset ? "Set" : "Change"}
                        </button>
                    ) : (
                        <span
                            className="text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600"
                            title="Use the election governance flow to change this officer"
                        >
                            governance only
                        </span>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="0x…"
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 outline-none focus:border-[#3481FF]/40 focus:ring-1 focus:ring-[#3481FF]/20 dark:border-white/[0.08] dark:bg-[#0c0c12] dark:text-white"
                    />
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={submit}
                            disabled={mutation.isPending || !isAddress(value.trim())}
                            className="inline-flex items-center gap-1 rounded-full bg-[#3481FF] px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-[#2f75e8] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {mutation.isPending && (
                                <Loader2 size={9} className="animate-spin" strokeWidth={2} />
                            )}
                            Submit
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-full px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                            Cancel
                        </button>
                    </div>
                    {mutation.isError && (
                        <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-rose-500 dark:text-rose-400">
                            <ShieldAlert size={10} strokeWidth={2} className="mt-[1px] shrink-0" />
                            {formatOfficerError(mutation.error)}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function formatOfficerError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("FacilitatorAlreadyElected")) {
        return "Facilitator is locked — a FacilitatorElection already adopted. Use the election governance flow.";
    }
    if (msg.includes("SecretaryAlreadyElected")) {
        return "Secretary is locked — a SecretaryElection already adopted. Use the election governance flow.";
    }
    if (msg.includes("NotOrgAdmin")) {
        return "Admin-only. Connect the org admin wallet to bootstrap.";
    }
    return msg;
}
