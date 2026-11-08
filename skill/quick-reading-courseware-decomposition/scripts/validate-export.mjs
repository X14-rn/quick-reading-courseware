import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkSchema } from './schema-check.mjs';
import { validateRelations } from './relations.mjs';
import { countPdfPagesFromBytes } from './pdf-pages.mjs';

export function validateExport(map, schema) {
  const shape = checkSchema(map, schema);
  return shape.length ? shape : validateRelations(map);
}

export function checkPdfs(map, directory, python = process.env.PYTHON || 'python3') {
  const errors = [], matched = [];
  const candidates = readdirSync(directory, { withFileTypes: true }).filter(e => e.isFile() && /\.pdf$/i.test(e.name));
  const hashes = new Map();
  for (const e of candidates) {
    const path = resolve(directory, e.name);
    hashes.set(createHash('sha256').update(readFileSync(path)).digest('hex'), path);
  }
  for (const doc of map.documents) {
    const path = hashes.get(doc.pdf_sha256);
    if (!path) errors.push(`Missing exact PDF bytes for ${doc.id} (${doc.filename})`);
    else matched.push({ id: doc.id, path, expected: doc.page_count });
  }
  // Page counts: built-in parser first (no dependencies); pypdf only for files it cannot read.
  const fallback = [];
  for (const row of matched) {
    let count;
    try { count = countPdfPagesFromBytes(readFileSync(row.path)); } catch { fallback.push(row); continue; }
    if (count !== row.expected) errors.push(`${row.id}: PDF has ${count} physical pages; map declares ${row.expected}`);
  }
  if (fallback.length) {
    const result = spawnSync(python, ['-c', 'import json,sys; from pypdf import PdfReader; print(json.dumps([{"id":r["id"],"count":len(PdfReader(r["path"]).pages),"expected":r["expected"]} for r in json.load(sys.stdin)]))'], { input: JSON.stringify(fallback), encoding: 'utf8' });
    if (result.error || result.status !== 0) errors.push(`PDF page-count verification unavailable for ${fallback.map(r => r.id).join(', ')}: ${result.error?.message || result.stderr.trim()}. Install pypdf and set PYTHON to its interpreter.`);
    else for (const row of JSON.parse(result.stdout)) if (row.count !== row.expected) errors.push(`${row.id}: PDF has ${row.count} physical pages; map declares ${row.expected}`);
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), input = args.shift();
    if (!input || (args.length && (args.length !== 2 || args[0] !== '--pdf-dir'))) throw new Error('Usage: node scripts/validate-export.mjs MAP.json [--pdf-dir DIRECTORY]');
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const schema = JSON.parse(readFileSync(resolve(root, 'references/qr-courseware-map-1.1.schema.json'), 'utf8'));
    const map = JSON.parse(readFileSync(input, 'utf8'));
    const errors = validateExport(map, schema);
    let pdfIdentity = 'not_checked';
    if (!errors.length && args.length) {
      const pdfErrors = checkPdfs(map, args[1]);
      errors.push(...pdfErrors);
      pdfIdentity = pdfErrors.length ? 'failed' : 'passed';
    }
    console.log(JSON.stringify({ valid: errors.length === 0, status: map.validation?.status,
      pdf_identity: pdfIdentity, semantic_review: 'not_proven_by_validator', note: 'Also run scripts/quality-check.mjs for learning quality', errors }, null, 2));
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
