import React, { useState, useEffect } from 'react';
import {
  Clock,
  FileText,
  GitBranch,
  Eye,
  GitCompare,
  ArrowLeft,
  GitCommit,
} from 'lucide-react';
import { Document, VersionHistory, VersionDiff, DiffLine } from '../../types';
import Button from '../common/Button';
import Dropdown, { DropdownOption } from '../common/Dropdown';
import DocumentViewerModal from '../DocumentViewerModal/DocumentViewerModal';
import styles from './VersionHistoryInterface.module.css';

interface VersionHistoryInterfaceProps {
  document: Document;
  onBack: () => void;
}

const VersionHistoryInterface: React.FC<VersionHistoryInterfaceProps> = ({
  document,
  onBack,
}) => {
  const [versionHistory, setVersionHistory] = useState<VersionHistory | null>(
    null
  );
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
        return styles.diffLineAdded;
      case 'removed':
        return styles.diffLineRemoved;
      case 'unchanged':
        return styles.diffLineUnchanged;
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

  // Prepare dropdown options for version selection
  const versionOptions: DropdownOption[] =
    versionHistory?.versions.map(version => ({
      value: version.version.toString(),
      label: `v${version.version}`,
      icon: <GitCommit />,
    })) || [];

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={`${styles.loadingSpinner} loading-spinner`}></div>
          <p className={styles.loadingText}>Loading version history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorText}>{error}</div>
          <Button onClick={onBack} variant='secondary'>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (showDiff && diffData) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeaderLeft}>
                <Button
                  onClick={() => setShowDiff(false)}
                  leftIcon={ArrowLeft}
                  variant='ghost'
                  size='sm'
                >
                  Back to History
                </Button>
                <div className={styles.documentInfo}>
                  <h1 className={styles.documentTitle}>Version Comparison</h1>
                  <p className={styles.documentPath}>{diffData.path}</p>
                </div>
              </div>
              <div className={styles.versionInfo}>
                <div className={styles.versionStats}>
                  <span
                    className={`${styles.versionBadge} ${styles.versionBadgeCurrent}`}
                  >
                    v{diffData.version_a}
                  </span>
                  vs
                  <span
                    className={`${styles.versionBadge} ${styles.versionBadgeLatest}`}
                  >
                    v{diffData.version_b}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Diff Summary */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Changes Summary</h2>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div
                  className={`${styles.statValue} ${styles.statValueSuccess}`}
                >
                  +{diffData.diff.summary.added}
                </div>
                <div className={styles.statLabel}>Lines Added</div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statValue} ${styles.statValueError}`}>
                  -{diffData.diff.summary.removed}
                </div>
                <div className={styles.statLabel}>Lines Removed</div>
              </div>
              <div className={styles.statCard}>
                <div
                  className={`${styles.statValue} ${styles.statValueNeutral}`}
                >
                  {diffData.diff.summary.unchanged}
                </div>
                <div className={styles.statLabel}>Lines Unchanged</div>
              </div>
            </div>
          </div>

          {/* Diff Content */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>File Differences</h2>
            <div className={styles.diffContainer}>
              {diffData.diff.lines.map((line: DiffLine, index: number) => (
                <div
                  key={index}
                  className={`${styles.diffLine} ${getDiffLineClass(line.type)}`}
                >
                  <div className={styles.lineNumber}>{line.line}</div>
                  <div className={styles.lineIndicator}>
                    {getDiffLineIcon(line.type)}
                  </div>
                  <div className={styles.lineContent}>{line.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionHeaderLeft}>
              <Button
                onClick={onBack}
                leftIcon={ArrowLeft}
                variant='ghost'
                size='sm'
              >
                Back to Search
              </Button>
              <div className={styles.documentInfo}>
                <h1 className={styles.documentTitle}>Version History</h1>
                <p className={styles.documentPath}>{document.filename}</p>
              </div>
            </div>
            <div className={styles.versionInfo}>
              <div className={styles.versionStats}>
                <GitBranch className={styles.versionIcon} />
                <span className={styles.versionText}>
                  {versionHistory?.versions.length || 0} versions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Version Timeline */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Version Timeline</h2>
          <div className={styles.versionList}>
            {versionHistory?.versions.map((version, index) => (
              <div
                key={version.id}
                className={`${styles.versionItem} ${
                  version.is_latest ? styles.versionItemLatest : ''
                }`}
              >
                <div className={styles.versionItemLeft}>
                  <div className={styles.versionItemInfo}>
                    <Clock className={styles.versionItemIcon} />
                    <span className={styles.versionItemText}>
                      {formatDate(version.indexed_at)}
                    </span>
                  </div>
                  <div className={styles.versionItemTitle}>
                    <span className={styles.versionItemTitleText}>
                      Version {version.version}
                    </span>
                    {version.is_latest && (
                      <span className={styles.versionItemBadge}>Latest</span>
                    )}
                  </div>
                </div>
                <div className={styles.versionItemActions}>
                  <Button
                    onClick={() => setSelectedVersion(version)}
                    leftIcon={Eye}
                    variant='ghost'
                    size='sm'
                  >
                    View
                  </Button>
                </div>
                <div className={styles.versionItemMeta}>
                  <div className={styles.versionItemMetaContent}>
                    <span>Size: {version.size} bytes</span>
                    <span>Hash: {version.content_hash.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Version Comparison */}
        <div className={styles.compareSection}>
          <h2 className={styles.sectionTitle}>Compare Versions</h2>
          <div className={styles.compareControls}>
            <div className={styles.compareControl}>
              <label className={styles.compareLabel}>Version A:</label>
              <Dropdown
                options={versionOptions}
                value={versionA.toString()}
                placeholder='Select version'
                icon={<GitCommit />}
                onChange={value => setVersionA(parseInt(value))}
              />
            </div>
            <div className={styles.compareControl}>
              <label className={styles.compareLabel}>Version B:</label>
              <Dropdown
                options={versionOptions}
                value={versionB.toString()}
                placeholder='Select version'
                icon={<GitCommit />}
                onChange={value => setVersionB(parseInt(value))}
              />
            </div>
            <Button
              onClick={compareVersions}
              disabled={isLoading}
              loading={isLoading}
              leftIcon={GitCompare}
              variant='primary'
            >
              Compare
            </Button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {selectedVersion && (
        <DocumentViewerModal
          documentId={selectedVersion.id}
          filename={selectedVersion.filename}
          path={selectedVersion.path}
          usedVersion={selectedVersion.version}
          latestVersion={versionHistory?.versions[0]?.version}
          isLatest={selectedVersion.is_latest}
          onClose={() => setSelectedVersion(null)}
        />
      )}
    </div>
  );
};

export default VersionHistoryInterface;
