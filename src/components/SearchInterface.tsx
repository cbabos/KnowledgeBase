import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Tag,
  Folder,
  History,
} from 'lucide-react';
import {
  MCPTool,
  SearchResult,
  SearchFilters,
  Document,
  Project,
} from '../types';
import VersionHistoryInterface from './VersionHistoryInterface';
import { marked } from 'marked';

interface SearchInterfaceProps {
  tools: MCPTool[];
  projects: Project[];
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  tools,
  projects,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [includeHistorical, setIncludeHistorical] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [documentContent, setDocumentContent] = useState<string>('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryDocument, setVersionHistoryDocument] =
    useState<Document | null>(null);

  const searchNotes = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const searchFilters = { ...filters };

      const request: any = {
        tool: 'search_notes',
        arguments: {
          query: query.trim(),
          limit: 20,
          offset: 0,
          include_historical: includeHistorical,
        },
      };

      if (Object.keys(searchFilters).length > 0) {
        request.arguments.filters = searchFilters;
      }

      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setResults(data.data.results || []);
      } else {
        console.error('Search failed:', data.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const readDocument = async (documentId: string) => {
    try {
      const request = {
        tool: 'read_note',
        arguments: { id: documentId },
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
        setDocumentContent(data.data.content);
      }
    } catch (error) {
      console.error('Failed to read document:', error);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    readDocument(result.document.id);
  };

  const handleViewVersionHistory = (document: Document) => {
    setVersionHistoryDocument(document);
    setShowVersionHistory(true);
  };

  const handleBackFromVersionHistory = () => {
    setShowVersionHistory(false);
    setVersionHistoryDocument(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (showVersionHistory && versionHistoryDocument) {
    return (
      <VersionHistoryInterface
        document={versionHistoryDocument}
        onBack={handleBackFromVersionHistory}
      />
    );
  }

  return (
    <div className='space-y-6'>
      {/* Search Header */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
        <div className='flex items-center space-x-4'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400' />
              <input
                type='text'
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && searchNotes()}
                placeholder='Search your knowledge base...'
                className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-3 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
            }`}
          >
            <Filter className='h-5 w-5 mr-2' />
            Filters
          </button>
          <button
            onClick={searchNotes}
            disabled={isLoading || !query.trim()}
            className='px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700'>
            <div className='mb-4'>
              <label className='flex items-center'>
                <input
                  type='checkbox'
                  checked={includeHistorical}
                  onChange={e => setIncludeHistorical(e.target.checked)}
                  className='rounded border-gray-300 text-primary-600 focus:ring-primary-500'
                />
                <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                  Include historical versions
                </span>
              </label>
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Project
              </label>
              <select
                value={filters.project_ids?.[0] || ''}
                onChange={e => {
                  const projectId = e.target.value;
                  setFilters({
                    ...filters,
                    project_ids: projectId ? [projectId] : undefined,
                  });
                }}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
              >
                <option value=''>All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  File Types
                </label>
                <div className='space-y-2'>
                  {['md', 'txt', 'pdf'].map(type => (
                    <label key={type} className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={filters.file_types?.includes(type) || false}
                        onChange={e => {
                          const newTypes = filters.file_types || [];
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              file_types: [...newTypes, type],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              file_types: newTypes.filter(t => t !== type),
                            });
                          }
                        }}
                        className='rounded border-gray-300 text-primary-600 focus:ring-primary-500'
                      />
                      <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
                        .{type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Tags
                </label>
                <input
                  type='text'
                  placeholder='Enter tags (comma-separated)'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
                  onChange={e => {
                    const tags = e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(t => t);
                    setFilters({
                      ...filters,
                      tags: tags.length > 0 ? tags : undefined,
                    });
                  }}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Folders
                </label>
                <input
                  type='text'
                  placeholder='Enter folder paths (comma-separated)'
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white'
                  onChange={e => {
                    const folders = e.target.value
                      .split(',')
                      .map(f => f.trim())
                      .filter(f => f);
                    setFilters({
                      ...filters,
                      folders: folders.length > 0 ? folders : undefined,
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Results List */}
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Search Results ({results.length})
          </h2>

          {isLoading && (
            <div className='flex items-center justify-center py-8'>
              <div className='loading-spinner'></div>
              <span className='ml-2 text-gray-600 dark:text-gray-400'>
                Searching...
              </span>
            </div>
          )}

          {!isLoading && results.length === 0 && query && (
            <div className='text-center py-8 text-gray-500 dark:text-gray-400'>
              No results found for "{query}"
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={index}
              onClick={() => handleResultClick(result)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedResult?.document.id === result.document.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className='flex items-start justify-between mb-2'>
                <div className='flex items-center space-x-2'>
                  <FileText className='h-4 w-4 text-gray-400' />
                  <span className='font-medium text-gray-900 dark:text-white'>
                    {result.document.title || result.document.filename}
                  </span>
                  <span className='text-xs text-gray-500 dark:text-gray-400'>
                    .{result.document.extension}
                  </span>
                  {result.document.version > 1 && (
                    <span className='text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded'>
                      v{result.document.version}
                    </span>
                  )}
                  {!result.document.is_latest && (
                    <span className='text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded'>
                      Historical
                    </span>
                  )}
                </div>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {formatFileSize(result.document.size)}
                </span>
              </div>

              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400'>
                  <div className='flex items-center'>
                    <Calendar className='h-3 w-3 mr-1' />
                    {formatDate(result.document.modified_at)}
                  </div>
                  {result.document.tags.length > 0 && (
                    <div className='flex items-center'>
                      <Tag className='h-3 w-3 mr-1' />
                      {result.document.tags.slice(0, 3).join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleViewVersionHistory(result.document);
                  }}
                  className='flex items-center px-2 py-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'
                >
                  <History className='h-3 w-3 mr-1' />
                  History
                </button>
              </div>

              {result.snippets.length > 0 && (
                <div className='text-sm text-gray-600 dark:text-gray-300'>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: result.snippets[0].highlighted.replace(
                        /\*\*(.*?)\*\*/g,
                        '<mark class="search-highlight">$1</mark>'
                      ),
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Document Preview */}
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Document Preview
          </h2>

          {selectedResult ? (
            <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6'>
              <div className='mb-4'>
                <h3 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>
                  {selectedResult.document.title ||
                    selectedResult.document.filename}
                </h3>
                <div className='flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400'>
                  <div className='flex items-center'>
                    <Folder className='h-4 w-4 mr-1' />
                    {selectedResult.document.path}
                  </div>
                  <div className='flex items-center'>
                    <Calendar className='h-4 w-4 mr-1' />
                    {formatDate(selectedResult.document.modified_at)}
                  </div>
                </div>
              </div>

              {selectedResult.document.headings.length > 0 && (
                <div className='mb-4'>
                  <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Headings:
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {selectedResult.document.headings.map((heading, index) => (
                      <span
                        key={index}
                        className='px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded'
                      >
                        {heading}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className='prose prose-sm max-w-none dark:prose-invert'>
                {selectedResult.document.extension.toLowerCase() === 'md' ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(documentContent || ''),
                    }}
                  />
                ) : (
                  <pre className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
                    {documentContent}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className='bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400'>
              Select a document to preview its content
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;
