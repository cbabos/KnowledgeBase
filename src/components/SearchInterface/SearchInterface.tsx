import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Tag,
  Folder,
  History,
  FileText,
} from 'lucide-react';
import {
  MCPTool,
  SearchResult,
  SearchFilters,
  Document,
  Project,
} from '../../types';
import Button from '../common/Button';
import Dropdown, { DropdownOption } from '../common/Dropdown';
import VersionHistoryInterface from '../VersionHistoryInterface/VersionHistoryInterface';
import DocumentPreviewModal from '../DocumentPreviewModal/DocumentPreviewModal';
import CitationPreview from '../CitationPreview/CitationPreview';
import { marked } from 'marked';
import { useStatePersistence } from '../../contexts/StatePersistenceContext';
import styles from './SearchInterface.module.css';

interface SearchInterfaceProps {
  tools: MCPTool[];
  projects: Project[];
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({
  tools,
  projects,
}) => {
  const { state, updateSearchState } = useStatePersistence();
  const [isLoading, setIsLoading] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryDocument, setVersionHistoryDocument] =
    useState<Document | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{
    id: string;
    filename: string;
    path: string;
    document?: Document;
    searchResult?: SearchResult;
  } | null>(null);

  // Use persistent state
  const {
    query,
    results,
    showFilters,
    filters,
    includeHistorical,
    selectedResult,
    documentContent,
  } = state.search;

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
        updateSearchState({ results: data.data.results || [] });
      } else {
        console.error('Search failed:', data.error);
        updateSearchState({ results: [] });
      }
    } catch (error) {
      console.error('Search error:', error);
      updateSearchState({ results: [] });
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
        updateSearchState({ documentContent: data.data.content });
      }
    } catch (error) {
      console.error('Failed to read document:', error);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    updateSearchState({ selectedResult: result });
    readDocument(result.document.id);
  };

  const handleOpenDocumentPreview = (result: SearchResult) => {
    setPreviewDocument({
      id: result.document.id,
      filename: result.document.filename,
      path: result.document.path,
      document: result.document,
      searchResult: result,
    });
    setShowDocumentPreview(true);
  };

  const handleViewVersionHistory = (document: Document) => {
    setVersionHistoryDocument(document);
    setShowVersionHistory(true);
  };

  const handleBackFromVersionHistory = () => {
    setShowVersionHistory(false);
    setVersionHistoryDocument(null);
  };

  const handleOpenDocument = (
    documentId: string,
    filename: string,
    path: string,
    usedVersion?: number,
    latestVersion?: number,
    isLatest?: boolean
  ) => {
    // For search results, we don't open a document viewer modal
    // Instead, we just select the result for preview
    const result = results.find(r => r.document.id === documentId);
    if (result) {
      handleResultClick(result);
    }
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

  // Prepare dropdown options for project filter
  const projectFilterOptions: DropdownOption[] = [
    { value: '', label: 'All Projects', icon: <Folder /> },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
      icon: <Folder />,
    })),
  ];

  if (showVersionHistory && versionHistoryDocument) {
    return (
      <VersionHistoryInterface
        document={versionHistoryDocument}
        onBack={handleBackFromVersionHistory}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Search Header */}
      <div className={styles.searchHeader}>
        <div className={styles.searchForm}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} />
            <input
              type='text'
              value={query}
              onChange={e => updateSearchState({ query: e.target.value })}
              onKeyPress={e => e.key === 'Enter' && searchNotes()}
              placeholder='Search your knowledge base...'
              className={styles.searchInput}
            />
          </div>
          <Button
            onClick={() => updateSearchState({ showFilters: !showFilters })}
            leftIcon={Filter}
            variant={showFilters ? 'primary' : 'secondary'}
          >
            Filters
          </Button>
          <Button
            onClick={searchNotes}
            disabled={isLoading || !query.trim()}
            loading={isLoading}
            variant='primary'
          >
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className={styles.filtersSection}>
            <div className={styles.historicalCheckbox}>
              <label className={styles.historicalCheckboxLabel}>
                <input
                  type='checkbox'
                  checked={includeHistorical}
                  onChange={e =>
                    updateSearchState({ includeHistorical: e.target.checked })
                  }
                  className={styles.historicalCheckboxInput}
                />
                <span className={styles.historicalCheckboxText}>
                  Include historical versions
                </span>
              </label>
            </div>

            <div className={styles.projectFilter}>
              <label className={styles.projectFilterLabel}>Project</label>
              <Dropdown
                options={projectFilterOptions}
                value={filters.project_ids?.[0] || ''}
                placeholder='All Projects'
                icon={<Folder />}
                onChange={projectId => {
                  updateSearchState({
                    filters: {
                      ...filters,
                      project_ids: projectId ? [projectId] : undefined,
                    },
                  });
                }}
              />
            </div>
            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterGroupLabel}>File Types</label>
                <div className={styles.filterGroupOptions}>
                  {['md', 'txt', 'pdf'].map(type => (
                    <label key={type} className={styles.filterOption}>
                      <input
                        type='checkbox'
                        checked={filters.file_types?.includes(type) || false}
                        onChange={e => {
                          const newTypes = filters.file_types || [];
                          if (e.target.checked) {
                            updateSearchState({
                              filters: {
                                ...filters,
                                file_types: [...newTypes, type],
                              },
                            });
                          } else {
                            updateSearchState({
                              filters: {
                                ...filters,
                                file_types: newTypes.filter(
                                  (t: string) => t !== type
                                ),
                              },
                            });
                          }
                        }}
                        className={styles.filterOptionInput}
                      />
                      <span className={styles.filterOptionText}>.{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterGroupLabel}>Tags</label>
                <input
                  type='text'
                  placeholder='Enter tags (comma-separated)'
                  className={styles.filterInput}
                  onChange={e => {
                    const tags = e.target.value
                      .split(',')
                      .map(t => t.trim())
                      .filter(t => t);
                    updateSearchState({
                      filters: {
                        ...filters,
                        tags: tags.length > 0 ? tags : undefined,
                      },
                    });
                  }}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterGroupLabel}>Folders</label>
                <input
                  type='text'
                  placeholder='Enter folder paths (comma-separated)'
                  className={styles.filterInput}
                  onChange={e => {
                    const folders = e.target.value
                      .split(',')
                      .map(f => f.trim())
                      .filter(f => f);
                    updateSearchState({
                      filters: {
                        ...filters,
                        folders: folders.length > 0 ? folders : undefined,
                      },
                    });
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className={styles.resultsGrid}>
        {/* Results List */}
        <div className={styles.resultsSection}>
          <h2 className={styles.resultsTitle}>
            Search Results ({results.length})
          </h2>

          {isLoading && (
            <div className={styles.loadingContainer}>
              <div className={`${styles.loadingSpinner} loading-spinner`}></div>
              <span className={styles.loadingText}>Searching...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && query && (
            <div className={styles.noResults}>
              No results found for "{query}"
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={index}
              onClick={() => handleResultClick(result)}
              className={`${styles.resultItem} ${
                selectedResult?.document.id === result.document.id
                  ? styles.resultItemSelected
                  : styles.resultItemUnselected
              }`}
            >
              <CitationPreview
                type='search-result'
                searchResult={result}
                onOpenDocument={() => handleOpenDocumentPreview(result)}
                onViewHistory={handleViewVersionHistory}
                showExcerpt={true}
                showMetadata={true}
                showVersionInfo={true}
                showActions={true}
                variant='default'
                className={styles.citationPreview}
              />
            </div>
          ))}
        </div>

        {/* Document Preview */}
        <div className={styles.previewSection}>
          <h2 className={styles.previewTitle}>Document Preview</h2>

          {selectedResult ? (
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <h3 className={styles.previewDocumentTitle}>
                  {selectedResult.document.title ||
                    selectedResult.document.filename}
                </h3>
                <div className={styles.previewMeta}>
                  <div className={styles.previewMetaItem}>
                    <Folder className={styles.previewMetaIcon} />
                    {selectedResult.document.path}
                  </div>
                  <div className={styles.previewMetaItem}>
                    <Calendar className={styles.previewMetaIcon} />
                    {formatDate(selectedResult.document.modified_at)}
                  </div>
                </div>
              </div>

              {selectedResult.document.headings.length > 0 && (
                <div className={styles.previewHeadings}>
                  <h4 className={styles.previewHeadingsTitle}>Headings:</h4>
                  <div className={styles.previewHeadingsList}>
                    {selectedResult.document.headings.map(
                      (heading: string, index: number) => (
                        <span key={index} className={styles.previewHeading}>
                          {heading}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className={styles.previewContent}>
                {selectedResult.document.extension.toLowerCase() === 'md' ? (
                  <div
                    className={`markdown-content ${styles.previewContentMarkdown}`}
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(documentContent || ''),
                    }}
                  />
                ) : (
                  <pre className={styles.previewContentText}>
                    {documentContent}
                  </pre>
                )}
              </div>

              <div className={styles.previewActions}>
                <Button
                  onClick={() => handleOpenDocumentPreview(selectedResult)}
                  variant='primary'
                  leftIcon={FileText}
                >
                  Open Full Preview
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.previewEmpty}>
              Select a document to preview its content
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {showDocumentPreview && previewDocument && (
        <DocumentPreviewModal
          documentId={previewDocument.id}
          filename={previewDocument.filename}
          path={previewDocument.path}
          document={previewDocument.document}
          searchResult={previewDocument.searchResult}
          onClose={() => setShowDocumentPreview(false)}
          onViewHistory={handleViewVersionHistory}
          showVersionInfo={true}
          showMetadata={true}
          showHeadings={true}
          showActions={true}
        />
      )}

      {/* Version History Interface */}
      {showVersionHistory && versionHistoryDocument && (
        <VersionHistoryInterface
          document={versionHistoryDocument}
          onBack={handleBackFromVersionHistory}
        />
      )}
    </div>
  );
};

export default SearchInterface;
