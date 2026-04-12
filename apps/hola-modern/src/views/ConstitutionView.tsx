import { motion } from "framer-motion";

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: EXPO },
});

function Cap({ n, children }: { n: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-700">{n}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-600">
                {children}
            </span>
        </div>
    );
}

export default function ConstitutionView() {
    return (
        <div className="min-h-[calc(100dvh-60px)] pb-36 pt-10">
            <div className="mx-auto max-w-[740px] px-5 sm:px-8">
                {/* ── Hero ── */}
                <motion.div {...fade(0)} className="mb-16">
                    <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-[-0.035em] text-slate-900 dark:text-white">
                        How it works
                    </h1>
                    <div className="mt-6 border-l border-slate-200 dark:border-white/[0.08] pl-5">
                        <p className="text-[15px] leading-[1.7] text-slate-500 dark:text-slate-400">
                            An onchain operating system for organizations — authority distributed,
                            roles explicit, governance verifiable. No managers, no politics, no
                            unwritten norms.
                        </p>
                    </div>
                </motion.div>

                {/* ── 01 What it is ── */}
                <motion.section {...fade(0.08)} className="mb-14">
                    <Cap n="01">What it is</Cap>
                    <p className="text-[17px] font-semibold leading-[1.5] tracking-[-0.02em] text-slate-700 dark:text-slate-200">
                        The protocol constitution defines how authority is distributed, how roles
                        are structured, how decisions are made, and how governance changes over time
                        — all verifiable onchain.
                    </p>
                    <blockquote className="mt-6 border-l-2 border-[#3481FF]/40 pl-5">
                        <p className="text-[15px] italic leading-snug text-slate-500 dark:text-slate-400">
                            "Instead of managers and unwritten norms —{" "}
                            <span className="font-semibold not-italic text-slate-700 dark:text-slate-200">
                                verifiable rules, enforced by code.
                            </span>
                            "
                        </p>
                    </blockquote>
                </motion.section>

                <div className="mb-14 h-px bg-slate-100 dark:bg-white/[0.05]" />

                {/* ── 02 What it changes ── */}
                <motion.section {...fade(0.12)} className="mb-14">
                    <Cap n="02">What it changes</Cap>
                    <h2 className="mb-7 text-[1.3rem] font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
                        Replacing the informal with the explicit
                    </h2>

                    <div className="grid grid-cols-[1fr_1px_1fr] gap-0">
                        <div className="space-y-3.5 pr-6 sm:pr-10">
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-700">
                                Before
                            </p>
                            {[
                                "Vague job descriptions",
                                "Top-down control",
                                "Informal politics",
                                "Unstructured meetings",
                                "Hidden expectations",
                            ].map((item) => (
                                <p
                                    key={item}
                                    className="text-[13px] text-slate-500 dark:text-slate-600 line-through decoration-slate-300 dark:decoration-slate-700/60"
                                >
                                    {item}
                                </p>
                            ))}
                        </div>
                        <div className="bg-slate-100 dark:bg-white/[0.05]" />
                        <div className="space-y-3.5 pl-6 sm:pl-10">
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                After
                            </p>
                            {[
                                "Clear roles",
                                "Distributed authority",
                                "Defined governance processes",
                                "Decision-making protocols",
                                "Transparent accountabilities",
                            ].map((item) => (
                                <p
                                    key={item}
                                    className="text-[13px] font-medium text-slate-700 dark:text-slate-200"
                                >
                                    {item}
                                </p>
                            ))}
                        </div>
                    </div>
                </motion.section>

                <div className="mb-14 h-px bg-slate-100 dark:bg-white/[0.05]" />

                {/* ── 03 What it revolutionizes ── */}
                <motion.section {...fade(0.16)} className="mb-14">
                    <Cap n="03">What it revolutionizes</Cap>
                    <h2 className="mb-6 text-[1.3rem] font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
                        Not flat structure — explicit power design
                    </h2>
                    <p className="mb-7 text-[14px] leading-[1.7] text-slate-500 dark:text-slate-400">
                        The protocol turns an organization from a hierarchy of people into a system
                        of interconnected building blocks — each one verifiable onchain.
                    </p>

                    <div className="space-y-1">
                        {[
                            "Roles",
                            "Teams",
                            "Policies",
                            "Proposal processes",
                            "Operational routines",
                        ].map((term, i) => (
                            <div
                                key={term}
                                className="flex items-center gap-4 border-b border-slate-100 dark:border-white/[0.04] py-2.5"
                            >
                                <span className="w-4 shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-700">
                                    {i + 1}
                                </span>
                                <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">
                                    {term}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-2xl border border-[#3481FF]/15 bg-[#3481FF]/[0.07] px-4 py-3.5">
                        <p className="text-[13px] text-slate-600 dark:text-slate-300">
                            Its core innovation is not "flat structure". It is{" "}
                            <span className="font-semibold text-[#3481FF] dark:text-[#7aabff]">
                                explicit power design
                            </span>
                            .
                        </p>
                    </div>
                </motion.section>

                <div className="mb-14 h-px bg-slate-100 dark:bg-white/[0.05]" />

                {/* ── 04 Why DAOs ── */}
                <motion.section {...fade(0.2)} className="mb-14">
                    <Cap n="04">Why this matters for DAOs</Cap>
                    <h2 className="mb-4 text-[1.3rem] font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
                        Structure for an existing ambition
                    </h2>
                    <p className="mb-7 text-[14px] leading-[1.7] text-slate-500 dark:text-slate-400">
                        DAOs already aim to distribute power, coordinate contributors, and reduce
                        dependence on centralized operators. This protocol gives that ambition
                        verifiable structure.
                    </p>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/[0.06]">
                        {[
                            ["Roles", "contributors, stewards, working group operators"],
                            ["Teams", "pods, guilds, subDAOs, working groups"],
                            ["Policies", "governance rules, mandates, treasury constraints"],
                            [
                                "Proposal reviews",
                                "proposal formation and internal decision processes",
                            ],
                            [
                                "Distributed authority",
                                "execution rights without routing through token votes",
                            ],
                        ].map(([left, right], i, arr) => (
                            <div
                                key={left}
                                className={`grid grid-cols-[auto_1px_1fr] items-stretch ${i < arr.length - 1 ? "border-b border-slate-100 dark:border-white/[0.05]" : ""}`}
                            >
                                <div className="flex w-[140px] shrink-0 items-center px-4 py-3">
                                    <span className="font-mono text-[12px] font-semibold text-[#3481FF] dark:text-[#7aabff]">
                                        {left}
                                    </span>
                                </div>
                                <div className="bg-slate-100 dark:bg-white/[0.05]" />
                                <div className="flex items-center px-4 py-3">
                                    <span className="text-[13px] text-slate-500 dark:text-slate-400">
                                        {right}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.section>

                <div className="mb-14 h-px bg-slate-100 dark:bg-white/[0.05]" />

                {/* ── 05 Where useful ── */}
                <motion.section {...fade(0.24)} className="mb-14">
                    <Cap n="05">Where it is useful</Cap>
                    <h2 className="mb-6 text-[1.3rem] font-bold tracking-[-0.025em] text-slate-900 dark:text-white">
                        DAOs that struggle with coordination
                    </h2>

                    <div className="mb-8 space-y-2.5">
                        {[
                            "Unclear contributor ownership",
                            "Slow execution",
                            "Too many decisions pushed to full-community voting",
                            "Hidden founder control",
                            "Messy coordination between working groups",
                        ].map((item, i) => (
                            <div key={item} className="flex items-center gap-4">
                                <span className="w-4 shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-700 text-right">
                                    {i + 1}
                                </span>
                                <p className="text-[14px] text-slate-500 dark:text-slate-400">
                                    {item}
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-600">
                        It separates
                    </p>
                    <div className="space-y-2">
                        {[
                            ["Constitutional governance", "day-to-day execution"],
                            ["Role authority", "social influence"],
                            ["Operational decisions", "token-holder signaling"],
                        ].map(([a, b]) => (
                            <div
                                key={a}
                                className="flex items-center overflow-hidden rounded-xl border border-slate-200 dark:border-white/[0.06]"
                            >
                                <span className="flex-1 bg-slate-50 dark:bg-white/[0.03] px-4 py-2.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                                    {a}
                                </span>
                                <span className="shrink-0 px-3 font-mono text-[9px] font-black tracking-widest text-slate-300 dark:text-slate-700">
                                    VS
                                </span>
                                <span className="flex-1 px-4 py-2.5 text-right text-[13px] text-slate-500">
                                    {b}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.section>

                <div className="mb-14 h-px bg-slate-100 dark:bg-white/[0.05]" />

                {/* ── 06 Bottom line ── */}
                <motion.section {...fade(0.28)} className="mb-8">
                    <Cap n="06">Bottom line</Cap>
                    <p className="text-[1.9rem] font-bold leading-[1.15] tracking-[-0.03em] text-slate-900 dark:text-white">
                        From loose decentralization to{" "}
                        <span
                            className="text-transparent bg-clip-text"
                            style={{ backgroundImage: "linear-gradient(90deg, #3481FF, #7aabff)" }}
                        >
                            functional self-management.
                        </span>
                    </p>
                    <p className="mt-5 text-[14px] leading-[1.75] text-slate-500 dark:text-slate-400">
                        It does not replace onchain governance. It makes autonomous organizations
                        more structured, transparent, modular, and scalable — a coordination
                        protocol that sits beneath the token vote.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2">
                        {["Structured", "Transparent", "Modular", "Scalable"].map((tag, i) => (
                            <div key={tag} className="flex items-center gap-2.5">
                                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-700">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                                    {tag}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
