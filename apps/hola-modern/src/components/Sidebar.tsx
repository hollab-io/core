import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import type { AppTabId } from "../config/navigation";
import { NAV_ITEMS } from "../config/navigation";
import { useWorkspaceSnapshot } from "../hooks/useWorkspaceSnapshot";

type SidebarProps = {
    activeTab: AppTabId;
    setActiveTab: (tab: AppTabId) => void;
};

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const { organization, setActiveOrganizationId } = useWorkspaceSnapshot();

    return (
        /* Outer shell — floating glass island */
        <aside
            className="z-20 my-3 ml-3 flex w-[62px] flex-shrink-0 flex-col items-center
                rounded-[1.75rem]
                border border-slate-200/70 dark:border-white/[0.07]
                bg-white/90 dark:bg-[#0c0c0f]/90
                shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_40px_rgba(0,0,0,0.5)]
                backdrop-blur-xl
                transition-[background-color,border-color] duration-500"
            style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
            aria-label="Primary navigation"
        >
            {/* Inner core */}
            <div className="flex h-full w-full flex-col items-center gap-1 px-[7px] py-4">
                {/* Logo / back button */}
                <div className="mb-2 flex flex-col items-center gap-1.5">
                    <button
                        type="button"
                        className="group flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center
                            rounded-[0.875rem]
                            bg-gradient-to-br from-[#3481FF] to-[#1a5fd4]
                            shadow-[0_4px_16px_rgba(52,129,255,0.4)]
                            transition-all duration-500
                            hover:scale-[1.07] hover:shadow-[0_6px_22px_rgba(52,129,255,0.5)]
                            active:scale-[0.96]"
                        style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                        aria-label="Workspace home"
                    >
                        <span className="text-[17px] font-bold text-white">H</span>
                    </button>
                    {organization && (
                        <button
                            type="button"
                            onClick={() => setActiveOrganizationId(null)}
                            className="group flex h-6 w-6 items-center justify-center rounded-full
                                text-slate-400 dark:text-slate-600
                                transition-all duration-300
                                hover:text-slate-600 dark:hover:text-slate-400"
                            style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                            aria-label="Back to organizations"
                            title="All organizations"
                        >
                            <ArrowLeft size={12} strokeWidth={2} />
                        </button>
                    )}
                </div>

                {/* Hairline divider */}
                <div className="mb-3 h-px w-8 rounded-full bg-slate-200 dark:bg-white/[0.08]" />

                {/* Nav items */}
                <nav className="flex w-full flex-1 flex-col items-center gap-0.5" aria-label="Main sections">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;

                        return (
                            <button
                                type="button"
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                aria-label={item.label}
                                aria-current={isActive ? "page" : undefined}
                                className={`group relative flex h-[42px] w-[44px] items-center justify-center
                                    rounded-[0.875rem]
                                    transition-all duration-500
                                    ${isActive
                                        ? "text-[#3481FF]"
                                        : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
                                    }`}
                                style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                            >
                                {/* Active background */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 rounded-[0.875rem]
                                            bg-[#3481FF]/[0.1] dark:bg-[#3481FF]/[0.15]
                                            ring-1 ring-[#3481FF]/[0.15] dark:ring-[#3481FF]/[0.2]"
                                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                    />
                                )}

                                {/* Hover background */}
                                <span className={`absolute inset-0 rounded-[0.875rem] transition-opacity duration-300
                                    bg-slate-100 dark:bg-white/[0.05] opacity-0 group-hover:opacity-100
                                    ${isActive ? "opacity-0 group-hover:opacity-0" : ""}`}
                                />

                                <Icon
                                    size={19}
                                    strokeWidth={isActive ? 2.1 : 1.5}
                                    className="relative z-10 transition-transform duration-500 group-hover:scale-[1.1]"
                                    style={{ transitionTimingFunction: "cubic-bezier(0.32,0.72,0,1)" }}
                                    aria-hidden="true"
                                />

                                {/* Active dot */}
                                {isActive && (
                                    <motion.span
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 28 }}
                                        className="absolute right-[7px] top-[7px] h-[5px] w-[5px] rounded-full bg-[#3481FF]
                                            shadow-[0_0_6px_rgba(52,129,255,0.8)]"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
