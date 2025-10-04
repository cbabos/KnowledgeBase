import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Folder,
  Calendar,
  FileText,
  X,
} from 'lucide-react';
import { Project } from '../../types';
import Button from '../common/Button';
import { useStatePersistence } from '../../contexts/StatePersistenceContext';
import styles from './ProjectsInterface.module.css';

interface ProjectsInterfaceProps {
  onProjectChange: () => void;
}

const ProjectsInterface: React.FC<ProjectsInterfaceProps> = ({
  onProjectChange,
}) => {
  const { state, updateProjectsState } = useStatePersistence();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use persistent state
  const { showCreateModal, showEditModal, editingProject, newProject } =
    state.projects;

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/projects');
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
      } else {
        setError(data.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      const data = await response.json();

      if (data.success) {
        setProjects([...projects, data.project]);
        updateProjectsState({
          newProject: { name: '', description: '' },
          showCreateModal: false,
        });
        setError(null);
        onProjectChange(); // Notify parent component
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to create project');
      console.error('Error creating project:', err);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editingProject.name.trim()) return;

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingProject.name,
          description: editingProject.description,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProjects(
          projects.map(p => (p.id === editingProject.id ? data.project : p))
        );
        updateProjectsState({
          editingProject: null,
          showEditModal: false,
        });
        setError(null);
        onProjectChange(); // Notify parent component
      } else {
        setError(data.error || 'Failed to update project');
      }
    } catch (err) {
      setError('Failed to update project');
      console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setProjects(projects.filter(p => p.id !== project.id));
        setError(null);
        onProjectChange(); // Notify parent component
      } else {
        setError(data.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('Failed to delete project');
      console.error('Error deleting project:', err);
    }
  };

  const openEditModal = (project: Project) => {
    updateProjectsState({
      editingProject: { ...project },
      showEditModal: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={`${styles.loadingSpinner} loading-spinner`}></div>
        <p className={styles.loadingText}>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Folder className={styles.headerIcon} />
          <h1 className={styles.headerTitle}>Projects</h1>
        </div>
        <Button
          onClick={() => updateProjectsState({ showCreateModal: true })}
          leftIcon={Plus}
          variant='primary'
        >
          New Project
        </Button>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <p className={styles.errorText}>{error}</p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className={styles.emptyState}>
          <Folder className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No projects yet</h3>
          <p className={styles.emptyDescription}>
            Create your first project to start organizing your knowledge base
          </p>
          <Button
            onClick={() => updateProjectsState({ showCreateModal: true })}
            leftIcon={Plus}
            variant='primary'
          >
            Create Project
          </Button>
        </div>
      ) : (
        <div className={styles.projectsGrid}>
          {projects.map(project => (
            <div key={project.id} className={styles.projectCard}>
              <div className={styles.projectHeader}>
                <div className={styles.projectInfo}>
                  <h3 className={styles.projectName}>{project.name}</h3>
                  {project.description && (
                    <p className={styles.projectDescription}>
                      {project.description}
                    </p>
                  )}
                </div>
                <div className={styles.projectActions}>
                  <Button
                    onClick={() => openEditModal(project)}
                    variant='ghost'
                    size='sm'
                    title='Edit project'
                  >
                    <Edit2 />
                  </Button>
                  <Button
                    onClick={() => handleDeleteProject(project)}
                    variant='danger'
                    size='sm'
                    title='Delete project'
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className={styles.projectMeta}>
                <div className={styles.metaItem}>
                  <Calendar className={styles.metaIcon} />
                  Created: {formatDate(project.created_at)}
                </div>
                <div className={styles.metaItem}>
                  <Calendar className={styles.metaIcon} />
                  Updated: {formatDate(project.updated_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => updateProjectsState({ showCreateModal: false })}
          />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Project</h2>
              <button
                onClick={() => updateProjectsState({ showCreateModal: false })}
                className={styles.modalCloseButton}
              >
                <X className={styles.modalCloseIcon} />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Project Name *</label>
                  <input
                    type='text'
                    value={newProject.name}
                    onChange={e =>
                      updateProjectsState({
                        newProject: { ...newProject, name: e.target.value },
                      })
                    }
                    className={styles.formInput}
                    placeholder='Enter project name'
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={e =>
                      updateProjectsState({
                        newProject: {
                          ...newProject,
                          description: e.target.value,
                        },
                      })
                    }
                    className={styles.formTextarea}
                    placeholder='Enter project description (optional)'
                    rows={3}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button
                  type='button'
                  onClick={() =>
                    updateProjectsState({ showCreateModal: false })
                  }
                  variant='secondary'
                >
                  Cancel
                </Button>
                <Button type='submit' variant='primary'>
                  Create Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className={styles.modal}>
          <div
            className={styles.modalBackdrop}
            onClick={() => updateProjectsState({ showEditModal: false })}
          />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Project</h2>
              <button
                onClick={() => updateProjectsState({ showEditModal: false })}
                className={styles.modalCloseButton}
              >
                <X className={styles.modalCloseIcon} />
              </button>
            </div>
            <form onSubmit={handleUpdateProject}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Project Name *</label>
                  <input
                    type='text'
                    value={editingProject.name}
                    onChange={e =>
                      updateProjectsState({
                        editingProject: {
                          ...editingProject,
                          name: e.target.value,
                        },
                      })
                    }
                    className={styles.formInput}
                    placeholder='Enter project name'
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    value={editingProject.description || ''}
                    onChange={e =>
                      updateProjectsState({
                        editingProject: {
                          ...editingProject,
                          description: e.target.value,
                        },
                      })
                    }
                    className={styles.formTextarea}
                    placeholder='Enter project description (optional)'
                    rows={3}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <Button
                  type='button'
                  onClick={() => updateProjectsState({ showEditModal: false })}
                  variant='secondary'
                >
                  Cancel
                </Button>
                <Button type='submit' variant='primary'>
                  Update Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsInterface;
