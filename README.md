# OpenLaTeX ⚡

A fast, private, local LaTeX editor that runs entirely on your machine — no cloud, no compile limits, no subscriptions.

Built with **CodeMirror 6** + **React** + **Node.js** + **MiKTeX**.

---

## Features

- **Live PDF preview** — auto-compiles 1.5s after you stop typing
- **LaTeX syntax highlighting** — powered by CodeMirror 6 with `stex` mode
- **Ctrl+S to compile** — works from anywhere in the editor
- **Document outline panel** — click any `\section` / `\subsection` to jump to it
- **Resizable split pane** — drag the divider to adjust editor/preview ratio
- **Smart double-compile** — automatically re-runs when `hyperref` signals a rerun needed (fixes PDF bookmarks & TOC)
- **MiKTeX auto-install** — missing packages are silently downloaded on first use (no popups)
- **Persistent state** — editor content and split position survive page refreshes
- **Compiler log** — full `pdflatex` output with parsed errors and warnings
- **No compile limits** — your machine, your rules
- **Fully offline** — nothing leaves your computer

---

## Screenshot

> _Editor on the left, live PDF preview on the right, document outline below._

---

## Requirements

- [Node.js](https://nodejs.org/) v18+
- [MiKTeX](https://miktex.org/) (Windows) or TeX Live (Linux/macOS)

---

## Quick Start

### 1. Install MiKTeX (if not already installed)

**Windows:**
```bash
winget install MiKTeX.MiKTeX
```

**macOS:**
```bash
brew install --cask mactex
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install texlive-full
```

### 2. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/openlatex.git
cd openlatex
npm run install:all
```

### 3. Run

```bash
npm run dev
```

Open **http://localhost:47200** in your browser.

---

## How it works

```
┌─────────────────────────────────────┐
│  Browser (React + CodeMirror 6)     │
│  localhost:47200                    │
│                                     │
│  Editor  │ drag │  PDF Preview      │
│  ──────────────────────────────     │
│  Document Outline (§ sections)      │
└────────────────┬────────────────────┘
                 │ POST /api/compile
                 ▼
┌─────────────────────────────────────┐
│  Node.js / Express                  │
│  localhost:47201                    │
│                                     │
│  pdflatex → PDF → serve back        │
└─────────────────────────────────────┘
```

The frontend proxies all `/api/*` requests to the backend — no CORS issues, no config needed.

---

## Project Structure

```
openlatex/
├── backend/
│   ├── server.js          # Express API: /api/compile, /api/preview.pdf, /api/status
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app — split pane, compile logic, persistence
│   │   ├── App.css        # Tokyo Night dark theme
│   │   └── components/
│   │       ├── Editor.jsx # CodeMirror 6 + LaTeX syntax + scrollToLine ref
│   │       ├── Preview.jsx# PDF iframe viewer
│   │       └── Outline.jsx# Document outline parser + jump-to-section
│   ├── vite.config.js
│   └── package.json
└── package.json           # Root — runs both with concurrently
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Compile |

---

## Roadmap

- [ ] Open / Save `.tex` files from disk
- [ ] Download PDF button
- [ ] LaTeX command autocomplete (`\begin{...}` → auto-close)
- [ ] Math preview on hover
- [ ] Symbol palette (click to insert `∑ ∫ α β`)
- [ ] BibTeX support
- [ ] Spell check
- [ ] Templates (article, beamer, CV, IEEE)
- [ ] Multiple tabs / file manager

---

## Contributing

Pull requests are welcome! To get started:

```bash
git clone https://github.com/YOUR_USERNAME/openlatex.git
cd openlatex
npm run install:all
npm run dev
```

Please open an issue first for large changes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Editor | [CodeMirror 6](https://codemirror.net/) + `@codemirror/legacy-modes` (stex) |
| UI | React 18 + Vite 5 |
| Backend | Node.js + Express |
| LaTeX | pdflatex (MiKTeX / TeX Live) |
| Theme | Tokyo Night dark |

---

## License

MIT © 2026 — free to use, modify, and distribute.
