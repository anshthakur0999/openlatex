import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';

// All colours reference CSS variables → auto-switch with OS theme.
const latexTheme = EditorView.theme({
  '&': {
    height: '100%',
    background: 'var(--editor-bg)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
    lineHeight: '1.7',
    background: 'var(--editor-bg)',
  },
  '.cm-content': {
    padding: '28px 0',
    caretColor: 'var(--primary)',
    color: 'var(--on-surface)',
  },
  '.cm-line': { padding: '0 24px' },
  '.cm-gutters': {
    background: 'var(--editor-bg)',
    border: 'none',
    color: 'var(--line-num)',
    borderRight: '1px solid var(--border)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    paddingRight: '14px',
    minWidth: '48px',
    textAlign: 'right',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: '12px',
  },
  '.cm-activeLineGutter': { background: 'transparent', color: 'var(--primary)', opacity: '0.7' },
  '.cm-activeLine':       { background: 'var(--active-line)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--primary)', borderLeftWidth: '2px' },
  '.cm-selectionBackground':           { background: 'rgba(66,65,188,0.12) !important' },
  '&.cm-focused .cm-selectionBackground': { background: 'rgba(66,65,188,0.18) !important' },
  '.cm-matchingBracket': { background: 'rgba(66,65,188,0.10)', outline: 'none' },
  // Syntax tokens
  '.cm-keyword': { color: 'var(--syn-cmd)'     },
  '.cm-atom':    { color: 'var(--syn-arg)'     },
  '.cm-comment': { color: 'var(--syn-comment)', fontStyle: 'italic' },
  '.cm-string':  { color: 'var(--syn-math)'    },
  '.cm-tag':     { color: 'var(--syn-cmd)'     },
  '.cm-builtin': { color: 'var(--syn-cmd)'     },
  '.cm-meta':    { color: 'var(--syn-comment)' },
  // Thin scrollbar
  '.cm-scroller::-webkit-scrollbar':       { width: '4px', height: '4px' },
  '.cm-scroller::-webkit-scrollbar-track': { background: 'transparent' },
  '.cm-scroller::-webkit-scrollbar-thumb': { background: 'var(--scrollbar)', borderRadius: '2px' },
});

const Editor = forwardRef(function Editor({ value, onChange, fontSize = 14, lineWrap = true }, ref) {
  const containerRef    = useRef(null);
  const viewRef         = useRef(null);
  const onChangeRef     = useRef(onChange);
  const wrapCompartment = useRef(new Compartment());

  onChangeRef.current = onChange;

  // scrollToLine exposed to parent (outline jump)
  useImperativeHandle(ref, () => ({
    scrollToLine(lineNumber) {
      const view = viewRef.current;
      if (!view) return;
      try {
        const line = view.state.doc.line(lineNumber);
        view.dispatch({
          selection: { anchor: line.from },
          effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
        });
        view.focus();
      } catch { /* line out of range */ }
    },
  }));

  // Mount once
  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          StreamLanguage.define(stex),
          latexTheme,
          wrapCompartment.current.of(lineWrap ? EditorView.lineWrapping : []),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => view.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external value changes without remounting
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Live-update line wrap via compartment (no remount)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(lineWrap ? EditorView.lineWrapping : []),
    });
  }, [lineWrap]);

  // Font size via inline style on the container — cleanest, no remount
  return (
    <div
      ref={containerRef}
      className="cm-container"
      style={{ fontSize: fontSize + 'px' }}
    />
  );
});

export default Editor;
