// Parses \chapter, \section, \subsection, \subsubsection from LaTeX source
// and renders a clickable document outline panel.

const LEVEL = { chapter: 0, section: 1, subsection: 2, subsubsection: 3 };
const LABEL = { chapter: 'CH', section: '§', subsection: '§§', subsubsection: '§§§' };
const SECTION_RE = /^\\(chapter|section|subsection|subsubsection)\*?\s*\{([^}]*)\}/;

export function parseOutline(content) {
  return content
    .split('\n')
    .map((line, i) => {
      const m = line.match(SECTION_RE);
      return m ? { type: m[1], title: m[2].trim(), line: i + 1, level: LEVEL[m[1]] ?? 1 } : null;
    })
    .filter(Boolean);
}

export default function Outline({ items, onJump }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="outline-panel">
      <div className="outline-header">
        <span className="outline-title">Document Outline</span>
        <span className="outline-count">{items.length} section{items.length !== 1 ? 's' : ''}</span>
      </div>
      <ul className="outline-list">
        {items.map((item, i) => (
          <li
            key={i}
            className={`outline-item outline-level-${item.level}`}
            onClick={() => onJump(item.line)}
            title={`Line ${item.line}`}
          >
            <span className="outline-badge">{LABEL[item.type]}</span>
            <span className="outline-label">{item.title || '(untitled)'}</span>
            <span className="outline-line">:{item.line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
