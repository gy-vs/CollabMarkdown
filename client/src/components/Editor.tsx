import { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { EditorProps } from '../types';
import * as monaco from 'monaco-editor';

interface Props extends EditorProps {
  onSave: () => void;
}

export default function MarkdownEditor({ 
  content, 
  onChange, 
  onCursorChange, 
  remoteCursors,
  onSave 
}: Props) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<Map<string, string[]>>(new Map());
  const stylesRef = useRef<Map<string, HTMLStyleElement>>(new Map());

  // Handle editor mount
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Set up keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      insertFormatting('**', '**');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      insertFormatting('*', '*');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      insertFormatting('[', '](url)');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });
  };

  // Insert formatting around selection
  const insertFormatting = (before: string, after: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    if (!selection) return;

    const model = editor.getModel();
    if (!model) return;

    const selectedText = model.getValueInRange(selection);
    const newText = before + selectedText + after;

    editor.executeEdits('formatting', [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }]);

    // Adjust cursor position
    if (selectedText) {
      const newSelection = new monaco.Selection(
        selection.startLineNumber,
        selection.startColumn + before.length,
        selection.endLineNumber,
        selection.endColumn + before.length
      );
      editor.setSelection(newSelection);
    } else {
      const newPosition = new monaco.Position(
        selection.startLineNumber,
        selection.startColumn + before.length
      );
      editor.setPosition(newPosition);
    }

    editor.focus();
  };

  // Update remote cursors
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Get current decoration ids to remove
    const oldDecorationIds: string[] = [];
    decorationsRef.current.forEach((ids) => {
      oldDecorationIds.push(...ids);
    });

    // Clear old decorations
    if (oldDecorationIds.length > 0) {
      editor.deltaDecorations(oldDecorationIds, []);
    }
    decorationsRef.current.clear();

    // Clean up old styles
    stylesRef.current.forEach((styleEl) => {
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    });
    stylesRef.current.clear();

    // Add new cursor decorations
    remoteCursors.forEach((user, userId) => {
      if (!user.cursor) return;

      const { lineNumber, column } = user.cursor;
      
      // Create decoration at cursor position
      const decoration: monaco.editor.IModelDeltaDecoration = {
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `remote-cursor-${userId}`,
          beforeContentClassName: `remote-cursor-label-${userId}`,
          overviewRuler: {
            color: user.color,
            position: monaco.editor.OverviewRulerLane.Full
          }
        }
      };

      const decorationIds = editor.deltaDecorations([], [decoration]);
      decorationsRef.current.set(userId, decorationIds);

      // Add cursor style with more visible styling
      const styleId = `cursor-style-${userId}`;
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      
      // Escape user name for CSS content
      const escapedName = user.name.replace(/'/g, "\\'").replace(/"/g, '\\"');
      
      styleEl.textContent = `
        .remote-cursor-${userId} {
          background-color: ${user.color}30 !important;
          border-left: 3px solid ${user.color} !important;
          position: relative;
        }
        .remote-cursor-label-${userId}::before {
          content: '${escapedName}';
          position: absolute;
          top: -22px;
          left: -3px;
          background-color: ${user.color};
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          z-index: 1000;
          pointer-events: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .remote-cursor-label-${userId}::after {
          content: '';
          position: absolute;
          top: -6px;
          left: 5px;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid ${user.color};
          z-index: 1000;
        }
      `;
      
      document.head.appendChild(styleEl);
      stylesRef.current.set(userId, styleEl);
    });

    return () => {
      // Cleanup
      decorationsRef.current.forEach((ids) => {
        editor.deltaDecorations(ids, []);
      });
      stylesRef.current.forEach((styleEl) => {
        if (styleEl.parentNode) {
          styleEl.parentNode.removeChild(styleEl);
        }
      });
    };
  }, [remoteCursors]);

  return (
    <div className="editor-container">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={content}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
          folding: true,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          }
        }}
      />
    </div>
  );
}
