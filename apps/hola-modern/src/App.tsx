import { useEffect, useState } from "react";

import type { AppTabId } from "./config/navigation";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { TAB_DESCRIPTIONS, TAB_TITLES } from "./config/navigation";
import ActionsList from "./views/ActionsList";
import CalendarView from "./views/CalendarView";
import GovernanceMeetingRoom from "./views/GovernanceMeetingRoom";
import GovernanceWorkspace from "./views/GovernanceWorkspace";
import IntegrationsSettings from "./views/IntegrationsSettings";
import OKRsTree from "./views/OKRsTree";
import OrganizationChart from "./views/OrganizationChart";
import PlaceholderView from "./views/PlaceholderView";
import ProjectsBoard from "./views/ProjectsBoard";
import TacticalMeetingRoom from "./views/TacticalMeetingRoom";

function App() {
    const [activeTab, setActiveTab] = useState<AppTabId>("chart");
    const [searchQuery, setSearchQuery] = useState("");
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== "undefined") {
            return (
                localStorage.getItem("theme") === "dark" ||
                (!localStorage.getItem("theme") &&
                    window.matchMedia("(prefers-color-scheme: dark)").matches)
            );
        }
        return false;
    });

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [isDarkMode]);

    const isCalendarTab = activeTab === "calendar";

    const renderContent = () => {
        switch (activeTab) {
            case "chart":
                return <OrganizationChart searchQuery={searchQuery} />;
            case "projects":
                return <ProjectsBoard />;
            case "okrs":
                return <OKRsTree />;
            case "settings":
                return <IntegrationsSettings />;
            case "actions":
                return <ActionsList />;
            case "calendar":
                return <CalendarView searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
            case "governance":
                return <GovernanceWorkspace searchQuery={searchQuery} />;
            default:
                return (
                    <PlaceholderView
                        title={TAB_TITLES[activeTab]}
                        description={TAB_DESCRIPTIONS[activeTab]}
                    />
                );
        }
    };

    return (
        <div
            className={`flex h-screen w-full overflow-hidden font-sans transition-colors duration-300 ${
                isCalendarTab ? "bg-[#202124]" : "bg-white dark:bg-slate-950"
            }`}
        >
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div
                className={`relative flex h-full min-w-0 flex-1 flex-col ${
                    isCalendarTab ? "bg-[#202124]" : ""
                }`}
            >
                {!isCalendarTab && (
                    <Topbar
                        activeTab={activeTab}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                    />
                )}
                <main
                    className={`min-w-0 flex-1 transition-colors duration-300 ${
                        isCalendarTab
                            ? "overflow-hidden bg-[#202124]"
                            : "custom-scrollbar overflow-auto bg-slate-50/50 p-4 dark:bg-slate-900/40 sm:p-6"
                    }`}
                >
                    {renderContent()}
                </main>
                <TacticalMeetingRoom onNavigateToTab={setActiveTab} />
                <GovernanceMeetingRoom />
            </div>
        </div>
    );
}

export default App;
