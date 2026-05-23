import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Outline, { parseOutline } from './components/Outline';

const DEFAULT_TEX = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}

\\title{My Document}
\\author{Author}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Welcome to your local \\LaTeX{} editor. Start editing and the PDF
will update automatically after a short pause.

\\section{Mathematics}
Here is the quadratic formula:
\\begin{equation}
  x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\end{equation}

And Euler's identity:
\\[
  e^{i\\pi} + 1 = 0
\\]

\\subsection{More identities}
\\begin{align}
  \\sin^2\\theta + \\cos^2\\theta &= 1 \\\\
  e^{i\\pi} + 1 &= 0
\\end{align}

\\section{Lists}
\\begin{itemize}
  \\item First item
  \\item Second item
  \\item Third item
\\end{itemize}

\\end{document}`;

const STATUS = {
  idle:      { label: 'Ready',      cls: 'status-idle' },
  compiling: { label: 'Compiling…', cls: 'status-compiling' },
  success:   { label: 'Compiled ✓', cls: 'status-success' },
  error:     { label: 'Error ✗',    cls: 'status-error' },
};

// Read a value from localStorage, falling back to a default
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded — ignore */ }
}

export default function App() {
  const [content, setContent]   = useState(() => load('latex:content', DEFAULT_TEX));
  const [status, setStatus]     = useState('idle');
  const [log, setLog]           = useState('');
  const [errors, setErrors]     = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [pdfUrl, setPdfUrl]     = useState('');
  const [showLog, setShowLog]   = useState(false);
  const [latexOk, setLatexOk]  = useState(null);

  // Resizable split — percentage of total width given to editor pane
  const [splitPos, setSplitPos]   = useState(() => load('latex:splitPos', 50));
  const layoutRef                 = useRef(null);
  const dragging                  = useRef(false);

  const editorRef   = useRef(null);
  const debounceRef = useRef(null);
  const contentRef  = useRef(content);   // always holds the latest content for the keydown handler

  // Document outline derived from content
  const outline = useMemo(() => parseOutline(content), [content]);

  // ── Backend health check ─────────────────────────────────
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => setLatexOk(d.ok))
      .catch(() => setLatexOk(false));
  }, []);

  // ── Drag-to-resize logic ─────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const raw  = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPos(Math.min(Math.max(raw, 20), 80));
    };
    const onMouseUp = () => {
      if (dragging.current) {
        // Save split position when the user releases the drag handle
        setSplitPos(pos => { save('latex:splitPos', pos); return pos; });
      }
      dragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  // ── Compile ──────────────────────────────────────────────
  const compile = useCallback(async (tex) => {
    setStatus('compiling');
    try {
      const res  = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tex }),
      });
      const data = await res.json();
      setLog(data.log || '');
      setErrors(data.errors || []);
      setWarnings(data.warnings || []);

      if (data.success) {
        setStatus('success');
        setPdfUrl(`/api/preview.pdf?t=${Date.now()}`);
      } else {
        setStatus('error');
        setShowLog(true);
      }
    } catch (err) {
      setStatus('error');
      setLog(err.message);
      setErrors([err.message]);
    }
  }, []);

  const handleChange = useCallback((val) => {
    setContent(val);
    contentRef.current = val;         // keep ref in sync for Ctrl+S handler
    save('latex:content', val);       // persist immediately on every keystroke
    setStatus('idle');
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => compile(val), 1500);
  }, [compile]);

  const handleJump = useCallback((line) => {
    editorRef.current?.scrollToLine(line);
  }, []);

  // ── Ctrl+S / Cmd+S → compile (must be after compile is defined) ──
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();   // suppress browser "Save page" dialog
        contentRef.current && compile(contentRef.current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [compile]);

  const { label, cls } = STATUS[status];

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="app-header">
        <span className="app-title">⚡ LaTeX Editor</span>

        {latexOk === false && (
          <span className="latex-warning">
            pdflatex not found — run <code>winget install MiKTeX.MiKTeX</code> then restart
          </span>
        )}

        <span className={`status-badge ${cls}`}>{label}</span>

        <button className="btn" onClick={() => compile(content)} disabled={status === 'compiling'} title="Compile (Ctrl+S)">
          Compile <kbd className="btn-kbd">Ctrl+S</kbd>
        </button>

        {log && (
          <button className="btn btn-ghost" onClick={() => setShowLog(v => !v)}>
            {showLog ? 'Hide Log' : `Log${errors.length ? ` (${errors.length} error${errors.length > 1 ? 's' : ''})` : ''}`}
          </button>
        )}
      </header>

      {/* ── Inline error bar ── */}
      {errors.length > 0 && (
        <div className="error-bar">
          {errors.map((e, i) => <span key={i} className="error-item">{e}</span>)}
        </div>
      )}

      {/* ── Editor / Preview split ── */}
      <div className="editor-layout" ref={layoutRef}>

        {/* Left pane: editor + outline */}
        <div className="pane pane-editor" style={{ flexBasis: `${splitPos}%` }}>
          <div className="editor-area">
            <Editor ref={editorRef} value={content} onChange={handleChange} />
          </div>
          <Outline items={outline} onJump={handleJump} />
        </div>

        {/* Drag handle */}
        <div
          className="drag-handle"
          onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
        >
          <div className="drag-handle-bar" />
        </div>

        {/* Right pane: PDF preview */}
        <div className="pane pane-preview" style={{ flexBasis: `${100 - splitPos}%` }}>
          <Preview url={pdfUrl} compiling={status === 'compiling'} />
        </div>

      </div>

      {/* ── Compiler log drawer ── */}
      {showLog && (
        <div className="log-panel">
          <div className="log-toolbar">
            <span className="log-title">Compiler Log</span>
            {warnings.length > 0 && (
              <span className="log-warnings">
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}
              </span>
            )}
            <button className="log-close" onClick={() => setShowLog(false)}>✕</button>
          </div>
          <pre className="log-content">{log}</pre>
        </div>
      )}
    </div>
  );
}
