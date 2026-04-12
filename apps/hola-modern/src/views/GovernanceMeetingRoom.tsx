import { meetingFactoryAbi } from "@hollab-io/viem-extension";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Check,
    ChevronRight,
    FileText,
    Loader2,
    MinusCircle,
    MoveRight,
    Plus,
    Scale,
    ScrollText,
    ShieldAlert,
    Users,
    Vote,
    X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { encodeFunctionData } from "viem";
import { useWalletClient } from "wagmi";

import type { GovernanceMeeting } from "../hooks/useGovernanceMeetingsFromIndexer";
import {
    encodeAmendRole,
    encodeCreateRole,
    encodeRemoveRole,
    ChangeType as OnChainChangeType,
} from "../hooks/useExecuteGovernance";
import { useGovernanceMeeting } from "../hooks/useGovernanceMeeting";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

// ─── Types ───────────────────────────────────────────────────────────────────

type GovernancePhaseId = "check-in" | "agenda-processing" | "closing-round";
type DrawerTab = "meeting" | "history";

type ChangeType =
    | "create-role"
    | "amend-role"
    | "remove-role"
    | "create-policy"
    | "amend-policy"
    | "remove-policy"
    | "move-role";

type ProposalWizardStep = "action" | "details";

type PendingGovernanceAction = {
    id: string;
    changeType: ChangeType;
    label: string;
    // Role fields
    circleId: string;
    roleName?: string;
    roleDescription?: string;
    roleDomain?: string;
    roleAccountabilities?: string;
    // Policy fields
    policyTitle?: string;
    policyBody?: string;
    // Target
    existingTargetId?: string;
    destinationCircleId?: string;
};

type ProposalDraft = {
    changeType: ChangeType;
    circleId: string;
    proposerRoleId: string;
    // Role fields
    roleName: string;
    roleDescription: string;
    roleDomain: string;
    roleAccountabilities: string;
    // Policy fields
    policyTitle: string;
    policyBody: string;
    // Target fields
    existingTargetId: string;
    destinationCircleId: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const GOVERNANCE_PHASES: { id: GovernancePhaseId; label: string; description: string }[] = [
    {
        id: "check-in",
        label: "Check-in round",
        description:
            "Each participant shares a brief word on how they arrive. No discussion, just listening.",
    },
    {
        id: "agenda-processing",
        label: "Agenda building & processing",
        description:
            "Surface tensions and process each agenda item through the Integrative Decision Making protocol.",
    },
    {
        id: "closing-round",
        label: "Closing round",
        description:
            "Share closing reflections. Once everyone has spoken, the facilitator completes the meeting.",
    },
];

const REVIEW_STEPS = [
    {
        step: "a",
        label: "Present proposal",
        desc: "Proposer describes the issue and shares a proposal",
    },
    {
        step: "b",
        label: "Clarifying questions",
        desc: "Others ask questions to understand — no reactions",
    },
    {
        step: "c",
        label: "Reaction round",
        desc: "Each participant shares reactions, one at a time",
    },
    { step: "d", label: "Option to clarify", desc: "Proposer may amend the proposal" },
    {
        step: "e",
        label: "Challenge round",
        desc: "Each participant raises concerns; facilitator captures challenges",
    },
    {
        step: "f",
        label: "Integration",
        desc: "Resolve each challenge until the proposal is adopted",
    },
] as const;

const CHANGE_TYPE_OPTIONS: { value: ChangeType; label: string; desc: string; icon: typeof Plus }[] =
    [
        {
            value: "create-role",
            label: "Create role",
            desc: "Define a new role with purpose, domain and accountabilities",
            icon: Plus,
        },
        {
            value: "amend-role",
            label: "Amend role",
            desc: "Change an existing role's definition",
            icon: FileText,
        },
        {
            value: "remove-role",
            label: "Remove role",
            desc: "Remove a role that is no longer needed",
            icon: MinusCircle,
        },
        {
            value: "move-role",
            label: "Move role",
            desc: "Transfer a role to a different circle",
            icon: MoveRight,
        },
        {
            value: "create-policy",
            label: "Create policy",
            desc: "Add a new governing policy to the circle",
            icon: ScrollText,
        },
        {
            value: "amend-policy",
            label: "Amend policy",
            desc: "Modify an existing circle policy",
            icon: FileText,
        },
        {
            value: "remove-policy",
            label: "Remove policy",
            desc: "Remove a policy from the circle",
            icon: MinusCircle,
        },
    ];

const WIZARD_STEPS: { id: ProposalWizardStep; label: string }[] = [
    { id: "action", label: "Action" },
    { id: "details", label: "Details" },
];

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { type: "spring" as const, stiffness: 340, damping: 28 };

const panelTransition = {
    type: "spring" as const,
    stiffness: 210,
    damping: 26,
    mass: 0.88,
};

const statusStyles = {
    completed: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
    in_progress: "border-[#3481FF]/30 bg-[#3481FF]/15 text-[#6aabff]",
    scheduled: "border-slate-500/30 bg-slate-500/15 text-slate-300",
} as const;

const agendaStatusClassNames = {
    complete: "border-emerald-400/20 bg-emerald-500/12 text-emerald-200",
    pending: "border-slate-700 bg-slate-900 text-slate-300",
    processing: "border-[#3481FF]/20 bg-[#3481FF]/12 text-[#6aabff]",
} as const;

const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
});

function formatMeetingDate(value: string) {
    return dateFmt.format(new Date(value));
}

const shortDateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
});

/**
 * Convert a pending governance action into an on-chain executeGovernance call.
 * Returns null for unsupported change types (policies, move-role — not yet on-chain).
 */
function buildGovernanceCall(
    action: PendingGovernanceAction,
    meetingFactoryAddress: `0x${string}`,
    orgId: bigint,
): { to: `0x${string}`; data: `0x${string}` } | null {
    let changeType: number;
    let encodedData: `0x${string}`;

    if (action.changeType === "create-role") {
        changeType = OnChainChangeType.CreateRole;
        encodedData = encodeCreateRole({
            circleId: BigInt(action.circleId || "0"),
            name: action.roleName ?? "",
            purpose: action.roleDescription ?? "",
            domains: action.roleDomain ? [action.roleDomain] : [],
            accountabilities: action.roleAccountabilities
                ? action.roleAccountabilities
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [],
        });
    } else if (action.changeType === "amend-role" && action.existingTargetId) {
        changeType = OnChainChangeType.AmendRole;
        encodedData = encodeAmendRole({
            roleId: BigInt(action.existingTargetId),
            name: action.roleName ?? "",
            purpose: action.roleDescription ?? "",
            domains: action.roleDomain ? [action.roleDomain] : [],
            accountabilities: action.roleAccountabilities
                ? action.roleAccountabilities
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [],
        });
    } else if (action.changeType === "remove-role" && action.existingTargetId) {
        changeType = OnChainChangeType.RemoveRole;
        encodedData = encodeRemoveRole(BigInt(action.existingTargetId));
    } else {
        // Policies and move-role not yet supported on-chain
        return null;
    }

    return {
        to: meetingFactoryAddress,
        data: encodeFunctionData({
            abi: meetingFactoryAbi,
            functionName: "executeGovernance",
            args: [orgId, changeType, encodedData],
        }),
    };
}

function buildEmptyDraft(circleId: string, roleId: string): ProposalDraft {
    return {
        changeType: "create-role",
        circleId,
        proposerRoleId: roleId,
        roleName: "",
        roleDescription: "",
        roleDomain: "",
        roleAccountabilities: "",
        policyTitle: "",
        policyBody: "",
        existingTargetId: "",
        destinationCircleId: "",
    };
}

// ─── Shared input classes ────────────────────────────────────────────────────

const inputCls =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-[13px] text-white placeholder:text-slate-600 outline-none transition-all focus:border-[#3481FF]/40 focus:ring-1 focus:ring-[#3481FF]/20";
const selectCls = inputCls;
const textareaCls = `${inputCls} resize-none`;
const labelCls =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

// ─── Phase Stepper ───────────────────────────────────────────────────────────

function PhaseStepper({
    activeIndex,
    onSelect,
}: {
    activeIndex: number;
    onSelect: (i: number) => void;
}) {
    return (
        <div>
            <div className="flex items-center">
                {GOVERNANCE_PHASES.map((phase, i) => {
                    const done = i < activeIndex;
                    const active = i === activeIndex;
                    return (
                        <div key={phase.id} className="flex flex-1 items-center last:flex-none">
                            <button
                                type="button"
                                onClick={() => onSelect(i)}
                                className="group relative z-10 flex-shrink-0"
                                aria-label={`${phase.label} — step ${i + 1}`}
                            >
                                <motion.div
                                    layout
                                    transition={SPRING}
                                    className={`flex items-center justify-center rounded-full
                                        text-[11px] font-bold transition-colors duration-300
                                        ${
                                            active
                                                ? "h-9 w-9 bg-[#3481FF] text-white shadow-[0_0_20px_rgba(52,129,255,0.4)]"
                                                : done
                                                  ? "h-7 w-7 border border-emerald-400/30 bg-emerald-500/15 text-emerald-400"
                                                  : "h-7 w-7 border border-white/[0.08] bg-white/[0.03] text-slate-600"
                                        }`}
                                >
                                    {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
                                </motion.div>
                                <span
                                    className="pointer-events-none absolute left-1/2 top-full mt-2
                                        -translate-x-1/2 whitespace-nowrap rounded-lg
                                        border border-white/[0.06] bg-[#0a0a0f] px-2.5 py-1
                                        text-[10px] font-medium text-slate-300
                                        opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                                >
                                    {phase.label}
                                </span>
                            </button>
                            {i < GOVERNANCE_PHASES.length - 1 && (
                                <div className="mx-2 h-px flex-1">
                                    <motion.div
                                        className="h-full origin-left"
                                        initial={false}
                                        animate={{
                                            scaleX: 1,
                                            backgroundColor:
                                                i < activeIndex
                                                    ? "rgba(52,211,153,0.35)"
                                                    : "rgba(255,255,255,0.06)",
                                        }}
                                        transition={{ duration: 0.4, ease: EXPO }}
                                        style={{ height: 1 }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EXPO }}
                className="mt-6 flex items-baseline gap-2"
            >
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    Phase {activeIndex + 1}/{GOVERNANCE_PHASES.length}
                </span>
                <span className="text-[13px] font-semibold text-white">
                    {GOVERNANCE_PHASES[activeIndex].label}
                </span>
            </motion.div>
        </div>
    );
}

// ─── IDM Sub-Steps ───────────────────────────────────────────────────────────

function IdmSubSteps({ activeSubStep }: { activeSubStep: number }) {
    return (
        <div className="space-y-1.5">
            {REVIEW_STEPS.map((step, i) => {
                const active = i === activeSubStep;
                const done = i < activeSubStep;
                return (
                    <div
                        key={step.step}
                        className={`flex items-start gap-3 rounded-xl px-3.5 py-2.5 transition-colors ${
                            active
                                ? "border border-[#3481FF]/20 bg-[#3481FF]/[0.06]"
                                : "border border-transparent"
                        }`}
                    >
                        <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                active
                                    ? "bg-[#3481FF] text-white"
                                    : done
                                      ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-400"
                                      : "border border-white/[0.08] bg-white/[0.03] text-slate-600"
                            }`}
                        >
                            {done ? <Check size={9} strokeWidth={3} /> : step.step}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p
                                className={`text-[12px] font-semibold ${active ? "text-white" : done ? "text-slate-400" : "text-slate-500"}`}
                            >
                                {step.label}
                            </p>
                            {active && (
                                <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="mt-1 text-[11px] leading-relaxed text-slate-400"
                                >
                                    {step.desc}
                                </motion.p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Proposal Wizard ─────────────────────────────────────────────────────────

function ProposalWizard({
    draft,
    setDraft,
    wizardStep,
    setWizardStep,
    onSubmit,
    onCancel,
    circles,
    roles,
    policies,
}: {
    draft: ProposalDraft;
    setDraft: (fn: (d: ProposalDraft) => ProposalDraft) => void;
    wizardStep: ProposalWizardStep;
    setWizardStep: (s: ProposalWizardStep) => void;
    onSubmit: () => void;
    onCancel: () => void;
    circles: { id: string; title: string }[];
    roles: { id: string; title: string; circleId: string; summary: string }[];
    policies: { id: string; title: string; circleId: string; summary: string }[];
}) {
    const stepIndex = WIZARD_STEPS.findIndex((s) => s.id === wizardStep);
    const circleRoles = roles.filter((r) => r.circleId === draft.circleId);
    const circlePolicies = policies.filter((p) => p.circleId === draft.circleId);

    const isRoleAction = draft.changeType.includes("role");
    const isPolicyAction = draft.changeType.includes("policy");
    const isCreate = draft.changeType === "create-role" || draft.changeType === "create-policy";
    const isMove = draft.changeType === "move-role";

    const existingTargets = isPolicyAction
        ? circlePolicies.map((p) => ({ id: p.id, label: p.title }))
        : circleRoles.map((r) => ({ id: r.id, label: r.title }));

    const canAdvance = (() => {
        switch (wizardStep) {
            case "action":
                return Boolean(draft.changeType && draft.circleId);
            case "details":
                if (isCreate && isRoleAction) return Boolean(draft.roleName.trim());
                if (isCreate && isPolicyAction)
                    return Boolean(draft.policyTitle.trim() && draft.policyBody.trim());
                if (!isCreate) return Boolean(draft.existingTargetId);
                return true;
            default:
                return false;
        }
    })();

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EXPO }}
            className="space-y-5"
        >
            {/* Wizard step indicator */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6aabff]">
                    <Plus size={13} />
                    New proposal
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full border border-white/[0.07] p-1.5 text-slate-500 transition-colors hover:border-white/[0.14] hover:text-slate-300"
                >
                    <X size={12} />
                </button>
            </div>

            {/* Mini stepper */}
            <div className="flex items-center gap-1">
                {WIZARD_STEPS.map((s, i) => (
                    <div key={s.id} className="flex flex-1 items-center gap-1 last:flex-none">
                        <div
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                i <= stepIndex ? "bg-[#3481FF]" : "bg-white/[0.06]"
                            }`}
                        />
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-slate-500">
                Step {stepIndex + 1} of {WIZARD_STEPS.length} — {WIZARD_STEPS[stepIndex].label}
            </p>

            {/* Step content */}
            <AnimatePresence mode="wait">
                {wizardStep === "action" && (
                    <motion.div
                        key="action"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2, ease: EXPO }}
                        className="space-y-4"
                    >
                        {/* Circle & role selectors */}
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Circle</label>
                                <select
                                    value={draft.circleId}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            circleId: e.target.value,
                                            proposerRoleId:
                                                roles.find((r) => r.circleId === e.target.value)
                                                    ?.id ?? "",
                                            existingTargetId: "",
                                        }))
                                    }
                                    className={selectCls}
                                >
                                    {!draft.circleId && <option value="">Select a circle</option>}
                                    {circles.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Your role</label>
                                <select
                                    value={draft.proposerRoleId}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, proposerRoleId: e.target.value }))
                                    }
                                    className={selectCls}
                                >
                                    <option value="">— optional —</option>
                                    {circleRoles.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Change type grid */}
                        <div className="space-y-1.5">
                            <label className={labelCls}>What do you want to change?</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {CHANGE_TYPE_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const selected = draft.changeType === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    changeType: opt.value,
                                                    existingTargetId: "",
                                                }))
                                            }
                                            className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                                                selected
                                                    ? "border-[#3481FF]/30 bg-[#3481FF]/[0.06] ring-1 ring-[#3481FF]/20"
                                                    : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.1] hover:bg-white/[0.05]"
                                            }`}
                                        >
                                            <Icon
                                                size={14}
                                                className={`mt-0.5 shrink-0 ${selected ? "text-[#6aabff]" : "text-slate-500"}`}
                                                strokeWidth={1.75}
                                            />
                                            <div>
                                                <p
                                                    className={`text-[12px] font-semibold ${selected ? "text-white" : "text-slate-300"}`}
                                                >
                                                    {opt.label}
                                                </p>
                                                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                                                    {opt.desc}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {wizardStep === "details" && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2, ease: EXPO }}
                        className="space-y-4"
                    >
                        {/* Target selection for amend/remove/move */}
                        {!isCreate && (
                            <div>
                                <label className={labelCls}>
                                    {isPolicyAction ? "Select policy" : "Select role"}
                                </label>
                                <select
                                    value={draft.existingTargetId}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            existingTargetId: e.target.value,
                                        }))
                                    }
                                    className={selectCls}
                                >
                                    <option value="" disabled>
                                        Choose...
                                    </option>
                                    {existingTargets.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Move destination */}
                        {isMove && (
                            <div>
                                <label className={labelCls}>Destination circle</label>
                                <select
                                    value={draft.destinationCircleId}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            destinationCircleId: e.target.value,
                                        }))
                                    }
                                    className={selectCls}
                                >
                                    <option value="" disabled>
                                        Choose destination...
                                    </option>
                                    {circles
                                        .filter((c) => c.id !== draft.circleId)
                                        .map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.title}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {/* Create / amend role fields */}
                        {isRoleAction && (isCreate || draft.changeType === "amend-role") && (
                            <>
                                <div>
                                    <label className={labelCls}>Name</label>
                                    <input
                                        type="text"
                                        value={draft.roleName}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, roleName: e.target.value }))
                                        }
                                        placeholder="e.g. Governance Steward"
                                        className={inputCls}
                                        autoFocus={isCreate}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Description</label>
                                    <textarea
                                        value={draft.roleDescription}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                roleDescription: e.target.value,
                                            }))
                                        }
                                        rows={2}
                                        placeholder="What this role exists to do..."
                                        className={textareaCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Domain</label>
                                    <textarea
                                        value={draft.roleDomain}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, roleDomain: e.target.value }))
                                        }
                                        rows={2}
                                        placeholder="What this role exclusively controls..."
                                        className={textareaCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Responsibilities</label>
                                    <p className="mb-2 text-[11px] text-slate-500">
                                        Ongoing activities this role is expected to perform. One per
                                        line.
                                    </p>
                                    <textarea
                                        value={draft.roleAccountabilities}
                                        onChange={(e) =>
                                            setDraft((d) => ({
                                                ...d,
                                                roleAccountabilities: e.target.value,
                                            }))
                                        }
                                        rows={4}
                                        placeholder={
                                            "Reviewing governance proposals\nFacilitating the proposal review process\nMaintaining governance records"
                                        }
                                        className={textareaCls}
                                    />
                                </div>
                            </>
                        )}

                        {/* Create / amend policy fields */}
                        {isPolicyAction && (isCreate || draft.changeType === "amend-policy") && (
                            <>
                                <div>
                                    <label className={labelCls}>Policy title</label>
                                    <input
                                        type="text"
                                        value={draft.policyTitle}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, policyTitle: e.target.value }))
                                        }
                                        placeholder="e.g. Meeting attendance policy"
                                        className={inputCls}
                                        autoFocus={isCreate}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Policy body</label>
                                    <textarea
                                        value={draft.policyBody}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, policyBody: e.target.value }))
                                        }
                                        rows={6}
                                        placeholder="The full text of the policy..."
                                        className={textareaCls}
                                    />
                                </div>
                            </>
                        )}

                        {/* Remove confirmation */}
                        {(draft.changeType === "remove-role" ||
                            draft.changeType === "remove-policy") &&
                            draft.existingTargetId && (
                                <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3">
                                    <p className="text-[12px] leading-relaxed text-amber-200/80">
                                        This will remove{" "}
                                        <span className="font-semibold text-amber-200">
                                            {
                                                existingTargets.find(
                                                    (t) => t.id === draft.existingTargetId,
                                                )?.label
                                            }
                                        </span>{" "}
                                        from the circle.
                                    </p>
                                </div>
                            )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-1">
                <button
                    type="button"
                    onClick={() => {
                        const prev = WIZARD_STEPS[stepIndex - 1];
                        if (prev) setWizardStep(prev.id);
                        else onCancel();
                    }}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03]
                        px-4 py-2.5 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06]"
                >
                    <ArrowLeft size={13} />
                    {stepIndex === 0 ? "Cancel" : "Back"}
                </button>
                <div className="flex-1" />
                {wizardStep === "details" ? (
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={!canAdvance}
                        className="flex items-center gap-2 rounded-xl bg-[#3481FF] px-5 py-2.5
                            text-[12px] font-semibold text-white transition-all
                            hover:bg-[#2570f0] active:scale-[0.98]
                            disabled:pointer-events-none disabled:opacity-40"
                    >
                        <Scale size={13} />
                        Create proposal
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => {
                            const next = WIZARD_STEPS[stepIndex + 1];
                            if (next) setWizardStep(next.id);
                        }}
                        disabled={!canAdvance}
                        className="flex items-center gap-2 rounded-xl border border-[#3481FF]/25 bg-[#3481FF]/10
                            px-5 py-2.5 text-[12px] font-semibold text-[#6aabff]
                            transition-colors hover:bg-[#3481FF]/20
                            disabled:pointer-events-none disabled:opacity-30"
                    >
                        Continue
                        <ArrowRight size={13} />
                    </button>
                )}
            </div>
        </motion.div>
    );
}

// ─── Phase Content ───────────────────────────────────────────────────────────

function PhaseContent({
    phaseIndex,
    participants,
    agendaItems,
    selectedAgendaItem,
    onSelectAgendaItem,
    linkedProposal,
    linkedElection,
    linkedObjections,
    linkedNominations,
    partnerMap,
    governanceMeetingAddress,
    isTxPending,
    onLinkProposal,
    showWizard,
    onShowWizard,
    wizardProps,
    pendingActions,
    onRemovePendingAction,
}: {
    phaseIndex: number;
    participants: string[];
    agendaItems: { id: string; label: string; type: string; status: string }[];
    selectedAgendaItem: {
        id: string;
        label: string;
        type: string;
        status: string;
        proposalId?: string;
        electionId?: string;
    } | null;
    onSelectAgendaItem: (id: string) => void;
    linkedProposal: {
        id: string;
        content: { title: string; summary: string };
        tension: string;
        example: string;
    } | null;
    linkedElection: {
        targetRoleLabel: string;
        status: string;
        proposedCandidateId?: string;
        nominationIds: string[];
    } | null;
    linkedObjections: { id: string; objectorId: string; status: string; concern: string }[];
    linkedNominations: {
        id: string;
        candidateId: string;
        nominatorId: string;
        reason: string;
        changed?: boolean;
        changedTo?: string;
    }[];
    partnerMap: Record<string, { name: string }>;
    governanceMeetingAddress?: `0x${string}`;
    isTxPending: boolean;
    onLinkProposal: (proposalId: string) => void;
    showWizard: boolean;
    onShowWizard: () => void;
    wizardProps: React.ReactNode;
    pendingActions: PendingGovernanceAction[];
    onRemovePendingAction: (id: string) => void;
}) {
    const phase = GOVERNANCE_PHASES[phaseIndex];
    const [idmSubStep, setIdmSubStep] = useState(0);

    return (
        <motion.div
            key={phase.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.3, ease: EXPO }}
            className="space-y-4"
        >
            <p className="text-[13px] leading-relaxed text-slate-400">{phase.description}</p>

            {/* ── Check-in ── */}
            {phase.id === "check-in" && (
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        Participants ({participants.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {participants.map((pid) => (
                            <span
                                key={pid}
                                className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[12px] text-slate-300"
                            >
                                <div className="h-5 w-5 rounded-full bg-white/[0.08]" />
                                {partnerMap[pid]?.name ?? pid}
                            </span>
                        ))}
                    </div>
                    <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                        <p className="text-[12px] leading-relaxed text-slate-400">
                            The facilitator invites each participant to share a brief word on how
                            they arrive. No cross-talk, just listening.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Agenda building & processing ── */}
            {phase.id === "agenda-processing" && (
                <div className="space-y-5">
                    <AnimatePresence mode="wait">
                        {showWizard ? (
                            wizardProps
                        ) : (
                            <motion.div
                                key="agenda-list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-5"
                            >
                                {/* New proposal button */}
                                <button
                                    type="button"
                                    onClick={onShowWizard}
                                    className="flex w-full items-center gap-3 rounded-xl border border-dashed border-[#3481FF]/25
                                        bg-[#3481FF]/[0.04] px-4 py-3 text-left
                                        text-[13px] font-medium text-[#6aabff]
                                        transition-colors hover:border-[#3481FF]/40 hover:bg-[#3481FF]/[0.08]"
                                >
                                    <Plus size={15} strokeWidth={1.75} />
                                    Build a new proposal
                                    <ChevronRight size={14} className="ml-auto" />
                                </button>

                                {/* Agenda items */}
                                <div>
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                            Agenda items
                                        </p>
                                        <span className="text-[11px] text-slate-600">
                                            {agendaItems.length} items
                                        </span>
                                    </div>
                                    {agendaItems.length > 0 ? (
                                        <div className="space-y-2">
                                            {agendaItems.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => onSelectAgendaItem(item.id)}
                                                    className={`w-full rounded-xl border px-4 py-3.5 text-left transition-colors ${
                                                        selectedAgendaItem?.id === item.id
                                                            ? "border-[#3481FF]/30 bg-[#3481FF]/[0.06]"
                                                            : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.1] hover:bg-white/[0.05]"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                                {item.type === "proposal" ? (
                                                                    <ScrollText size={11} />
                                                                ) : (
                                                                    <Vote size={11} />
                                                                )}
                                                                {item.type}
                                                            </div>
                                                            <div className="mt-1.5 text-[13px] font-medium text-white">
                                                                {item.label}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                                                agendaStatusClassNames[
                                                                    item.status as keyof typeof agendaStatusClassNames
                                                                ] ?? agendaStatusClassNames.pending
                                                            }`}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-5 py-8 text-center">
                                            <Scale
                                                size={20}
                                                className="mx-auto mb-3 text-slate-700"
                                                strokeWidth={1.5}
                                            />
                                            <p className="text-[12px] text-slate-600">
                                                No agenda items yet. Build a proposal above to get
                                                started.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* IDM process for selected item */}
                                {selectedAgendaItem && (
                                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                        <div className="flex items-center gap-2 mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6aabff]">
                                            <Scale size={13} />
                                            Integrative Decision Making
                                        </div>
                                        <IdmSubSteps activeSubStep={idmSubStep} />
                                        <div className="mt-4 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setIdmSubStep((s) => Math.max(s - 1, 0))
                                                }
                                                disabled={idmSubStep === 0}
                                                className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03]
                                                    px-3 py-1.5 text-[11px] font-semibold text-slate-400
                                                    transition-colors hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-30"
                                            >
                                                <ArrowLeft size={11} />
                                                Back
                                            </button>
                                            <div className="flex-1" />
                                            {idmSubStep < REVIEW_STEPS.length - 1 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setIdmSubStep((s) => s + 1)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-[#3481FF]/25 bg-[#3481FF]/10
                                                        px-3 py-1.5 text-[11px] font-semibold text-[#6aabff]
                                                        transition-colors hover:bg-[#3481FF]/20"
                                                >
                                                    Next step
                                                    <ArrowRight size={11} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setIdmSubStep(0)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15
                                                        px-3 py-1.5 text-[11px] font-semibold text-emerald-300
                                                        transition-colors hover:bg-emerald-500/25"
                                                >
                                                    <Check size={11} />
                                                    Item complete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Linked proposal detail */}
                                {linkedProposal && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Proposal
                                                </div>
                                                {governanceMeetingAddress && (
                                                    <button
                                                        type="button"
                                                        disabled={isTxPending}
                                                        onClick={() =>
                                                            onLinkProposal(linkedProposal.id)
                                                        }
                                                        className="flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10
                                                            px-2.5 py-1 text-[10px] font-semibold text-violet-300
                                                            transition-colors hover:bg-violet-500/20 disabled:opacity-60 disabled:pointer-events-none"
                                                    >
                                                        {isTxPending ? (
                                                            <Loader2
                                                                size={10}
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <Scale size={10} />
                                                        )}
                                                        Link on-chain
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-2 text-[15px] font-semibold text-white">
                                                {linkedProposal.content.title}
                                            </div>
                                            <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
                                                {linkedProposal.content.summary}
                                            </p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Issue
                                                </div>
                                                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-200">
                                                    {linkedProposal.tension}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Example
                                                </div>
                                                <p className="mt-1.5 text-[12px] leading-relaxed text-slate-200">
                                                    {linkedProposal.example}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                                            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                <ShieldAlert size={12} />
                                                Challenges
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {linkedObjections.length > 0 ? (
                                                    linkedObjections.map((obj) => (
                                                        <div
                                                            key={obj.id}
                                                            className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                                                        >
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="text-[12px] font-medium text-white">
                                                                    {partnerMap[obj.objectorId]
                                                                        ?.name ?? obj.objectorId}
                                                                </div>
                                                                <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                                    {obj.status}
                                                                </span>
                                                            </div>
                                                            <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
                                                                {obj.concern}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-4 text-[12px] text-slate-500">
                                                        No objections raised.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Linked election detail */}
                                {linkedElection && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                Election
                                            </div>
                                            <div className="mt-2 text-[15px] font-semibold text-white">
                                                {linkedElection.targetRoleLabel}
                                            </div>
                                            <p className="mt-2 text-[12px] text-slate-300">
                                                Stage: {linkedElection.status.replace("-", " ")}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                Proposed candidate
                                            </div>
                                            <div className="mt-2 text-[13px] font-medium text-white">
                                                {linkedElection.proposedCandidateId
                                                    ? (partnerMap[
                                                          linkedElection.proposedCandidateId
                                                      ]?.name ?? linkedElection.proposedCandidateId)
                                                    : "Awaiting facilitator proposal"}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                    Nominations
                                                </div>
                                                <span className="text-[11px] text-slate-600">
                                                    {linkedNominations.length}
                                                </span>
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {linkedNominations.map((nom) => (
                                                    <div
                                                        key={nom.id}
                                                        className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="text-[12px] font-medium text-white">
                                                                {partnerMap[nom.candidateId]
                                                                    ?.name ?? nom.candidateId}
                                                            </span>
                                                            <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                                                by{" "}
                                                                {partnerMap[nom.nominatorId]
                                                                    ?.name ?? nom.nominatorId}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-[12px] leading-relaxed text-slate-300">
                                                            {nom.reason}
                                                        </p>
                                                        {nom.changed && nom.changedTo && (
                                                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#6aabff]">
                                                                <ChevronRight size={12} />
                                                                Changed to{" "}
                                                                {partnerMap[nom.changedTo]?.name ??
                                                                    nom.changedTo}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Closing round ── */}
            {phase.id === "closing-round" && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            {
                                label: "Actions",
                                value: pendingActions.length,
                                color: "text-[#3481FF]",
                            },
                            {
                                label: "Agenda",
                                value: agendaItems.length,
                                color: "text-amber-400",
                            },
                            {
                                label: "Participants",
                                value: participants.length,
                                color: "text-emerald-400",
                            },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-center"
                            >
                                <p className={`text-[22px] font-bold tabular-nums ${s.color}`}>
                                    {s.value}
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    {s.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Pending on-chain actions */}
                    {pendingActions.length > 0 && (
                        <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                Queued on-chain actions
                            </p>
                            <div className="space-y-1.5">
                                {pendingActions.map((action) => {
                                    const opt = CHANGE_TYPE_OPTIONS.find(
                                        (o) => o.value === action.changeType,
                                    );
                                    const Icon = opt?.icon ?? Plus;
                                    return (
                                        <div
                                            key={action.id}
                                            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5"
                                        >
                                            <Icon
                                                size={13}
                                                className="shrink-0 text-[#6aabff]"
                                                strokeWidth={1.75}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[12px] font-medium text-white">
                                                    {action.label}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => onRemovePendingAction(action.id)}
                                                className="shrink-0 rounded-full p-1 text-slate-600 transition-colors hover:text-slate-300"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4">
                        <p className="text-[12px] leading-relaxed text-slate-400">
                            {pendingActions.length > 0
                                ? `Completing the meeting will submit ${pendingActions.length} governance action${pendingActions.length > 1 ? "s" : ""} on-chain in a single batch transaction.`
                                : "Take a moment to share closing reflections. Once everyone has spoken, the facilitator can complete the meeting to record it on-chain."}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ─── Meeting History List ────────────────────────────────────────────────────

function GovernanceMeetingHistoryList({
    meetings,
    circleMap,
    partnerMap,
    currentMeetingId,
    onOpen,
}: {
    meetings: GovernanceMeeting[];
    circleMap: Record<string, { title: string }>;
    partnerMap: Record<string, { name: string }>;
    currentMeetingId: string | null;
    onOpen: (meeting: GovernanceMeeting) => void;
}) {
    const inProgress = meetings.filter((m) => !m.completedAt && m.id !== currentMeetingId);
    const completed = meetings.filter((m) => m.completedAt !== null);

    return (
        <div className="space-y-6">
            <section>
                <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#3481FF] shadow-[0_0_8px_rgba(52,129,255,0.5)]" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        In progress
                    </h4>
                    {inProgress.length > 0 && (
                        <span className="rounded-full bg-[#3481FF]/15 px-2 py-0.5 text-[10px] font-bold text-[#6aabff]">
                            {inProgress.length}
                        </span>
                    )}
                </div>
                {inProgress.length > 0 ? (
                    <div className="space-y-2">
                        {inProgress.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => onOpen(m)}
                                className="group flex w-full items-center gap-3 rounded-xl border border-[#3481FF]/15 bg-[#3481FF]/[0.04] px-4 py-3 text-left transition-colors hover:border-[#3481FF]/30 hover:bg-[#3481FF]/[0.08]"
                            >
                                <Scale
                                    size={14}
                                    className="shrink-0 text-[#3481FF]"
                                    strokeWidth={2}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-white">
                                        Governance Meeting #{m.meetingId}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                        {circleMap[m.circleId]?.title ?? `Circle ${m.circleId}`} ·{" "}
                                        Convened by{" "}
                                        {partnerMap[m.convenedBy]?.name ??
                                            `${m.convenedBy.slice(0, 6)}...${m.convenedBy.slice(-4)}`}
                                    </p>
                                </div>
                                <span className="text-[11px] font-semibold text-[#6aabff] opacity-0 transition-opacity group-hover:opacity-100">
                                    Resume
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[12px] text-slate-600">
                        No governance meetings in progress.
                    </div>
                )}
            </section>
            <section>
                <div className="mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Completed
                    </h4>
                    <span className="text-[11px] text-slate-700">{completed.length}</span>
                </div>
                {completed.length > 0 ? (
                    <div className="space-y-2">
                        {completed.slice(0, 8).map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => onOpen(m)}
                                className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
                            >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500/10">
                                    <Check
                                        size={11}
                                        className="text-emerald-400"
                                        strokeWidth={2.5}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-slate-300">
                                        Governance Meeting #{m.meetingId}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-600">
                                        {circleMap[m.circleId]?.title ?? `Circle ${m.circleId}`} ·{" "}
                                        {m.completedAt
                                            ? shortDateFmt.format(
                                                  new Date(Number(m.completedAt) * 1000),
                                              )
                                            : ""}
                                    </p>
                                </div>
                                <ChevronRight
                                    size={14}
                                    className="shrink-0 text-slate-700 transition-colors group-hover:text-slate-400"
                                />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[12px] text-slate-600">
                        No completed governance meetings yet.
                    </div>
                )}
            </section>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GovernanceMeetingRoom({
    governanceMeetingAddress,
    indexedGovernanceMeetings,
    orgId,
}: {
    governanceMeetingAddress?: `0x${string}`;
    indexedGovernanceMeetings?: GovernanceMeeting[];
    orgId?: string;
}) {
    const { data: walletClient } = useWalletClient();
    const {
        activeGovernanceMeeting,
        authenticatedWalletAddress,
        circleMap,
        closeGovernanceMeeting,
        createGovernanceProposal,
        partnerMap,
        setGovernanceMeetingPhase,
        snapshot,
    } = useWorkspaceSnapshot();
    const { completeMeeting: completeMeetingOnChain, linkProposal } = useGovernanceMeeting();

    const [activePhaseIndex, setActivePhaseIndex] = useState(0);
    const [drawerTab, setDrawerTab] = useState<DrawerTab>("meeting");
    const [selectedAgendaItemId, setSelectedAgendaItemId] = useState<string | null>(null);
    const [isTxPending, setIsTxPending] = useState(false);
    const [txError, setTxError] = useState<string | null>(null);

    // Proposal wizard state
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState<ProposalWizardStep>("action");
    const initialCircleId = snapshot.circles[0]?.id ?? "";
    const initialRoleId = snapshot.roles.find((r) => r.circleId === initialCircleId)?.id ?? "";
    const [proposalDraft, setProposalDraft] = useState<ProposalDraft>(() =>
        buildEmptyDraft(initialCircleId, initialRoleId),
    );

    // Pending governance actions — batched on meeting completion
    const [pendingActions, setPendingActions] = useState<PendingGovernanceAction[]>([]);

    const removePendingAction = useCallback((id: string) => {
        setPendingActions((prev) => prev.filter((a) => a.id !== id));
    }, []);

    // Reset phase when meeting changes
    const meetingId = activeGovernanceMeeting?.id ?? null;
    useEffect(() => {
        if (!meetingId || !activeGovernanceMeeting) return;
        const phaseMap: Record<string, number> = {
            "check-in": 0,
            "agenda-processing": 1,
            "closing-round": 2,
        };
        setActivePhaseIndex(phaseMap[activeGovernanceMeeting.phase] ?? 0);
        setDrawerTab("meeting");
        setSelectedAgendaItemId(null);
        setShowWizard(false);
        setPendingActions([]);
    }, [meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

    const activePhase = GOVERNANCE_PHASES[activePhaseIndex];
    const isFirstPhase = activePhaseIndex === 0;
    const isLastPhase = activePhaseIndex === GOVERNANCE_PHASES.length - 1;

    const goNext = useCallback(() => {
        setActivePhaseIndex((i) => {
            const next = Math.min(i + 1, GOVERNANCE_PHASES.length - 1);
            if (activeGovernanceMeeting)
                setGovernanceMeetingPhase(activeGovernanceMeeting.id, GOVERNANCE_PHASES[next].id);
            return next;
        });
    }, [activeGovernanceMeeting, setGovernanceMeetingPhase]);

    const goBack = useCallback(() => {
        setActivePhaseIndex((i) => {
            const prev = Math.max(i - 1, 0);
            if (activeGovernanceMeeting)
                setGovernanceMeetingPhase(activeGovernanceMeeting.id, GOVERNANCE_PHASES[prev].id);
            return prev;
        });
    }, [activeGovernanceMeeting, setGovernanceMeetingPhase]);

    const handleSelectPhase = useCallback(
        (i: number) => {
            setActivePhaseIndex(i);
            if (activeGovernanceMeeting)
                setGovernanceMeetingPhase(activeGovernanceMeeting.id, GOVERNANCE_PHASES[i].id);
        },
        [activeGovernanceMeeting, setGovernanceMeetingPhase],
    );

    const handleCompleteMeeting = useCallback(async () => {
        if (!activeGovernanceMeeting) return;

        const hasOnChain = governanceMeetingAddress && authenticatedWalletAddress;

        if (!hasOnChain) {
            closeGovernanceMeeting();
            return;
        }

        setIsTxPending(true);
        setTxError(null);

        try {
            const walletAddr = authenticatedWalletAddress as `0x${string}`;
            const onChainId =
                activeGovernanceMeeting.onChainMeetingId ?? activeGovernanceMeeting.id;
            const meetingIdBigInt = /^\d+$/.test(onChainId) ? BigInt(onChainId) : BigInt(0);
            const orgIdForMeeting = BigInt(orgId ?? activeGovernanceMeeting.orgId ?? "0");
            const meetingKindGovernance = 1;

            // Build governance execution calls from adopted proposals
            const calls: { to: `0x${string}`; data: `0x${string}` }[] = [];

            for (const action of pendingActions) {
                const call = buildGovernanceCall(action, governanceMeetingAddress, orgIdForMeeting);
                if (call) calls.push(call);
            }

            // End the meeting after all governance changes are executed
            calls.push({
                to: governanceMeetingAddress,
                data: encodeFunctionData({
                    abi: meetingFactoryAbi,
                    functionName: "endMeeting",
                    args: [meetingIdBigInt, orgIdForMeeting, meetingKindGovernance],
                }),
            });

            let batched = false;
            if (walletClient) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (walletClient as any).request({
                        method: "wallet_sendCalls",
                        params: [
                            {
                                version: "1",
                                from: walletAddr,
                                calls: calls.map((c) => ({ to: c.to, data: c.data })),
                            },
                        ],
                    });
                    batched = true;
                } catch {
                    // wallet doesn't support wallet_sendCalls
                }
            }

            if (!batched) {
                // Execute governance actions + endMeeting sequentially
                for (const call of calls) {
                    await walletClient!.sendTransaction({
                        to: call.to,
                        data: call.data,
                        account: walletAddr,
                        chain: undefined,
                    });
                }
            }

            setPendingActions([]);
        } catch (err) {
            setTxError(err instanceof Error ? err.message : "Failed to complete meeting");
            setIsTxPending(false);
            return;
        }
        setIsTxPending(false);
        closeGovernanceMeeting();
    }, [
        activeGovernanceMeeting,
        authenticatedWalletAddress,
        closeGovernanceMeeting,
        governanceMeetingAddress,
        orgId,
        pendingActions,
        walletClient,
    ]);

    const handleLinkProposal = useCallback(
        async (proposalId: string) => {
            if (
                !activeGovernanceMeeting ||
                !governanceMeetingAddress ||
                !authenticatedWalletAddress
            )
                return;
            setIsTxPending(true);
            setTxError(null);
            try {
                await linkProposal({
                    governanceMeetingAddress,
                    meetingId: BigInt(
                        activeGovernanceMeeting.onChainMeetingId ?? activeGovernanceMeeting.id,
                    ),
                    orgId: BigInt(orgId ?? activeGovernanceMeeting.orgId ?? "0"),
                    proposalId: BigInt(proposalId),
                    walletAddress: authenticatedWalletAddress as `0x${string}`,
                });
            } catch (err) {
                setTxError(err instanceof Error ? err.message : "Failed to link proposal");
            } finally {
                setIsTxPending(false);
            }
        },
        [
            activeGovernanceMeeting,
            authenticatedWalletAddress,
            governanceMeetingAddress,
            linkProposal,
        ],
    );

    const handleSubmitProposal = useCallback(() => {
        if (!activeGovernanceMeeting) return;

        const isRoleAction = proposalDraft.changeType.includes("role");
        const isPolicyAction = proposalDraft.changeType.includes("policy");
        const isCreate =
            proposalDraft.changeType === "create-role" ||
            proposalDraft.changeType === "create-policy";

        let targetId: string;
        let title: string;
        let summary: string;
        let payload: string;

        const changeLabel =
            CHANGE_TYPE_OPTIONS.find((o) => o.value === proposalDraft.changeType)?.label ??
            proposalDraft.changeType;

        if (isCreate && isRoleAction) {
            targetId = proposalDraft.roleName.trim().toLowerCase().replace(/\s+/g, "-");
            title = proposalDraft.roleName.trim();
            summary = proposalDraft.roleDescription.trim() || `New role: ${title}`;
            payload =
                [
                    proposalDraft.roleDomain && `Domain: ${proposalDraft.roleDomain}`,
                    proposalDraft.roleAccountabilities &&
                        `Accountabilities:\n${proposalDraft.roleAccountabilities}`,
                ]
                    .filter(Boolean)
                    .join("\n\n") || summary;
        } else if (isCreate && isPolicyAction) {
            targetId = proposalDraft.policyTitle.trim().toLowerCase().replace(/\s+/g, "-");
            title = proposalDraft.policyTitle.trim();
            summary = proposalDraft.policyBody.trim().slice(0, 200) || `New policy: ${title}`;
            payload = proposalDraft.policyBody.trim() || summary;
        } else {
            targetId = proposalDraft.existingTargetId;
            const target = isRoleAction
                ? snapshot.roles.find((r) => r.id === targetId)
                : snapshot.policies.find((p) => p.id === targetId);
            title = target ? ("title" in target ? target.title : "") : targetId;
            summary =
                proposalDraft.roleDescription ||
                proposalDraft.policyBody ||
                `${changeLabel}: ${title}`;
            payload = proposalDraft.roleAccountabilities || proposalDraft.policyBody || summary;
        }

        createGovernanceProposal({
            circleId: proposalDraft.circleId,
            proposerRoleId: proposalDraft.proposerRoleId,
            tension: "",
            example: "",
            explanation: "",
            content: {
                type: proposalDraft.changeType,
                targetId,
                title,
                summary,
                payload,
                destinationCircleId:
                    proposalDraft.changeType === "move-role"
                        ? proposalDraft.destinationCircleId || undefined
                        : undefined,
            },
            meetingId: activeGovernanceMeeting.id,
        });

        // Queue the on-chain action for batched execution at meeting completion
        const actionLabel = `${changeLabel}: ${title}`;

        setPendingActions((prev) => [
            ...prev,
            {
                id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                changeType: proposalDraft.changeType,
                label: actionLabel,
                circleId: proposalDraft.circleId,
                roleName: proposalDraft.roleName || undefined,
                roleDescription: proposalDraft.roleDescription || undefined,
                roleDomain: proposalDraft.roleDomain || undefined,
                roleAccountabilities: proposalDraft.roleAccountabilities || undefined,
                policyTitle: proposalDraft.policyTitle || undefined,
                policyBody: proposalDraft.policyBody || undefined,
                existingTargetId: proposalDraft.existingTargetId || undefined,
                destinationCircleId: proposalDraft.destinationCircleId || undefined,
            },
        ]);

        setShowWizard(false);
        setWizardStep("action");
        setProposalDraft(buildEmptyDraft(initialCircleId, initialRoleId));
    }, [
        activeGovernanceMeeting,
        createGovernanceProposal,
        initialCircleId,
        initialRoleId,
        proposalDraft,
        snapshot.policies,
        snapshot.roles,
    ]);

    const agendaItems = useMemo(
        () =>
            activeGovernanceMeeting
                ? snapshot.governanceAgendaItems.filter(
                      (item) => item.meetingId === activeGovernanceMeeting.id,
                  )
                : [],
        [activeGovernanceMeeting, snapshot.governanceAgendaItems],
    );

    const resolvedSelectedAgendaItemId =
        selectedAgendaItemId && agendaItems.some((item) => item.id === selectedAgendaItemId)
            ? selectedAgendaItemId
            : (agendaItems.find((item) => item.status === "processing")?.id ??
              agendaItems[0]?.id ??
              null);
    const selectedAgendaItem =
        agendaItems.find((item) => item.id === resolvedSelectedAgendaItemId) ??
        agendaItems[0] ??
        null;

    const linkedProposal = selectedAgendaItem?.proposalId
        ? (snapshot.governanceProposals.find((p) => p.id === selectedAgendaItem.proposalId) ?? null)
        : null;
    const linkedElection = selectedAgendaItem?.electionId
        ? (snapshot.governanceElections.find((e) => e.id === selectedAgendaItem.electionId) ?? null)
        : null;
    const linkedObjections = linkedProposal
        ? snapshot.governanceObjections.filter((o) => o.proposalId === linkedProposal.id)
        : [];
    const linkedNominations = linkedElection
        ? snapshot.governanceNominations.filter((n) => linkedElection.nominationIds.includes(n.id))
        : [];

    // Mapped data for the wizard
    const circlesForWizard = useMemo(
        () => snapshot.circles.map((c) => ({ id: c.id, title: c.title })),
        [snapshot.circles],
    );
    const rolesForWizard = useMemo(
        () =>
            snapshot.roles.map((r) => ({
                id: r.id,
                title: r.title,
                circleId: r.circleId,
                summary: r.summary,
            })),
        [snapshot.roles],
    );
    const policiesForWizard = useMemo(
        () =>
            snapshot.policies.map((p) => ({
                id: p.id,
                title: p.title,
                circleId: p.circleId,
                summary: p.summary,
            })),
        [snapshot.policies],
    );

    return (
        <AnimatePresence>
            {activeGovernanceMeeting && (
                <motion.div
                    className="fixed inset-0 z-[72] bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeGovernanceMeeting}
                >
                    <motion.aside
                        className="absolute inset-y-0 right-0 flex w-full max-w-[720px] flex-col border-l border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0a0a0f] text-slate-900 dark:text-slate-100 shadow-[0_0_80px_rgba(0,0,0,0.08)] dark:shadow-[0_0_80px_rgba(0,0,0,0.6)]"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={panelTransition}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ── Header ── */}
                        <div className="shrink-0 border-b border-white/[0.05] px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-[#3481FF]/25 bg-[#3481FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6aabff]">
                                            Governance room
                                        </span>
                                        <span
                                            className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusStyles[activeGovernanceMeeting.status]}`}
                                        >
                                            {activeGovernanceMeeting.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <h2 className="mt-3 truncate text-[22px] font-bold tracking-[-0.03em] text-white">
                                        {activeGovernanceMeeting.title}
                                    </h2>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                                        <span className="inline-flex items-center gap-1.5">
                                            <CalendarDays size={12} />
                                            {formatMeetingDate(activeGovernanceMeeting.scheduledAt)}
                                        </span>
                                        <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                            {activePhase?.label}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeGovernanceMeeting}
                                    className="rounded-full border border-white/[0.07] p-2 text-slate-500 transition-colors hover:border-white/[0.14] hover:text-slate-300"
                                    aria-label="Close"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Metadata strip */}
                            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                                <span className="text-slate-600">
                                    <span className="text-slate-500">Circle</span>{" "}
                                    <span className="font-medium text-slate-300">
                                        {circleMap[activeGovernanceMeeting.circleId]?.title ??
                                            "Unassigned"}
                                    </span>
                                </span>
                                <span className="text-white/[0.06]">|</span>
                                <span className="text-slate-600">
                                    <span className="text-slate-500">Facilitator</span>{" "}
                                    <span className="font-medium text-slate-300">
                                        {partnerMap[activeGovernanceMeeting.facilitatorId]?.name ??
                                            activeGovernanceMeeting.facilitatorId}
                                    </span>
                                </span>
                                <span className="text-white/[0.06]">|</span>
                                <span className="text-slate-600">
                                    <span className="text-slate-500">Secretary</span>{" "}
                                    <span className="font-medium text-slate-300">
                                        {partnerMap[activeGovernanceMeeting.secretaryId]?.name ??
                                            activeGovernanceMeeting.secretaryId}
                                    </span>
                                </span>
                                <span className="text-white/[0.06]">|</span>
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                    <Users size={11} />
                                    <span className="font-medium text-slate-300">
                                        {activeGovernanceMeeting.participantIds.length}
                                    </span>
                                </span>
                            </div>

                            {/* Tab switcher */}
                            <div className="mt-5 flex items-center gap-px rounded-full border border-white/[0.06] bg-white/[0.03] p-[3px] w-fit">
                                {(
                                    [
                                        {
                                            id: "meeting" as DrawerTab,
                                            label: "Meeting",
                                            icon: Scale,
                                        },
                                        {
                                            id: "history" as DrawerTab,
                                            label: "History",
                                            icon: CalendarDays,
                                        },
                                    ] as const
                                ).map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setDrawerTab(t.id)}
                                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                                            drawerTab === t.id
                                                ? "bg-white/[0.08] text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-300"
                                        }`}
                                    >
                                        <t.icon size={11} strokeWidth={2} />
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Body ── */}
                        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6">
                            <AnimatePresence mode="wait">
                                {drawerTab === "meeting" ? (
                                    <motion.div
                                        key="meeting"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-6"
                                    >
                                        <PhaseStepper
                                            activeIndex={activePhaseIndex}
                                            onSelect={handleSelectPhase}
                                        />

                                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                            <AnimatePresence mode="wait">
                                                <PhaseContent
                                                    phaseIndex={activePhaseIndex}
                                                    participants={
                                                        activeGovernanceMeeting.participantIds
                                                    }
                                                    agendaItems={agendaItems}
                                                    selectedAgendaItem={selectedAgendaItem}
                                                    onSelectAgendaItem={setSelectedAgendaItemId}
                                                    linkedProposal={linkedProposal}
                                                    linkedElection={linkedElection}
                                                    linkedObjections={linkedObjections}
                                                    linkedNominations={linkedNominations}
                                                    partnerMap={partnerMap}
                                                    governanceMeetingAddress={
                                                        governanceMeetingAddress
                                                    }
                                                    isTxPending={isTxPending}
                                                    onLinkProposal={handleLinkProposal}
                                                    showWizard={showWizard}
                                                    onShowWizard={() => {
                                                        setProposalDraft(
                                                            buildEmptyDraft(
                                                                activeGovernanceMeeting.circleId ||
                                                                    initialCircleId,
                                                                snapshot.roles.find(
                                                                    (r) =>
                                                                        r.circleId ===
                                                                        (activeGovernanceMeeting.circleId ||
                                                                            initialCircleId),
                                                                )?.id ?? initialRoleId,
                                                            ),
                                                        );
                                                        setWizardStep("action");
                                                        setShowWizard(true);
                                                    }}
                                                    wizardProps={
                                                        <ProposalWizard
                                                            draft={proposalDraft}
                                                            setDraft={setProposalDraft}
                                                            wizardStep={wizardStep}
                                                            setWizardStep={setWizardStep}
                                                            onSubmit={handleSubmitProposal}
                                                            onCancel={() => {
                                                                setShowWizard(false);
                                                                setWizardStep("action");
                                                            }}
                                                            circles={circlesForWizard}
                                                            roles={rolesForWizard}
                                                            policies={policiesForWizard}
                                                        />
                                                    }
                                                    pendingActions={pendingActions}
                                                    onRemovePendingAction={removePendingAction}
                                                />
                                            </AnimatePresence>
                                        </div>

                                        {/* Phase navigation */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={goBack}
                                                disabled={isFirstPhase}
                                                className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03]
                                                    px-4 py-2.5 text-[12px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06]
                                                    disabled:pointer-events-none disabled:opacity-30"
                                            >
                                                <ArrowLeft size={13} />
                                                Back
                                            </button>
                                            <div className="flex-1" />
                                            {isLastPhase ? (
                                                <button
                                                    type="button"
                                                    disabled={isTxPending}
                                                    onClick={handleCompleteMeeting}
                                                    className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/15
                                                        px-5 py-2.5 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25
                                                        disabled:pointer-events-none disabled:opacity-50"
                                                >
                                                    {isTxPending ? (
                                                        <Loader2
                                                            size={13}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <Check size={13} />
                                                    )}
                                                    {isTxPending
                                                        ? "Completing..."
                                                        : "Complete meeting"}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={goNext}
                                                    className="flex items-center gap-2 rounded-xl border border-[#3481FF]/25 bg-[#3481FF]/10
                                                        px-5 py-2.5 text-[12px] font-semibold text-[#6aabff] transition-colors hover:bg-[#3481FF]/20"
                                                >
                                                    Next phase
                                                    <ArrowRight size={13} />
                                                </button>
                                            )}
                                        </div>

                                        {txError && (
                                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.08] px-4 py-2.5 text-[12px] text-rose-400">
                                                {txError}
                                            </div>
                                        )}

                                        {/* Guardrails */}
                                        {(activeGovernanceMeeting.intention ||
                                            activeGovernanceMeeting.limits) && (
                                            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                    <ScrollText size={13} />
                                                    Meeting guardrails
                                                </div>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                    {activeGovernanceMeeting.intention && (
                                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                                                Intention
                                                            </div>
                                                            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-200">
                                                                {activeGovernanceMeeting.intention}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {activeGovernanceMeeting.limits && (
                                                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                                                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                                                Limits
                                                            </div>
                                                            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-200">
                                                                {activeGovernanceMeeting.limits}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="history"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <GovernanceMeetingHistoryList
                                            meetings={indexedGovernanceMeetings ?? []}
                                            circleMap={circleMap}
                                            partnerMap={partnerMap}
                                            currentMeetingId={activeGovernanceMeeting.id}
                                            onOpen={() => setDrawerTab("meeting")}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.aside>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
