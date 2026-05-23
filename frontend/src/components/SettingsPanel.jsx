const DELAYS = [
  { label: 'Off',   value: 0    },
  { label: '0.5s',  value: 500  },
  { label: '1s',    value: 1000 },
  { label: '1.5s',  value: 1500 },
  { label: '3s',    value: 3000 },
];

export default function SettingsPanel({
  fontSize, onFontSize,
  compileDelay, onCompileDelay,
  lineWrap, onLineWrap,
  onReset,
}) {
  return (
    <div className="panel-body">
      <p className="panel-section-label">Settings</p>

      {/* Font size */}
      <div className="setting-row">
        <span className="setting-label">Font size</span>
        <div className="stepper">
          <button className="stepper-btn" onClick={() => onFontSize(Math.max(12, fontSize - 1))} disabled={fontSize <= 12}>−</button>
          <span className="stepper-val">{fontSize}px</span>
          <button className="stepper-btn" onClick={() => onFontSize(Math.min(20, fontSize + 1))} disabled={fontSize >= 20}>+</button>
        </div>
      </div>

      {/* Auto-compile delay */}
      <div className="setting-row setting-row-col">
        <span className="setting-label">Auto-compile</span>
        <div className="pill-group">
          {DELAYS.map(d => (
            <button
              key={d.value}
              className={`pill${compileDelay === d.value ? ' active' : ''}`}
              onClick={() => onCompileDelay(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Line wrap */}
      <div className="setting-row">
        <span className="setting-label">Line wrap</span>
        <button className={`toggle${lineWrap ? ' on' : ''}`} onClick={() => onLineWrap(!lineWrap)}>
          <div className="toggle-thumb" />
        </button>
      </div>

      {/* Reset */}
      <div className="setting-divider" />
      <button className="panel-btn danger" onClick={onReset}>
        <span className="icon icon-sm">restart_alt</span>
        Reset to default
      </button>
    </div>
  );
}
