import { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface CreateDocModalProps {
  onClose: () => void;
  onCreate: (title: string) => void;
}

export default function CreateDocModal({ onClose, onCreate }: CreateDocModalProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(title.trim() || 'Untitled Document');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Document</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="doc-title">
              <FileText size={16} />
              Document Title
            </label>
            <input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
              autoFocus
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
