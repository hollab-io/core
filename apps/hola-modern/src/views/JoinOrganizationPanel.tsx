/**
 * JoinOrganizationPanel
 *
 * Lets an outside user look up a HolLab org by subname and submit a join request.
 * Shown inside OrganizationsHome for users who want to join (rather than create) an org.
 */
import { organizationFactoryAbi } from "@hollab-io/viem-extension";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Check, Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

import { useJoinRequest } from "../hooks/useJoinRequest";
import { ORGANIZATION_FACTORY_ADDRESS } from "./organizationFactoryAddress";

const publicClient = createPublicClient({ chain: mainnet, transport: http() });

type OrgPreview = {
    id: bigint;
    name: string;
    subname: string;
    creator: `0x${string}`;
};

type LookupState =
    | { kind: "idle" }
    | { kind: "searching" }
    | { kind: "found"; org: OrgPreview }
    | { kind: "not-found" }
    | { kind: "error"; message: string };

type SubmitState = "idle" | "pending" | "done" | "error";

const SPRING = { type: "spring", stiffness: 360, damping: 30 } as const;

type Props = {
    onClose: () => void;
    /** When coming from the Discover list, pass the org directly to skip the contract lookup. */
    prefilled?: OrgPreview;
};

export default function JoinOrganizationPanel({ onClose, prefilled }: Props) {
    const [subname, setSubname] = useState(prefilled?.subname ?? "");
    const [message, setMessage] = useState("");
    const [lookupState, setLookupState] = useState<LookupState>(
        prefilled ? { kind: "found", org: prefilled } : { kind: "idle" },
    );
    const [submitState, setSubmitState] = useState<SubmitState>("idle");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { requestToJoin } = useJoinRequest();

    const lookupOrg = useCallback(async (value: string) => {
        const trimmed = value.trim().toLowerCase();
        if (trimmed.length < 3) {
            setLookupState({ kind: "idle" });
            return;
        }
        setLookupState({ kind: "searching" });
        try {
            const org = (await publicClient.readContract({
                address: ORGANIZATION_FACTORY_ADDRESS,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                abi: organizationFactoryAbi as any,
                functionName: "getOrganizationBySubname",
                args: [trimmed],
            })) as { id: bigint; name: string; subname: string; creator: `0x${string}` };

            if (!org || org.id === 0n) {
                setLookupState({ kind: "not-found" });
            } else {
                setLookupState({
                    kind: "found",
                    org: { id: org.id, name: org.name, subname: org.subname, creator: org.creator },
                });
            }
        } catch {
            setLookupState({ kind: "error", message: "Could not reach the network. Try again." });
        }
    }, []);

    useEffect(() => {
        // If prefilled org was passed, don't re-trigger lookup from the subname field.
        if (prefilled) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void lookupOrg(subname), 600);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [subname, lookupOrg, prefilled]);

    const handleSubmit = async () => {
        if (lookupState.kind !== "found") return;
        setSubmitState("pending");
        setSubmitError(null);
        try {
            await requestToJoin({ orgId: lookupState.org.id, message });
            setSubmitState("done");
        } catch (err) {
            setSubmitState("error");
            setSubmitError(err instanceof Error ? err.message : "Transaction failed");
        }
    };

    const orgFound = lookupState.kind === "found";
    const isPending = submitState === "pending";
    const canSubmit = orgFound && submitState === "idle";

    return (
        <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-2xl border border-white/[0.08] bg-[#0e0e14] p-6"
        >
            {/* Close */}
            <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.07] text-slate-500 transition-colors hover:text-slate-300"
            >
                <X size={12} strokeWidth={2} />
            </button>

            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3481FF]">
                Join
            </p>
            <h2 className="mb-5 text-[18px] font-bold tracking-[-0.02em] text-white">
                Request to join an org
            </h2>

            {/* Subname input */}
            <div className="mb-3">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Org subname
                </label>
                <div
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-300 ${
                        lookupState.kind === "found"
                            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                            : lookupState.kind === "not-found" || lookupState.kind === "error"
                              ? "border-red-500/25 bg-red-500/[0.03]"
                              : "border-white/[0.08] bg-white/[0.03] focus-within:border-[#3481FF]/40"
                    }`}
                >
                    {lookupState.kind === "searching" ? (
                        <Loader2 size={14} className="flex-shrink-0 animate-spin text-slate-500" />
                    ) : lookupState.kind === "found" ? (
                        <Check size={14} className="flex-shrink-0 text-emerald-400" />
                    ) : (
                        <Search size={14} className="flex-shrink-0 text-slate-600" />
                    )}
                    <input
                        type="text"
                        value={subname}
                        onChange={(e) => setSubname(e.target.value)}
                        placeholder="e.g. core"
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-white placeholder:text-slate-700 outline-none"
                    />
                    {subname && (
                        <span className="flex-shrink-0 text-[11px] text-slate-600">
                            .hollab.eth
                        </span>
                    )}
                </div>
                <AnimatePresence>
                    {lookupState.kind === "not-found" && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 px-1 text-[12px] text-red-400"
                        >
                            No organization found with this subname.
                        </motion.p>
                    )}
                    {lookupState.kind === "error" && (
                        <motion.p
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mt-1.5 px-1 text-[12px] text-red-400"
                        >
                            {lookupState.message}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Org preview */}
            <AnimatePresence>
                {lookupState.kind === "found" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={SPRING}
                        className="mb-3 overflow-hidden"
                    >
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[0.6rem] bg-[#3481FF] text-[14px] font-bold text-white">
                                {lookupState.org.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-white">
                                    {lookupState.org.name}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {lookupState.org.subname}.hollab.eth
                                </p>
                            </div>
                            <Building2
                                size={14}
                                className="ml-auto flex-shrink-0 text-emerald-400"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Message */}
            <AnimatePresence>
                {orgFound && submitState !== "done" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={SPRING}
                        className="mb-4 overflow-hidden"
                    >
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Message{" "}
                            <span className="normal-case tracking-normal font-normal text-slate-600">
                                (optional)
                            </span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Briefly introduce yourself or explain why you'd like to join…"
                            rows={3}
                            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder:text-slate-700 outline-none transition-all duration-300 focus:border-[#3481FF]/40 focus:bg-white/[0.05]"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success */}
            <AnimatePresence>
                {submitState === "done" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-3 text-[13px] text-emerald-400"
                    >
                        Request submitted! The org admin will review it.
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            {submitState === "error" && submitError && (
                <p className="mb-3 text-[12px] text-red-400">{submitError}</p>
            )}

            {/* CTA */}
            {submitState !== "done" && (
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit || isPending}
                    className={`group flex w-full items-center justify-between rounded-xl px-5 py-3 text-[13px] font-bold transition-all duration-500 active:scale-[0.98] ${
                        canSubmit
                            ? "bg-[#3481FF] text-white shadow-[0_8px_28px_rgba(52,129,255,0.3)] hover:bg-[#2570f0]"
                            : "cursor-not-allowed bg-white/[0.05] text-slate-600"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {isPending ? (
                            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                        ) : null}
                        {isPending ? "Confirm in wallet…" : "Send join request"}
                    </div>
                    {submitState !== "pending" && (
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
                                canSubmit
                                    ? "bg-white/20 group-hover:translate-x-0.5"
                                    : "bg-white/[0.04]"
                            }`}
                        >
                            <ArrowRight size={12} strokeWidth={2.5} />
                        </div>
                    )}
                </button>
            )}
        </motion.div>
    );
}
