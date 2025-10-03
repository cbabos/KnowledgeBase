import React, { useState } from 'react';
import { MessageSquare, Send, FileText, ExternalLink, AlertCircle, Search } from 'lucide-react';
import { MCPTool, QAAnswer, Citation } from '../types';
import DocumentViewerModal from './DocumentViewerModal';

interface QnAInterfaceProps {
  tools: MCPTool[];
  onSwitchToSearch?: () => void;
}

const QnAInterface: React.FC<QnAInterfaceProps> = ({ tools, onSwitchToSearch }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<QAAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCitations, setShowCitations] = useState(false);
  const [viewer, setViewer] = useState<{ id: string; filename: string; path: string; used?: number; latest?: number; isLatest?: boolean } | null>(null);

  const askQuestion = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const request = {
        tool: 'answer_question',
        arguments: {
          question: question.trim(),
          top_k: 5,
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
        setAnswer(data.data);
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

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'low':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
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

  return (
    <div className="space-y-6">
      {/* Question Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ask a Question</h2>
          {onSwitchToSearch && (
            <button
              onClick={onSwitchToSearch}
              className="flex items-center px-3 py-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <Search className="h-4 w-4 mr-2" />
              Switch to Search
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
                placeholder="Ask a question about your knowledge base..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <button
            onClick={askQuestion}
            disabled={isLoading || !question.trim()}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isLoading ? (
              <>
                <div className="loading-spinner h-4 w-4 mr-2"></div>
                Asking...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Ask
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Answer Display */}
      {answer && (
        <div className="space-y-4">
          {/* Answer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Answer</h2>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(answer.confidence)}`}>
                  {getConfidenceIcon(answer.confidence)} {answer.confidence.toUpperCase()} CONFIDENCE
                </span>
                {answer.confidence === 'low' && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Consider checking sources
                  </span>
                )}
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {answer.answer}
              </p>
            </div>

            {answer.confidence === 'low' && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>Low confidence:</strong> The answer may not be accurate. Please verify the information by checking the source documents.
                </p>
              </div>
            )}
          </div>

          {/* Citations */}
          {answer.citations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Sources ({answer.citations.length})
                  </h3>
                  <button
                    onClick={() => setShowCitations(!showCitations)}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                  >
                    {showCitations ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                <div className="space-y-3">
                  {answer.citations.map((citation, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {citation.filename}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Chunk {citation.chunk_id}
                            </span>
                          </div>
                          
                          {/* Version Information */}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Version:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              citation.is_latest 
                                ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20' 
                                : 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'
                            }`}>
                              v{citation.used_version}
                            </span>
                            {!citation.is_latest && (
                              <>
                                <span className="text-xs text-gray-400">→</span>
                                <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700">
                                  Latest: v{citation.latest_version}
                                </span>
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  (Outdated)
                                </span>
                              </>
                            )}
                            {citation.is_latest && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                (Latest)
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {citation.path}
                          </p>

                          {showCitations && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {citation.excerpt}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setViewer({
                              id: citation.document_id,
                              filename: citation.filename,
                              path: citation.path,
                              used: (citation as any).used_version,
                              latest: (citation as any).latest_version,
                              isLatest: (citation as any).is_latest,
                            });
                          }}
                          className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Open document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Based on {answer.context_chunks} context chunks from your knowledge base.
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {viewer && (
        <DocumentViewerModal
          documentId={viewer.id}
          filename={viewer.filename}
          path={viewer.path}
          usedVersion={viewer.used}
          latestVersion={viewer.latest}
          isLatest={viewer.isLatest}
          onClose={() => setViewer(null)}
        />
      )}

      {/* Help Text */}
      {!answer && !isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            How to use Q&A
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Ask specific questions about your knowledge base content</li>
            <li>• The system will search for relevant information and provide answers with citations</li>
            <li>• Check the confidence level - low confidence answers should be verified</li>
            <li>• Click on source documents to verify the information</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default QnAInterface;
