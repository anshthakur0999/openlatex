import { useState } from 'react';

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function HistoryPanel({ history, onRestore, onClear }) {
  const [confirming, setConfirming] = useState(false);

  if (history.length === 0) {
    return (
      <div className="panel-body">
        <p className="panel-section-label">History</p>
        <div className="panel-empty">
          <span className="icon" style={{ fontSize: 28, opacity: 0.3 }}>history</span>
          <p>Snapshots are saved automatically on each successful compile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <div className="panel-section-row">
        <p className="panel-section-label" style={{ margin: 0 }}>History</p>
        {confirming ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="panel-btn-xs danger" onClick={() => { onClear(); setConfirming(false); }}>
              Clear all
            </button>
            <button className="panel-btn-xs" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="panel-btn-xs" onClick={() => setConfirming(true)}>
            Clear
          </button>
        )}
      </div>

      <div className="history-list">
        {history.map((snap, i) => (
          <button
            key={snap.timestamp}
            className="history-item"
            onClick={() => onRestore(snap.content)}
            title="Click to restore this version"
          >
            <div className="history-item-meta">
              <span className="history-time">{timeAgo(snap.timestamp)}</span>
              <span className="history-size">{snap.content.split('\n').length} lines</span>
            </div>
            <span className="icon icon-sm history-restore">restore</span>
          </button>
        ))}
      </div>
    </div>
  );
}
