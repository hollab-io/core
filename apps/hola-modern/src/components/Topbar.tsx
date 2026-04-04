import { Info, Menu, Moon, Search, Sun } from "lucide-react";
import { useState } from "react";

import type { AppTabId } from "../config/navigation";
import { TAB_TITLES } from "../config/navigation";
import DynamicAuthControl from "./DynamicAuthControl";

type TopbarProps = {
    activeTab: AppTabId;
    okrView: "timeframe" | "hierarchy";
    organizationName: string;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isDarkMode: boolean;
    setOkrView: (view: "timeframe" | "hierarchy") => void;
    setIsDarkMode: (isDark: boolean) => void;
};

export default function Topbar({
    activeTab,
    okrView,
    organizationName,
    searchQuery,
    setSearchQuery,
    isDarkMode,
    setOkrView,
    setIsDarkMode,
}: TopbarProps) {
    const [chartView, setChartView] = useState<"roles" | "chart">("chart");
    const searchPlaceholders: Partial<Record<AppTabId, string>> = {
        chart: "Search a role",
        projects: "Search projects",
        actions: "Search actions",
        calendar: "Search meetings",
        governance: "Search proposals and elections",
        members: "Search members",
    };

    const renderSegmentedControl = (
        options: Array<{ id: string; label: string }>,
        activeOption: string,
        onChange: (option: string) => void,
    ) => (
        <div
            className="ml-0 flex items-center gap-2 rounded-lg bg-transparent p-1 sm:ml-6"
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
                        className={`rounded-md border px-5 py-1.5 text-sm font-medium transition-all ${
                            isActive
                                ? "border-[#3481FF] bg-[#3481FF] text-white shadow-sm"
                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                        onClick={() => onChange(option.id)}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <header className="sticky top-0 z-10 border-b border-border/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-4 py-4 shadow-sm backdrop-blur-md sm:px-8 transition-colors duration-300">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
                    <h1 className="flex items-center gap-2 truncate text-[22px] font-semibold text-slate-800 dark:text-slate-100">
                        {activeTab === "chart" ? <>{organizationName}</> : TAB_TITLES[activeTab]}
                    </h1>
                    <button
                        type="button"
                        className="text-slate-400 dark:text-slate-500 transition-colors hover:text-[#3481FF]"
                        aria-label={`Show information about ${TAB_TITLES[activeTab]}`}
                    >
                        <Info size={18} aria-hidden="true" />
                    </button>

                    {activeTab === "chart" &&
                        renderSegmentedControl(
                            [
                                { id: "roles", label: "Roles" },
                                { id: "chart", label: "Chart" },
                            ],
                            chartView,
                            (option) => setChartView(option as "roles" | "chart"),
                        )}

                    {activeTab === "okrs" &&
                        renderSegmentedControl(
                            [
                                { id: "timeframe", label: "Timeframe" },
                                { id: "hierarchy", label: "Hierarchy" },
                            ],
                            okrView,
                            (option) => setOkrView(option as "timeframe" | "hierarchy"),
                        )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
                    <DynamicAuthControl />

                    {(activeTab === "chart" ||
                        activeTab === "projects" ||
                        activeTab === "actions" ||
                        activeTab === "calendar" ||
                        activeTab === "governance" ||
                        activeTab === "members") && (
                        <label className="relative block">
                            <span className="sr-only">Search inside {TAB_TITLES[activeTab]}</span>
                            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search
                                    size={16}
                                    className="text-slate-400 dark:text-slate-500 transition-colors"
                                    aria-hidden="true"
                                />
                            </span>
                            <input
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={searchPlaceholders[activeTab] ?? "Search"}
                                className="w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-4 text-sm text-slate-900 dark:text-slate-100 transition-all focus:border-[#3481FF] focus:outline-none focus:ring-2 focus:ring-[#3481FF]/20 sm:w-[280px]"
                            />
                        </label>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="Toggle dark mode"
                    >
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <button
                        type="button"
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        aria-label="Open page actions"
                    >
                        <Menu size={20} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </header>
    );
}
