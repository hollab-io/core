import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { type AppTabId, TAB_DESCRIPTIONS, TAB_TITLES } from './config/navigation';
import ActionsList from './views/ActionsList';
import IntegrationsSettings from './views/IntegrationsSettings';
import OKRsTree from './views/OKRsTree';
import OrganizationChart from './views/OrganizationChart';
import PlaceholderView from './views/PlaceholderView';
import ProjectsBoard from './views/ProjectsBoard';

function App() {
  const [activeTab, setActiveTab] = useState<AppTabId>('chart');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const renderContent = () => {
    switch (activeTab) {
      case 'chart':
        return <OrganizationChart searchQuery={searchQuery} />;
      case 'projects':
        return <ProjectsBoard />;
      case 'okrs':
        return <OKRsTree />;
      case 'settings':
        return <IntegrationsSettings />;
      case 'actions':
        return <ActionsList />;
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
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-slate-950 font-sans transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        <Topbar 
          activeTab={activeTab} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
        <main className="custom-scrollbar min-w-0 flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/40 p-4 sm:p-6 transition-colors duration-300">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
