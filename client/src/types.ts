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
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
}

export interface DocumentVersion {
  id: string;
  content: string;
  savedBy: string;
  savedAt: string;
}

export interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onCursorChange: (position: CursorPosition) => void;
  remoteCursors: Map<string, User>;
}

export interface PreviewProps {
  content: string;
}
