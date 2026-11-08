import { defineConfig } from 'vite';
import { securityPolicy } from './security-policy.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const pdfRoot = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));

export default defineConfig(({ command, isPreview }) => {
  const csp = securityPolicy(command === 'serve' && !isPreview);
  const headers = { 'Content-Security-Policy': `${csp}; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
  return {
    server: { host: '127.0.0.1', cors: false, headers },
    preview: { host: '127.0.0.1', cors: false, headers },
    plugins: [{ name: 'local-pdf-assets', configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (/^\/pdf-assets\/(cmaps|standard_fonts|wasm)\/[A-Za-z0-9._-]+$/.test(req.url || ''))
          req.url = req.url.replace('/pdf-assets/', '/node_modules/pdfjs-dist/');
        next();
      });
    }, generateBundle() {
      for (const dir of ['cmaps', 'standard_fonts', 'wasm'])
        for (const file of readdirSync(join(pdfRoot, dir)))
          this.emitFile({ type: 'asset', fileName: `pdf-assets/${dir}/${file}`, source: readFileSync(join(pdfRoot, dir, file)) });
    } }, { name: 'local-viewer-security', transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }];
    } }]
  };
});
