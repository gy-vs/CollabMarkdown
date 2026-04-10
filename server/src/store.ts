import { Document, DocumentVersion, User } from './types';

// Simple UUID generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class Store {
  private documents: Map<string, Document> = new Map();
  private users: Map<string, User> = new Map();

  // Document operations
  createDocument(title: string, content: string = ''): Document {
    const id = generateId();
    const now = new Date();
    const doc: Document = {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      versions: []
    };
    this.documents.set(id, doc);
    return doc;
  }

  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  updateDocument(id: string, content: string): Document | undefined {
    const doc = this.documents.get(id);
    if (!doc) return undefined;
    
    doc.content = content;
    doc.updatedAt = new Date();
    this.documents.set(id, doc);
    return doc;
  }

  saveVersion(docId: string, content: string, savedBy: string): DocumentVersion | undefined {
    const doc = this.documents.get(docId);
    if (!doc) return undefined;

    const version: DocumentVersion = {
      id: generateId(),
      content,
      savedBy,
      savedAt: new Date()
    };

    doc.versions.push(version);
    this.documents.set(docId, doc);
    return version;
  }

  getVersions(docId: string): DocumentVersion[] | undefined {
    const doc = this.documents.get(docId);
    return doc?.versions;
  }

  restoreVersion(docId: string, versionId: string): Document | undefined {
    const doc = this.documents.get(docId);
    if (!doc) return undefined;

    const version = doc.versions.find(v => v.id === versionId);
    if (!version) return undefined;

    doc.content = version.content;
    doc.updatedAt = new Date();
    this.documents.set(docId, doc);
    return doc;
  }

  // User operations
  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUserCursor(userId: string, cursor: { lineNumber: number; column: number }): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = cursor;
      this.users.set(userId, user);
    }
  }

  getDocumentUsers(docId: string): User[] {
    return Array.from(this.users.values()).filter(u => u.id.startsWith(docId));
  }
}

export const store = new Store();
