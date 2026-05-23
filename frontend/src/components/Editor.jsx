import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { oneDark } from '@codemirror/theme-one-dark';

const latexTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '14px' },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace',
    lineHeight: '1.6',
  },
  '.cm-content':  { padding: '12px 0' },
  '.cm-line':     { padding: '0 16px' },
  '.cm-gutters':  { background: '#21252b', border: 'none', color: '#5c6370' },
  '.cm-activeLineGutter': { background: '#2c313a' },
  '.cm-activeLine':       { background: '#2c313a55' },
  '.cm-cursor':           { borderLeftColor: '#528bff' },
  '.cm-selectionBackground, ::selection': { background: '#3e4451 !important' },
});

const Editor = forwardRef(function Editor({ value, onChange }, ref) {
  const containerRef = useRef(null);
  const viewRef      = useRef(null);
  const onChangeRef  = useRef(onChange);
  onChangeRef.current = onChange;

  // Expose scrollToLine so the outline panel can jump the editor
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
      } catch { /* line out of range — ignore */ }
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
          oneDark,
          latexTheme,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => view.destroy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync value set from outside (e.g. file load) without remounting
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={containerRef} className="cm-container" />;
});

export default Editor;
