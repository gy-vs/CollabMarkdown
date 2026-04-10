export interface User {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  id: string;
  content: string;
  savedBy: string;
  savedAt: Date;
}

export interface DocumentUpdate {
  content: string;
  userId: string;
}

export interface CursorUpdate {
  userId: string;
  cursor: CursorPosition;
}

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];
