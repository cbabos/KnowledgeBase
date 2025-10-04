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
} from 'lucide-react';
import Button from '../common/Button';
import Dropdown, { DropdownOption } from '../common/Dropdown';
import ThemeToggle from '../common/ThemeToggle';
import { useStatePersistence } from '../../contexts/StatePersistenceContext';
import styles from './SettingsInterface.module.css';

const SettingsInterface: React.FC = () => {
  const { state, updateSettingsState } = useStatePersistence();
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  // Use persistent state
  const { settings, showApiKey, apiKey, retentionPolicy } = state.settings;

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
              <label className={styles.formLabel}>Ollama URL</label>
              <input
                type='text'
                value={settings.ollamaUrl}
                onChange={e =>
                  updateSettingsState({
                    settings: { ...settings, ollamaUrl: e.target.value },
                  })
                }
                className={styles.formInput}
                placeholder='http://localhost:11434'
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Ollama Model</label>
              <input
                type='text'
                value={settings.ollamaModel}
                onChange={e =>
                  updateSettingsState({
                    settings: { ...settings, ollamaModel: e.target.value },
                  })
                }
                className={styles.formInput}
                placeholder='gpt-oss:20b'
              />
            </div>

            {!settings.localFirst && (
              <div>
                <label className={styles.formLabel}>
                  API Key (if using remote service)
                </label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e =>
                      updateSettingsState({ apiKey: e.target.value })
                    }
                    className={styles.formInput}
                    placeholder='Enter API key'
                  />
                  <button
                    type='button'
                    onClick={() =>
                      updateSettingsState({ showApiKey: !showApiKey })
                    }
                    className={styles.passwordToggle}
                  >
                    {showApiKey ? (
                      <EyeOff className={styles.passwordToggleIcon} />
                    ) : (
                      <Eye className={styles.passwordToggleIcon} />
                    )}
                  </button>
                </div>
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
            <div>
              <label className={styles.formLabel}>
                {retentionPolicy.policy_type === 'last_n_versions'
                  ? 'Number of Versions'
                  : 'Number of Days'}
              </label>
              <input
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
                className={styles.formInput}
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
