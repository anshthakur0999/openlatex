export default function Preview({ url, compiling }) {
  if (!url && !compiling) {
    return (
      <div className="preview-placeholder">
        <div className="placeholder-icon">📄</div>
        <p className="placeholder-title">PDF preview</p>
        <p className="placeholder-body">
          Start typing — the PDF compiles automatically after 1.5 s of inactivity.
          <br />
          Or press <kbd>Compile</kbd> to compile now.
        </p>
      </div>
    );
  }

  return (
    <div className="preview-wrapper">
      {compiling && <div className="compile-overlay">Compiling…</div>}
      {url && (
        <iframe
          className="pdf-frame"
          src={url}
          title="PDF Preview"
        />
      )}
    </div>
  );
}
