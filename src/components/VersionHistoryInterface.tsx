import React, { useState, useEffect } from 'react';
import { Clock, FileText, GitBranch, Eye, GitCompare, ArrowLeft } from 'lucide-react';
import { Document, VersionHistory, VersionDiff, DiffLine } from '../types';

interface VersionHistoryInterfaceProps {
  document: Document;
  onBack: () => void;
}

const VersionHistoryInterface: React.FC<VersionHistoryInterfaceProps> = ({ document, onBack }) => {
  const [versionHistory, setVersionHistory] = useState<VersionHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Document | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState<VersionDiff | null>(null);
  const [versionA, setVersionA] = useState<number>(1);
  const [versionB, setVersionB] = useState<number>(1);

  useEffect(() => {
    loadVersionHistory();
  }, [document.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVersionHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const request = {
        tool: 'get_document_versions',
        arguments: {
          path: document.path,
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
        setVersionHistory(data.data);
        setVersionA(data.data.versions[0]?.version || 1);
        setVersionB(data.data.versions[0]?.version || 1);
      } else {
        setError(data.error || 'Failed to load version history');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Version history error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const compareVersions = async () => {
    if (versionA === versionB) {
      setError('Please select different versions to compare');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const request = {
        tool: 'compare_versions',
        arguments: {
          path: document.path,
          version_a: versionA,
          version_b: versionB,
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
        setDiffData(data.data);
        setShowDiff(true);
      } else {
        setError(data.error || 'Failed to compare versions');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Version comparison error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDiffLineClass = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500';
      case 'removed':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
      case 'unchanged':
        return 'bg-gray-50 dark:bg-gray-800';
      default:
        return '';
    }
  };

  const getDiffLineIcon = (type: string) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'unchanged':
        return ' ';
      default:
        return ' ';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading version history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (showDiff && diffData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowDiff(false)}
                  className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to History
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Version Comparison
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {diffData.path}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded mr-2">
                    v{diffData.version_a}
                  </span>
                  vs
                  <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded ml-2">
                    v{diffData.version_b}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diff Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Changes Summary
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +{diffData.diff.summary.added}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Lines Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  -{diffData.diff.summary.removed}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Lines Removed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {diffData.diff.summary.unchanged}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Lines Unchanged</div>
              </div>
            </div>
          </div>

          {/* Diff Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                File Differences
              </h2>
              <div className="overflow-x-auto">
                <div className="font-mono text-sm">
                  {diffData.diff.lines.map((line: DiffLine, index: number) => (
                    <div
                      key={index}
                      className={`flex ${getDiffLineClass(line.type)} p-1`}
                    >
                      <div className="w-8 text-right pr-2 text-gray-500 dark:text-gray-400">
                        {line.line}
                      </div>
                      <div className="w-4 text-center text-gray-500 dark:text-gray-400">
                        {getDiffLineIcon(line.type)}
                      </div>
                      <div className="flex-1 text-gray-900 dark:text-gray-100">
                        {line.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Version History
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {document.filename}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {versionHistory?.versions.length || 0} versions
              </span>
            </div>
          </div>
        </div>

        {/* Version Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Version Timeline
          </h2>
          <div className="space-y-4">
            {versionHistory?.versions.map((version, index) => (
              <div
                key={version.id}
                className={`p-4 rounded-lg border ${
                  version.is_latest
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(version.indexed_at)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Version {version.version}
                      </span>
                      {version.is_latest && (
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedVersion(version)}
                      className="flex items-center px-3 py-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span>Size: {version.size} bytes</span>
                    <span>Hash: {version.content_hash.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Version Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Compare Versions
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">Version A:</label>
              <select
                value={versionA}
                onChange={(e) => setVersionA(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {versionHistory?.versions.map((version) => (
                  <option key={version.version} value={version.version}>
                    v{version.version}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">Version B:</label>
              <select
                value={versionB}
                onChange={(e) => setVersionB(parseInt(e.target.value))}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                {versionHistory?.versions.map((version) => (
                  <option key={version.version} value={version.version}>
                    v{version.version}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={compareVersions}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryInterface;
