import { useState, useEffect } from 'react';
import { X, RotateCcw, Clock } from 'lucide-react';
import { DocumentVersion } from '../types';
import { getVersions, restoreVersion } from '../socket';

interface VersionHistoryProps {
  docId: string;
  onClose: () => void;
  onRestore: (content: string) => void;
}

export default function VersionHistory({ docId, onClose, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);

  useEffect(() => {
    loadVersions();
  }, [docId]);

  const loadVersions = async () => {
    try {
      const data = await getVersions(docId);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: DocumentVersion) => {
    if (!confirm('Are you sure you want to restore this version? Current content will be replaced.')) {
      return;
    }

    try {
      await restoreVersion(docId, version.id);
      onRestore(version.content);
      onClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
      alert('Failed to restore version');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content version-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Version History</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="version-list">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : versions.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <p>No saved versions yet</p>
              <span>Press Ctrl+S to save a version</span>
            </div>
          ) : (
            <>
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`version-item ${selectedVersion?.id === version.id ? 'selected' : ''}`}
                  onClick={() => setSelectedVersion(version)}
                >
                  <div className="version-info">
                    <div className="version-number">Version {versions.length - index}</div>
                    <div className="version-meta">
                      <span className="version-author">{version.savedBy}</span>
                      <span className="version-date">{formatDate(version.savedAt)}</span>
                    </div>
                  </div>
                  <button
                    className="restore-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(version);
                    }}
                    title="Restore this version"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {selectedVersion && (
          <div className="version-preview">
            <h3>Preview</h3>
            <div className="preview-content">
              <pre>{selectedVersion.content.slice(0, 500)}{selectedVersion.content.length > 500 ? '...' : ''}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
