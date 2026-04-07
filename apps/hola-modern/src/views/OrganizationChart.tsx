import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Users, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

function polarXY(cx: number, cy: number, r: number, i: number, total: number) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(total, 1);
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
}

export default function OrganizationChart({ isDarkMode = false }: { isDarkMode?: boolean }) {
    const { snapshot } = useWorkspaceSnapshot();
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    const rootCircle = useMemo(
        () => snapshot.circles.find((c) => c.isAnchor) ?? snapshot.circles[0] ?? null,
        [snapshot.circles],
    );

    const roles = useMemo(
        () => (rootCircle ? snapshot.roles.filter((r) => r.circleId === rootCircle.id) : []),
        [snapshot.roles, rootCircle],
    );

    const partnerMap = useMemo(
        () => Object.fromEntries(snapshot.partners.map((p) => [p.id, p])),
        [snapshot.partners],
    );

    const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

    // ── Layout constants ─────────────────────────────────────────────────────
    const CX = 400;
    const CY = 400;
    const ROOT_R = 280;
    const ROLE_R = 38;
    const ORBIT_R = ROOT_R * 0.58;

    return (
        <section className="relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#050505]">
            <div className="min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_360px]">
                {/* ── Canvas ──────────────────────────────────────────────── */}
                <div
                    className="relative flex min-h-[600px] items-center justify-center overflow-hidden bg-white dark:bg-[#050505]"
                    onClick={() => setSelectedRoleId(null)}
                >
                    <svg
                        viewBox="0 0 800 800"
                        className="h-full max-h-[720px] w-full max-w-[720px]"
                        style={{ userSelect: "none" }}
                    >
                        {/* Root circle background */}
                        <circle
                            cx={CX}
                            cy={CY}
                            r={ROOT_R}
                            fill={isDarkMode ? "rgba(52,129,255,0.06)" : "#EAF2FB"}
                            stroke={isDarkMode ? "rgba(52,129,255,0.12)" : "#d4e5f7"}
                            strokeWidth={1.5}
                        />

                        {/* Root circle label */}
                        {rootCircle && (
                            <text
                                x={CX}
                                y={CY - ROOT_R + 32}
                                textAnchor="middle"
                                fill={isDarkMode ? "#94a3b8" : "#64748b"}
                                fontSize={14}
                                fontWeight={600}
                                letterSpacing="-0.01em"
                            >
                                {rootCircle.title}
                            </text>
                        )}

                        {/* Role bubbles */}
                        {roles.map((role, i) => {
                            const pos =
                                roles.length === 1
                                    ? { x: CX, y: CY }
                                    : polarXY(CX, CY, ORBIT_R, i, roles.length);
                            const isSelected = role.id === selectedRoleId;

                            return (
                                <g
                                    key={role.id}
                                    style={{ cursor: "pointer" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRoleId(isSelected ? null : role.id);
                                    }}
                                >
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={ROLE_R + (isSelected ? 4 : 0)}
                                        fill={
                                            isDarkMode
                                                ? isSelected
                                                    ? "rgba(52,129,255,0.65)"
                                                    : "rgba(52,129,255,0.4)"
                                                : isSelected
                                                  ? "#6AAEE8"
                                                  : "#7BBCF0"
                                        }
                                        stroke={
                                            isDarkMode
                                                ? "rgba(52,129,255,0.3)"
                                                : "rgba(100,160,220,0.5)"
                                        }
                                        strokeWidth={isSelected ? 2 : 1}
                                    />
                                    <text
                                        x={pos.x}
                                        y={pos.y}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill={isDarkMode ? "#d0e8ff" : "#1a3a52"}
                                        fontSize={11}
                                        fontWeight={600}
                                    >
                                        {role.title.length > 18
                                            ? role.title.slice(0, 16) + "..."
                                            : role.title}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Empty state */}
                        {roles.length === 0 && (
                            <text
                                x={CX}
                                y={CY}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fill={isDarkMode ? "#475569" : "#94a3b8"}
                                fontSize={14}
                            >
                                {rootCircle ? "No roles in this circle yet" : "No circles found"}
                            </text>
                        )}
                    </svg>
                </div>

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className="flex max-h-full min-h-0 flex-col overflow-auto border-l border-slate-200/60 dark:border-white/[0.06] bg-white/60 dark:bg-[#0a0a0d] px-5 py-5">
                    <AnimatePresence mode="wait">
                        {selectedRole ? (
                            <motion.div
                                key={selectedRole.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16 }}
                                transition={{ duration: 0.22, ease: "easeOut" }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="inline-flex items-center gap-2 rounded-full bg-[#3481FF]/[0.08] dark:bg-[#3481FF]/[0.12] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3481FF]">
                                            <span className="h-2 w-2 rounded-full bg-[#3481FF]" />
                                            {rootCircle?.title ?? "Role"}
                                        </div>
                                        <h3 className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white leading-tight">
                                            {selectedRole.title}
                                        </h3>
                                        <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-500">
                                            {selectedRole.summary}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoleId(null)}
                                        className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-white/[0.08] text-slate-400 dark:text-slate-600 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.07] hover:text-slate-600 dark:hover:text-slate-300"
                                        aria-label="Close"
                                    >
                                        <X size={15} strokeWidth={2} aria-hidden="true" />
                                    </button>
                                </div>

                                {/* Cadence */}
                                {selectedRole.cadence && (
                                    <div className="mt-4 rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.03] px-4 py-3">
                                        <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-600">
                                            Cadence
                                        </div>
                                        <div className="mt-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                                            {selectedRole.cadence}
                                        </div>
                                    </div>
                                )}

                                {/* Scope */}
                                {selectedRole.scope.length > 0 && (
                                    <div className="mt-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.07] bg-white dark:bg-[#0e0e12] p-4">
                                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3481FF]">
                                            <Sparkles
                                                size={13}
                                                strokeWidth={2}
                                                aria-hidden="true"
                                            />
                                            Scope
                                        </div>
                                        <div className="space-y-2">
                                            {selectedRole.scope.map((item) => (
                                                <div
                                                    key={item}
                                                    className="rounded-lg border border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.03] px-3 py-2.5 text-[12px] text-slate-700 dark:text-slate-300"
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Members */}
                                {selectedRole.memberIds.length > 0 && (
                                    <div className="mt-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.07] bg-white dark:bg-[#0e0e12] p-4">
                                        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3481FF]">
                                            <Users size={13} strokeWidth={2} aria-hidden="true" />
                                            People
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedRole.memberIds.map((id) => (
                                                <span
                                                    key={id}
                                                    className="rounded-full border border-[#3481FF]/[0.15] dark:border-[#3481FF]/[0.2] bg-[#3481FF]/[0.07] dark:bg-[#3481FF]/[0.1] px-3 py-1 text-[11px] font-semibold text-[#3481FF]"
                                                >
                                                    {partnerMap[id]?.name ?? id}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="hint"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-1 flex-col gap-4"
                            >
                                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.02] p-5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#3481FF] mb-1.5">
                                        Organization
                                    </p>
                                    <h3 className="text-[18px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white">
                                        {rootCircle?.title ?? "No circle"}
                                    </h3>
                                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-500">
                                        {rootCircle?.purpose ||
                                            rootCircle?.summary ||
                                            "Select a role to view its scope, members, and cadence."}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#0e0e12] px-4 py-3">
                                    <p className="text-[26px] font-bold tabular-nums tracking-tight text-[#3481FF]">
                                        {roles.length}
                                    </p>
                                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-600">
                                        Roles
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </aside>
            </div>
        </section>
    );
}
