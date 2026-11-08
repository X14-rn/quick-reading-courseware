// Build a complete qr-courseware-map/1.1 export from a working draft.
// The model authors meaning (pages, occurrences, nodes, key points, reviews,
// issues); this script derives every bookkeeping field so they cannot drift:
// element.node_ids, element.status=mapped, page_inventory.element_ids,
// v3 (exact copy of nodes), v3.references, counts, unresolved_supplements
// and the validation status.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExport } from './validate-export.mjs';
import { qualityMetrics } from './quality-check.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const schema = () => JSON.parse(readFileSync(resolve(ROOT, 'references/qr-courseware-map-1.1.schema.json'), 'utf8'));

export function assemble(draft) {
  const errors = [];
  for (const key of ['project', 'documents', 'pages', 'elements', 'v1', 'nodes', 'reviews', 'issues', 'coverage_scope'])
    if (draft[key] === undefined) errors.push(`Draft is missing ${key}`);
  if (errors.length) return { errors };
  const docOrder = new Map(draft.documents.map((d, i) => [d.id, i]));
  const nodeIds = new Map();
  for (const n of draft.nodes) for (const id of n.evidence_ids || []) {
    if (!nodeIds.has(id)) nodeIds.set(id, []);
    nodeIds.get(id).push(n.id);
  }
  const known = new Set(draft.elements.map(e => e.id));
  for (const [id, owners] of nodeIds) if (!known.has(id)) errors.push(`Nodes ${owners.join(', ')} cite unknown element ${id}`);
  const elements = draft.elements.map(e => {
    const owners = nodeIds.get(e.id) || [];
    const out = { id: e.id, document_id: e.document_id, page: e.page, kind: e.kind, locator: e.locator };
    if (owners.length) {
      if (e.status && e.status !== 'mapped') errors.push(`Element ${e.id} is ${e.status} but cited by ${owners.join(', ')}`);
      out.status = 'mapped';
    } else if (e.status === 'excluded_administrative' || e.status === 'unresolved') out.status = e.status;
    else errors.push(`Element ${e.id} is not cited by any learning point; cite it, or mark it excluded_administrative/unresolved with a note`);
    out.node_ids = owners;
    if (e.note) out.note = e.note;
    out.verification = e.verification;
    if (e.uncertainty) out.uncertainty = e.uncertainty;
    return out;
  });
  const onPage = new Map();
  for (const e of elements) {
    const key = `${e.document_id}/${e.page}`;
    if (!onPage.has(key)) onPage.set(key, []);
    onPage.get(key).push(e.id);
  }
  const page_inventory = [...draft.pages]
    .sort((a, b) => (docOrder.get(a.document_id) ?? 1e9) - (docOrder.get(b.document_id) ?? 1e9) || a.page - b.page)
    .map(p => ({ document_id: p.document_id, page: p.page, inspection: p.inspection, element_ids: onPage.get(`${p.document_id}/${p.page}`) || [], ...(p.note ? { note: p.note } : {}) }));
  const byId = new Map(elements.map(e => [e.id, e]));
  const references = [];
  for (const n of draft.nodes) {
    if (n.kind !== 'learning_point') continue;
    const groups = new Map();
    for (const id of n.evidence_ids) {
      const e = byId.get(id);
      if (!e) continue;
      const key = `${e.document_id}/${e.page}`;
      if (!groups.has(key)) groups.set(key, { node_id: n.id, document_id: e.document_id, page: e.page, element_ids: [] });
      groups.get(key).element_ids.push(id);
    }
    references.push(...[...groups.values()].sort((a, b) => (docOrder.get(a.document_id) ?? 1e9) - (docOrder.get(b.document_id) ?? 1e9) || a.page - b.page));
  }
  const counts = { registered: elements.length, mapped: 0, excluded_administrative: 0, unresolved: 0 };
  for (const e of elements) counts[e.status]++;
  const unresolved = elements.filter(e => e.status === 'unresolved').map(e => e.id);
  const issues = draft.issues;
  const nodes = JSON.parse(JSON.stringify(draft.nodes));
  const lastReview = draft.reviews.at(-1);
  const completeEligible = draft.project.scope === 'full_source'
    && ['ai_reviewed', 'chatgpt_reviewed'].includes(draft.project.provenance)
    && !unresolved.length && page_inventory.every(p => p.inspection === 'inspected')
    && elements.every(e => e.verification === 'verified') && !!lastReview?.confirming_pass;
  const status = issues.some(i => i.severity === 'critical') ? 'blocked'
    : completeEligible && draft.requested_status !== 'incomplete' ? 'complete' : 'incomplete';
  const map = {
    schema_version: 'qr-courseware-map/1.1', project: draft.project, documents: draft.documents,
    page_inventory, source_coverage_register: elements, v1: draft.v1,
    v2: { nodes, reviews: draft.reviews },
    v3: { nodes: JSON.parse(JSON.stringify(draft.nodes)), references, unresolved_supplements: unresolved },
    validation: { status, coverage_scope: draft.coverage_scope, counts, issues }
  };
  if (errors.length) return { errors, map };
  return { errors: validateExport(map, schema()), map };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, flag, output] = process.argv.slice(2);
  if (!input || (flag && flag !== '--out') || (flag && !output)) {
    console.error('Usage: node scripts/assemble.mjs DRAFT.json [--out MAP.json]'); process.exit(2);
  }
  const { errors, map } = assemble(JSON.parse(readFileSync(input, 'utf8')));
  if (map && output && !errors.length) writeFileSync(output, JSON.stringify(map, null, 1) + '\n');
  const quality = map && !errors.length ? qualityMetrics(map) : null;
  console.log(JSON.stringify({ valid: !errors.length, written: !!(output && !errors.length), status: map?.validation.status,
    errors: errors.slice(0, 50), error_count: errors.length,
    quality: quality && { passed: `${quality.passed}/${quality.total}`, failed: quality.metrics.filter(m => !m.pass).map(m => `${m.metric}=${m.value} (target ${m.target})`) } }, null, 2));
  process.exitCode = errors.length ? 1 : 0;
}
