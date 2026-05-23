export default function FilesPanel({ content, pdfUrl, onSaveSnapshot }) {
  const lines = content.split('\n').length;
  const chars = content.length;

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'document.pdf';
    a.click();
  };

  return (
    <div className="panel-body">
      <p className="panel-section-label">Files</p>

      {/* File item */}
      <div className="file-item">
        <span className="icon icon-sm icon-fill" style={{ color: 'var(--primary)' }}>description</span>
        <span className="file-name">main.tex</span>
      </div>

      {/* File metadata */}
      <div className="file-meta">
        <span>{lines} lines</span>
        <span>{chars.toLocaleString()} chars</span>
      </div>

      {/* Actions */}
      <div className="panel-actions">
        <button className="panel-btn" onClick={downloadPdf} disabled={!pdfUrl}>
          <span className="icon icon-sm">download</span>
          Download PDF
        </button>
        <button className="panel-btn" onClick={onSaveSnapshot}>
          <span className="icon icon-sm">bookmark_add</span>
          Save Snapshot
        </button>
      </div>
    </div>
  );
}

