import React, { useState } from 'react';
import { FolderPlus, Database, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { IndexingResult } from '../types';

const IndexingInterface: React.FC = () => {
  const [folders, setFolders] = useState<string[]>([]);
  const [newFolder, setNewFolder] = useState('');
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingResult, setIndexingResult] = useState<IndexingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFolder = () => {
    if (newFolder.trim() && !folders.includes(newFolder.trim())) {
      setFolders([...folders, newFolder.trim()]);
      setNewFolder('');
    }
  };

  const removeFolder = (index: number) => {
    setFolders(folders.filter((_, i) => i !== index));
  };

  const startIndexing = async () => {
    if (folders.length === 0) {
      setError('Please add at least one folder to index');
      return;
    }

    setIsIndexing(true);
    setError(null);
    setIndexingResult(null);

    try {
      const request = {
        folders: folders.map(f => f.trim()),
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
        setIndexingResult(data.result);
      } else {
        setError(data.message || 'Indexing failed');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Indexing error:', error);
    } finally {
      setIsIndexing(false);
    }
  };

  const getStatusIcon = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
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

  return (
    <div className="space-y-6">
      {/* Folder Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Corpus Folders
        </h2>
        
        <div className="space-y-4">
          {/* Add Folder */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFolder()}
                placeholder="Enter folder path (e.g., /Users/username/notes)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={addFolder}
              disabled={!newFolder.trim()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Add
            </button>
          </div>

          {/* Folder List */}
          {folders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Folders to Index:
              </h3>
              {folders.map((folder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {folder}
                  </span>
                  <button
                    onClick={() => removeFolder(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Indexing Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Index Management
        </h2>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={startIndexing}
            disabled={isIndexing || folders.length === 0}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isIndexing ? (
              <>
                <div className="loading-spinner h-4 w-4 mr-2"></div>
                Indexing...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Build Index
              </>
            )}
          </button>
          
          {indexingResult && (
            <button
              onClick={startIndexing}
              disabled={isIndexing}
              className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-index
            </button>
          )}
        </div>

        {folders.length === 0 && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Add folders above to start indexing your knowledge base.
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Indexing Results */}
      {indexingResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Indexing Results
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              {getStatusIcon('success')}
              <div className="ml-3">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Files Processed
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                  {indexingResult.files_processed}
                </p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              {getStatusIcon('warning')}
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Files Skipped
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">
                  {indexingResult.files_skipped}
                </p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              {getStatusIcon('error')}
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Files Failed
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-300">
                  {indexingResult.files_failed}
                </p>
              </div>
            </div>
          </div>

          {/* Errors */}
          {indexingResult.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Errors ({indexingResult.errors.length}):
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {indexingResult.errors.map((error, index) => (
                  <div
                    key={index}
                    className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
          About Indexing
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Add folders containing your notes, documents, and knowledge files</li>
          <li>• Supported file types: .md, .txt, .pdf (basic text extraction)</li>
          <li>• The system will automatically exclude common directories like node_modules, .git</li>
          <li>• Indexing creates searchable chunks and extracts metadata like titles and tags</li>
          <li>• Re-index when you add or modify files in your folders</li>
        </ul>
      </div>
    </div>
  );
};

export default IndexingInterface;
