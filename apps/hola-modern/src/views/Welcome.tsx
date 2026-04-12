import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

import logoSvg from "../assets/logo.svg";
import WalletAuthControl from "../components/WalletAuthControl";

const EXPO = [0.16, 1, 0.3, 1] as const;

const FEATURES = [
    "Roles & teams",
    "Proposals & voting",
    "Actions & execution",
    "Agent-ready SDK",
] as const;

export default function WelcomeScreen({ onShowConstitution }: { onShowConstitution?: () => void }) {
    return (
        <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-white dark:bg-[#050505]">
            {/* ── Background mesh gradients ── */}
            {/* Bottom-right blue orb */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-100"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 75% 60% at 75% 100%, rgba(52,129,255,0.18) 0%, transparent 65%)",
                }}
            />
            {/* Top-left indigo orb */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-100"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 55% 45% at 20% 0%, rgba(99,102,241,0.14) 0%, transparent 60%)",
                }}
            />
            {/* Center-right violet accent */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.3] dark:opacity-100"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 35% 30% at 90% 40%, rgba(139,92,246,0.07) 0%, transparent 55%)",
                }}
            />
            {/* Deep vignette — dark only */}
            <div
                className="pointer-events-none absolute inset-0 hidden dark:block"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 35%, rgba(5,5,5,0.75) 100%)",
                }}
            />

            {/* ── Noise grain — dark only ── */}
            <div className="grain-overlay hidden dark:block" aria-hidden="true" />

            {/* ── Grid lines (subtle) — dark only ── */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03] hidden dark:block"
                aria-hidden="true"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                }}
            />

            {/* ── Content ── */}
            <div className="relative z-10 flex w-full max-w-[420px] flex-col items-center px-6 text-center">
                {/* Brand mark */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, filter: "blur(8px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.7, ease: EXPO }}
                    className="mb-7"
                >
                    <div
                        className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-[1.25rem]
                            bg-gradient-to-br from-[#3481FF] to-[#1a5fd4]
                            shadow-[0_0_0_1px_rgba(52,129,255,0.3),0_8px_32px_rgba(52,129,255,0.45)]"
                    >
                        <img src={logoSvg} alt="Hollab" className="h-[34px] w-[34px]" />
                    </div>
                </motion.div>

                {/* Eyebrow */}
                <motion.div
                    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, delay: 0.08, ease: EXPO }}
                >
                    <span
                        className="inline-flex items-center gap-2 rounded-full
                        border border-slate-200 dark:border-white/[0.1] bg-white/80 dark:bg-white/[0.05]
                        px-3.5 py-1.5 backdrop-blur-sm"
                    >
                        <span
                            className="h-1.5 w-1.5 rounded-full bg-[#3481FF]"
                            style={{ boxShadow: "0 0 8px rgba(52,129,255,0.9)" }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/50">
                            Onchain · Autonomous · Verifiable
                        </span>
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, delay: 0.14, ease: EXPO }}
                    className="mt-6 text-balance text-[50px] font-bold leading-[1.08] tracking-[-0.04em] text-slate-900 dark:text-white sm:text-[58px]"
                >
                    hollab.eth
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, delay: 0.22, ease: EXPO }}
                    className="mt-4 max-w-[300px] text-balance text-[14px] font-medium leading-relaxed text-slate-500 dark:text-white/35"
                >
                    The onchain operating system for autonomous organizations — structure,
                    governance, and execution without managers.
                </motion.p>

                {/* Feature pills */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3, ease: EXPO }}
                    className="mt-7 flex flex-wrap justify-center gap-2"
                >
                    {FEATURES.map((f) => (
                        <span
                            key={f}
                            className="rounded-full border border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] px-3 py-1
                                text-[11px] font-medium text-slate-500 dark:text-white/40"
                        >
                            {f}
                        </span>
                    ))}
                </motion.div>

                {/* Auth card — double bezel */}
                <motion.div
                    initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, delay: 0.38, ease: EXPO }}
                    className="mt-9 w-full"
                >
                    {/* Outer shell */}
                    <div
                        className="w-full rounded-[2rem]
                            border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.04]
                            p-[5px]
                            shadow-[0_20px_60px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
                    >
                        {/* Inner core */}
                        <div
                            className="rounded-[calc(2rem-5px)] bg-slate-50 dark:bg-[#0d0d11]
                                shadow-none dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]
                                px-7 py-8"
                        >
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-white/20">
                                Connect to get started
                            </p>

                            <div className="flex w-full justify-center">
                                <WalletAuthControl />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Constitution link */}
                {onShowConstitution && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: EXPO }}
                        className="mt-6"
                    >
                        <button
                            type="button"
                            onClick={onShowConstitution}
                            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 dark:text-slate-500
                                transition-colors duration-300 hover:text-[#3481FF]"
                        >
                            <BookOpen size={14} strokeWidth={1.75} />
                            Read the Constitution
                        </button>
                    </motion.div>
                )}
            </div>
        </section>
    );
}
