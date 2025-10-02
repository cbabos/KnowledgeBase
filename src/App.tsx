import React, { useState, useEffect } from 'react';
import { Search, FileText, MessageSquare, Settings, FolderPlus, Database } from 'lucide-react';
import SearchInterface from './components/SearchInterface';
import QnAInterface from './components/QnAInterface';
import SettingsInterface from './components/SettingsInterface';
import IndexingInterface from './components/IndexingInterface';
import { MCPTool } from './types';

type Tab = 'search' | 'qa' | 'settings' | 'indexing';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const response = await fetch('/api/tools');
      if (response.ok) {
        const toolsData = await response.json();
        setTools(toolsData);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'search' as Tab, label: 'Search', icon: Search },
    { id: 'qa' as Tab, label: 'Q&A', icon: MessageSquare },
    { id: 'indexing' as Tab, label: 'Index', icon: Database },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Knowledge Base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary-500 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Knowledge Base
              </h1>
            </div>
            
            {/* Tab Navigation */}
            <nav className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="fade-in">
          {activeTab === 'search' && <SearchInterface tools={tools} />}
          {activeTab === 'qa' && <QnAInterface tools={tools} />}
          {activeTab === 'indexing' && <IndexingInterface />}
          {activeTab === 'settings' && <SettingsInterface />}
        </div>
      </main>
    </div>
  );
}

export default App;
