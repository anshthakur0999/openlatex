import { useState } from 'react';

const LEVEL = { chapter: 0, section: 1, subsection: 2, subsubsection: 3 };
const SECTION_RE = /^\\(chapter|section|subsection|subsubsection)\*?\s*\{([^}]*)\}/;

export function parseOutline(content) {
  return content
    .split('\n')
    .map((line, i) => {
      const m = line.match(SECTION_RE);
      return m
        ? { type: m[1], title: m[2].trim(), line: i + 1, level: LEVEL[m[1]] ?? 1 }
        : null;
    })
    .filter(Boolean);
}

export default function Outline({ items, onJump, onClose, sidebarExpanded }) {
  const [filter, setFilter] = useState('');
  const [activeIdx, setActiveIdx] = useState(null);

  if (!items || items.length === 0) return null;

  const filtered = filter
    ? items.filter(item => item.title.toLowerCase().includes(filter.toLowerCase()))
    : items;

  const handleClick = (item, i) => {
    setActiveIdx(i);
    onJump(item.line);
  };

  return (
    <div className={`outline-popover${sidebarExpanded ? ' sidebar-expanded' : ''}`}>
      <div className="outline-popover-header">
        <span className="outline-popover-title">Outline</span>
        <button className="outline-popover-close" onClick={onClose} title="Close">
          <span className="icon icon-sm">close</span>
        </button>
      </div>

      <div className="outline-popover-list">
        {filtered.map((item, i) => (
          <button
            key={i}
            className={`outline-popover-item level-${item.level}${activeIdx === i ? ' is-active' : ''}`}
            onClick={() => handleClick(item, i)}
            title={`Line ${item.line}`}
          >
            <span className="outline-item-num">{i + 1}</span>
            <span className="outline-item-title">{item.title || '(untitled)'}</span>
          </button>
        ))}
      </div>

      <div className="outline-popover-search">
        <span className="icon icon-sm">search</span>
        <input
          type="text"
          placeholder="Filter sections..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
    </div>
  );
}
