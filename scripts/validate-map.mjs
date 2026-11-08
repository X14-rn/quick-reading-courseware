import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

// Reuse the actual viewer contract rather than maintain a second validator.
const [mapPath, flag, pdfDirectory] = process.argv.slice(2);
if (!mapPath || (flag && (flag !== '--pdf-dir' || !pdfDirectory))) {
  console.error('Usage: npm run validate:map -- map.json [--pdf-dir source_inputs]');
  process.exit(2);
}
let server;
try {
  const map = JSON.parse(await fs.readFile(mapPath, 'utf8'));
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const { validateMap } = await server.ssrLoadModule('/src/contract.js');
  const errors = validateMap(map);
  if (!errors.length && pdfDirectory) {
    for (const document of map.documents) {
      const base = path.resolve(pdfDirectory);
      const pdfPath = path.resolve(base, document.filename);
      if (path.dirname(pdfPath) !== base) throw new Error('PDF filename must identify a file directly inside --pdf-dir');
      const bytes = await fs.readFile(pdfPath);
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== document.pdf_sha256) {
        errors.push(`${document.id}: PDF SHA-256 mismatch`);
      }
      const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8', windowsHide: true });
      const count = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (count !== document.page_count) errors.push(`${document.id}: PDF has ${count} pages; expected ${document.page_count}`);
    }
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${mapPath}; ${map.v3.nodes.length} nodes, ${map.v3.references.length} references; status=${map.validation.status}`);
    console.log(pdfDirectory ? 'Original PDF hashes and page counts verified.' : 'PDF bytes not checked (provide --pdf-dir; requires Poppler pdfinfo).');
    console.log('Structural validation does not certify semantic support or full source coverage.');
  }
} catch (error) {
  console.error(`Validation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await server?.close();
}
