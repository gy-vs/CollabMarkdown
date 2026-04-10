import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface ShareModalProps {
  docId: string;
  onClose: () => void;
}

export default function ShareModal({ docId, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/doc/${docId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Document</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="share-content">
          <p>Share this link with others to collaborate:</p>
          
          <div className="share-url-container">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="share-url-input"
            />
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="share-info">
            <h4>How it works:</h4>
            <ul>
              <li>Anyone with this link can view and edit the document</li>
              <li>Changes are synchronized in real-time</li>
              <li>Each user is assigned a unique color for their cursor</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
