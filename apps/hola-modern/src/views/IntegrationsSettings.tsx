import { useState } from "react";

const INTEGRATIONS = [
    {
        id: "trello",
        name: "Trello",
        desc: "Visual task management with Kanban boards. Sync cards with Hollab actions and projects.",
        color: "from-blue-500 to-blue-600",
        icon: "T",
    },
    {
        id: "asana",
        name: "Asana",
        desc: "Plan and structure work with priorities, deadlines, and task assignments — mirrored in your workspace.",
        color: "from-orange-500 to-pink-500",
        icon: "A",
    },
    {
        id: "jira",
        name: "Jira",
        desc: "Agile project tracking. Scrum, kanban, sprints — linked to circles and roles inside Hollab.",
        color: "from-blue-600 to-indigo-600",
        icon: "J",
    },
    {
        id: "basecamp",
        name: "Basecamp",
        desc: "Real-time communication and team coordination, with notifications routed through your org structure.",
        color: "from-green-500 to-emerald-600",
        icon: "B",
    },
    {
        id: "slack",
        name: "Slack",
        desc: "Automatic messages for project, role, policy, and election events — delivered to your chosen channel.",
        color: "from-indigo-500 to-violet-500",
        icon: "S",
    },
] as const;

type SettingsSection = "general" | "privacy" | "integrations";

const SPRING = "cubic-bezier(0.32,0.72,0,1)";

export default function IntegrationsSettings() {
    const [activeSection, setActiveSection] = useState<SettingsSection>("integrations");
    const [enabledIntegrations, setEnabledIntegrations] = useState<Record<string, boolean>>({
        trello: false,
        asana: true,
        jira: false,
        basecamp: false,
        slack: false,
    });

    const sectionTabs: Array<{ id: SettingsSection; label: string }> = [
        { id: "general", label: "General" },
        { id: "privacy", label: "Privacy" },
        { id: "integrations", label: "Integrations" },
    ];

    return (
        <div className="mx-auto max-w-2xl">
            {/* Section tabs */}
            <div
                className="mb-6 flex items-center gap-px rounded-full
                bg-slate-100/80 dark:bg-white/[0.05]
                ring-1 ring-slate-200/80 dark:ring-white/[0.06]
                p-[3px] w-fit"
                role="tablist"
            >
                {sectionTabs.map((tab) => {
                    const isActive = activeSection === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveSection(tab.id)}
                            className={`rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-300
                                ${
                                    isActive
                                        ? "bg-white dark:bg-white/[0.1] text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200/60 dark:ring-white/[0.1]"
                                        : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                            style={{ transitionTimingFunction: SPRING }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeSection !== "integrations" ? (
                <div
                    className="rounded-2xl border border-slate-200/70 dark:border-white/[0.07]
                    bg-white dark:bg-[#0e0e12] p-6"
                >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3481FF] mb-1.5">
                        {activeSection}
                    </p>
                    <h2 className="text-[18px] font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
                        {activeSection === "general" ? "General settings" : "Privacy settings"}
                    </h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-500">
                        Settings for this section will be available in a future update.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {INTEGRATIONS.map((item) => {
                        const isEnabled = enabledIntegrations[item.id];
                        return (
                            <article
                                key={item.id}
                                className="flex items-start gap-4 rounded-2xl
                                    border border-slate-200/70 dark:border-white/[0.07]
                                    bg-white dark:bg-[#0e0e12]
                                    p-5 transition-all duration-300
                                    hover:border-slate-300/80 dark:hover:border-white/[0.1]"
                                style={{ transitionTimingFunction: SPRING }}
                            >
                                {/* Icon */}
                                <div
                                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl
                                    bg-gradient-to-br ${item.color}
                                    text-[17px] font-bold text-white
                                    shadow-sm`}
                                >
                                    {item.icon}
                                </div>

                                {/* Body */}
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                                            {item.name}
                                        </h3>
                                        {/* Toggle */}
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={isEnabled}
                                            aria-label={`${isEnabled ? "Disable" : "Enable"} ${item.name}`}
                                            onClick={() =>
                                                setEnabledIntegrations((s) => ({
                                                    ...s,
                                                    [item.id]: !s[item.id],
                                                }))
                                            }
                                            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full
                                                transition-colors duration-300
                                                ${isEnabled ? "bg-[#3481FF]" : "bg-slate-200 dark:bg-white/[0.1]"}`}
                                            style={{ transitionTimingFunction: SPRING }}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm
                                                    transition-transform duration-300
                                                    ${isEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                                                style={{ transitionTimingFunction: SPRING }}
                                            />
                                        </button>
                                    </div>
                                    <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-500">
                                        {item.desc}
                                    </p>
                                    {isEnabled && (
                                        <span
                                            className="mt-2 inline-flex rounded-full
                                            border border-emerald-200/70 dark:border-emerald-500/20
                                            bg-emerald-50 dark:bg-emerald-500/[0.08]
                                            px-2.5 py-0.5 text-[10px] font-semibold
                                            text-emerald-700 dark:text-emerald-400"
                                        >
                                            Connected
                                        </span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
