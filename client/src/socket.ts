import { io, Socket } from 'socket.io-client';
import { User, CursorPosition, Document, DocumentVersion } from './types';

const SOCKET_URL = 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): void {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
      this.setupListeners();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('document-state', (data) => {
      this.emit('document-state', data);
    });

    this.socket.on('document-updated', (data) => {
      this.emit('document-updated', data);
    });

    this.socket.on('cursor-moved', (data) => {
      this.emit('cursor-moved', data);
    });

    this.socket.on('user-joined', (data) => {
      this.emit('user-joined', data);
    });

    this.socket.on('user-left', (data) => {
      this.emit('user-left', data);
    });

    this.socket.on('active-users', (data) => {
      this.emit('active-users', data);
    });

    this.socket.on('version-saved', (data) => {
      this.emit('version-saved', data);
    });

    this.socket.on('error', (data) => {
      this.emit('error', data);
    });
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  joinDocument(docId: string, userName: string): void {
    if (this.socket) {
      this.socket.emit('join-document', { docId, userName });
    }
  }

  updateDocument(content: string): void {
    if (this.socket) {
      this.socket.emit('update-document', { content });
    }
  }

  updateCursor(cursor: CursorPosition): void {
    if (this.socket) {
      this.socket.emit('cursor-move', { cursor });
    }
  }

  saveVersion(content: string): void {
    if (this.socket) {
      this.socket.emit('save-version', { content });
    }
  }
}

export const socketService = new SocketService();

// API functions
const API_URL = 'http://localhost:3001/api';

export async function createDocument(title: string, content: string = ''): Promise<Document> {
  const response = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content })
  });
  return response.json();
}

export async function getDocument(id: string): Promise<Document> {
  const response = await fetch(`${API_URL}/documents/${id}`);
  return response.json();
}

export async function getVersions(docId: string): Promise<DocumentVersion[]> {
  const response = await fetch(`${API_URL}/documents/${docId}/versions`);
  return response.json();
}

export async function restoreVersion(docId: string, versionId: string): Promise<Document> {
  const response = await fetch(`${API_URL}/documents/${docId}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionId })
  });
  return response.json();
}
