// Start a draft from the exact PDFs: computes SHA-256 and physical page counts
// and lists every physical page as pending. Never type hashes by hand.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pageCount } from './pdf-pages.mjs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export { pageCount };

export function initDraft(paths, ids = []) {
  const documents = paths.map((path, i) => ({
    id: ids[i] || `d${i + 1}`, filename: basename(path),
    pdf_sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), page_count: pageCount(path)
  }));
  return {
    draft_version: 'qr-draft/1',
    project: { id: 'course-map', title: 'TODO course title', language: 'TODO confirmed output language', scope: 'full_source', provenance: 'ai_reviewed' },
    documents,
    pages: documents.flatMap(d => Array.from({ length: d.page_count }, (_, k) => ({ document_id: d.id, page: k + 1, inspection: 'pending' }))),
    elements: [], v1: { candidate: [], revision: [], review_note: 'TODO' }, nodes: [], reviews: [], issues: [],
    coverage_scope: 'TODO: what was actually inspected'
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), out = args.indexOf('--out');
  const target = out >= 0 ? args.splice(out, 2)[1] : null;
  if (!args.length || !target) { console.error('Usage: node scripts/init-draft.mjs FILE1.pdf [FILE2.pdf ...] --out draft.json   (upload order = argument order)'); process.exit(2); }
  if (existsSync(target)) { console.error(`${target} exists; refusing to overwrite a draft`); process.exit(2); }
  const draft = initDraft(args);
  writeFileSync(target, JSON.stringify(draft, null, 1) + '\n');
  console.log(JSON.stringify(draft.documents, null, 2));
}
