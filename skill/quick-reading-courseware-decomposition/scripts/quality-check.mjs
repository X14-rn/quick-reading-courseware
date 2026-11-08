// Deterministic learning-quality metrics for qr-courseware-map 1.0/1.1 exports.
// These metrics flag structural symptoms of poor decomposition. They do not
// replace the judged rubric in references/quality-rubric.md: a map can pass
// every metric and still group concepts badly.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Wording that belongs in issues/uncertainty records, not learner-facing goals.
export const AUDIT_WORDS = /\b(flag(ged|s)?|inconsisten\w*|unresolved|conflict\w*|missing|incomplete|without adding|without changing|absent|erratum|errata|typo|misprint)\b/i;
// Wording that describes the slides instead of the concept.
export const SOURCE_WORDS = /\b(the source'?s?|supplied|illustrated|the slides?|the course'?s?|in the course|the lecture|named (in|by)|as shown|stated)\b/i;
const PAGE_WORDS = /\b(page|slide|module \d|p\.\s?\d)/i;

export const TARGETS = {
  leaf_key_points: { min: 0.95, label: 'Learning points with ≥1 key point' },
  importance_labelled: { min: 1, label: 'Learning points with importance label' },
  audit_language: { max: 0, label: 'Objectives/titles with audit wording (count)' },
  source_referential: { max: 0.10, label: 'Objectives phrased about the slides' },
  fanout_in_range: { min: 0.80, label: 'Groups with 3–7 children' },
  wide_groups: { max: 0, label: 'Groups with >9 children (count)' },
  single_child_groups: { max: 0, label: 'Single-child groups (count)' },
  broad_leaves: { max: 0.05, label: 'Leaves citing ≥7 occurrences or ≥5 pages' },
  title_quality: { min: 0.95, label: 'Concise concept titles (1–8 words, no page words)' },
  supplement_ratio: { max: 0.5, label: 'Supplements per key point' },
  critical_errata: { max: 0, label: 'Source errata marked critical (count)' }
};

export function qualityMetrics(map) {
  const nodes = map.v3.nodes;
  const children = new Map(nodes.map(n => [n.id, []]));
  for (const n of nodes) if (n.parent_id) children.get(n.parent_id)?.push(n);
  const byId = new Map(nodes.map(n => [n.id, n]));
  const depth = n => { let d = 0; for (let c = n; c?.parent_id; c = byId.get(c.parent_id)) d++; return d; };
  const leaves = nodes.filter(n => n.kind === 'learning_point');
  const groups = nodes.filter(n => n.kind === 'group');
  const refsBy = new Map(leaves.map(n => [n.id, []]));
  for (const r of map.v3.references) refsBy.get(r.node_id)?.push(r);
  const share = (arr, pred) => arr.length ? arr.filter(pred).length / arr.length : 0;
  const keyPoints = leaves.reduce((s, n) => s + (n.key_points?.length || 0), 0);
  const supplements = nodes.reduce((s, n) => s + (n.supplements?.length || 0), 0);
  const fan = groups.map(g => children.get(g.id).length);
  const errataCritical = (map.validation.issues || []).filter(i => i.category === 'source_erratum' && i.severity === 'critical').length;
  // 1.0 maps have no category; count critical issues whose description blames the printed source.
  const legacyErrata = (map.validation.issues || []).filter(i => !i.category && i.severity === 'critical' && /\b(print(ed|s)?|source|displayed|described|defined|contradict\w*|inconsistent)\b/i.test(i.description)).length;
  const values = {
    leaf_key_points: share(leaves, n => (n.key_points?.length || 0) > 0),
    importance_labelled: share(leaves, n => !!n.importance),
    audit_language: nodes.filter(n => AUDIT_WORDS.test(n.objective) || AUDIT_WORDS.test(n.title)).length,
    source_referential: share(nodes, n => SOURCE_WORDS.test(n.objective)),
    fanout_in_range: share(fan, f => f >= 3 && f <= 7),
    wide_groups: fan.filter(f => f > 9).length,
    single_child_groups: fan.filter(f => f === 1).length,
    broad_leaves: share(leaves, n => n.evidence_ids.length >= 7 || new Set(refsBy.get(n.id).map(r => `${r.document_id}/${r.page}`)).size >= 5),
    title_quality: share(nodes.filter(n => n.parent_id), n => { const w = n.title.trim().split(/\s+/).length; return w >= 1 && w <= 8 && !PAGE_WORDS.test(n.title); }),
    supplement_ratio: keyPoints ? supplements / keyPoints : (supplements ? Infinity : 0),
    critical_errata: errataCritical + legacyErrata
  };
  const results = Object.entries(TARGETS).map(([key, t]) => {
    const v = values[key];
    const pass = t.min !== undefined ? v >= t.min : v <= t.max;
    return { metric: key, label: t.label, value: Number.isFinite(v) && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v,
      target: t.min !== undefined ? `≥ ${t.min}` : `≤ ${t.max}`, pass };
  });
  const depths = leaves.map(depth);
  const imp = Object.fromEntries(['core', 'supporting', 'context'].map(k => [k, leaves.filter(n => n.importance === k).length]));
  const findings = {
    audit_language: nodes.filter(n => AUDIT_WORDS.test(n.objective) || AUDIT_WORDS.test(n.title)).map(n => n.id),
    wide_groups: groups.filter(g => children.get(g.id).length > 9).map(g => `${g.id} (${children.get(g.id).length})`),
    single_child_groups: groups.filter(g => children.get(g.id).length === 1).map(g => g.id),
    broad_leaves: leaves.filter(n => n.evidence_ids.length >= 7 || new Set(refsBy.get(n.id).map(r => `${r.document_id}/${r.page}`)).size >= 5).map(n => n.id),
    leaves_without_key_points: leaves.filter(n => !(n.key_points?.length)).length
  };
  return {
    schema_version: map.schema_version,
    summary: { nodes: nodes.length, learning_points: leaves.length, groups: groups.length,
      max_depth: Math.max(0, ...nodes.map(depth)), leaf_depth_range: [Math.min(...depths), Math.max(...depths)],
      key_points: keyPoints, supplements, importance: imp,
      multi_document_leaves: leaves.filter(n => new Set(refsBy.get(n.id).map(r => r.document_id)).size > 1).length },
    metrics: results, passed: results.filter(r => r.pass).length, total: results.length, findings,
    note: 'Deterministic symptoms only. Score the judged criteria in references/quality-rubric.md as well.'
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  if (!input) { console.error('Usage: node scripts/quality-check.mjs MAP.json'); process.exit(2); }
  const report = qualityMetrics(JSON.parse(readFileSync(input, 'utf8')));
  console.log(JSON.stringify(report, null, 2));
}
