import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Editor from './components/Editor';
import Preview from './components/Preview';
import Outline, { parseOutline } from './components/Outline';
import FilesPanel from './components/FilesPanel';
import HistoryPanel from './components/HistoryPanel';
import SettingsPanel from './components/SettingsPanel';

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

const STATUS_CONFIG = {
  idle:      { label: 'Idle',      cls: 'idle'      },
  compiling: { label: 'Compiling', cls: 'compiling' },
  success:   { label: 'Success',   cls: 'success'   },
  error:     { label: 'Error',     cls: 'error'     },
};

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export default function App() {
  // ── Core editor state ─────────────────────────────────────────
  const [content, setContent]   = useState(() => load('latex:content', DEFAULT_TEX));
  const [status, setStatus]     = useState('idle');
  const [log, setLog]           = useState('');
  const [errors, setErrors]     = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [pdfUrl, setPdfUrl]     = useState('');
  const [showLog, setShowLog]   = useState(false);
  const [latexOk, setLatexOk]   = useState(null);

  // ── History ───────────────────────────────────────────────────
  const [history, setHistory] = useState(() => load('latex:history', []));

  // ── Settings ──────────────────────────────────────────────────
  const [fontSize,     setFontSizeState]     = useState(() => load('ui:fontSize',     14));
  const [compileDelay, setCompileDelayState] = useState(() => load('ui:compileDelay', 1500));
  const [lineWrap,     setLineWrapState]     = useState(() => load('ui:lineWrap',     true));

  const setFontSize     = (v) => { setFontSizeState(v);     save('ui:fontSize',     v); };
  const setCompileDelay = (v) => { setCompileDelayState(v); save('ui:compileDelay', v); };
  const setLineWrap     = (v) => { setLineWrapState(v);     save('ui:lineWrap',     v); };

  // ── UI state ──────────────────────────────────────────────────
  const [sidebarExpanded, setSidebarExpanded] = useState(() => load('ui:sidebar',  false));
  const [showPreview,     setShowPreview]     = useState(() => load('ui:preview',  true));
  const [showOutline,     setShowOutline]     = useState(false);
  const [activeNav,       setActiveNav]       = useState('files');

  // ── Split pane ────────────────────────────────────────────────
  const [splitPos, setSplitPos] = useState(() => load('latex:splitPos', 55));
  const layoutRef = useRef(null);
  const dragging  = useRef(false);

  // ── Misc refs ─────────────────────────────────────────────────
  const editorRef       = useRef(null);
  const debounceRef     = useRef(null);
  const contentRef      = useRef(content);
  const compileDelayRef = useRef(compileDelay);
  compileDelayRef.current = compileDelay;

  const outline = useMemo(() => parseOutline(content), [content]);

  // ── Backend health check ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => setLatexOk(d.ok))
      .catch(() => setLatexOk(false));
  }, []);

  // ── Drag-to-resize ────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      setSplitPos(Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 25), 75));
    };
    const onMouseUp = () => {
      if (dragging.current) setSplitPos(p => { save('latex:splitPos', p); return p; });
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  // ── Compile ───────────────────────────────────────────────────
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
        // Auto-save a history snapshot on each successful compile
        setHistory(prev => {
          const snap = { content: tex, timestamp: Date.now() };
          const next = [snap, ...prev].slice(0, 30);
          save('latex:history', next);
          return next;
        });
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

  // ── Content change ────────────────────────────────────────────
  const handleChange = useCallback((val) => {
    setContent(val);
    contentRef.current = val;
    save('latex:content', val);
    setStatus('idle');
    clearTimeout(debounceRef.current);
    if (compileDelayRef.current > 0) {
      debounceRef.current = setTimeout(() => compile(val), compileDelayRef.current);
    }
  }, [compile]);

  // ── Ctrl+S / Cmd+S ────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        contentRef.current && compile(contentRef.current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [compile]);


  // ── Sidebar nav ───────────────────────────────────────────────
  const handleNavClick = useCallback((item) => {
    if (item === 'outline') { setShowOutline(v => !v); return; }
    if (item === 'logs')    { setShowLog(v => !v);    return; }
    setActiveNav(item);
    setSidebarExpanded(prev => {
      const next = activeNav === item ? !prev : true;
      save('ui:sidebar', next);
      return next;
    });
  }, [activeNav]);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => { save('ui:sidebar', !prev); return !prev; });
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview(prev => { save('ui:preview', !prev); return !prev; });
  }, []);

  // ── Download PDF ──────────────────────────────────────────────
  const downloadPdf = useCallback(() => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'document.pdf';
    a.click();
  }, [pdfUrl]);

  // ── Jump to line (outline) ────────────────────────────────────
  const handleJump = useCallback((line) => {
    editorRef.current?.scrollToLine(line);
  }, []);

  // ── History helpers ───────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    setHistory(prev => {
      const snap = { content: contentRef.current, timestamp: Date.now() };
      const next = [snap, ...prev].slice(0, 30);
      save('latex:history', next);
      return next;
    });
  }, []);

  const restoreHistory = useCallback((restoredContent) => {
    setContent(restoredContent);
    contentRef.current = restoredContent;
    save('latex:content', restoredContent);
    setStatus('idle');
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    save('latex:history', []);
  }, []);

  // ── Reset to default ──────────────────────────────────────────
  const resetContent = useCallback(() => {
    setContent(DEFAULT_TEX);
    contentRef.current = DEFAULT_TEX;
    save('latex:content', DEFAULT_TEX);
    setStatus('idle');
  }, []);

  const { label, cls } = STATUS_CONFIG[status];

  const navItems = [
    { id: 'files',    icon: 'folder',              label: 'Files'    },
    { id: 'outline',  icon: 'format_list_bulleted', label: 'Outline'  },
    { id: 'history',  icon: 'history',              label: 'History'  },
    { id: 'settings', icon: 'settings',             label: 'Settings' },
  ];

  // Which panel is active in the sidebar body
  const activePanel = sidebarExpanded && activeNav !== 'outline' ? activeNav : null;

  return (
    <div className="app">

      {/* ── Navbar ── */}
      <header className="navbar">
        <div className="navbar-left">
          <span className="app-brand" onClick={toggleSidebar} title="Toggle sidebar">
            ⚡ OpenLaTeX
          </span>
        </div>

        <div className="navbar-right">
          {latexOk === false && (
            <span className="latex-warning">
              pdflatex not found — install <code>MiKTeX</code>
            </span>
          )}

          <div className={`status-pill ${cls}`}>
            <div className="status-dot" />
            {label}
          </div>

          <button
            className="btn-primary"
            onClick={() => compile(content)}
            disabled={status === 'compiling'}
            title="Compile (Ctrl+S)"
          >
            Compile <kbd className="btn-kbd">Ctrl+S</kbd>
          </button>

          <button
            className={`btn-ghost${showPreview ? ' active' : ''}`}
            onClick={togglePreview}
          >
            Preview
          </button>

        </div>
      </header>

      {/* ── Workspace ── */}
      <div className="workspace">

        {/* ── Sidebar ── */}
        <aside className={`sidebar${sidebarExpanded ? ' expanded' : ''}${activePanel ? ' has-panel' : ''}`}>
          <nav className="sidebar-nav">
            {navItems.map(({ id, icon, label: navLabel }) => {
              const isActive = id === 'outline' ? showOutline : activeNav === id;
              return (
                <button
                  key={id}
                  className={`sidebar-item${isActive ? ' active' : ''}`}
                  onClick={() => handleNavClick(id)}
                  title={navLabel}
                >
                  <span className={`icon sidebar-item-icon${isActive && id === 'files' ? ' icon-fill' : ''}`}>
                    {icon}
                  </span>
                  <span className="sidebar-label">{navLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar panel — shows below nav when expanded */}
          {activePanel && (
            <div className="sidebar-panel-area">
              {activePanel === 'files' && (
                <FilesPanel
                  content={content}
                  pdfUrl={pdfUrl}
                  onSaveSnapshot={saveSnapshot}
                />
              )}
              {activePanel === 'history' && (
                <HistoryPanel
                  history={history}
                  onRestore={restoreHistory}
                  onClear={clearHistory}
                />
              )}
              {activePanel === 'settings' && (
                <SettingsPanel
                  fontSize={fontSize}         onFontSize={setFontSize}
                  compileDelay={compileDelay} onCompileDelay={setCompileDelay}
                  lineWrap={lineWrap}         onLineWrap={setLineWrap}
                  onReset={resetContent}
                />
              )}
            </div>
          )}

          <div className="sidebar-footer">
            <button
              className={`sidebar-item${showLog ? ' active' : ''}`}
              onClick={() => handleNavClick('logs')}
              title="Logs"
            >
              <span className="icon sidebar-item-icon">terminal</span>
              <span className="sidebar-label">Logs</span>
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="main-content">

          {errors.length > 0 && (
            <div className="error-bar">
              {errors.map((e, i) => <span key={i} className="error-item">{e}</span>)}
            </div>
          )}

          <div className="editor-layout" ref={layoutRef}>

            {/* Editor pane */}
            <div
              className={`editor-pane${!showPreview ? ' solo' : ''}`}
              style={showPreview ? { flex: splitPos } : undefined}
            >
              <div className="pane-header">
                <span className="pane-tab">main.tex</span>
              </div>
              <div className="editor-scroll">
                <Editor
                  ref={editorRef}
                  value={content}
                  onChange={handleChange}
                  fontSize={fontSize}
                  lineWrap={lineWrap}
                />
              </div>
            </div>

            {showPreview && (
              <div
                className="drag-handle"
                onMouseDown={(e) => { e.preventDefault(); dragging.current = true; }}
              >
                <div className="drag-handle-bar" />
              </div>
            )}

            {showPreview && (
              <div className="preview-pane" style={{ flex: 100 - splitPos }}>
                <div className="pane-header">
                  <span className="pane-tab">Preview</span>
                  <span className="zoom-badge">100%</span>
                  <div className="pane-spacer" />
                  <div className="pane-actions">
                    <button className="pane-action-btn" title="Download PDF" onClick={downloadPdf} disabled={!pdfUrl}>
                      <span className="icon icon-sm">download</span>
                    </button>
                    <button className="pane-action-btn" title="Open in new tab" onClick={() => pdfUrl && window.open(pdfUrl, '_blank')} disabled={!pdfUrl}>
                      <span className="icon icon-sm">open_in_new</span>
                    </button>
                  </div>
                </div>
                <div className="pdf-scroll-area">
                  <Preview url={pdfUrl} compiling={status === 'compiling'} />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Floating outline popover ── */}
      {showOutline && (
        <Outline
          items={outline}
          onJump={handleJump}
          onClose={() => setShowOutline(false)}
          sidebarExpanded={sidebarExpanded}
        />
      )}

      {/* ── Log drawer ── */}
      {showLog && (
        <div className="log-drawer">
          <div className="log-toolbar">
            <span className="log-title">Compiler Log</span>
            {warnings.length > 0 && (
              <span className="log-warnings">
                {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
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
