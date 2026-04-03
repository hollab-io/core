import { HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { NAV_ITEMS, type AppTabId } from '../config/navigation';

type SidebarProps = {
  activeTab: AppTabId;
  setActiveTab: (tab: AppTabId) => void;
};

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <aside
      className="z-20 flex h-full w-16 flex-col items-center bg-white dark:bg-slate-900 py-6 border-r border-slate-200 dark:border-slate-800 text-slate-500 transition-colors duration-300 sm:w-[72px]"
      aria-label="Primary navigation"
    >
      <button
        type="button"
        className="mb-10 flex h-10 w-10 items-center justify-center rounded-xl bg-[#3481FF] shadow-lg shadow-blue-500/20"
        aria-label="Open workspace home"
      >
        <div className="text-white">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79l4.79 4.79v1.1c0 .94.76 1.7 1.7 1.7v2.13zm6.44-3.52c-.3-.23-.69-.41-1.14-.54l-1.3-.39v-1.1c0-.94-.76-1.7-1.7-1.7h-2.13v-2.14l4.79-4.79c.13.58.21 1.17.21 1.79 0 4.08-3.05 7.44-7 7.93v2.13c4.94-.5 8.94-4.5 9.44-9.44h2.13a9.914 9.914 0 01-3.44 8.21z" />
          </svg>
        </div>
      </button>

      <nav className="relative flex w-full flex-1 flex-col items-center gap-4" aria-label="Main sections">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                isActive
                  ? 'text-[#3481FF] bg-[#F4F8FF] dark:bg-blue-500/10'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 w-1 h-8 bg-[#3481FF] rounded-r-full"
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                />
              )}
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className="relative z-10"
                aria-hidden="true"
              />
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-6">
        <button
          type="button"
          aria-label="Open help"
          className="text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
        >
          <HelpCircle size={24} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="h-10 w-10 rounded-full border-2 border-slate-100 dark:border-slate-800 p-[2px] transition-transform hover:scale-105"
          aria-label="Open user profile"
        >
          <div className="h-full w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Avatar for Felix"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </button>
      </div>
    </aside>
  );
}
