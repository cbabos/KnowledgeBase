import React, { useState, useEffect } from 'react';
import {
  Search,
  FileText,
  MessageSquare,
  Settings,
  FolderPlus,
  Database,
  Folder,
} from 'lucide-react';
import SearchInterface from '../SearchInterface/SearchInterface';
import QnAInterface from '../QnAInterface/QnAInterface';
import SettingsInterface from '../SettingsInterface/SettingsInterface';
import IndexingInterface from '../IndexingInterface/IndexingInterface';
import ProjectsInterface from '../ProjectsInterface/ProjectsInterface';
import { MCPTool, Project } from '../../types';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { StatePersistenceProvider } from '../../contexts/StatePersistenceContext';
import styles from './App.module.css';

type Tab = 'search' | 'qa' | 'settings' | 'indexing' | 'projects';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('qa');
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadTools();
    loadProjects();
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

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProjects(data.projects || []);
        }
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const tabs = [
    { id: 'qa' as Tab, label: 'Q&A', icon: MessageSquare },
    { id: 'search' as Tab, label: 'Search', icon: Search },
    { id: 'projects' as Tab, label: 'Projects', icon: Folder },
    { id: 'indexing' as Tab, label: 'Index', icon: Database },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={`${styles.loadingSpinner} loading-spinner`}></div>
          <p className={styles.loadingText}>Loading Knowledge Base...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <StatePersistenceProvider>
        <div className={styles.app}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerInner}>
                <div className={styles.headerLeft}>
                  <img
                    src='/src/assets/logo.svg'
                    alt='Knowledge Base'
                    className={styles.logo}
                  />
                  <h1 className={styles.title}>Knowledge Base</h1>
                </div>

                {/* Tab Navigation */}
                <nav className={styles.nav}>
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${styles.navButton} ${
                          activeTab === tab.id
                            ? styles.navButtonActive
                            : styles.navButtonInactive
                        }`}
                      >
                        <Icon className={styles.navIcon} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className={styles.main}>
            <div className={styles.content}>
              {activeTab === 'qa' && (
                <QnAInterface
                  tools={tools}
                  projects={projects}
                  onSwitchToSearch={() => setActiveTab('search')}
                />
              )}
              {activeTab === 'search' && (
                <SearchInterface tools={tools} projects={projects} />
              )}
              {activeTab === 'projects' && (
                <ProjectsInterface onProjectChange={loadProjects} />
              )}
              {activeTab === 'indexing' && (
                <IndexingInterface projects={projects} />
              )}
              {activeTab === 'settings' && <SettingsInterface />}
            </div>
          </main>
        </div>
      </StatePersistenceProvider>
    </ThemeProvider>
  );
}

export default App;
