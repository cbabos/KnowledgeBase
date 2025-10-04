import React, { useEffect, useState } from 'react';
import { X, FileText, Calendar, Folder, Tag, History } from 'lucide-react';
import { Document, SearchResult } from '../../types';
import { marked } from 'marked';
import Button from '../common/Button';
import styles from './DocumentPreviewModal.module.css';

export interface DocumentPreviewModalProps {
  // Document identification
  documentId: string;
  filename: string;
  path: string;

  // Version information
  usedVersion?: number;
  latestVersion?: number;
  isLatest?: boolean;

  // Document data (optional - will fetch if not provided)
  document?: Document;
  searchResult?: SearchResult;

  // Actions
  onClose: () => void;
  onViewHistory?: (document: Document) => void;

  // Display options
  showVersionInfo?: boolean;
  showMetadata?: boolean;
  showHeadings?: boolean;
  showActions?: boolean;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  documentId,
  filename,
  path,
  usedVersion,
  latestVersion,
  isLatest,
  document: providedDocument,
  searchResult,
  onClose,
  onViewHistory,
  showVersionInfo = true,
  showMetadata = true,
  showHeadings = true,
  showActions = true,
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use provided document data or create from search result
  const document = providedDocument || searchResult?.document;

  // Use provided content or fetch it
  const documentContent = content;

  useEffect(() => {
    const fetchContent = async () => {
      // If we already have content, don't fetch again
      if (content) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request = {
          tool: 'read_note',
          arguments: { id: documentId },
        };

        const response = await fetch('/api/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const data = await response.json();
        if (data.success && data.data) {
          setContent(data.data.content || '');
        } else {
          setError(data.error || 'Failed to load document');
        }
      } catch (e) {
        setError('Network error while loading document');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [documentId, searchResult, content]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isMarkdown =
    document?.extension?.toLowerCase() === 'md' ||
    filename.toLowerCase().endsWith('.md');
  const renderedHtml = isMarkdown ? marked.parse(documentContent || '') : '';

  const handleViewHistory = () => {
    if (onViewHistory && document) {
      onViewHistory(document);
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
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText className={styles.headerIcon} />
            <div className={styles.headerInfo}>
              <h3 className={styles.headerTitle}>
                {document?.title || filename}
              </h3>
              <span className={styles.headerExtension}>
                .{document?.extension || filename.split('.').pop()}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            {showActions && onViewHistory && document && (
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
            <Button onClick={onClose} variant='ghost' size='sm' title='Close'>
              <X />
            </Button>
          </div>
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

        {/* Metadata */}
        {showMetadata && document && (
          <div className={styles.metadata}>
            <div className={styles.metadataItem}>
              <Folder className={styles.metadataIcon} />
              {path}
            </div>
            {document.modified_at && (
              <div className={styles.metadataItem}>
                <Calendar className={styles.metadataIcon} />
                {formatDate(document.modified_at)}
              </div>
            )}
            {document.size > 0 && (
              <div className={styles.metadataItem}>
                <span className={styles.metadataValue}>
                  {formatFileSize(document.size)}
                </span>
              </div>
            )}
            {document.tags.length > 0 && (
              <div className={styles.metadataItem}>
                <Tag className={styles.metadataIcon} />
                {document.tags.slice(0, 5).join(', ')}
                {document.tags.length > 5 &&
                  ` +${document.tags.length - 5} more`}
              </div>
            )}
          </div>
        )}

        {/* Headings */}
        {showHeadings && document?.headings && document.headings.length > 0 && (
          <div className={styles.headings}>
            <h4 className={styles.headingsTitle}>Document Structure:</h4>
            <div className={styles.headingsList}>
              {document.headings.map((heading, index) => (
                <span key={index} className={styles.heading}>
                  {heading}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className={styles.body}>
          {error && (
            <div className={styles.error}>
              <div className={styles.errorContent}>
                <span className={styles.errorText}>{error}</span>
              </div>
            </div>
          )}

          <div className={styles.contentArea}>
            {isLoading && (
              <div className={styles.loadingOverlay}>
                <div
                  className={`${styles.loadingSpinner} loading-spinner`}
                ></div>
                <span className={styles.loadingText}>Loading document...</span>
              </div>
            )}

            {!error && (
              <>
                {isMarkdown ? (
                  <div
                    className={`markdown-content ${styles.contentMarkdown} ${isLoading ? styles.contentLoading : ''}`}
                    dangerouslySetInnerHTML={{ __html: renderedHtml }}
                  />
                ) : (
                  <pre
                    className={`${styles.contentText} ${isLoading ? styles.contentLoading : ''}`}
                  >
                    {documentContent}
                  </pre>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
