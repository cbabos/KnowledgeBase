import React, { useEffect, useState } from 'react';
import { X, FileText, Calendar, Folder } from 'lucide-react';
import { marked } from 'marked';

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

  const isMarkdown = extension.toLowerCase() === 'md' || filename.toLowerCase().endsWith('.md');
  const renderedHtml = isMarkdown ? marked.parse(content || '') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[85vh] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{filename}</h3>
            {typeof usedVersion === 'number' && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isLatest ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/20' : 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20'
              }`}>
                v{usedVersion}
              </span>
            )}
            {typeof latestVersion === 'number' && !isLatest && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-700">
                Latest: v{latestVersion}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center"><Folder className="h-4 w-4 mr-1" />{path}</div>
          <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />{formatDate(modifiedAt)}</div>
        </div>
        <div className="p-4 overflow-auto">
          {isLoading && (
            <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
          )}
          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}
          {!isLoading && !error && (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {isMarkdown ? (
                <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">{content}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;


