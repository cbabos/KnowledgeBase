import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// Define the state structure for each interface
interface QnAState {
  question: string;
  answer: any | null;
  activeProject: any | null;
  showCitations: boolean;
  copied: boolean;
}

interface SearchState {
  query: string;
  results: any[];
  showFilters: boolean;
  filters: any;
  includeHistorical: boolean;
  selectedResult: any | null;
  documentContent: string;
}

interface ProjectsState {
  showCreateModal: boolean;
  showEditModal: boolean;
  editingProject: any | null;
  newProject: { name: string; description: string };
}

interface IndexingState {
  folders: string[];
  newFolder: string;
  selectedProject: string;
  indexingResult: any | null;
  showReassignModal: boolean;
  selectedFolder: any | null;
  newProjectId: string;
}

interface SettingsState {
  settings: {
    localFirst: boolean;
    loggingEnabled: boolean;
    logRetentionDays: number;
    ollamaUrl: string;
    ollamaModel: string;
  };
  showApiKey: boolean;
  apiKey: string;
  retentionPolicy: any;
  exclusionPatterns: any[];
  newExclusionPattern: string;
  newExclusionDescription: string;
}

// Combined state interface
interface AppState {
  qa: QnAState;
  search: SearchState;
  projects: ProjectsState;
  indexing: IndexingState;
  settings: SettingsState;
}

// Default states
const defaultQnAState: QnAState = {
  question: '',
  answer: null,
  activeProject: null,
  showCitations: false,
  copied: false,
};

const defaultSearchState: SearchState = {
  query: '',
  results: [],
  showFilters: false,
  filters: {},
  includeHistorical: false,
  selectedResult: null,
  documentContent: '',
};

const defaultProjectsState: ProjectsState = {
  showCreateModal: false,
  showEditModal: false,
  editingProject: null,
  newProject: { name: '', description: '' },
};

const defaultIndexingState: IndexingState = {
  folders: [],
  newFolder: '',
  selectedProject: '',
  indexingResult: null,
  showReassignModal: false,
  selectedFolder: null,
  newProjectId: '',
};

const defaultSettingsState: SettingsState = {
  settings: {
    localFirst: true,
    loggingEnabled: false,
    logRetentionDays: 7,
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'gpt-oss:20b',
  },
  showApiKey: false,
  apiKey: '',
  retentionPolicy: {
    policy_type: 'all',
    value: 0,
    description: 'Keep all versions (default)',
  },
  exclusionPatterns: [],
  newExclusionPattern: '',
  newExclusionDescription: '',
};

const defaultState: AppState = {
  qa: defaultQnAState,
  search: defaultSearchState,
  projects: defaultProjectsState,
  indexing: defaultIndexingState,
  settings: defaultSettingsState,
};

// Context type
interface StatePersistenceContextType {
  state: AppState;
  updateQnAState: (updates: Partial<QnAState>) => void;
  updateSearchState: (updates: Partial<SearchState>) => void;
  updateProjectsState: (updates: Partial<ProjectsState>) => void;
  updateIndexingState: (updates: Partial<IndexingState>) => void;
  updateSettingsState: (updates: Partial<SettingsState>) => void;
  resetInterfaceState: (interfaceName: keyof AppState) => void;
  resetAllStates: () => void;
}

// Create context
const StatePersistenceContext = createContext<
  StatePersistenceContextType | undefined
>(undefined);

// Storage key
const STORAGE_KEY = 'knowledge-base-interface-states';

// Provider component
interface StatePersistenceProviderProps {
  children: ReactNode;
}

export const StatePersistenceProvider: React.FC<
  StatePersistenceProviderProps
> = ({ children }) => {
  const [state, setState] = useState<AppState>(defaultState);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Merge with defaults to handle new properties
        setState(prevState => ({
          qa: { ...defaultQnAState, ...parsedState.qa },
          search: { ...defaultSearchState, ...parsedState.search },
          projects: { ...defaultProjectsState, ...parsedState.projects },
          indexing: { ...defaultIndexingState, ...parsedState.indexing },
          settings: { ...defaultSettingsState, ...parsedState.settings },
        }));
      }
    } catch (error) {
      console.error('Failed to load saved state:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [state]);

  // Update functions for each interface
  const updateQnAState = (updates: Partial<QnAState>) => {
    setState(prevState => ({
      ...prevState,
      qa: { ...prevState.qa, ...updates },
    }));
  };

  const updateSearchState = (updates: Partial<SearchState>) => {
    setState(prevState => ({
      ...prevState,
      search: { ...prevState.search, ...updates },
    }));
  };

  const updateProjectsState = (updates: Partial<ProjectsState>) => {
    setState(prevState => ({
      ...prevState,
      projects: { ...prevState.projects, ...updates },
    }));
  };

  const updateIndexingState = (updates: Partial<IndexingState>) => {
    setState(prevState => ({
      ...prevState,
      indexing: { ...prevState.indexing, ...updates },
    }));
  };

  const updateSettingsState = (updates: Partial<SettingsState>) => {
    setState(prevState => ({
      ...prevState,
      settings: { ...prevState.settings, ...updates },
    }));
  };

  // Reset functions
  const resetInterfaceState = (interfaceName: keyof AppState) => {
    setState(prevState => ({
      ...prevState,
      [interfaceName]: defaultState[interfaceName],
    }));
  };

  const resetAllStates = () => {
    setState(defaultState);
  };

  const contextValue: StatePersistenceContextType = {
    state,
    updateQnAState,
    updateSearchState,
    updateProjectsState,
    updateIndexingState,
    updateSettingsState,
    resetInterfaceState,
    resetAllStates,
  };

  return (
    <StatePersistenceContext.Provider value={contextValue}>
      {children}
    </StatePersistenceContext.Provider>
  );
};

// Custom hook to use the context
export const useStatePersistence = (): StatePersistenceContextType => {
  const context = useContext(StatePersistenceContext);
  if (context === undefined) {
    throw new Error(
      'useStatePersistence must be used within a StatePersistenceProvider'
    );
  }
  return context;
};

export default StatePersistenceContext;
