import { useState } from 'react';
import { Calendar, MoreVertical } from 'lucide-react';

type ActionItem = {
  id: number;
  text: string;
  context?: string;
  date?: string;
  dateDesc?: string;
  user: string | null;
  completed: boolean;
};

const ACTIONS: ActionItem[] = [
  { id: 1, text: 'Tasks 2', context: 'Marketing', user: null, completed: false },
  {
    id: 2,
    text: 'Create a Slack channel with Sales and Customer Teams',
    date: '14 April',
    user: 'Sarah',
    completed: false,
  },
  {
    id: 3,
    text: 'Sync Holaspirit with Slack',
    context: 'Customer Services in Growth',
    user: 'Paul',
    completed: false,
  },
  { id: 4, text: 'Fill in the Doodle survey', user: 'Felix', completed: false },
  {
    id: 5,
    text: 'Fill in the Doodle survey',
    dateDesc: 'Completed on Mar 28, 2022',
    user: 'Maria',
    completed: true,
  },
  { id: 6, text: 'Fill in the doodle', user: 'Anna', completed: false },
  {
    id: 7,
    text: 'Gather case studies',
    context: 'Customer Support in Custom...',
    user: 'Bob',
    completed: false,
  },
  {
    id: 8,
    text: 'Organize case studies and review them',
    context: 'Customer Support in Custom...',
    user: 'Bob',
    completed: false,
  },
  {
    id: 9,
    text: 'Update the KPI we need as a SaaS business',
    context: 'CEO in Holaspiriters',
    user: 'John',
    completed: false,
  },
];

type ActionsFilter = 'mine' | 'completed' | 'all';
type SortOption = 'newest' | 'assignee';

export default function ActionsList() {
  const [activeFilter, setActiveFilter] = useState<ActionsFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const visibleActions = [...ACTIONS]
    .filter((action) => {
      if (activeFilter === 'mine') {
        return action.user === 'Felix';
      }

      if (activeFilter === 'completed') {
        return action.completed;
      }

      return true;
    })
    .sort((leftAction, rightAction) => {
      if (sortBy === 'assignee') {
        return (leftAction.user ?? 'ZZZ').localeCompare(rightAction.user ?? 'ZZZ');
      }

      return rightAction.id - leftAction.id;
    });

  const filterTabs: Array<{ id: ActionsFilter; label: string }> = [
    { id: 'mine', label: 'My actions' },
    { id: 'completed', label: 'Completed actions' },
    { id: 'all', label: 'All actions' },
  ];

  return (
    <div className="mt-4 flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-4 py-4 sm:gap-6 sm:px-6">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-primary pb-2 text-slate-800 sm:pb-4'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-500">Sort by</span>
          <button
            type="button"
            onClick={() =>
              setSortBy((currentSort) =>
                currentSort === 'newest' ? 'assignee' : 'newest',
              )
            }
            className="text-sm font-medium text-slate-800 transition-colors hover:text-primary"
            aria-label={`Sort actions by ${sortBy === 'newest' ? 'assignee' : 'newest'}`}
          >
            {sortBy === 'newest' ? 'Newest' : 'Assignee'} ⌄
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-auto">
        {visibleActions.map((action) => (
          <div
            key={action.id}
            className="group flex flex-col gap-3 border-b border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-6 lg:flex-row lg:items-center lg:gap-4"
          >
            <div className="flex items-start gap-4 lg:flex-1">
              <button
                type="button"
                aria-label={`${action.completed ? 'Mark as incomplete' : 'Mark as complete'}: ${action.text}`}
                aria-pressed={action.completed}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  action.completed
                    ? 'border-primary bg-primary'
                    : 'border-slate-300 bg-white group-hover:border-primary'
                }`}
              >
                {action.completed && (
                  <svg
                    className="h-3.5 w-3.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <h4
                  className={`text-sm font-medium leading-snug ${
                    action.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}
                >
                  {action.text}
                </h4>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              {action.date ? (
                <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <Calendar size={12} aria-hidden="true" />
                  {action.date}
                </div>
              ) : action.dateDesc ? (
                <span className="text-xs text-slate-400">{action.dateDesc}</span>
              ) : (
                <span className="text-xs text-slate-300">No due date</span>
              )}

              <div className="max-w-[12rem] truncate px-0 text-xs text-slate-400 sm:px-2 lg:text-right">
                {action.context || 'no role'}
              </div>

              {action.user ? (
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-200">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${action.user}`}
                    alt={`Avatar for ${action.user}`}
                    className="h-full w-full"
                    loading="lazy"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={`Assign owner to ${action.text}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-primary hover:text-primary"
                >
                  +
                </button>
              )}

              <button
                type="button"
                aria-label={`Open actions menu for ${action.text}`}
                className="rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <MoreVertical size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
