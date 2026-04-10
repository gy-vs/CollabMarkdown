import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MarkdownEditor from './components/Editor';
import Preview from './components/Preview';
import Toolbar from './components/Toolbar';
import VersionHistory from './components/VersionHistory';
import ShareModal from './components/ShareModal';
import UserList from './components/UserList';
import CreateDocModal from './components/CreateDocModal';
import { socketService, createDocument, getDocument } from './socket';
import { User, CursorPosition, Document } from './types';
import './App.css';

const DEFAULT_CONTENT = `# Welcome to Collaborative Markdown Editor

This is a **real-time collaborative** markdown editor.

## Features

- **Live Collaboration**: Multiple users can edit simultaneously
- **Syntax Highlighting**: Support for code blocks
- **Math Support**: $E = mc^2$
- **Tables**: 

| Feature | Status |
|---------|--------|
| Real-time sync | ✅ |
| Version history | ✅ |
| Share links | ✅ |

## Shortcuts

- Ctrl+B: **Bold**
- Ctrl+I: *Italic*
- Ctrl+K: [Link](url)
- Ctrl+S: Save version

Start typing to see the magic! ✨
`;

function App() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [document, setDocument] = useState<Document | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userColor, setUserColor] = useState<string>('');
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, User>>(new Map());
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string>('');
  
  const contentRef = useRef(content);
  const isRemoteUpdate = useRef(false);
  const usersMapRef = useRef<Map<string, User>>(new Map());

  // Update ref when content changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Update users map ref when activeUsers changes
  useEffect(() => {
    const newMap = new Map<string, User>();
    activeUsers.forEach(user => {
      newMap.set(user.id, user);
    });
    usersMapRef.current = newMap;
  }, [activeUsers]);

  // Initialize document
  useEffect(() => {
    const init = async () => {
      if (!docId) {
        // Create a new document
        try {
          const newDoc = await createDocument('Untitled Document', DEFAULT_CONTENT);
          navigate(`/doc/${newDoc.id}`, { replace: true });
        } catch (error) {
          console.error('Failed to create document:', error);
          setConnectionError('Failed to create document');
        }
        return;
      }

      try {
        // Get existing document
        const existingDoc = await getDocument(docId);
        setDocument(existingDoc);
        setContent(existingDoc.content);
        
        // Connect to socket
        socketService.connect();
        
        // Generate user name
        const userName = `User ${Math.floor(Math.random() * 1000)}`;
        socketService.joinDocument(docId, userName);
      } catch (error) {
        console.error('Failed to load document:', error);
        setConnectionError('Document not found');
        setIsConnecting(false);
      }
    };

    init();

    return () => {
      socketService.disconnect();
    };
  }, [docId, navigate]);

  // Setup socket listeners
  useEffect(() => {
    const handleDocumentState = (data: { document: Document; userId: string; userColor: string }) => {
      setDocument(data.document);
      setCurrentUserId(data.userId);
      setUserColor(data.userColor);
      setIsConnecting(false);
    };

    const handleDocumentUpdated = (data: { content: string; userId: string }) => {
      if (data.userId !== currentUserId) {
        isRemoteUpdate.current = true;
        setContent(data.content);
      }
    };

    const handleCursorMoved = (data: { userId: string; cursor: CursorPosition }) => {
      // Use ref to get latest users map
      const user = usersMapRef.current.get(data.userId);
      if (user) {
        setRemoteCursors(prev => {
          const newMap = new Map(prev);
          newMap.set(data.userId, { ...user, cursor: data.cursor });
          return newMap;
        });
      }
    };

    const handleUserJoined = (data: { userId: string; userName: string; userColor: string }) => {
      const newUser: User = {
        id: data.userId,
        name: data.userName,
        color: data.userColor
      };
      setActiveUsers(prev => {
        const filtered = prev.filter(u => u.id !== data.userId);
        return [...filtered, newUser];
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
      setRemoteCursors(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    };

    const handleActiveUsers = (users: User[]) => {
      setActiveUsers(users);
    };

    const handleVersionSaved = () => {
      // Could show a notification here
    };

    const handleError = (data: { message: string }) => {
      setConnectionError(data.message);
      setIsConnecting(false);
    };

    socketService.on('document-state', handleDocumentState);
    socketService.on('document-updated', handleDocumentUpdated);
    socketService.on('cursor-moved', handleCursorMoved);
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('active-users', handleActiveUsers);
    socketService.on('version-saved', handleVersionSaved);
    socketService.on('error', handleError);

    return () => {
      socketService.off('document-state', handleDocumentState);
      socketService.off('document-updated', handleDocumentUpdated);
      socketService.off('cursor-moved', handleCursorMoved);
      socketService.off('user-joined', handleUserJoined);
      socketService.off('user-left', handleUserLeft);
      socketService.off('active-users', handleActiveUsers);
      socketService.off('version-saved', handleVersionSaved);
      socketService.off('error', handleError);
    };
  }, [currentUserId]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    
    if (!isRemoteUpdate.current) {
      socketService.updateDocument(newContent);
    }
    isRemoteUpdate.current = false;
  }, []);

  // Handle cursor change
  const handleCursorChange = useCallback((position: CursorPosition) => {
    socketService.updateCursor(position);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    socketService.saveVersion(contentRef.current);
    alert('Version saved!');
  }, []);

  // Handle title change
  const handleTitleChange = useCallback((title: string) => {
    setDocument(prev => prev ? { ...prev, title } : null);
  }, []);

  // Handle new document
  const handleNewDoc = useCallback(() => {
    setShowCreate(true);
  }, []);

  // Handle create document
  const handleCreateDoc = useCallback(async (title: string) => {
    try {
      const newDoc = await createDocument(title, DEFAULT_CONTENT);
      navigate(`/doc/${newDoc.id}`);
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to create document:', error);
      alert('Failed to create document');
    }
  }, [navigate]);

  // Handle open document
  const handleOpenDoc = useCallback(() => {
    const id = prompt('Enter document ID:');
    if (id) {
      navigate(`/doc/${id}`);
    }
  }, [navigate]);

  // Handle restore version
  const handleRestoreVersion = useCallback((restoredContent: string) => {
    setContent(restoredContent);
    socketService.updateDocument(restoredContent);
  }, []);

  // Insert formatting helpers
  const insertBold = useCallback(() => {
    // This will be handled by the editor component
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      bubbles: true
    }));
  }, []);

  const insertItalic = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'i',
      ctrlKey: true,
      bubbles: true
    }));
  }, []);

  const insertLink = useCallback(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true
    }));
  }, []);

  if (isConnecting) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Connecting to document...</p>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="error-screen">
        <h2>Error</h2>
        <p>{connectionError}</p>
        <button onClick={() => navigate('/')}>
          Create New Document
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar
        onBold={insertBold}
        onItalic={insertItalic}
        onLink={insertLink}
        onSave={handleSave}
        onShowHistory={() => setShowHistory(true)}
        onShare={() => setShowShare(true)}
        onNewDoc={handleNewDoc}
        onOpenDoc={handleOpenDoc}
        userCount={activeUsers.length + 1}
        documentTitle={document?.title || 'Untitled'}
        onTitleChange={handleTitleChange}
      />

      <div className="main-container">
        <div className="editor-pane">
          <MarkdownEditor
            content={content}
            onChange={handleContentChange}
            onCursorChange={handleCursorChange}
            remoteCursors={remoteCursors}
            onSave={handleSave}
          />
        </div>
        
        <div className="preview-pane">
          <Preview content={content} />
        </div>
      </div>

      <UserList users={activeUsers} currentUserId={currentUserId} />

      {showHistory && docId && (
        <VersionHistory
          docId={docId}
          onClose={() => setShowHistory(false)}
          onRestore={handleRestoreVersion}
        />
      )}

      {showShare && docId && (
        <ShareModal
          docId={docId}
          onClose={() => setShowShare(false)}
        />
      )}

      {showCreate && (
        <CreateDocModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateDoc}
        />
      )}
    </div>
  );
}

export default App;
