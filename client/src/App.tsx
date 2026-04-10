import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirrorEditor from './components/CodeMirrorEditor';
import MarkdownPreview from './components/MarkdownPreview';
import { User, VersionHistory } from './types';
import './index.css';

function App() {
  const [docId, setDocId] = useState<string>('');
  const [userId] = useState<string>(() => 'user_' + Math.random().toString(36).substr(2, 9));
  const [userName, setUserName] = useState<string>('');
  const [content, setContent] = useState<string>('# Welcome to CollabMarkdown\n\nStart editing your collaborative document...');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [userColor, setUserColor] = useState<string>('#4299e1');
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showNameModal, setShowNameModal] = useState(true);
  const [tempName, setTempName] = useState('');
  const contentRef = useRef(content);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedDocId = urlParams.get('doc');
    if (sharedDocId) {
      setDocId(sharedDocId);
    }
    const savedName = localStorage.getItem('collabmarkdown_username');
    if (savedName) {
      setTempName(savedName);
    }
  }, []);

  const connectWebSocket = useCallback((dId: string, uName: string) => {
    const wsPort = 3001;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:${wsPort}?docId=${dId}&userId=${userId}&userName=${encodeURIComponent(uName)}`;
    const websocket = new WebSocket(wsUrl);
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'init':
          setUserColor(data.color);
          setContent(data.content);
          setUsers(data.users);
          break;
        case 'update':
          setContent(data.content);
          break;
        case 'cursor':
          setUsers(prev => ({
            ...prev,
            [data.userId]: {
              ...prev[data.userId],
              cursor: data.cursor,
              color: data.color,
              name: data.userName
            }
          }));
          break;
        case 'selection':
          setUsers(prev => ({
            ...prev,
            [data.userId]: {
              ...prev[data.userId],
              selection: data.selection,
              color: data.color
            }
          }));
          break;
        case 'user_join':
        case 'user_leave':
          setUsers(data.users);
          break;
      }
    };

    websocket.onclose = () => {
      setTimeout(() => connectWebSocket(dId, uName), 1000);
    };

    setWs(websocket);
  }, [userId]);

  const handleJoin = () => {
    if (!tempName.trim()) return;
    setUserName(tempName);
    localStorage.setItem('collabmarkdown_username', tempName);
    setShowNameModal(false);
    
    if (!docId) {
      createNewDoc();
    } else {
      connectWebSocket(docId, tempName);
      fetch(`/api/doc/${docId}`)
        .then(res => res.json())
        .then(data => {
          setVersions(data.versions || []);
        });
    }
  };

  const createNewDoc = async () => {
    try {
      const res = await fetch('/api/create', { method: 'POST' });
      const data = await res.json();
      setDocId(data.docId);
      const newUrl = `${window.location.origin}${window.location.pathname}?doc=${data.docId}`;
      window.history.pushState({}, '', newUrl);
      connectWebSocket(data.docId, userName || tempName);
    } catch (e) {
      console.error('Failed to create document:', e);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'update',
        content: newContent,
        userId
      }));
    }
  };

  const handleCursorChange = (cursor: any, selection: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (cursor) {
        ws.send(JSON.stringify({
          type: 'cursor',
          userId,
          userName,
          cursor
        }));
      }
      if (selection) {
        ws.send(JSON.stringify({
          type: 'selection',
          userId,
          userName,
          selection
        }));
      }
    }
  };

  const saveVersion = async () => {
    if (!docId) return;
    try {
      const res = await fetch(`/api/doc/${docId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentRef.current,
          userId,
          userName
        })
      });
      const data = await res.json();
      if (data.success) {
        setVersions(data.versions);
        alert('Version saved successfully!');
      }
    } catch (e) {
      console.error('Failed to save version:', e);
    }
  };

  const rollbackToVersion = (version: VersionHistory) => {
    setContent(version.content);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'update',
        content: version.content,
        userId
      }));
    }
    setShowVersions(false);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?doc=${docId}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
    setShowShare(false);
  };

  const openNewDocument = () => {
    createNewDoc();
  };

  return (
    <div className="app">
      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Welcome to CollabMarkdown!</h2>
            <p style={{ marginBottom: 16, color: '#4a5568' }}>Enter your name to start collaborating:</p>
            <input
              type="text"
              placeholder="Your name"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleJoin}>
              Start Editing
            </button>
          </div>
        </div>
      )}

      <div className="header">
        <div className="header-left">
          <h1>📝 CollabMarkdown</h1>
        </div>
        <div className="header-center">
          <button className="btn btn-primary" onClick={openNewDocument}>
            New Document
          </button>
          <button className="btn btn-secondary" onClick={() => setShowShare(true)} disabled={!docId}>
            Share Link
          </button>
          <button className="btn btn-success" onClick={saveVersion} disabled={!docId}>
            Save Version
          </button>
          <button className="btn btn-secondary" onClick={() => setShowVersions(true)} disabled={!docId}>
            Version History
          </button>
        </div>
        <div className="header-right">
          <div className="user-indicators">
            {Object.entries(users).map(([id, user]) => (
              <div
                key={id}
                className="user-indicator"
                style={{ backgroundColor: user.color || userColor }}
                title={id === userId ? 'You' : user.name}
              >
                {id === userId ? 'You' : user.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="main-container">
        <div className="editor-pane">
          <div className="pane-header">
            Editor <span className="shortcut-hint">Ctrl+B: Bold | Ctrl+I: Italic | Ctrl+K: Link</span>
          </div>
          <CodeMirrorEditor
            content={content}
            onChange={handleContentChange}
            onCursorChange={handleCursorChange}
            users={users}
            currentUserId={userId}
          />
        </div>
        <div className="preview-pane">
          <div className="pane-header">Preview</div>
          <MarkdownPreview content={content} />
        </div>
      </div>

      {showVersions && (
        <div className="modal-overlay" onClick={() => setShowVersions(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Version History</h2>
            {versions.length === 0 ? (
              <p style={{ color: '#718096' }}>No versions saved yet. Click "Save Version" to create a snapshot.</p>
            ) : (
              versions.map((v, i) => (
                <div
                  key={i}
                  className="version-item"
                  onClick={() => rollbackToVersion(v)}
                >
                  <div className="version-user">{v.user}</div>
                  <div className="version-time">
                    {new Date(v.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
            <button
              className="btn btn-secondary"
              style={{ marginTop: 16 }}
              onClick={() => setShowVersions(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Share Document</h2>
            <p style={{ marginBottom: 16, color: '#4a5568' }}>Copy this link to invite collaborators:</p>
            <input
              type="text"
              value={`${window.location.origin}${window.location.pathname}?doc=${docId}`}
              readOnly
              onClick={(e) => e.currentTarget.select()}
            />
            <button className="btn btn-primary" onClick={copyShareLink}>
              Copy Link
            </button>
            <button
              className="btn btn-secondary"
              style={{ marginLeft: 8 }}
              onClick={() => setShowShare(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
