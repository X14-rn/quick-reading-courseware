// Print a compact indented outline of a draft or map for structure review.
// Leaves show importance, key-point count and cited pages (d1:p12), so a
// reviewer can judge grouping, order and granularity without the full JSON.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function outline(data, { objectives = false } = {}) {
  const nodes = data.nodes || data.v3.nodes;
  const elements = new Map((data.elements || data.source_coverage_register).map(e => [e.id, e]));
  const kids = new Map(nodes.map(n => [n.id, []]));
  for (const n of nodes) if (n.parent_id) kids.get(n.parent_id)?.push(n);
  const lines = [];
  const walk = (n, depth) => {
    const pad = '  '.repeat(depth);
    if (n.kind === 'group') lines.push(`${pad}${n.title}  [${kids.get(n.id).length}]`);
    else {
      const pages = [...new Set(n.evidence_ids.map(id => elements.get(id)).filter(Boolean).map(e => `${e.document_id}:p${e.page}`))];
      lines.push(`${pad}- ${n.title}  (${n.importance || '?'}, ${n.key_points?.length || 0} kp${n.supplements?.length ? `, ${n.supplements.length} supp` : ''}) ${pages.join(' ')}`);
    }
    if (objectives) lines.push(`${pad}    ↳ ${n.objective}`);
    for (const c of kids.get(n.id)) walk(c, depth + 1);
  };
  const root = nodes.find(n => n.parent_id === null);
  if (root) walk(root, 0);
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node scripts/outline.mjs DRAFT_or_MAP.json [--objectives]'); process.exit(2); }
  console.log(outline(JSON.parse(readFileSync(file, 'utf8')), { objectives: process.argv.includes('--objectives') }));
}
