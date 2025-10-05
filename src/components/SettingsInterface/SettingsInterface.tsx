import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Shield,
  Eye,
  EyeOff,
  Download,
  Upload,
  Clock,
  Trash2,
  Palette,
  Calendar,
  Archive,
  Filter,
  Plus,
  X,
} from 'lucide-react';
import Button from '../common/Button';
import Dropdown, { DropdownOption } from '../common/Dropdown';
import Input from '../common/Input';
import ThemeToggle from '../common/ThemeToggle';
import { useStatePersistence } from '../../contexts/StatePersistenceContext';
import styles from './SettingsInterface.module.css';

const SettingsInterface: React.FC = () => {
  const { state, updateSettingsState } = useStatePersistence();
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  // Use persistent state
  const {
    settings,
    showApiKey,
    apiKey,
    retentionPolicy,
    exclusionPatterns,
    newExclusionPattern,
    newExclusionDescription,
  } = state.settings;

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('knowledge-base-settings');
    if (savedSettings) {
      updateSettingsState({
        settings: {
          ...settings,
          ...JSON.parse(savedSettings),
        },
      });
    }
    loadRetentionPolicy();
    loadExclusionPatterns();
  }, []);

  const loadRetentionPolicy = async () => {
    setIsLoadingPolicy(true);
    try {
      const request = {
        tool: 'get_retention_policy',
        arguments: {},
      };

      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success && data.data) {
        updateSettingsState({ retentionPolicy: data.data });
      }
    } catch (error) {
      console.error('Failed to load retention policy:', error);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const saveRetentionPolicy = async () => {
    setIsLoadingPolicy(true);
    try {
      const request = {
        tool: 'set_retention_policy',
        arguments: {
          policy_type: retentionPolicy.policy_type,
          value: retentionPolicy.value,
        },
      };

      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success && data.data) {
        updateSettingsState({ retentionPolicy: data.data });
        alert('Retention policy saved successfully!');
      } else {
        alert(
          'Failed to save retention policy: ' + (data.error || 'Unknown error')
        );
      }
    } catch (error) {
      console.error('Failed to save retention policy:', error);
      alert('Failed to save retention policy');
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const purgeHistory = async (dryRun = true) => {
    setIsLoadingPolicy(true);
    try {
      const request = {
        tool: 'purge_history',
        arguments: {
          dry_run: dryRun,
        },
      };

      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success && data.data) {
        const result = data.data;
        if (dryRun) {
          alert(
            `Dry run completed. Would delete ${result.versions_deleted} versions and free ${result.space_freed_bytes} bytes.`
          );
        } else {
          alert(
            `History purge completed. Deleted ${result.versions_deleted} versions and freed ${result.space_freed_bytes} bytes.`
          );
        }
      } else {
        alert('Failed to purge history: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to purge history:', error);
      alert('Failed to purge history');
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('knowledge-base-settings', JSON.stringify(settings));
    // In a real app, this would also save to the backend
    alert('Settings saved successfully!');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'knowledge-base-settings.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          updateSettingsState({
            settings: { ...settings, ...importedSettings },
          });
        } catch (error) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  const addExclusionPattern = async () => {
    const pattern = newExclusionPattern.trim();
    if (pattern && !exclusionPatterns.some(p => p.pattern === pattern)) {
      const description = newExclusionDescription.trim() || undefined;
      const success = await saveExclusionPattern(pattern, description);
      if (success) {
        updateSettingsState({
          newExclusionPattern: '',
          newExclusionDescription: '',
        });
      }
    }
  };

  const removeExclusionPattern = async (id: string) => {
    if (
      window.confirm('Are you sure you want to remove this exclusion pattern?')
    ) {
      await deleteExclusionPattern(id);
    }
  };

  const loadExclusionPatterns = async () => {
    try {
      const response = await fetch('/api/exclusion-patterns');
      const data = await response.json();
      if (data.success) {
        updateSettingsState({ exclusionPatterns: data.patterns || [] });
      }
    } catch (error) {
      console.error('Failed to load exclusion patterns:', error);
    }
  };

  const saveExclusionPattern = async (
    pattern: string,
    description?: string
  ) => {
    try {
      const response = await fetch('/api/exclusion-patterns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pattern,
          description,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadExclusionPatterns(); // Reload patterns from server
        return true;
      } else {
        alert(
          'Failed to save exclusion pattern: ' + (data.error || 'Unknown error')
        );
        return false;
      }
    } catch (error) {
      console.error('Failed to save exclusion pattern:', error);
      alert('Failed to save exclusion pattern');
      return false;
    }
  };

  const deleteExclusionPattern = async (id: string) => {
    try {
      const response = await fetch(`/api/exclusion-patterns/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        await loadExclusionPatterns(); // Reload patterns from server
        return true;
      } else {
        alert(
          'Failed to delete exclusion pattern: ' +
            (data.error || 'Unknown error')
        );
        return false;
      }
    } catch (error) {
      console.error('Failed to delete exclusion pattern:', error);
      alert('Failed to delete exclusion pattern');
      return false;
    }
  };

  // Prepare dropdown options
  const logRetentionOptions: DropdownOption[] = [
    { value: '1', label: '1 day', icon: <Calendar /> },
    { value: '7', label: '7 days', icon: <Calendar /> },
    { value: '30', label: '30 days', icon: <Calendar /> },
    { value: '90', label: '90 days', icon: <Calendar /> },
    { value: '0', label: 'Never delete', icon: <Archive /> },
  ];

  const retentionPolicyOptions: DropdownOption[] = [
    { value: 'all', label: 'Keep all versions', icon: <Archive /> },
    {
      value: 'last_n_versions',
      label: 'Keep last N versions',
      icon: <Archive />,
    },
    {
      value: 'last_n_days',
      label: 'Keep versions from last N days',
      icon: <Calendar />,
    },
  ];

  return (
    <div className={styles.container}>
      {/* Theme Settings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Palette className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Appearance</h2>
        </div>

        <div className={styles.sectionContent}>
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <h3 className={styles.formLabel}>Theme</h3>
              <p className={styles.settingDescription}>
                Choose your preferred color scheme. System will automatically
                switch between light and dark based on your system settings.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Shield className={`${styles.sectionIcon} text-primary-500`} />
          <h2 className={styles.sectionTitle}>Privacy & Security</h2>
        </div>

        <div className={styles.settingsSection}>
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <h3 className={styles.formLabel}>Local-First Processing</h3>
              <p className={styles.settingDescription}>
                Keep all processing local by default. Remote models require
                explicit opt-in.
              </p>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type='checkbox'
                checked={settings.localFirst}
                onChange={e =>
                  updateSettingsState({
                    settings: { ...settings, localFirst: e.target.checked },
                  })
                }
                className={styles.toggleInput}
              />
              <div className={styles.toggleSwitch}></div>
            </label>
          </div>

          {!settings.localFirst && (
            <div className={styles.alertWarning}>
              <div className={styles.alertContent}>
                <Eye className={styles.alertIcon} />
                <span className={styles.alertText}>
                  <strong>Warning:</strong> Remote processing may send your
                  documents to external services. Make sure you trust the
                  service and have appropriate consent.
                </span>
              </div>
            </div>
          )}

          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <Input
                label='Ollama URL'
                type='text'
                value={settings.ollamaUrl}
                onChange={e =>
                  updateSettingsState({
                    settings: { ...settings, ollamaUrl: e.target.value },
                  })
                }
                placeholder='http://localhost:11434'
              />
            </div>

            <div className={styles.formGroup}>
              <Input
                label='Ollama Model'
                type='text'
                value={settings.ollamaModel}
                onChange={e =>
                  updateSettingsState({
                    settings: { ...settings, ollamaModel: e.target.value },
                  })
                }
                placeholder='gpt-oss:20b'
              />
            </div>

            {!settings.localFirst && (
              <div className={styles.formGroup}>
                <Input
                  label='API Key (if using remote service)'
                  type='password'
                  value={apiKey}
                  onChange={e =>
                    updateSettingsState({ apiKey: e.target.value })
                  }
                  placeholder='Enter API key'
                  showPasswordToggle={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logging Settings */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Database className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Logging & Telemetry</h2>
        </div>

        <div className={styles.sectionContent}>
          <div className={styles.toggleRow}>
            <div>
              <h3 className={styles.toggleLabel}>Enable Logging</h3>
              <p className={styles.toggleDescription}>
                Log queries and operations for troubleshooting. Content is
                redacted for privacy.
              </p>
            </div>
            <label className={styles.toggleContainer}>
              <input
                type='checkbox'
                checked={settings.loggingEnabled}
                onChange={e =>
                  updateSettingsState({
                    settings: { ...settings, loggingEnabled: e.target.checked },
                  })
                }
                className={styles.toggleInput}
              />
              <div className={styles.toggleSwitch}></div>
            </label>
          </div>

          {settings.loggingEnabled && (
            <div>
              <label className={styles.formLabel}>Log Retention (days)</label>
              <Dropdown
                options={logRetentionOptions}
                value={settings.logRetentionDays.toString()}
                placeholder='Select retention period'
                icon={<Calendar />}
                onChange={value =>
                  updateSettingsState({
                    settings: {
                      ...settings,
                      logRetentionDays: parseInt(value),
                    },
                  })
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Exclusion Patterns */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Filter className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Indexing Exclusions</h2>
        </div>

        <div className={styles.sectionContent}>
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <h3 className={styles.formLabel}>Exclusion Patterns</h3>
              <p className={styles.settingDescription}>
                Define patterns to exclude files and folders from indexing. Use
                glob patterns with * for wildcards.
              </p>
            </div>
          </div>

          {/* Add New Pattern */}
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <Input
                label='Pattern'
                type='text'
                value={newExclusionPattern}
                onChange={e =>
                  updateSettingsState({ newExclusionPattern: e.target.value })
                }
                placeholder='e.g., node_modules, *.tmp, .git'
              />
            </div>

            <div className={styles.formGroup}>
              <Input
                label='Description (optional)'
                type='text'
                value={newExclusionDescription}
                onChange={e =>
                  updateSettingsState({
                    newExclusionDescription: e.target.value,
                  })
                }
                placeholder='e.g., Node.js dependencies'
              />
            </div>

            <Button
              onClick={addExclusionPattern}
              disabled={!newExclusionPattern.trim()}
              leftIcon={Plus}
              variant='primary'
            >
              Add Pattern
            </Button>
          </div>

          {/* Current Patterns */}
          {exclusionPatterns.length > 0 && (
            <div className={styles.patternsList}>
              <h3 className={styles.formLabel}>Active Exclusion Patterns:</h3>
              {exclusionPatterns.map(pattern => (
                <div key={pattern.id} className={styles.patternItem}>
                  <div className={styles.patternInfo}>
                    <div className={styles.patternText}>
                      <code className={styles.patternCode}>
                        {pattern.pattern}
                      </code>
                      {pattern.is_glob && (
                        <span className={styles.patternType}>glob</span>
                      )}
                    </div>
                    {pattern.description && (
                      <div className={styles.patternDescription}>
                        {pattern.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeExclusionPattern(pattern.id)}
                    className={styles.patternRemoveButton}
                    title='Remove pattern'
                  >
                    <X className={styles.patternRemoveIcon} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Default Patterns Info */}
          <div className={styles.patternsInfo}>
            <h4 className={styles.patternsInfoTitle}>Default Exclusions</h4>
            <p className={styles.patternsInfoText}>
              The following patterns are automatically excluded:{' '}
              <code>node_modules</code>, <code>.git</code>,{' '}
              <code>.DS_Store</code>, <code>*.tmp</code>, <code>*.log</code>
            </p>
          </div>
        </div>
      </div>

      {/* Version History Retention */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Clock className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Version History Retention</h2>
        </div>

        <div className={styles.sectionContent}>
          <div>
            <label className={styles.formLabel}>Retention Policy</label>
            <Dropdown
              options={retentionPolicyOptions}
              value={retentionPolicy.policy_type}
              placeholder='Select retention policy'
              icon={<Archive />}
              onChange={value =>
                updateSettingsState({
                  retentionPolicy: {
                    ...retentionPolicy,
                    policy_type: value,
                  },
                })
              }
            />
          </div>

          {(retentionPolicy.policy_type === 'last_n_versions' ||
            retentionPolicy.policy_type === 'last_n_days') && (
            <div className={styles.formGroup}>
              <Input
                label={
                  retentionPolicy.policy_type === 'last_n_versions'
                    ? 'Number of Versions'
                    : 'Number of Days'
                }
                type='number'
                min='1'
                value={retentionPolicy.value}
                onChange={e =>
                  updateSettingsState({
                    retentionPolicy: {
                      ...retentionPolicy,
                      value: parseInt(e.target.value) || 1,
                    },
                  })
                }
              />
            </div>
          )}

          <div className={styles.policyInfo}>
            <p className={styles.policyText}>
              <strong>Current Policy:</strong> {retentionPolicy.description}
            </p>
          </div>

          <div className={styles.buttonGroup}>
            <Button
              onClick={saveRetentionPolicy}
              disabled={isLoadingPolicy}
              loading={isLoadingPolicy}
              variant='primary'
            >
              {isLoadingPolicy ? 'Saving...' : 'Save Policy'}
            </Button>

            <Button
              onClick={() => purgeHistory(true)}
              disabled={isLoadingPolicy}
              loading={isLoadingPolicy}
              variant='warning'
            >
              {isLoadingPolicy ? 'Checking...' : 'Preview Purge'}
            </Button>

            <Button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to purge historical versions? This action cannot be undone.'
                  )
                ) {
                  purgeHistory(false);
                }
              }}
              disabled={isLoadingPolicy}
              leftIcon={Trash2}
              variant='danger'
            >
              Purge History
            </Button>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Settings className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Configuration Management</h2>
        </div>

        <div className={styles.importExportButtons}>
          <Button
            onClick={exportSettings}
            leftIcon={Download}
            variant='secondary'
          >
            Export Settings
          </Button>

          <label className={styles.importButton}>
            <span className={styles.importButtonContent}>
              <Upload className={styles.importButtonIcon} />
              Import Settings
            </span>
            <input
              type='file'
              accept='.json'
              onChange={importSettings}
              className={styles.fileInput}
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.saveButtonContainer}>
        <Button onClick={saveSettings} variant='primary'>
          Save Settings
        </Button>
      </div>

      {/* Help Text */}
      <div className={styles.helpSection}>
        <h3 className={styles.helpTitle}>Privacy & Security Notes</h3>
        <ul className={styles.helpList}>
          <li>
            • <strong>Local-First:</strong> All processing happens on your
            device by default
          </li>
          <li>
            • <strong>Remote Models:</strong> Only enable if you trust the
            service and have consent
          </li>
          <li>
            • <strong>Logging:</strong> When enabled, document content is
            redacted from logs
          </li>
          <li>
            • <strong>API Keys:</strong> Stored securely using your OS keychain
            when possible
          </li>
          <li>
            • <strong>Data Retention:</strong> Configure how long logs are kept
            locally
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsInterface;
