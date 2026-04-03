import { useState } from 'react';

const INTEGRATIONS = [
  {
    id: 'trello',
    name: 'Trello',
    desc: 'Trello is a task management app that gives you a visual overview of what is being worked on and who is working on it. It uses the Kanban system to keep production levels high and maintain flexibility.',
    iconBg: 'bg-blue-500',
    icon: 'T',
  },
  {
    id: 'asana',
    name: 'Asana',
    desc: "Asana allows you to plan and structure work in a way that's best for you. Set priorities and deadlines, share details, and assign tasks all in one place.",
    iconBg: 'bg-orange-500',
    icon: 'A',
  },
  {
    id: 'jira',
    name: 'Jira',
    desc: 'Jira is an agile project management tool that supports any agile methodology, be it scrum, kanban, or your own unique flavor. From agile boards to reports, you can plan, track, and manage all your agile software development projects from a single tool.',
    iconBg: 'bg-blue-600',
    icon: 'J',
  },
  {
    id: 'basecamp',
    name: 'Basecamp 3',
    desc: "Basecamp is a real-time communication tool that helps teams stay on the same page. It's less useful for traditional project management tasks (e.g., resource planning and long-term scheduling).",
    iconBg: 'bg-green-500',
    icon: 'B',
  },
  {
    id: 'slack',
    name: 'Slack',
    desc: 'Holaspirit will generate automatic messages in a specific Slack channel for the following triggers: project creation/update, role and circle creation/update/deletion, policy creation/update/deletion, election in a core role.',
    iconBg: 'bg-indigo-500',
    icon: 'S',
  },
];

type SettingsSection = 'general' | 'privacy' | 'integrations';

export default function IntegrationsSettings() {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('integrations');
  const [enabledIntegrations, setEnabledIntegrations] = useState<
    Record<string, boolean>
  >({
    trello: false,
    asana: true,
    jira: false,
    basecamp: false,
    slack: false,
  });

  const sectionTabs: Array<{ id: SettingsSection; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'integrations', label: 'Integrations' },
  ];

  const toggleIntegration = (integrationId: string) => {
    setEnabledIntegrations((currentState) => ({
      ...currentState,
      [integrationId]: !currentState[integrationId],
    }));
  };

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8 flex flex-wrap gap-6 border-b border-slate-200 px-2" role="tablist">
        {sectionTabs.map((tab) => {
          const isActive = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSection(tab.id)}
              className={`pb-4 font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection !== 'integrations' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            {activeSection === 'general' ? 'General settings' : 'Privacy settings'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This panel now switches sections correctly. Detailed settings content can
            be added here without leaving the user on a fake active tab.
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          {INTEGRATIONS.map((item) => {
            const isEnabled = enabledIntegrations[item.id];

            return (
              <article
                key={item.id}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:gap-6 sm:p-6"
              >
                <div
                  className={`mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-sm ${item.iconBg}`}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">{item.name}</h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`${isEnabled ? 'Disable' : 'Enable'} ${item.name}`}
                      onClick={() => toggleIntegration(item.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-primary' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full border border-slate-200 bg-white transition-transform ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
