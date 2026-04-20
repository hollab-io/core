/**
 * OkrProposalComposer — modal form that proposes OKR updates via governance.
 *
 * The caller must be a role lead of the receiving role (so the proposal is
 * raised under the representation rule). On submit, the aggregate objectives
 * list is uploaded to 0G and an AmendRoleWithRefs proposal is created that
 * re-points the role's `keccak256("okr:{quarter}")` content ref.
 */
import type { OkrKeyResult, OkrObjective } from "@hollab-io/hollab-sdk";
import type { Address } from "viem";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Target, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { showToast } from "../components/ToastHost";
import { useOkrObjectives } from "../hooks/useOkrObjectives";
import { quarterFromDate } from "../hooks/useOrgOkrs";
import { useRolesFromIndexer } from "../hooks/useRolesFromIndexer";
import { useSetOkrs } from "../hooks/useSetOkrs";

type OkrComposerProps = {
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
    roleRegistryAddress: Address;
    meetingFactoryAddress: Address;
};

type DraftKeyResult = {
    id: string;
    label: string;
};

type DraftObjective = {
    id: string;
    title: string;
    description: string;
    keyResults: DraftKeyResult[];
};

function nextQuarters(count: number): string[] {
    const now = new Date();
    const results: string[] = [];
    for (let i = -1; i < count - 1; ++i) {
        const d = new Date(now.getFullYear(), now.getMonth() + i * 3, 1);
        results.push(quarterFromDate(d));
    }
    return results;
}

function makeId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDraft(obj: OkrObjective): DraftObjective {
    return {
        id: obj.id,
        title: obj.title,
        description: obj.description,
        keyResults: obj.keyResults.map((kr) => ({ id: kr.id, label: kr.label })),
    };
}

function fromDraft(
    d: DraftObjective,
    ctx: { roleId: string; circleId: string; quarter: string; timestamp: number },
): OkrObjective {
    const keyResults: OkrKeyResult[] = d.keyResults.map((kr) => ({
        id: kr.id,
        label: kr.label,
        linkedActionIds: [],
        linkedProjectIds: [],
        linkedProposalIds: [],
    }));
    return {
        id: d.id,
        roleId: ctx.roleId,
        circleId: ctx.circleId,
        quarter: ctx.quarter,
        title: d.title,
        description: d.description,
        keyResults,
        startOffset: 0,
        endOffset: 12,
        createdAt: ctx.timestamp,
        updatedAt: ctx.timestamp,
    };
}

export default function OkrProposalComposer({
    isOpen,
    onClose,
    orgId,
    roleRegistryAddress,
    meetingFactoryAddress,
}: OkrComposerProps) {
    const { address } = useAccount();
    const { roles } = useRolesFromIndexer(orgId);
    const setOkrs = useSetOkrs();

    const ledRoles = useMemo(() => {
        if (!address) return [];
        const lower = address.toLowerCase();
        return roles.filter((r) => r.leads.some((a) => a.toLowerCase() === lower));
    }, [roles, address]);

    const [selectedRoleId, setSelectedRoleId] = useState<string>("");
    const [quarter, setQuarter] = useState<string>(quarterFromDate(new Date()));
    const [drafts, setDrafts] = useState<DraftObjective[]>([]);
    const [tension, setTension] = useState("");

    useEffect(() => {
        if (ledRoles.length > 0 && !selectedRoleId) {
            setSelectedRoleId(ledRoles[0].roleId);
        }
    }, [ledRoles, selectedRoleId]);

    const selectedRole = useMemo(
        () => ledRoles.find((r) => r.roleId === selectedRoleId),
        [ledRoles, selectedRoleId],
    );

    const { data: existingObjectives = [], isLoading: loadingExisting } = useOkrObjectives({
        roleRegistryAddress,
        orgId: orgId ? BigInt(orgId) : undefined,
        circleId: selectedRole ? BigInt(selectedRole.circleId) : undefined,
        roleId: selectedRole ? BigInt(selectedRole.roleId) : undefined,
        quarter,
    });

    // Seed drafts from existing objectives whenever the (role, quarter) pair changes.
    useEffect(() => {
        if (loadingExisting) return;
        setDrafts(existingObjectives.map(toDraft));
    }, [existingObjectives, loadingExisting, selectedRoleId, quarter]);

    const addObjective = () => {
        setDrafts((prev) => [
            ...prev,
            { id: makeId(), title: "", description: "", keyResults: [] },
        ]);
    };
    const removeObjective = (id: string) => {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
    };
    const updateObjective = (id: string, patch: Partial<DraftObjective>) => {
        setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    };
    const addKr = (objId: string) => {
        setDrafts((prev) =>
            prev.map((d) =>
                d.id === objId
                    ? { ...d, keyResults: [...d.keyResults, { id: makeId(), label: "" }] }
                    : d,
            ),
        );
    };
    const removeKr = (objId: string, krId: string) => {
        setDrafts((prev) =>
            prev.map((d) =>
                d.id === objId
                    ? { ...d, keyResults: d.keyResults.filter((k) => k.id !== krId) }
                    : d,
            ),
        );
    };
    const updateKr = (objId: string, krId: string, label: string) => {
        setDrafts((prev) =>
            prev.map((d) =>
                d.id === objId
                    ? {
                          ...d,
                          keyResults: d.keyResults.map((k) =>
                              k.id === krId ? { ...k, label } : k,
                          ),
                      }
                    : d,
            ),
        );
    };

    const canSubmit =
        Boolean(selectedRole) && drafts.every((d) => d.title.trim() !== "") && !setOkrs.isPending;

    const handleSubmit = async () => {
        if (!selectedRole) return;
        const timestamp = Math.floor(Date.now() / 1000);
        const objectives = drafts.map((d) =>
            fromDraft(d, {
                roleId: selectedRole.roleId,
                circleId: selectedRole.circleId,
                quarter,
                timestamp,
            }),
        );

        try {
            await setOkrs.mutateAsync({
                meetingFactoryAddress,
                roleRegistryAddress,
                orgId: BigInt(orgId),
                circleId: BigInt(selectedRole.circleId),
                roleId: BigInt(selectedRole.roleId),
                quarter,
                objectives,
                tension: tension.trim() || undefined,
            });
            showToast(`OKR proposal submitted for ${selectedRole.name} (${quarter})`);
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Proposal failed";
            showToast(`OKR proposal failed: ${message}`);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-black/70 backdrop-blur-xl"
                onClick={() => !setOkrs.isPending && onClose()}
            >
                <motion.div
                    key="modal"
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-xl max-h-[85vh] overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0b0b0b]/90 shadow-2xl"
                >
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                        <div className="flex items-center gap-2">
                            <Target size={16} className="text-[#3481FF]" strokeWidth={2} />
                            <h3 className="text-sm font-semibold text-white">Propose OKRs</h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="max-h-[calc(85vh-128px)] overflow-y-auto px-5 py-4 space-y-4">
                        {!address ? (
                            <p className="text-[13px] text-slate-400">
                                Connect a wallet to propose OKRs.
                            </p>
                        ) : ledRoles.length === 0 ? (
                            <p className="text-[13px] text-slate-400">
                                You don't currently lead any role in this organization. Only role
                                leads can raise OKR proposals.
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Role
                                        </span>
                                        <select
                                            value={selectedRoleId}
                                            onChange={(e) => setSelectedRoleId(e.target.value)}
                                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-[12px] text-white"
                                        >
                                            {ledRoles.map((r) => (
                                                <option key={r.roleId} value={r.roleId}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Quarter
                                        </span>
                                        <select
                                            value={quarter}
                                            onChange={(e) => setQuarter(e.target.value)}
                                            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-[12px] text-white"
                                        >
                                            {nextQuarters(5).map((q) => (
                                                <option key={q} value={q}>
                                                    {q}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <label className="space-y-1 block">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                        Tension (optional)
                                    </span>
                                    <input
                                        type="text"
                                        value={tension}
                                        onChange={(e) => setTension(e.target.value)}
                                        placeholder="What is this OKR update responding to?"
                                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white placeholder:text-slate-600"
                                    />
                                </label>

                                <div className="space-y-3">
                                    {drafts.map((obj, idx) => (
                                        <div
                                            key={obj.id}
                                            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                                        >
                                            <div className="mb-2 flex items-start justify-between">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Objective {idx + 1}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeObjective(obj.id)}
                                                    aria-label="Remove objective"
                                                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:text-rose-400"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={obj.title}
                                                onChange={(e) =>
                                                    updateObjective(obj.id, {
                                                        title: e.target.value,
                                                    })
                                                }
                                                placeholder="Title"
                                                className="mb-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-white placeholder:text-slate-600"
                                            />
                                            <textarea
                                                value={obj.description}
                                                onChange={(e) =>
                                                    updateObjective(obj.id, {
                                                        description: e.target.value,
                                                    })
                                                }
                                                placeholder="Description (optional)"
                                                rows={2}
                                                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600"
                                            />
                                            <div className="mt-2 space-y-1.5">
                                                {obj.keyResults.map((kr) => (
                                                    <div
                                                        key={kr.id}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <span className="text-[10px] font-semibold uppercase text-slate-600">
                                                            KR
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={kr.label}
                                                            onChange={(e) =>
                                                                updateKr(
                                                                    obj.id,
                                                                    kr.id,
                                                                    e.target.value,
                                                                )
                                                            }
                                                            placeholder="Key result"
                                                            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-[12px] text-white placeholder:text-slate-600"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeKr(obj.id, kr.id)}
                                                            aria-label="Remove key result"
                                                            className="flex h-5 w-5 items-center justify-center rounded-full text-slate-500 hover:text-rose-400"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addKr(obj.id)}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#3481FF] hover:bg-[#3481FF]/[0.08]"
                                                >
                                                    <Plus size={10} /> Add key result
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addObjective}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/[0.1] px-3 py-2.5 text-[12px] font-medium text-slate-400 hover:border-[#3481FF]/40 hover:text-[#3481FF]"
                                >
                                    <Plus size={12} /> Add objective
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-black/30 px-5 py-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={setOkrs.isPending}
                            className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-400 hover:text-white disabled:opacity-40"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3481FF] px-3.5 py-2 text-[12px] font-semibold text-white shadow hover:bg-[#2b74ec] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {setOkrs.isPending ? "Submitting…" : "Propose OKRs"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
