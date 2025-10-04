import React, { useEffect, useState } from 'react';
import { X, FileText, Calendar, Folder } from 'lucide-react';
import { marked } from 'marked';
import Button from '../common/Button';
import styles from './DocumentViewerModal.module.css';

interface DocumentViewerModalProps {
  documentId: string;
  filename: string;
  path: string;
  usedVersion?: number;
  latestVersion?: number;
  isLatest?: boolean;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  documentId,
  filename,
  path,
  usedVersion,
  latestVersion,
  isLatest,
  onClose,
}) => {
  const [content, setContent] = useState<string>('');
  const [modifiedAt, setModifiedAt] = useState<string>('');
  const [extension, setExtension] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readDocument = async () => {
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
          setModifiedAt(data.data.document?.modified_at || '');
          setExtension(data.data.document?.extension || '');
        } else {
          setError(data.error || 'Failed to load document');
        }
      } catch (e) {
        setError('Network error while loading document');
      } finally {
        setIsLoading(false);
      }
    };
    readDocument();
  }, [documentId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const isMarkdown =
    extension.toLowerCase() === 'md' || filename.toLowerCase().endsWith('.md');
  const renderedHtml = isMarkdown ? marked.parse(content || '') : '';

  return (
    <div className={styles.modal}>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText className={styles.headerIcon} />
            <h3 className={styles.headerTitle}>{filename}</h3>
            {typeof usedVersion === 'number' && (
              <span
                className={`${styles.versionBadge} ${
                  isLatest
                    ? styles.versionBadgeLatest
                    : styles.versionBadgeHistorical
                }`}
              >
                v{usedVersion}
              </span>
            )}
            {typeof latestVersion === 'number' && !isLatest && (
              <span
                className={`${styles.versionBadge} ${styles.versionBadgeGray}`}
              >
                Latest: v{latestVersion}
              </span>
            )}
          </div>
          <Button onClick={onClose} variant='ghost' size='sm'>
            <X />
          </Button>
        </div>
        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <Folder className={styles.metaIcon} />
            {path}
          </div>
          <div className={styles.metaItem}>
            <Calendar className={styles.metaIcon} />
            {formatDate(modifiedAt)}
          </div>
        </div>
        <div className={styles.body}>
          {isLoading && <div className={styles.loading}>Loading...</div>}
          {error && <div className={styles.error}>{error}</div>}
          {!isLoading && !error && (
            <div className={styles.contentArea}>
              {isMarkdown ? (
                <div
                  className={styles.contentMarkdown}
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <pre className={styles.contentText}>{content}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
