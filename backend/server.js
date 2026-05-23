import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 47201;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Persistent work directory for this session
const WORK_DIR = join(tmpdir(), 'latex-editor-work');
if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

const TEX_FILE = join(WORK_DIR, 'document.tex');
const PDF_FILE = join(WORK_DIR, 'document.pdf');

// Find pdflatex — checks common MiKTeX install locations on Windows, then falls back to PATH
function findPdflatex() {
  const candidates = [
    // Per-user MiKTeX (most common on Windows 10/11)
    join(process.env.USERPROFILE || '', 'AppData', 'Local', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe'),
    join(process.env.LOCALAPPDATA  || '', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe'),
    // System-wide MiKTeX
    'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
    'C:\\Program Files (x86)\\MiKTeX\\miktex\\bin\\pdflatex.exe',
    // TeX Live (Linux / macOS / Windows)
    '/usr/bin/pdflatex',
    '/usr/local/bin/pdflatex',
    '/Library/TeX/texbin/pdflatex',
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;   // full path confirmed on disk — use it
  }
  return 'pdflatex'; // last resort: rely on PATH (works if shell profile updated)
}

const PDFLATEX = findPdflatex();

// Find MiKTeX's initexmf to configure auto-install at startup
function findInitexmf() {
  return join(
    process.env.USERPROFILE || process.env.HOME || '',
    'AppData', 'Local', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'initexmf.exe'
  );
}

// On startup: tell MiKTeX to always auto-install packages silently (no GUI popup)
try {
  const initexmf = findInitexmf();
  if (existsSync(initexmf)) {
    exec(`"${initexmf}" --set-config-value [MPM]AutoInstall=1`, () => {});
    console.log('  MiKTeX: auto-install enabled (no package popups)');
  }
} catch { /* non-fatal */ }

// Parse log for errors and warnings
function parseLog(log) {
  const errors = [];
  const warnings = [];
  for (const line of log.split('\n')) {
    if (line.startsWith('!')) errors.push(line);
    else if (line.includes('LaTeX Warning:') || line.includes('Overfull') || line.includes('Underfull')) {
      warnings.push(line.trim());
    }
  }
  return { errors, warnings };
}

// POST /api/compile — accepts { content: string }, returns { success, log, errors, warnings }
app.post('/api/compile', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'No content provided' });

  writeFileSync(TEX_FILE, content, 'utf-8');

  // --enable-installer: lets MiKTeX auto-download missing packages silently (no GUI popup)
  // -interaction=nonstopmode: never pause for user input
  const cmd = `"${PDFLATEX}" --enable-installer -interaction=nonstopmode -output-directory="${WORK_DIR}" "${TEX_FILE}"`;

  try {
    // First pass — compiles the document and writes .aux / .out files
    const run1 = await execAsync(cmd, { timeout: 120_000 });
    let log = run1.stdout + (run1.stderr || '');

    // Second pass — only if needed (hyperref bookmarks, TOC, cross-refs)
    // Detects the "Rerun" signal from packages like hyperref / rerunfilecheck
    const needsRerun = log.includes('Rerun to get') || log.includes('Rerun for') || log.includes('rerunfilecheck');
    if (needsRerun && existsSync(PDF_FILE)) {
      const run2 = await execAsync(cmd, { timeout: 60_000 });
      log += '\n\n── second pass ──\n\n' + run2.stdout + (run2.stderr || '');
    }

    const { errors, warnings } = parseLog(log);

    if (existsSync(PDF_FILE)) {
      res.json({ success: true, log, errors, warnings });
    } else {
      res.json({ success: false, log, errors, warnings, error: 'pdflatex ran but produced no PDF.' });
    }
  } catch (err) {
    const log = (err.stdout || '') + (err.stderr || '') + '\n' + err.message;
    const { errors, warnings } = parseLog(log);

    // Give a friendly hint if pdflatex is not found
    const notFound = err.message.includes('not found') || err.message.includes('ENOENT') || err.code === 127;
    const hint = notFound
      ? '\n\n⚠️  pdflatex not found. Install MiKTeX:\n  winget install MiKTeX.MiKTeX\nThen restart this server.'
      : '';

    res.json({ success: false, log: log + hint, errors, warnings, error: err.message });
  }
});

// GET /api/preview.pdf — serves the last compiled PDF (no-cache)
app.get('/api/preview.pdf', (req, res) => {
  if (!existsSync(PDF_FILE)) {
    return res.status(404).send('No PDF compiled yet.');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'no-store');
  res.send(readFileSync(PDF_FILE));
});

// GET /api/status — health check + pdflatex detection
app.get('/api/status', async (req, res) => {
  try {
    await execAsync(`"${PDFLATEX}" --version`, { timeout: 5000 });
    res.json({ ok: true, pdflatex: PDFLATEX });
  } catch {
    res.json({ ok: false, pdflatex: null, hint: 'Install MiKTeX: winget install MiKTeX.MiKTeX' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n  LaTeX Editor backend  →  http://localhost:${PORT}`);
  console.log(`  Work dir: ${WORK_DIR}`);
  console.log(`  pdflatex: ${PDFLATEX}\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ✖  Port ${PORT} is already in use.`);
    console.error(`  Run this to free it:  npx kill-port ${PORT} ${PORT - 1}\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
