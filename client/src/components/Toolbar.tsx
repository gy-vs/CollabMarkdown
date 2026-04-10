import { 
  Bold, 
  Italic, 
  Link, 
  Save, 
  History, 
  Share2, 
  Users,
  FilePlus,
  FolderOpen
} from 'lucide-react';

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onSave: () => void;
  onShowHistory: () => void;
  onShare: () => void;
  onNewDoc: () => void;
  onOpenDoc: () => void;
  userCount: number;
  documentTitle: string;
  onTitleChange: (title: string) => void;
}

export default function Toolbar({
  onBold,
  onItalic,
  onLink,
  onSave,
  onShowHistory,
  onShare,
  onNewDoc,
  onOpenDoc,
  userCount,
  documentTitle,
  onTitleChange
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-btn" onClick={onNewDoc} title="New Document">
          <FilePlus size={18} />
        </button>
        <button className="toolbar-btn" onClick={onOpenDoc} title="Open Document">
          <FolderOpen size={18} />
        </button>
        <div className="toolbar-divider" />
        <input
          type="text"
          className="document-title-input"
          value={documentTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled Document"
        />
      </div>

      <div className="toolbar-center">
        <button className="toolbar-btn" onClick={onBold} title="Bold (Ctrl+B)">
          <Bold size={18} />
        </button>
        <button className="toolbar-btn" onClick={onItalic} title="Italic (Ctrl+I)">
          <Italic size={18} />
        </button>
        <button className="toolbar-btn" onClick={onLink} title="Insert Link (Ctrl+K)">
          <Link size={18} />
        </button>
        <div className="toolbar-divider" />
        <button className="toolbar-btn" onClick={onSave} title="Save (Ctrl+S)">
          <Save size={18} />
        </button>
        <button className="toolbar-btn" onClick={onShowHistory} title="Version History">
          <History size={18} />
        </button>
      </div>

      <div className="toolbar-right">
        <div className="user-count">
          <Users size={18} />
          <span>{userCount}</span>
        </div>
        <button className="toolbar-btn share-btn" onClick={onShare} title="Share">
          <Share2 size={18} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
