import { Moon, Sun } from "lucide-react";

import type { AppTabId } from "../config/navigation";
import DynamicAuthControl from "./DynamicAuthControl";

type TopbarProps = {
    activeTab: AppTabId;
    okrView: "timeframe" | "hierarchy";
    organizationName: string;
    organizationEns?: string;
    isDarkMode: boolean;
    setOkrView: (view: "timeframe" | "hierarchy") => void;
    setIsDarkMode: (isDark: boolean) => void;
};

const SPRING = "cubic-bezier(0.32,0.72,0,1)";

export default function Topbar({
    activeTab,
    okrView,
    organizationName,
    organizationEns,
    isDarkMode,
    setOkrView,
    setIsDarkMode,
}: TopbarProps) {
    const renderSegmentedControl = (
        options: Array<{ id: string; label: string }>,
        activeOption: string,
        onChange: (option: string) => void,
    ) => (
        <div
            className="flex items-center gap-px rounded-full
                bg-slate-100/80 dark:bg-white/[0.06]
                ring-1 ring-slate-200/80 dark:ring-white/[0.06]
                p-[3px]"
            role="tablist"
        >
            {options.map((option) => {
                const isActive = activeOption === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`relative rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide
                            transition-all duration-500
                            ${isActive
                                ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-white/[0.1]"
                                : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        style={{ transitionTimingFunction: SPRING }}
                        onClick={() => onChange(option.id)}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );

    const pageTitle = organizationName || activeTab;

    return (
        <header
            className="sticky top-0 z-10
                border-b border-slate-200/60 dark:border-white/[0.05]
                bg-[#f6f6f8]/80 dark:bg-[#050505]/80
                backdrop-blur-2xl px-5 py-3
                transition-[background-color,border-color] duration-500"
            style={{ transitionTimingFunction: SPRING }}
        >
            <div className="flex min-h-[44px] items-center gap-3">
                {/* Title + ENS subtitle */}
                <div className="mr-1 flex min-w-0 flex-col justify-center">
                    <h1 className="truncate text-[17px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white leading-none">
                        {pageTitle}
                    </h1>
                    {activeTab === "chart" && organizationEns && (
                        <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400 dark:text-slate-600 leading-none">
                            {organizationEns}
                        </p>
                    )}
                </div>

                {/* Segmented controls */}
                {activeTab === "okrs" &&
                    renderSegmentedControl(
                        [
                            { id: "timeframe", label: "Timeframe" },
                            { id: "hierarchy", label: "Hierarchy" },
                        ],
                        okrView,
                        (opt) => setOkrView(opt as "timeframe" | "hierarchy"),
                    )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right controls */}
                <div className="flex items-center gap-2">
                    {/* Theme toggle */}
                    <button
                        type="button"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="group flex h-8 w-8 items-center justify-center rounded-full
                            bg-slate-100/80 dark:bg-white/[0.05]
                            ring-1 ring-slate-200/70 dark:ring-white/[0.06]
                            text-slate-500 dark:text-slate-500
                            transition-all duration-500
                            hover:text-slate-800 dark:hover:text-slate-200
                            hover:ring-slate-300 dark:hover:ring-white/[0.12]
                            active:scale-[0.92]"
                        style={{ transitionTimingFunction: SPRING }}
                        aria-label="Toggle dark mode"
                    >
                        {isDarkMode
                            ? <Sun size={14} strokeWidth={1.75} className="transition-transform duration-300 group-hover:rotate-[20deg]" />
                            : <Moon size={14} strokeWidth={1.75} className="transition-transform duration-300 group-hover:-rotate-[12deg]" />
                        }
                    </button>

                    {/* Wallet auth */}
                    <DynamicAuthControl />
                </div>
            </div>
        </header>
    );
}
