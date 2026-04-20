import { motion } from "framer-motion";
import { CheckSquare, KanbanSquare, Plus, Target, TrendingUp } from "lucide-react";
import { useState } from "react";

import type { MeetingOutput, TacticalMeeting } from "../hooks/useTacticalMeetingsFromIndexer";
import { quarterFromDate, useOrgOkrs } from "../hooks/useOrgOkrs";
import { useMetricsByContract } from "../hooks/useRoleData";
import { useRolesFromIndexer } from "../hooks/useRolesFromIndexer";
import OkrProposalComposer from "./OkrProposalComposer";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

function truncateAddress(addr: string): string {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

type Props = {
    outputs: MeetingOutput[];
    meetings: TacticalMeeting[];
    orgId?: string;
    roleRegistryAddress?: `0x${string}`;
    roleDataRegistryAddress?: `0x${string}`;
    meetingFactoryAddress?: `0x${string}`;
};

export default function ActionItemsView({
    outputs,
    meetings,
    orgId,
    roleRegistryAddress,
    roleDataRegistryAddress,
    meetingFactoryAddress,
}: Props) {
    const [isOkrComposerOpen, setIsOkrComposerOpen] = useState(false);
    const canProposeOkrs = Boolean(orgId && roleRegistryAddress && meetingFactoryAddress);
    const nextActions = outputs.filter((o) => o.outputType === 0);
    const projects = outputs.filter((o) => o.outputType === 1);

    const meetingMap = new Map(meetings.map((m) => [m.meetingId, m]));

    const { data: metrics = [] } = useMetricsByContract(roleDataRegistryAddress);
    const { roles: indexedRoles } = useRolesFromIndexer(orgId ?? null);
    const roleNameById = new Map(indexedRoles.map((r) => [r.roleId.toString(), r.name]));

    const currentQuarter = quarterFromDate(new Date());
    const { data: okrsByRole = [] } = useOrgOkrs({
        roleRegistryAddress,
        orgId: orgId ? BigInt(orgId) : undefined,
        circleId: undefined,
        quarter: currentQuarter,
    });
    const totalOkrCount = okrsByRole.reduce((sum, r) => sum + r.objectives.length, 0);

    return (
        <div className="min-h-[calc(100dvh-60px)] pb-32 pt-8">
            <div className="mx-auto max-w-[900px] px-5 sm:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EXPO }}
                    className="mb-10"
                >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Actions
                    </p>
                    <h1 className="text-[2rem] font-bold leading-none tracking-[-0.03em] text-slate-900 dark:text-white">
                        Operational work
                    </h1>
                    <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-slate-400">
                        Next actions, projects, OKRs, and metrics — the concrete output of every
                        team sync.
                    </p>
                </motion.div>

                {/* 2 × 2 grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Next actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.06, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <CheckSquare size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Next actions
                            </p>
                            {nextActions.length > 0 && (
                                <span className="ml-auto font-mono text-[11px] text-slate-500">
                                    {nextActions.length}
                                </span>
                            )}
                        </div>
                        {nextActions.length > 0 ? (
                            <ul className="space-y-1.5">
                                {nextActions.slice(0, 8).map((output) => (
                                    <li
                                        key={output.id}
                                        className="flex items-start gap-2.5 rounded-xl
                                            border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5"
                                    >
                                        <div
                                            className="mt-[3px] h-3 w-3 shrink-0 rounded-full
                                            border border-slate-600 bg-transparent"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] leading-snug text-slate-300">
                                                {output.description}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {output.assignedTo !==
                                                    "0x0000000000000000000000000000000000000000" && (
                                                    <span className="text-[10px] text-slate-500">
                                                        {truncateAddress(output.assignedTo)}
                                                    </span>
                                                )}
                                                {meetingMap.has(output.meetingId) && (
                                                    <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                                        Meeting #{output.meetingId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={CheckSquare}
                                text="No open actions. Start a team sync to capture next steps."
                            />
                        )}
                    </motion.div>

                    {/* Projects */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <KanbanSquare size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Projects
                            </p>
                            {projects.length > 0 && (
                                <span className="ml-auto font-mono text-[11px] text-slate-500">
                                    {projects.length}
                                </span>
                            )}
                        </div>
                        {projects.length > 0 ? (
                            <ul className="space-y-1.5">
                                {projects.slice(0, 6).map((output) => (
                                    <li
                                        key={output.id}
                                        className="flex items-center gap-2.5 rounded-xl
                                            border border-white/[0.04] bg-white/[0.02] px-3.5 py-2.5"
                                    >
                                        <div className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[13px] leading-snug text-slate-300 truncate">
                                                {output.description}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {output.assignedTo !==
                                                    "0x0000000000000000000000000000000000000000" && (
                                                    <span className="text-[10px] text-slate-500">
                                                        {truncateAddress(output.assignedTo)}
                                                    </span>
                                                )}
                                                {meetingMap.has(output.meetingId) && (
                                                    <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                                                        Meeting #{output.meetingId}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={KanbanSquare}
                                text="No active projects. Create one from a team sync."
                            />
                        )}
                    </motion.div>

                    {/* OKRs */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.14, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-slate-500" strokeWidth={1.75} />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    OKRs · {currentQuarter}
                                </p>
                                {totalOkrCount > 0 && (
                                    <span className="ml-1 rounded-full bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                        {totalOkrCount}
                                    </span>
                                )}
                            </div>
                            {canProposeOkrs && (
                                <button
                                    type="button"
                                    onClick={() => setIsOkrComposerOpen(true)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#3481FF]/20 bg-[#3481FF]/[0.08] px-2.5 py-1 text-[11px] font-semibold text-[#3481FF] hover:bg-[#3481FF]/[0.14]"
                                >
                                    <Plus size={12} />
                                    Propose
                                </button>
                            )}
                        </div>
                        {totalOkrCount === 0 ? (
                            <EmptyState
                                icon={Target}
                                text="No OKRs adopted yet this quarter. Propose them through governance — OKRs commit your circle's direction."
                            />
                        ) : (
                            <div className="space-y-3">
                                {okrsByRole.map((entry) => (
                                    <div key={entry.roleId.toString()} className="space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            {roleNameById.get(entry.roleId.toString()) ??
                                                `Role #${entry.roleId}`}
                                        </p>
                                        <ul className="space-y-2">
                                            {entry.objectives.map((obj) => (
                                                <li
                                                    key={obj.id}
                                                    className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                                                >
                                                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">
                                                        {obj.title}
                                                    </p>
                                                    {obj.description && (
                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                            {obj.description}
                                                        </p>
                                                    )}
                                                    {obj.keyResults.length > 0 && (
                                                        <ul className="mt-2 space-y-1">
                                                            {obj.keyResults.map((kr) => (
                                                                <li
                                                                    key={kr.id}
                                                                    className="text-[11px] text-slate-500"
                                                                >
                                                                    <span className="mr-1 text-slate-600">
                                                                        KR
                                                                    </span>
                                                                    {kr.label}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Metrics */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.18, ease: EXPO }}
                        className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                        <div className="mb-4 flex items-center gap-2">
                            <TrendingUp size={14} className="text-slate-500" strokeWidth={1.75} />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Metrics
                            </p>
                            {metrics.length > 0 && (
                                <span className="ml-1 rounded-full bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                    {metrics.length}
                                </span>
                            )}
                        </div>
                        {metrics.length === 0 ? (
                            <EmptyState
                                icon={TrendingUp}
                                text="No metrics yet. Role leads can add recurring metrics during the tactical huddle."
                            />
                        ) : (
                            <ul className="space-y-2">
                                {metrics.map((m) => (
                                    <li
                                        key={m.id}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                                    >
                                        <p className="text-[13px] text-slate-800 dark:text-slate-200">
                                            {m.label}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-slate-500">
                                            {roleNameById.get(m.roleId.toString()) ??
                                                `Role #${m.roleId}`}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                </div>
            </div>

            {canProposeOkrs && orgId && roleRegistryAddress && meetingFactoryAddress && (
                <OkrProposalComposer
                    isOpen={isOkrComposerOpen}
                    onClose={() => setIsOkrComposerOpen(false)}
                    orgId={orgId}
                    roleRegistryAddress={roleRegistryAddress}
                    meetingFactoryAddress={meetingFactoryAddress}
                />
            )}
        </div>
    );
}

function EmptyState({
    icon: Icon,
    text,
}: {
    icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
    text: string;
}) {
    return (
        <div
            className="flex flex-col items-center gap-3 rounded-2xl
            border border-dashed border-white/[0.06] bg-white/[0.015]
            px-4 py-8 text-center"
        >
            <Icon size={20} className="text-slate-700" strokeWidth={1.5} />
            <p className="max-w-[24ch] text-xs leading-relaxed text-slate-600">{text}</p>
        </div>
    );
}
