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
} from 'lucide-react';

const SettingsInterface: React.FC = () => {
  const [settings, setSettings] = useState({
    localFirst: true,
    loggingEnabled: false,
    logRetentionDays: 7,
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'gpt-oss:20b',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [retentionPolicy, setRetentionPolicy] = useState({
    policy_type: 'all',
    value: 0,
    description: 'Keep all versions (default)',
  });
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);

  useEffect(() => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('knowledge-base-settings');
    if (savedSettings) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ...JSON.parse(savedSettings),
      }));
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
        setRetentionPolicy(data.data);
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
        setRetentionPolicy(data.data);
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
          setSettings({ ...settings, ...importedSettings });
        } catch (error) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className='space-y-6'>
      {/* Privacy Settings */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center mb-4'>
          <Shield className='h-5 w-5 text-primary-500 mr-2' />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Privacy & Security
          </h2>
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Local-First Processing
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Keep all processing local by default. Remote models require
                explicit opt-in.
              </p>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.localFirst}
                onChange={e =>
                  setSettings({ ...settings, localFirst: e.target.checked })
                }
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {!settings.localFirst && (
            <div className='p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
              <div className='flex items-center'>
                <Eye className='h-5 w-5 text-yellow-500 mr-2' />
                <span className='text-sm text-yellow-700 dark:text-yellow-400'>
                  <strong>Warning:</strong> Remote processing may send your
                  documents to external services. Make sure you trust the
                  service and have appropriate consent.
                </span>
              </div>
            </div>
          )}

          <div className='space-y-3'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Ollama URL
              </label>
              <input
                type='text'
                value={settings.ollamaUrl}
                onChange={e =>
                  setSettings({ ...settings, ollamaUrl: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
                placeholder='http://localhost:11434'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Ollama Model
              </label>
              <input
                type='text'
                value={settings.ollamaModel}
                onChange={e =>
                  setSettings({ ...settings, ollamaModel: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
                placeholder='gpt-oss:20b'
              />
            </div>

            {!settings.localFirst && (
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  API Key (if using remote service)
                </label>
                <div className='relative'>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    className='w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
                    placeholder='Enter API key'
                  />
                  <button
                    type='button'
                    onClick={() => setShowApiKey(!showApiKey)}
                    className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  >
                    {showApiKey ? (
                      <EyeOff className='h-4 w-4 text-gray-400' />
                    ) : (
                      <Eye className='h-4 w-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logging Settings */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center mb-4'>
          <Database className='h-5 w-5 text-primary-500 mr-2' />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Logging & Telemetry
          </h2>
        </div>

        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Enable Logging
              </h3>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Log queries and operations for troubleshooting. Content is
                redacted for privacy.
              </p>
            </div>
            <label className='relative inline-flex items-center cursor-pointer'>
              <input
                type='checkbox'
                checked={settings.loggingEnabled}
                onChange={e =>
                  setSettings({ ...settings, loggingEnabled: e.target.checked })
                }
                className='sr-only peer'
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings.loggingEnabled && (
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Log Retention (days)
              </label>
              <select
                value={settings.logRetentionDays}
                onChange={e =>
                  setSettings({
                    ...settings,
                    logRetentionDays: parseInt(e.target.value),
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={0}>Never delete</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Version History Retention */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center mb-4'>
          <Clock className='h-5 w-5 text-primary-500 mr-2' />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Version History Retention
          </h2>
        </div>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Retention Policy
            </label>
            <select
              value={retentionPolicy.policy_type}
              onChange={e =>
                setRetentionPolicy({
                  ...retentionPolicy,
                  policy_type: e.target.value,
                })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
            >
              <option value='all'>Keep all versions</option>
              <option value='last_n_versions'>Keep last N versions</option>
              <option value='last_n_days'>
                Keep versions from last N days
              </option>
            </select>
          </div>

          {(retentionPolicy.policy_type === 'last_n_versions' ||
            retentionPolicy.policy_type === 'last_n_days') && (
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {retentionPolicy.policy_type === 'last_n_versions'
                  ? 'Number of Versions'
                  : 'Number of Days'}
              </label>
              <input
                type='number'
                min='1'
                value={retentionPolicy.value}
                onChange={e =>
                  setRetentionPolicy({
                    ...retentionPolicy,
                    value: parseInt(e.target.value) || 1,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
              />
            </div>
          )}

          <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              <strong>Current Policy:</strong> {retentionPolicy.description}
            </p>
          </div>

          <div className='flex items-center space-x-4'>
            <button
              onClick={saveRetentionPolicy}
              disabled={isLoadingPolicy}
              className='px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isLoadingPolicy ? 'Saving...' : 'Save Policy'}
            </button>

            <button
              onClick={() => purgeHistory(true)}
              disabled={isLoadingPolicy}
              className='px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isLoadingPolicy ? 'Checking...' : 'Preview Purge'}
            </button>

            <button
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
              className='px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <Trash2 className='h-4 w-4 mr-2 inline' />
              Purge History
            </button>
          </div>
        </div>
      </div>

      {/* Import/Export */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center mb-4'>
          <Settings className='h-5 w-5 text-primary-500 mr-2' />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Configuration Management
          </h2>
        </div>

        <div className='flex items-center space-x-4'>
          <button
            onClick={exportSettings}
            className='flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors'
          >
            <Download className='h-4 w-4 mr-2' />
            Export Settings
          </button>

          <label className='flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer'>
            <Upload className='h-4 w-4 mr-2' />
            Import Settings
            <input
              type='file'
              accept='.json'
              onChange={importSettings}
              className='hidden'
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className='flex justify-end'>
        <button
          onClick={saveSettings}
          className='px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors'
        >
          Save Settings
        </button>
      </div>

      {/* Help Text */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6'>
        <h3 className='text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2'>
          Privacy & Security Notes
        </h3>
        <ul className='text-sm text-blue-700 dark:text-blue-300 space-y-1'>
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
