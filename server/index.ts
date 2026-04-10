import express from 'express';
import http from 'http';
import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { join } from 'path';

const app = express();
const server = http.createServer(app);

interface Document {
  content: string;
  versions: { timestamp: number; content: string; user: string }[];
  users: { [id: string]: { name: string; color: string; cursor?: any } };
}

const documents: { [id: string]: Document } = {};
const userColors = ['#FF5733', '#33FF57', '#3357FF', '#FF33F5', '#33FFF5', '#F5FF33'];
let colorIndex = 0;

app.use(express.static(join(__dirname, '../dist/client')));
app.use(express.json());

app.get('/api/doc/:id', (req, res) => {
  const docId = req.params.id;
  if (!documents[docId]) {
    documents[docId] = {
      content: '# Welcome to CollabMarkdown\n\nStart editing your collaborative document...',
      versions: [],
      users: {}
    };
  }
  res.json({ 
    content: documents[docId].content, 
    users: documents[docId].users,
    versions: documents[docId].versions 
  });
});

app.post('/api/doc/:id/save', (req, res) => {
  const docId = req.params.id;
  const { content, userId, userName } = req.body;
  if (!documents[docId]) {
    return res.status(404).json({ error: 'Document not found' });
  }
  documents[docId].content = content;
  documents[docId].versions.unshift({
    timestamp: Date.now(),
    content,
    user: userName || userId
  });
  if (documents[docId].versions.length > 50) {
    documents[docId].versions.pop();
  }
  res.json({ success: true, versions: documents[docId].versions });
});

app.post('/api/create', (req, res) => {
  const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  documents[docId] = {
    content: '# New Collaborative Document\n\nStart editing here...',
    versions: [],
    users: {}
  };
  res.json({ docId });
});

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const urlParams = new URLSearchParams(req.url?.split('?')[1] || '');
  const docId = urlParams.get('docId') || 'default';
  const userId = urlParams.get('userId') || ('user_' + Math.random().toString(36).substr(2, 9));
  const userName = urlParams.get('userName') || 'Anonymous';

  if (!documents[docId]) {
    documents[docId] = {
      content: '# Welcome to CollabMarkdown\n\nStart editing your collaborative document...',
      versions: [],
      users: {}
    };
  }

  const userColor = userColors[colorIndex++ % userColors.length];
  documents[docId].users[userId] = { name: userName, color: userColor };

  const docClients = Array.from(wss.clients()).filter((c: any) => c.docId === docId);
  (ws as any).docId = docId;
  (ws as any).userId = userId;

  docClients.forEach((client: any) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'user_join',
        userId,
        userName,
        color: userColor,
        users: documents[docId].users
      }));
    }
  });

  ws.send(JSON.stringify({
    type: 'init',
    userId,
    color: userColor,
    content: documents[docId].content,
    users: documents[docId].users
  }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      const docClients = Array.from(wss.clients()).filter((c: any) => 
        c.docId === docId && c.readyState === WebSocket.OPEN
      );
      
      switch (data.type) {
        case 'update':
          documents[docId].content = data.content;
          docClients.forEach((client: any) => {
            if (client.userId !== data.userId) {
              client.send(JSON.stringify({
                type: 'update',
                content: data.content,
                userId: data.userId
              }));
            }
          });
          break;
        case 'cursor':
          documents[docId].users[userId].cursor = data.cursor;
          docClients.forEach((client: any) => {
            if (client.userId !== data.userId) {
              client.send(JSON.stringify({
                type: 'cursor',
                userId: data.userId,
                userName: data.userName,
                cursor: data.cursor,
                color: userColor
              }));
            }
          });
          break;
        case 'selection':
          docClients.forEach((client: any) => {
            if (client.userId !== data.userId) {
              client.send(JSON.stringify({
                type: 'selection',
                userId: data.userId,
                userName: data.userName,
                selection: data.selection,
                color: userColor
              }));
            }
          });
          break;
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  });

  ws.on('close', () => {
    if (documents[docId] && documents[docId].users[userId]) {
      delete documents[docId].users[userId];
      const docClients = Array.from(wss.clients()).filter((c: any) => 
        c.docId === docId && c.readyState === WebSocket.OPEN
      );
      docClients.forEach((client: any) => {
        client.send(JSON.stringify({
          type: 'user_leave',
          userId,
          users: documents[docId].users
        }));
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});
