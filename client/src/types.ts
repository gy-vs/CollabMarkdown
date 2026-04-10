export interface User {
  name: string;
  color: string;
  cursor?: { line: number; ch: number };
  selection?: { anchor: { line: number; ch: number }; head: { line: number; ch: number } };
}

export interface VersionHistory {
  timestamp: number;
  content: string;
  user: string;
}
