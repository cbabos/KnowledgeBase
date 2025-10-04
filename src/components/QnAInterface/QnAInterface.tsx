import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  AlertCircle,
  Search,
  Copy,
  Check,
  Folder,
} from 'lucide-react';
import { MCPTool, QAAnswer, Citation, Project, Document } from '../../types';
import Button from '../common/Button';
import Dropdown, { DropdownOption } from '../common/Dropdown';
import DocumentPreviewModal from '../DocumentPreviewModal/DocumentPreviewModal';
import VersionHistoryInterface from '../VersionHistoryInterface/VersionHistoryInterface';
import CitationPreview from '../CitationPreview/CitationPreview';
import { marked } from 'marked';
import { useStatePersistence } from '../../contexts/StatePersistenceContext';
import styles from './QnAInterface.module.css';

interface QnAInterfaceProps {
  tools: MCPTool[];
  projects: Project[];
  onSwitchToSearch?: () => void;
}

const QnAInterface: React.FC<QnAInterfaceProps> = ({
  tools,
  projects,
  onSwitchToSearch,
}) => {
  const { state, updateQnAState } = useStatePersistence();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{
    id: string;
    filename: string;
    path: string;
    used?: number;
    latest?: number;
    isLatest?: boolean;
  } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryDocument, setVersionHistoryDocument] =
    useState<Document | null>(null);

  // Use persistent state
  const { question, answer, showCitations, copied, activeProject } = state.qa;

  const copyAnswer = async () => {
    if (answer) {
      await navigator.clipboard.writeText(answer.answer);
      updateQnAState({ copied: true });
      setTimeout(() => updateQnAState({ copied: false }), 2000);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    updateQnAState({ answer: null, copied: false });

    try {
      const request: any = {
        tool: 'answer_question',
        arguments: {
          question: question.trim(),
          top_k: 5,
        },
      };

      if (activeProject) {
        request.arguments.project_ids = [activeProject.id];
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
        updateQnAState({ answer: data.data });
      } else {
        setError(data.error || 'Failed to get answer');
      }
    } catch (error) {
      setError('Network error occurred');
      console.error('Q&A error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceClass = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return styles.confidenceHigh;
      case 'medium':
        return styles.confidenceMedium;
      case 'low':
        return styles.confidenceLow;
      default:
        return styles.confidenceDefault;
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '✓';
      case 'medium':
        return '⚠';
      case 'low':
        return '⚠';
      default:
        return '?';
    }
  };

  // Prepare dropdown options
  const projectOptions: DropdownOption[] = [
    { value: '', label: 'All Projects', icon: <Folder /> },
    ...projects.map(project => ({
      value: project.id,
      label: project.name,
      icon: <Folder />,
    })),
  ];

  const handleProjectChange = (projectId: string) => {
    const project = projectId ? projects.find(p => p.id === projectId) : null;
    updateQnAState({ activeProject: project || null });
  };

  const handleOpenDocument = (
    documentId: string,
    filename: string,
    path: string,
    usedVersion?: number,
    latestVersion?: number,
    isLatest?: boolean
  ) => {
    setViewer({
      id: documentId,
      filename,
      path,
      used: usedVersion,
      latest: latestVersion,
      isLatest,
    });
  };

  const handleViewVersionHistory = (document: Document) => {
    setVersionHistoryDocument(document);
    setShowVersionHistory(true);
  };

  const handleBackFromVersionHistory = () => {
    setShowVersionHistory(false);
    setVersionHistoryDocument(null);
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
    <div className={styles.container}>
      {/* Project Selector */}
      <div className={styles.projectSelector}>
        <div className={styles.projectSelectorHeader}>
          <h3 className={styles.projectSelectorTitle}>Project Context</h3>
          <Dropdown
            options={projectOptions}
            value={activeProject?.id || ''}
            placeholder='All Projects'
            icon={<Folder />}
            onChange={handleProjectChange}
            className={styles.projectDropdown}
          />
        </div>
      </div>

      {/* Question Input */}
      <div className={styles.questionInput}>
        <div className={styles.questionInputHeader}>
          <h2 className={styles.questionInputTitle}>Ask a Question</h2>
          {onSwitchToSearch && (
            <Button
              onClick={onSwitchToSearch}
              leftIcon={Search}
              variant='ghost'
              size='sm'
            >
              Switch to Search
            </Button>
          )}
        </div>
        <div className={styles.questionInputForm}>
          <div className={styles.questionInputField}>
            <MessageSquare className={styles.questionInputIcon} />
            <input
              type='text'
              value={question}
              onChange={e => updateQnAState({ question: e.target.value })}
              onKeyPress={e => e.key === 'Enter' && askQuestion()}
              placeholder='Ask a question about your knowledge base...'
              className={styles.questionInputInput}
            />
          </div>
          <Button
            onClick={askQuestion}
            disabled={isLoading || !question.trim()}
            loading={isLoading}
            leftIcon={Send}
            variant='primary'
          >
            {isLoading ? 'Asking...' : 'Ask'}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorAlert}>
          <div className={styles.errorAlertContent}>
            <AlertCircle className={styles.errorAlertIcon} />
            <span className={styles.errorAlertText}>{error}</span>
          </div>
        </div>
      )}

      {/* Answer Display */}
      {answer && (
        <div className={styles.answerSection}>
          {/* Answer */}
          <div className={styles.answerCard}>
            <div className={styles.answerHeader}>
              <h2 className={styles.answerTitle}>Answer</h2>
              <div className={styles.answerActions}>
                <Button
                  onClick={copyAnswer}
                  leftIcon={copied ? Check : Copy}
                  variant='ghost'
                  size='sm'
                  title='Copy answer'
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <span
                  className={`${styles.confidenceBadge} ${getConfidenceClass(answer.confidence)}`}
                >
                  {getConfidenceIcon(answer.confidence)}{' '}
                  {answer.confidence.toUpperCase()} CONFIDENCE
                </span>
                {answer.confidence === 'low' && (
                  <span className={styles.confidenceText}>
                    Consider checking sources
                  </span>
                )}
              </div>
            </div>

            <div
              className='markdown-content'
              dangerouslySetInnerHTML={{ __html: marked(answer.answer) }}
            />

            {answer.confidence === 'low' && (
              <div className={styles.lowConfidenceWarning}>
                <p className={styles.lowConfidenceWarningText}>
                  <strong>Low confidence:</strong> The answer may not be
                  accurate. Please verify the information by checking the source
                  documents.
                </p>
              </div>
            )}
          </div>

          {/* Citations */}
          {answer.citations.length > 0 && (
            <div className={styles.citationsCard}>
              <div className={styles.citationsHeader}>
                <div className={styles.citationsHeaderContent}>
                  <h3 className={styles.citationsTitle}>
                    Sources ({answer.citations.length})
                  </h3>
                  <button
                    onClick={() =>
                      updateQnAState({ showCitations: !showCitations })
                    }
                    className={styles.citationsToggle}
                  >
                    {showCitations ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                <div className={styles.citationsList}>
                  {answer.citations.map((citation: Citation, index: number) => (
                    <CitationPreview
                      key={index}
                      type='citation'
                      citation={citation}
                      onOpenDocument={handleOpenDocument}
                      onViewHistory={handleViewVersionHistory}
                      showExcerpt={showCitations}
                      showMetadata={true}
                      showVersionInfo={true}
                      showActions={true}
                      variant='default'
                    />
                  ))}
                </div>

                <div className={styles.citationsFooter}>
                  <p className={styles.citationsFooterText}>
                    Based on {answer.context_chunks} context chunks from your
                    knowledge base.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {viewer && (
        <DocumentPreviewModal
          documentId={viewer.id}
          filename={viewer.filename}
          path={viewer.path}
          usedVersion={viewer.used}
          latestVersion={viewer.latest}
          isLatest={viewer.isLatest}
          onClose={() => setViewer(null)}
          onViewHistory={handleViewVersionHistory}
          showVersionInfo={true}
          showMetadata={true}
          showHeadings={true}
          showActions={true}
        />
      )}

      {/* Help Text */}
      {!answer && !isLoading && (
        <div className={styles.helpCard}>
          <h3 className={styles.helpTitle}>How to use Q&A</h3>
          <ul className={styles.helpList}>
            <li>• Ask specific questions about your knowledge base content</li>
            <li>
              • The system will search for relevant information and provide
              answers with citations
            </li>
            <li>
              • Check the confidence level - low confidence answers should be
              verified
            </li>
            <li>• Click on source documents to verify the information</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default QnAInterface;
