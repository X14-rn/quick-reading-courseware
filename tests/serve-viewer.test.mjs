// Security tests for scripts/serve-viewer.mjs (needs a built dist/; run "npm run build" first).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

const PORT = 5199;
const dist = new URL('../dist/index.html', import.meta.url);
let proc;

function get(path, { method = 'GET', host = `127.0.0.1:${PORT}` } = {}) {
  return new Promise((res, rej) => {
    const r = request({ host: '127.0.0.1', port: PORT, path, method, headers: { Host: host } }, (m) => {
      let body = ''; m.on('data', (c) => (body += c)); m.on('end', () => res({ status: m.statusCode, headers: m.headers, body }));
    });
    r.on('error', rej); r.end();
  });
}

before(async () => {
  if (!existsSync(dist)) return;
  proc = spawn(process.execPath, [fileURLToPath(new URL('../scripts/serve-viewer.mjs', import.meta.url)), '--port', String(PORT)]);
  for (let i = 0; i < 50; i++) {
    try { if ((await get('/__quick-reading-viewer')).body === 'ok') return; } catch { }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
});
after(() => proc?.kill());

const skip = !existsSync(dist) && 'dist/ not built';

test('serves index with CSP and hardening headers', { skip }, async () => {
  const r = await get('/');
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /text\/html/);
  assert.match(r.headers['content-security-policy'], /default-src 'none'/);
  assert.doesNotMatch(r.headers['content-security-policy'], /ws:/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
});

test('blocks path traversal', { skip }, async () => {
  for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json', '/%2e%2e%5cpackage.json', '/pdf-assets/../../package.json'])
    assert.equal((await get(p)).status, 404, p);
});

test('rejects foreign Host headers (DNS rebinding)', { skip }, async () => {
  assert.equal((await get('/', { host: 'evil.example:5199' })).status, 421);
});

test('allows only GET and HEAD', { skip }, async () => {
  assert.equal((await get('/', { method: 'POST' })).status, 405);
  assert.equal((await get('/', { method: 'HEAD' })).status, 200);
});

test('unknown file types are not served', { skip }, async () => {
  assert.equal((await get('/does-not-exist.exe')).status, 404);
});
