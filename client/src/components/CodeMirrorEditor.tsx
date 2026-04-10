import React, { useEffect, useRef, useCallback } from 'react';
import { EditorState, DecorationSet, RangeSet, Range } from '@codemirror/state';
import { EditorView, keymap, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, lineNumbers, highlightActiveLineGutter, highlightActiveLine, gutter, GutterMarker, ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { User } from '../types';

interface RemoteCursorWidget {
  userId: string;
  user: User;
  pos: number;
}

class CursorWidget extends WidgetType {
  constructor(private userName: string, private color: string) {
    super();
  }
  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'remote-cursor';
    wrap.innerHTML = `<div class="remote-cursor-line" style="background: ${this.color}"></div><div class="remote-cursor-label" style="background: ${this.color}">${this.userName}</div>`;
    return wrap;
  }
  ignoreEvent() { return true; }
}

const remoteCursors = (users: { [key: string]: User }, currentUserId: string) =>
  ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor() {
      this.decorations = DecorationSet.empty;
    }
    update() {
      const widgets: any[] = [];
      Object.entries(users).forEach(([id, user]) => {
        if (id !== currentUserId && user.cursor) {
          widgets.push(
            Decoration.widget({
              widget: new CursorWidget(user.name || id, user.color),
              inclusive: true,
              block: false
            }).range(user.cursor.pos || 0)
          );
        }
      });
      this.decorations = Decoration.set(widgets);
    }
  }, {
    decorations: v => v.decorations
  });

const userColorTheme = EditorView.theme({}, {});

const basicAbsoluteSetup = [
  highlightSpecialChars(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentWithTab,
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  userColorTheme,
  keymap.of([
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...completionKeymap,
    ...lintKeymap,
    indentWithTab
  ]),
];

interface Props {
  content: string;
  onChange: (content: string) => void;
  onCursorChange: (cursor: any, selection: any) => void;
  users: { [key: string]: User };
  currentUserId: string;
}

function CodeMirrorEditor({ content, onChange, onCursorChange, users, currentUserId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const toggleBold = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const { from, to, empty } = state.selection.main;
    let newText: string;
    let newFrom: number, newTo: number;
    if (empty) {
      newText = '****';
      newFrom = from + 2;
      newTo = from + 2;
    } else {
      const selected = state.doc.sliceString(from, to);
      newText = `**${selected}**`;
      newFrom = from + 2;
      newTo = to + 2;
    }
    dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: newFrom, head: newTo }
    });
  }, []);

  const toggleItalic = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const { from, to, empty } = state.selection.main;
    let newText: string;
    let newFrom: number, newTo: number;
    if (empty) {
      newText = '__';
      newFrom = from + 1;
      newTo = from + 1;
    } else {
      const selected = state.doc.sliceString(from, to);
      newText = `_${selected}_`;
      newFrom = from + 1;
      newTo = to + 1;
    }
    dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: newFrom, head: newTo }
    });
  }, []);

  const insertLink = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const { from, to, empty } = state.selection.main;
    let newText: string;
    let newFrom: number, newTo: number;
    if (empty) {
      newText = '[text](url)';
      newFrom = from + 1;
      newTo = from + 5;
    } else {
      const selected = state.doc.sliceString(from, to);
      newText = `[${selected}](url)`;
      newFrom = to + 3;
      newTo = to + 6;
    }
    dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: newFrom, head: newTo }
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        onChange(newContent);
      }
      if (update.selectionSet) {
        const { main } = update.state.selection;
        const cursor = { line: 0, ch: 0, pos: main.head };
        const selection = main.empty ? null : {
          anchor: { line: 0, ch: 0, pos: main.anchor },
          head: { line: 0, ch: 0, pos: main.head }
        };
        onCursorChange(cursor, selection);
      }
    });

    const startState = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        gutter({ class: 'cm-breakpoint' }),
        highlightActiveLineGutter(),
        ...basicAbsoluteSetup,
        markdown(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        autocompletion(),
        updateListener,
        remoteCursors(users, currentUserId),
        EditorView.lineWrapping,
        keymap.of([
          { key: 'Ctrl-b', run: () => { toggleBold(); return true; }, preventDefault: true },
          { key: 'Ctrl-i', run: () => { toggleItalic(); return true; }, preventDefault: true },
          { key: 'Ctrl-k', run: () => { insertLink(); return true; }, preventDefault: true },
          { key: 'Mod-b', run: () => { toggleBold(); return true; }, preventDefault: true },
          { key: 'Mod-i', run: () => { toggleItalic(); return true; }, preventDefault: true },
          { key: 'Mod-k', run: () => { insertLink(); return true; }, preventDefault: true },
        ]),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (content !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content }
      });
    }
  }, [content]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const widgets: any[] = [];
    Object.entries(users).forEach(([id, user]) => {
      if (id !== currentUserId && user.cursor) {
        const pos = Math.min(user.cursor.pos || 0, view.state.doc.length);
        widgets.push(
          Decoration.widget({
            widget: new CursorWidget(user.name || id, user.color),
            inclusive: true,
            side: -1
          }).range(pos)
        );
      }
    });

    if (widgets.length > 0) {
      view.dispatch({
        effects: [
          EditorView.decorations.of(() => Decoration.set(widgets, true))
        ]
      });
    }
  }, [users, currentUserId]);

  return (
    <div className="editor-wrapper" ref={containerRef} />
  );
}

export default CodeMirrorEditor;
