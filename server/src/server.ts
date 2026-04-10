import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { store } from './store';
import { USER_COLORS, User, CursorPosition } from './types';

// 允许的跨域来源
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// REST API Routes

// Create a new document
app.post('/api/documents', (req, res) => {
  const { title, content = '' } = req.body;
  const doc = store.createDocument(title || 'Untitled Document', content);
  res.json(doc);
});

// Get a document
app.get('/api/documents/:id', (req, res) => {
  const doc = store.getDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

// Save a version
app.post('/api/documents/:id/versions', (req, res) => {
  const { content, savedBy } = req.body;
  const version = store.saveVersion(req.params.id, content, savedBy);
  if (!version) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(version);
});

// Get all versions
app.get('/api/documents/:id/versions', (req, res) => {
  const versions = store.getVersions(req.params.id);
  if (!versions) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(versions);
});

// Restore a version
app.post('/api/documents/:id/restore', (req, res) => {
  const { versionId } = req.body;
  const doc = store.restoreVersion(req.params.id, versionId);
  if (!doc) {
    return res.status(404).json({ error: 'Document or version not found' });
  }
  res.json(doc);
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  let currentDocId: string | null = null;
  let userId: string | null = null;

  // Join a document room
  socket.on('join-document', ({ docId, userName }: { docId: string; userName: string }) => {
    const doc = store.getDocument(docId);
    if (!doc) {
      socket.emit('error', { message: 'Document not found' });
      return;
    }

    // Leave previous room if any
    if (currentDocId) {
      socket.leave(currentDocId);
    }

    currentDocId = docId;
    userId = `${docId}-${socket.id}`;

    // Create user
    const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
    const user: User = {
      id: userId,
      name: userName || `User ${socket.id.slice(0, 6)}`,
      color
    };
    
    store.addUser(user);
    socket.join(docId);

    // Send current document state
    socket.emit('document-state', {
      document: doc,
      userId: userId,
      userColor: color
    });

    // Notify other users
    socket.to(docId).emit('user-joined', {
      userId: userId,
      userName: user.name,
      userColor: color
    });

    // Send list of active users to the new user
    const activeUsers = Array.from(io.sockets.adapter.rooms.get(docId) || [])
      .map(socketId => {
        const uid = `${docId}-${socketId}`;
        return store.getUser(uid);
      })
      .filter((u): u is User => u !== undefined);
    
    socket.emit('active-users', activeUsers);

    console.log(`User ${user.name} joined document ${docId}`);
  });

  // Handle document updates
  socket.on('update-document', ({ content }: { content: string }) => {
    if (!currentDocId || !userId) return;

    // Update document in store
    store.updateDocument(currentDocId, content);

    // Broadcast to other users in the room
    socket.to(currentDocId).emit('document-updated', {
      content,
      userId
    });
  });

  // Handle cursor position updates
  socket.on('cursor-move', ({ cursor }: { cursor: CursorPosition }) => {
    if (!currentDocId || !userId) return;

    store.updateUserCursor(userId, cursor);

    // Broadcast cursor position to other users
    socket.to(currentDocId).emit('cursor-moved', {
      userId,
      cursor
    });
  });

  // Handle save version
  socket.on('save-version', ({ content }: { content: string }) => {
    if (!currentDocId || !userId) return;

    const user = store.getUser(userId);
    if (!user) return;

    const version = store.saveVersion(currentDocId, content, user.name);
    if (version) {
      // Notify all users in the room
      io.to(currentDocId).emit('version-saved', version);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (currentDocId && userId) {
      store.removeUser(userId);
      socket.to(currentDocId).emit('user-left', { userId });
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
