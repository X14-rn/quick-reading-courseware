// Local static server for the built viewer (dist/). No dependencies.
// Security: binds 127.0.0.1 only, GET/HEAD only, Host-header allow-list (DNS-rebinding defence),
// path-traversal guard, explicit MIME types, production CSP and hardening headers.
// Usage: node scripts/serve-viewer.mjs [--port 5173]
import { createServer } from 'node:http';
import { createReadStream, statSync, realpathSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { securityPolicy } from '../security-policy.mjs';

const HOST = '127.0.0.1';
const argPort = process.argv.indexOf('--port');
const PORT = argPort > 0 ? Number(process.argv[argPort + 1]) : 5173;
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) { console.error('Invalid port'); process.exit(2); }

const ROOT = realpathSync(resolve(fileURLToPath(new URL('../dist/', import.meta.url))));
const HEALTH = '/__quick-reading-viewer';
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.pfb': 'application/octet-stream', '.bcmap': 'application/octet-stream',
  '.map': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};
const HEADERS = {
  'Content-Security-Policy': `${securityPolicy(false)}; frame-ancestors 'none'`,
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-cache'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { ...HEADERS, 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

export function resolveSafe(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0].split('#')[0]); } catch { return null; }
  if (p.includes('\0') || p.includes('\\')) return null;
  if (p === '/' || p === '') p = '/index.html';
  const full = resolve(ROOT, '.' + p);
  if (full !== ROOT && !full.startsWith(ROOT + sep)) return null;
  try {
    const real = realpathSync(full);                       // block symlinks pointing outside dist/
    if (!real.startsWith(ROOT + sep)) return null;
    return statSync(real).isFile() ? real : null;
  } catch { return null; }
}

const server = createServer((req, res) => {
  if (!ALLOWED_HOSTS.has(String(req.headers.host || '').toLowerCase())) return send(res, 421, 'Misdirected request');
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); return send(res, 405, 'Method not allowed'); }
  if (req.url === HEALTH) return send(res, 200, 'ok');
  const file = resolveSafe(req.url || '/');
  if (!file) return send(res, 404, 'Not found');
  const type = MIME[extname(file).toLowerCase()];
  if (!type) return send(res, 404, 'Not found');
  res.writeHead(200, { ...HEADERS, 'Content-Type': type, 'Content-Length': statSync(file).size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
});

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    // Already running (e.g. second launch)? Then reuse it; otherwise report the clash.
    try {
      const r = await fetch(`http://${HOST}:${PORT}${HEALTH}`);
      if (r.ok && (await r.text()) === 'ok') { console.log('Viewer already running.'); process.exit(0); }
    } catch { /* fall through */ }
    console.error(`Port ${PORT} is used by another program (is "npm run dev" still running?).`);
    process.exit(3);
  }
  console.error(err.message); process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Quick Reading viewer: http://${HOST}:${PORT}/  (serving ${ROOT})`);
  console.log('Close this window to stop the viewer.');
});
