const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const documents = new Map();
const userColors = {};
const availableColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#FF8C00', '#98D8C8'
];
let colorIndex = 0;

function getNextColor() {
  const color = availableColors[colorIndex % availableColors.length];
  colorIndex++;
  return color;
}

wss.on('connection', (ws) => {
  const userId = uuidv4();
  const userColor = getNextColor();
  userColors[userId] = { color, name: `用户${userId.slice(0, 4)}`, ws };
  
  ws.send(JSON.stringify({
    type: 'init',
    userId,
    userColor,
    documents: Array.from(documents.keys())
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join':
          handleJoin(ws, userId, data.docId);
          break;
        case 'content':
          handleContent(userId, data.docId, data.content, data.cursor);
          break;
        case 'cursor':
          handleCursor(userId, data.docId, data.cursor);
          break;
        case 'create-doc':
          handleCreateDoc(ws, data.name);
          break;
        case 'get-docs':
          ws.send(JSON.stringify({
            type: 'doc-list',
            documents: Array.from(documents.entries()).map(([id, doc]) => ({
              id,
              name: doc.name
            }))
          }));
          break;
      }
    } catch (e) {
      console.error('解析消息错误:', e);
    }
  });

  ws.on('close', () => {
    handleDisconnect(userId);
    delete userColors[userId];
  });
});

function handleJoin(ws, userId, docId) {
  if (!documents.has(docId)) {
    documents.set(docId, {
      name: '未命名文档',
      content: '# 欢迎使用 CollabMarkdown\n\n开始编辑您的 Markdown 文档...',
      users: new Set(),
      cursors: {},
      versions: []
    });
  }
  
  const doc = documents.get(docId);
  doc.users.add(userId);
  
  ws.send(JSON.stringify({
    type: 'document',
    docId,
    name: doc.name,
    content: doc.content,
    users: Array.from(doc.users).map(uid => ({
      userId: uid,
      name: userColors[uid]?.name || '未知用户',
      color: userColors[uid]?.color || '#ccc',
      cursor: doc.cursors[uid]
    })),
    versions: doc.versions
  }));
  
  broadcastToDoc(docId, {
    type: 'user-join',
    userId,
    name: userColors[userId]?.name,
    color: userColors[userId]?.color
  }, userId);
}

function handleContent(userId, docId, content, cursor) {
  if (!documents.has(docId)) return;
  
  const doc = documents.get(docId);
  doc.content = content;
  if (cursor) {
    doc.cursors[userId] = cursor;
  }
  
  broadcastToDoc(docId, {
    type: 'sync',
    userId,
    content,
    cursor,
    userName: userColors[userId]?.name
  }, userId);
}

function handleCursor(userId, docId, cursor) {
  if (!documents.has(docId)) return;
  
  const doc = documents.get(docId);
  doc.cursors[userId] = cursor;
  
  broadcastToDoc(docId, {
    type: 'cursor-update',
    userId,
    cursor,
    color: userColors[userId]?.color,
    name: userColors[userId]?.name
  });
}

function handleCreateDoc(ws, name) {
  const docId = uuidv4();
  documents.set(docId, {
    name: name || '未命名文档',
    content: '# 新文档\n\n开始编辑...',
    users: new Set(),
    cursors: {},
    versions: []
  });
  
  ws.send(JSON.stringify({
    type: 'doc-created',
    docId,
    name: name || '未命名文档'
  }));
  
  broadcastAll({
    type: 'doc-list',
    documents: Array.from(documents.entries()).map(([id, doc]) => ({
      id,
      name: doc.name
    }))
  });
}

function handleDisconnect(userId) {
  documents.forEach((doc, docId) => {
    if (doc.users.has(userId)) {
      doc.users.delete(userId);
      delete doc.cursors[userId];
      
      broadcastToDoc(docId, {
        type: 'user-leave',
        userId
      });
    }
  });
}

function broadcastToDoc(docId, message, excludeUserId = null) {
  const doc = documents.get(docId);
  if (!doc) return;
  
  doc.users.forEach(userId => {
    if (userId !== excludeUserId && userColors[userId]?.ws) {
      userColors[userId].ws.send(JSON.stringify(message));
    }
  });
}

function broadcastAll(message) {
  Object.values(userColors).forEach(({ ws }) => {
    if (ws) ws.send(JSON.stringify(message));
  });
}

app.get('/api/history/:docId', (req, res) => {
  const { docId } = req.params;
  if (!documents.has(docId)) {
    return res.status(404).json({ error: '文档不存在' });
  }
  res.json(documents.get(docId).versions);
});

app.post('/api/save/:docId', (req, res) => {
  const { docId } = req.params;
  if (!documents.has(docId)) {
    return res.status(404).json({ error: '文档不存在' });
  }
  
  const doc = documents.get(docId);
  const version = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    content: doc.content
  };
  doc.versions.push(version);
  
  broadcastToDoc(docId, {
    type: 'new-version',
    version
  });
  
  res.json(version);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
