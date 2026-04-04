import { motion } from "framer-motion";

import DynamicAuthControl from "../components/DynamicAuthControl";

const EXPO = [0.16, 1, 0.3, 1] as const;
const SPRING = "cubic-bezier(0.32,0.72,0,1)";

const FEATURES = ["Org chart & circles", "Governance & proposals", "Actions & OKRs", "Wallet-native auth"] as const;

export default function WelcomeScreen() {
    return (
        <section className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#050505]">

            {/* ── Background mesh gradients ── */}
            {/* Bottom-right blue orb */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 75% 60% at 75% 100%, rgba(52,129,255,0.18) 0%, transparent 65%)",
                }}
            />
            {/* Top-left indigo orb */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 55% 45% at 20% 0%, rgba(99,102,241,0.14) 0%, transparent 60%)",
                }}
            />
            {/* Center-right violet accent */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 35% 30% at 90% 40%, rgba(139,92,246,0.07) 0%, transparent 55%)",
                }}
            />
            {/* Deep vignette */}
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background:
                        "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 35%, rgba(5,5,5,0.75) 100%)",
                }}
            />

            {/* ── Noise grain (fixed, pointer-events-none) ── */}
            <div className="grain-overlay" aria-hidden="true" />

            {/* ── Grid lines (subtle) ── */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
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
                        <span className="text-[26px] font-bold text-white">H</span>
                    </div>
                </motion.div>

                {/* Eyebrow */}
                <motion.div
                    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.8, delay: 0.08, ease: EXPO }}
                >
                    <span className="inline-flex items-center gap-2 rounded-full
                        border border-white/[0.1] bg-white/[0.05]
                        px-3.5 py-1.5 backdrop-blur-sm">
                        <span
                            className="h-1.5 w-1.5 rounded-full bg-[#3481FF]"
                            style={{ boxShadow: "0 0 8px rgba(52,129,255,0.9)" }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                            Holacracy · Web3 native
                        </span>
                    </span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, delay: 0.14, ease: EXPO }}
                    className="mt-6 text-balance text-[50px] font-bold leading-[1.08] tracking-[-0.04em] text-white sm:text-[58px]"
                >
                    Holaspirit
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.9, delay: 0.22, ease: EXPO }}
                    className="mt-4 max-w-[300px] text-balance text-[14px] font-medium leading-relaxed text-white/35"
                >
                    The decentralized operating system for organizations — governance, execution, and strategy in one workspace.
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
                            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1
                                text-[11px] font-medium text-white/40"
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
                            border border-white/[0.1] bg-white/[0.04]
                            p-[5px]
                            shadow-[0_20px_60px_rgba(0,0,0,0.55)]
                            backdrop-blur-2xl"
                    >
                        {/* Inner core */}
                        <div
                            className="rounded-[calc(2rem-5px)] bg-[#0d0d11]
                                shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]
                                px-7 py-8"
                        >
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/20">
                                Connect to get started
                            </p>
                            <p className="mb-6 text-[13px] text-white/35">
                                Use your wallet or social login to enter the workspace.
                            </p>
                            <div className="flex w-full justify-center">
                                <DynamicAuthControl />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.6, ease: EXPO }}
                    className="mt-7 text-[11px] text-white/15"
                >
                    Non-custodial · ERC-4337 · Gas sponsored
                </motion.p>

            </div>
        </section>
    );
}
