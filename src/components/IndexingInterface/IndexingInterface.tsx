import React, { useEffect, useRef, useState } from 'react';
import {
  FolderPlus,
  Database,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Edit3,
  X,
  Folder,
} from 'lucide-react';
import { IndexingResult, Project } from '../../types';
import Button from '../common/Button';
import Dropdown, { DropdownOption } from '../common/Dropdown';
import { useStatePersistence } from '../../contexts/StatePersistenceContext';
import styles from './IndexingInterface.module.css';

interface IndexingInterfaceProps {
  projects: Project[];
}

const IndexingInterface: React.FC<IndexingInterfaceProps> = ({ projects }) => {
  const { state, updateIndexingState } = useStatePersistence();
  const foldersRef = useRef<string[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexedFolders, setIndexedFolders] = useState<
    Array<{
      path: string;
      file_count: number;
      last_indexed?: string;
      project_id?: string;
    }>
  >([]);

  // Use persistent state
  const {
    folders,
    newFolder,
    selectedProject,
    indexingResult,
    showReassignModal,
    selectedFolder,
    newProjectId,
  } = state.indexing;

  const loadIndexedFolders = async () => {
    try {
      const res = await fetch('/api/index/folders');
      const data = await res.json();
      if (data.success) {
        setIndexedFolders(
          (data.folders || []).map((folder: any) => ({
            path: folder.path,
            file_count: folder.file_count,
            last_indexed: folder.last_indexed,
            project_id: folder.project_id,
          }))
        );
      }
    } catch {}
  };

  useEffect(() => {
    loadIndexedFolders();
  }, []);

  const addFolder = () => {
    const trimmed = newFolder.trim();
    if (trimmed && !foldersRef.current.includes(trimmed) && selectedProject) {
      const updated = [...folders, trimmed];
      foldersRef.current = updated;
      updateIndexingState({
        folders: updated,
        newFolder: '',
      });
    }
  };

  const removeFolder = (index: number) => {
    const updated = folders.filter((_, i) => i !== index);
    foldersRef.current = updated;
    updateIndexingState({ folders: updated });
  };

  const reindexFolder = async (folderPath: string, projectId?: string) => {
    setIsIndexing(true);
    setError(null);
    updateIndexingState({ indexingResult: null });

    try {
      const request = {
        folders: [folderPath],
        project_id: projectId || null,
      };

      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success) {
        updateIndexingState({ indexingResult: data.result });
        await loadIndexedFolders();
      } else {
        setError(data.error || 'Reindexing failed');
      }
    } catch (error) {
      setError('Failed to reindex folder');
      console.error('Reindexing error:', error);
    } finally {
      setIsIndexing(false);
    }
  };

  const startIndexing = async (paths?: string[]) => {
    const base = paths && paths.length ? paths : foldersRef.current;
    const foldersToIndex = base.map(f => f.trim()).filter(Boolean);
    if (foldersToIndex.length === 0) {
      setError('Please add at least one folder to index');
      return;
    }

    if (!selectedProject) {
      setError('Please select a project before indexing');
      return;
    }

    setIsIndexing(true);
    setError(null);
    updateIndexingState({ indexingResult: null });

    try {
      const request = {
        folders: foldersToIndex,
        project_id: selectedProject,
      };

      const response = await fetch('/api/index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success) {
        updateIndexingState({ indexingResult: data.result });
        await loadIndexedFolders();
      } else {
        setError(data.error || 'Indexing failed');
      }
    } catch (err) {
      setError('Failed to start indexing');
      console.error('Indexing error:', err);
    } finally {
      setIsIndexing(false);
    }
  };

  const getStatusIcon = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return <CheckCircle className={styles.statusIconSuccess} />;
      case 'warning':
        return <AlertCircle className={styles.statusIconWarning} />;
      case 'error':
        return <XCircle className={styles.statusIconError} />;
    }
  };

  const getStatusColor = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
    }
  };

  const handleReassignProject = async () => {
    if (!selectedFolder) return;

    try {
      const response = await fetch(
        `/api/index/folders?path=${encodeURIComponent(selectedFolder.path)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: newProjectId || null,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        await loadIndexedFolders();
        updateIndexingState({
          showReassignModal: false,
          selectedFolder: null,
          newProjectId: '',
        });
      } else {
        setError(data.error || 'Failed to reassign project');
      }
    } catch (err) {
      setError('Failed to reassign project');
      console.error('Reassign error:', err);
    }
  };

  const openReassignModal = (folder: { path: string; project_id?: string }) => {
    updateIndexingState({
      selectedFolder: folder,
      newProjectId: folder.project_id || '',
      showReassignModal: true,
    });
  };

  // Prepare dropdown options for project selection
  const projectOptions: DropdownOption[] = [
    { value: '', label: 'Choose a project...', icon: <Folder /> },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
      icon: <Folder />,
    })),
  ];

  // Prepare dropdown options for reassign modal
  const reassignProjectOptions: DropdownOption[] = [
    { value: '', label: 'No Project (Unassigned)', icon: <Folder /> },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
      icon: <Folder />,
    })),
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Database className={styles.headerIcon} />
          <h1 className={styles.headerTitle}>Indexing</h1>
        </div>
        <Button
          onClick={loadIndexedFolders}
          leftIcon={RefreshCw}
          variant='secondary'
        >
          Refresh
        </Button>
      </div>

      {/* Folder Management */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <FolderPlus className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Corpus Folders</h2>
        </div>

        <div className={styles.formSection}>
          {/* Project Selection */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Select Project *</label>
            <Dropdown
              options={projectOptions}
              value={selectedProject}
              placeholder='Choose a project...'
              icon={<Folder />}
              onChange={value =>
                updateIndexingState({ selectedProject: value })
              }
              disabled={projects.length === 0}
            />
            {projects.length === 0 && (
              <p className={styles.formHelpText}>
                No projects available. Create a project first in the Projects
                tab.
              </p>
            )}
          </div>

          {/* Add Folder */}
          <div className={styles.addFolderContainer}>
            <div className={styles.addFolderInput}>
              <input
                type='text'
                value={newFolder}
                onChange={e =>
                  updateIndexingState({ newFolder: e.target.value })
                }
                onKeyPress={e => e.key === 'Enter' && addFolder()}
                placeholder='Enter folder path (e.g., /Users/username/notes)'
                className={styles.formInput}
                disabled={!selectedProject}
              />
            </div>
            <Button
              onClick={addFolder}
              disabled={!newFolder.trim() || !selectedProject}
              leftIcon={FolderPlus}
              variant='primary'
            >
              Add
            </Button>
          </div>

          {/* Folder List */}
          {folders.length > 0 && (
            <div className={styles.foldersList}>
              <h3 className={styles.formLabel}>Folders to Index:</h3>
              {folders.map((folder, index) => (
                <div key={index} className={styles.folderItem}>
                  <span className={styles.folderPath}>{folder}</span>
                  <button
                    onClick={() => removeFolder(index)}
                    className={`${styles.folderActionButton} ${styles.folderActionButtonDanger}`}
                  >
                    <XCircle className={styles.folderActionIcon} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Indexing Controls */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Database className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Index Management</h2>
        </div>

        <div className={styles.buttonGroup}>
          <Button
            onClick={() => startIndexing()}
            disabled={isIndexing || folders.length === 0 || !selectedProject}
            loading={isIndexing}
            leftIcon={Database}
            variant='primary'
          >
            {isIndexing ? 'Indexing...' : 'Build Index'}
          </Button>

          {indexingResult && (
            <Button
              onClick={() => startIndexing()}
              disabled={isIndexing}
              leftIcon={RefreshCw}
              variant='secondary'
            >
              Re-index
            </Button>
          )}
        </div>

        {folders.length === 0 && (
          <p className={styles.helpText}>
            Add folders above to start indexing your knowledge base.
          </p>
        )}
      </div>

      {/* Indexed Folders */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Database className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Indexed Folders</h2>
        </div>
        {indexedFolders.length === 0 ? (
          <p className={styles.emptyText}>No folders indexed yet.</p>
        ) : (
          <div className={styles.indexedFoldersList}>
            {indexedFolders.map((f, i) => {
              const project = projects.find(p => p.id === f.project_id);
              return (
                <div key={i} className={styles.indexedFolderItem}>
                  <div className={styles.indexedFolderInfo}>
                    <div className={styles.indexedFolderPath}>{f.path}</div>
                    <div className={styles.indexedFolderMeta}>
                      Files: {f.file_count}
                      {project && ` • Project: ${project.name}`}
                      {f.last_indexed
                        ? ` • Last indexed: ${new Date(f.last_indexed).toLocaleString()}`
                        : ''}
                    </div>
                  </div>
                  <div className={styles.indexedFolderActions}>
                    <Button
                      onClick={async () => {
                        await reindexFolder(f.path, f.project_id);
                      }}
                      variant='secondary'
                      size='sm'
                    >
                      Reindex
                    </Button>
                    <Button
                      onClick={() => openReassignModal(f)}
                      leftIcon={Edit3}
                      variant='primary'
                      size='sm'
                    >
                      Change Project
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          window.confirm(
                            'Remove this folder and purge its indexed documents?'
                          )
                        ) {
                          await fetch(
                            `/api/index/folders?path=${encodeURIComponent(f.path)}`,
                            { method: 'DELETE' }
                          );
                          await loadIndexedFolders();
                        }
                      }}
                      variant='danger'
                      size='sm'
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorAlert}>
          <div className={styles.errorContent}>
            <XCircle className={styles.errorIcon} />
            <span className={styles.errorText}>{error}</span>
          </div>
        </div>
      )}

      {/* Indexing Results */}
      {indexingResult && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CheckCircle className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Indexing Results</h2>
          </div>

          <div className={styles.resultsGrid}>
            <div className={styles.resultCard}>
              {getStatusIcon('success')}
              <div className={styles.resultContent}>
                <p className={styles.resultLabel}>Files Processed</p>
                <p className={styles.resultValue}>
                  {indexingResult.files_processed}
                </p>
              </div>
            </div>

            <div className={styles.resultCard}>
              {getStatusIcon('warning')}
              <div className={styles.resultContent}>
                <p className={styles.resultLabel}>Files Skipped</p>
                <p className={styles.resultValue}>
                  {indexingResult.files_skipped}
                </p>
              </div>
            </div>

            <div className={styles.resultCard}>
              {getStatusIcon('error')}
              <div className={styles.resultContent}>
                <p className={styles.resultLabel}>Files Failed</p>
                <p className={styles.resultValue}>
                  {indexingResult.files_failed}
                </p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {indexingResult.errors.length > 0 && (
            <div className={styles.errorsSection}>
              <h3 className={styles.errorsTitle}>
                Errors ({indexingResult.errors.length}):
              </h3>
              <div className={styles.errorsList}>
                {indexingResult.errors.map((error, index) => (
                  <div key={index} className={styles.errorItem}>
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className={styles.helpSection}>
        <h3 className={styles.helpTitle}>About Indexing</h3>
        <ul className={styles.helpList}>
          <li>
            • Add folders containing your notes, documents, and knowledge files
          </li>
          <li>
            • Supported file types: .md, .txt, .pdf (basic text extraction)
          </li>
          <li>
            • The system will automatically exclude common directories like
            node_modules, .git
          </li>
          <li>
            • Indexing creates searchable chunks and extracts metadata like
            titles and tags
          </li>
          <li>• Re-index when you add or modify files in your folders</li>
        </ul>
      </div>

      {/* Reassign Project Modal */}
      {showReassignModal && selectedFolder && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => {
              updateIndexingState({
                showReassignModal: false,
                selectedFolder: null,
                newProjectId: '',
              });
            }}
          />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Change Project Assignment</h3>
              <button
                onClick={() => {
                  updateIndexingState({
                    showReassignModal: false,
                    selectedFolder: null,
                    newProjectId: '',
                  });
                }}
                className={styles.modalCloseButton}
              >
                <X className={styles.modalCloseIcon} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <p className={styles.modalDescription}>
                  Folder:{' '}
                  <span className={styles.modalFolderPath}>
                    {selectedFolder.path}
                  </span>
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Assign to Project</label>
                <Dropdown
                  options={reassignProjectOptions}
                  value={newProjectId}
                  placeholder='No Project (Unassigned)'
                  icon={<Folder />}
                  onChange={value =>
                    updateIndexingState({ newProjectId: value })
                  }
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button
                onClick={() => {
                  updateIndexingState({
                    showReassignModal: false,
                    selectedFolder: null,
                    newProjectId: '',
                  });
                }}
                variant='secondary'
              >
                Cancel
              </Button>
              <Button onClick={handleReassignProject} variant='primary'>
                Update Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndexingInterface;
