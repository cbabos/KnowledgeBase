import React, { useState } from 'react';
import {
  FileText,
  ExternalLink,
  History,
  Calendar,
  Tag,
  Folder,
} from 'lucide-react';
import { Citation, SearchResult, Document } from '../../types';
import Button from '../common/Button';
import styles from './CitationPreview.module.css';

export interface CitationPreviewProps {
  // Common props
  type: 'citation' | 'search-result';
  onOpenDocument?: (
    documentId: string,
    filename: string,
    path: string,
    usedVersion?: number,
    latestVersion?: number,
    isLatest?: boolean
  ) => void;
  onViewHistory?: (document: Document) => void;

  // Citation-specific props
  citation?: Citation;

  // Search result-specific props
  searchResult?: SearchResult;

  // Display options
  showExcerpt?: boolean;
  showMetadata?: boolean;
  showVersionInfo?: boolean;
  showActions?: boolean;

  // Styling
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const CitationPreview: React.FC<CitationPreviewProps> = ({
  type,
  onOpenDocument,
  onViewHistory,
  citation,
  searchResult,
  showExcerpt = true,
  showMetadata = true,
  showVersionInfo = true,
  showActions = true,
  variant = 'default',
  className = '',
}) => {
  const [showFullExcerpt, setShowFullExcerpt] = useState(false);

  // Extract common data based on type
  const document =
    type === 'citation'
      ? citation
        ? {
            id: citation.document_id,
            filename: citation.filename,
            path: citation.path,
            extension: citation.filename.split('.').pop() || '',
            size: 0, // Not available in citation
            modified_at: '', // Not available in citation
            title: citation.filename,
            tags: [],
            headings: [],
            content_excerpt: citation.excerpt,
            content_hash: '',
            indexed_at: '',
            version: citation.used_version,
            is_latest: citation.is_latest,
          }
        : null
      : searchResult?.document;

  const excerpt =
    type === 'citation' ? citation?.excerpt : searchResult?.snippets[0]?.text;
  const highlightedExcerpt =
    type === 'search-result' ? searchResult?.snippets[0]?.highlighted : null;
  const chunkId = type === 'citation' ? citation?.chunk_id : undefined;
  const usedVersion =
    type === 'citation' ? citation?.used_version : document?.version;
  const latestVersion =
    type === 'citation' ? citation?.latest_version : document?.version;
  const isLatest =
    type === 'citation' ? citation?.is_latest : document?.is_latest;

  if (!document) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const handleOpenDocument = () => {
    if (onOpenDocument) {
      onOpenDocument(
        document.id,
        document.filename,
        document.path,
        usedVersion,
        latestVersion,
        isLatest
      );
    }
  };

  const handleViewHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewHistory && document) {
      // Ensure we have a proper Document object with all required fields
      const documentForHistory: Document = {
        id: document.id,
        path: document.path,
        filename: document.filename,
        extension: document.extension,
        size: document.size,
        modified_at: document.modified_at,
        title: document.title,
        tags: document.tags,
        headings: document.headings,
        content_excerpt: document.content_excerpt,
        content_hash: document.content_hash,
        indexed_at: document.indexed_at,
        version: document.version,
        is_latest: document.is_latest,
        project_id: document.project_id,
      };
      onViewHistory(documentForHistory);
    }
  };

  const getVersionBadgeClass = () => {
    if (isLatest) return styles.versionBadgeLatest;
    return styles.versionBadgeHistorical;
  };

  const getVersionStatusClass = () => {
    if (isLatest) return styles.versionStatusLatest;
    return styles.versionStatusOutdated;
  };

  return (
    <div className={`${styles.container} ${styles[variant]} ${className}`}>
      <div className={styles.content}>
        <div className={styles.info}>
          {/* Header with filename and metadata */}
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <FileText className={styles.icon} />
              <span className={styles.filename}>
                {document.title || document.filename}
              </span>
              <span className={styles.extension}>.{document.extension}</span>
              {chunkId && (
                <span className={styles.chunkId}>Chunk {chunkId}</span>
              )}
            </div>

            {showActions && (
              <div className={styles.actions}>
                {onViewHistory && (
                  <Button
                    onClick={handleViewHistory}
                    leftIcon={History}
                    variant='ghost'
                    size='sm'
                    title='View version history'
                  >
                    History
                  </Button>
                )}
                {onOpenDocument && (
                  <Button
                    onClick={handleOpenDocument}
                    variant='ghost'
                    size='sm'
                    title='Open document'
                  >
                    <ExternalLink />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Version Information */}
          {showVersionInfo && usedVersion && (
            <div className={styles.versionInfo}>
              <span className={styles.versionLabel}>Version:</span>
              <span
                className={`${styles.versionBadge} ${getVersionBadgeClass()}`}
              >
                v{usedVersion}
              </span>
              {!isLatest && latestVersion && (
                <>
                  <span className={styles.arrowText}>→</span>
                  <span
                    className={`${styles.versionBadge} ${styles.versionBadgeGray}`}
                  >
                    Latest: v{latestVersion}
                  </span>
                  <span
                    className={`${styles.versionStatus} ${getVersionStatusClass()}`}
                  >
                    (Outdated)
                  </span>
                </>
              )}
              {isLatest && (
                <span
                  className={`${styles.versionStatus} ${styles.versionStatusLatest}`}
                >
                  (Latest)
                </span>
              )}
            </div>
          )}

          {/* Path */}
          <div className={styles.path}>{document.path}</div>

          {/* Metadata */}
          {showMetadata && type === 'search-result' && (
            <div className={styles.metadata}>
              {document.size > 0 && (
                <div className={styles.metadataItem}>
                  <span className={styles.metadataValue}>
                    {formatFileSize(document.size)}
                  </span>
                </div>
              )}
              {document.modified_at && (
                <div className={styles.metadataItem}>
                  <Calendar className={styles.metadataIcon} />
                  {formatDate(document.modified_at)}
                </div>
              )}
              {document.tags.length > 0 && (
                <div className={styles.metadataItem}>
                  <Tag className={styles.metadataIcon} />
                  {document.tags.slice(0, 3).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Excerpt/Snippet */}
          {showExcerpt && excerpt && (
            <div className={styles.excerpt}>
              {type === 'search-result' && highlightedExcerpt ? (
                <div
                  className={styles.highlightedExcerpt}
                  dangerouslySetInnerHTML={{
                    __html: highlightedExcerpt.replace(
                      /\*\*(.*?)\*\*/g,
                      '<mark class="search-highlight">$1</mark>'
                    ),
                  }}
                />
              ) : (
                <div className={styles.excerptText}>{excerpt}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitationPreview;
