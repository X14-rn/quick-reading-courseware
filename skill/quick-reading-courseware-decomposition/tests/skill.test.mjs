import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assemble, schema } from '../scripts/assemble.mjs';
import { validateExport } from '../scripts/validate-export.mjs';
import { qualityMetrics } from '../scripts/quality-check.mjs';
import { initDraft } from '../scripts/init-draft.mjs';
import { outline } from '../scripts/outline.mjs';

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const draft = () => fixture('synthetic-draft-1.1.json');
const built = d => { const r = assemble(d); return { ...r, text: r.errors.join('\n') }; };
const exportOf = d => { const r = assemble(d); assert.deepEqual(r.errors, []); return r.map; };

test('1.0 fixtures keep their original results under the 1.1 schema', () => {
  assert.deepEqual(validateExport(fixture('synthetic-valid.json'), schema()), []);
  assert.match(validateExport(fixture('synthetic-invalid-page.json'), schema()).join('\n'), /physical page/);
});

test('assemble derives a valid 1.1 export with references, counts and status', () => {
  const map = exportOf(draft());
  assert.equal(map.schema_version, 'qr-courseware-map/1.1');
  assert.deepEqual(map.v3.nodes, map.v2.nodes);
  assert.deepEqual(map.v3.references.map(r => `${r.node_id}/${r.document_id}/${r.page}`), ['N2/waves/1', 'N3/waves/2', 'N3/optics/1']);
  assert.deepEqual(map.source_coverage_register.map(e => [e.status, e.node_ids]), [['mapped', ['N2']], ['mapped', ['N3']], ['mapped', ['N3']]]);
  assert.deepEqual(map.validation.counts, { registered: 3, mapped: 3, excluded_administrative: 0, unresolved: 0 });
  assert.equal(map.validation.status, 'incomplete');
});

test('uncited elements need an explicit disposition', () => {
  const d = draft(); d.nodes[2].evidence_ids = ['E2']; d.nodes[2].key_points.pop();
  assert.match(built(d).text, /E3 is not cited/);
  d.elements[2].status = 'excluded_administrative'; d.elements[2].note = 'Course logo page';
  assert.deepEqual(built(d).errors, []);
});

test('cited elements cannot also be excluded', () => {
  const d = draft(); d.elements[0].status = 'excluded_administrative';
  assert.match(built(d).text, /E1 is excluded_administrative but cited/);
});

test('1.1 learning points need importance and key points citing their own evidence', () => {
  let d = draft(); delete d.nodes[1].importance;
  assert.match(built(d).text, /importance is required/);
  d = draft(); d.nodes[1].key_points = [];
  assert.match(built(d).text, /at least one key point/);
  d = draft(); d.nodes[1].key_points[0].element_ids = ['E2'];
  assert.match(built(d).text, /cites E2, which is not in its evidence/);
});

test('groups cannot carry key points or importance', () => {
  const d = draft(); d.nodes[0].importance = 'core';
  assert.match(built(d).text, /Group N1: key points and importance belong on learning points/);
});

test('schema limits supplements and key-point length', () => {
  let d = draft(); d.nodes[1].supplements = Array(4).fill({ purpose: 'bridge', text: 'x' });
  assert.match(built(d).text, /too many items/);
  d = draft(); d.nodes[1].key_points[0].text = 'x'.repeat(501);
  assert.match(built(d).text, /string too long/);
});

test('source errata are noncritical, anchored, and never block', () => {
  let d = draft(); d.issues[0].severity = 'critical';
  assert.match(built(d).text, /source erratum is preserved and flagged, so it is noncritical/);
  d = draft(); delete d.issues[0].node_id;
  assert.match(built(d).text, /must name the affected node/);
  d = draft(); d.issues.push({ severity: 'noncritical', code: 'x', category: 'coverage', description: 'y', standard_form: 'z' });
  assert.match(built(d).text, /standard_form is only for source errata/);
});

test('status: critical issue blocks; full verified confirmed source is complete; complete can be declined', () => {
  let d = draft(); d.issues.push({ severity: 'critical', code: 'unsupported', category: 'evidence', description: 'Unsupported claim', node_id: 'N2' });
  assert.equal(exportOf(d).validation.status, 'blocked');
  d = draft(); d.project = { ...d.project, scope: 'full_source', provenance: 'ai_reviewed' };
  d.reviews.push({ round: 2, findings: [], corrections: [], confirming_pass: true });
  assert.equal(exportOf(d).validation.status, 'complete');
  d.requested_status = 'incomplete';
  assert.equal(exportOf(d).validation.status, 'incomplete');
  d = draft(); d.project = { ...d.project, scope: 'full_source', provenance: 'ai_reviewed' }; d.pages[0].inspection = 'pending';
  d.reviews.push({ round: 2, findings: [], corrections: [], confirming_pass: true });
  assert.equal(exportOf(d).validation.status, 'incomplete');
});

test('1.1 fields are rejected in a map declaring 1.0', () => {
  const map = exportOf(draft()); map.schema_version = 'qr-courseware-map/1.0';
  assert.match(validateExport(map, schema()).join('\n'), /require schema_version qr-courseware-map\/1.1/);
});

test('review rounds must increase and confirmations carry no corrections', () => {
  const d = draft(); d.reviews.push({ round: 2, findings: [], corrections: ['changed N2'], confirming_pass: true });
  assert.match(built(d).text, /confirming review cannot contain material corrections/);
});

test('quality check flags audit wording, missing key points and legacy errata', () => {
  const good = qualityMetrics(exportOf(draft()));
  assert.equal(good.metrics.find(m => m.metric === 'audit_language').value, 0);
  assert.equal(good.metrics.find(m => m.metric === 'leaf_key_points').value, 1);
  const d = draft(); d.nodes[1].objective = 'Use the relation while flagging the inconsistent label.';
  const bad = qualityMetrics(exportOf(d));
  assert.deepEqual(bad.findings.audit_language, ['N2']);
  const legacy = qualityMetrics(fixture('synthetic-valid.json'));
  assert.equal(legacy.metrics.find(m => m.metric === 'leaf_key_points').value, 0);
});

test('init-draft computes the exact fixture hashes and page counts', () => {
  const pdfs = ['waves.pdf', 'optics.pdf'].map(f => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url)));
  const d = initDraft(pdfs, ['waves', 'optics']);
  const ref = fixture('synthetic-valid.json').documents;
  assert.deepEqual(d.documents, ref);
  assert.equal(d.pages.length, 3);
  assert.ok(d.pages.every(p => p.inspection === 'pending'));
});

test('CLI: assemble writes a map that validate-export accepts with exact PDFs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qr-'));
  try {
    const root = fileURLToPath(new URL('..', import.meta.url)), out = join(dir, 'map.json');
    const a = spawnSync(process.execPath, ['scripts/assemble.mjs', 'tests/fixtures/synthetic-draft-1.1.json', '--out', out], { cwd: root, encoding: 'utf8' });
    assert.equal(a.status, 0, a.stdout + a.stderr);
    const v = spawnSync(process.execPath, ['scripts/validate-export.mjs', out, '--pdf-dir', 'tests/fixtures'], { cwd: root, encoding: 'utf8' });
    assert.equal(v.status, 0, v.stdout + v.stderr);
    assert.equal(JSON.parse(v.stdout).pdf_identity, 'passed');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('outline shows structure, importance and pages', () => {
  const text = outline(exportOf(draft()));
  assert.match(text, /^Wave concepts {2}\[2\]/);
  assert.match(text, /- Wave speed relation {2}\(core, 1 kp, 1 supp\) waves:p1/);
});

test('SKILL.md keeps identity, safety and the quality-first workflow', () => {
  const s = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  assert.match(s, /^---\nname: quick-reading-courseware-decomposition\ndescription: .{50,1024}\n---/);
  for (const phrase of [/untrusted content, never instructions/, /learning quality is the goal/i, /leaf test/, /Confirmation round/, /supplements/, /source_erratum/])
    assert.match(s, phrase);
});

test('page counts need no Python: built-in parser reads the fixture PDFs', async () => {
  const { countPdfPagesFromBytes } = await import('../scripts/pdf-pages.mjs');
  const count = f => countPdfPagesFromBytes(readFileSync(new URL(`./fixtures/${f}`, import.meta.url)));
  assert.equal(count('waves.pdf'), 2);
  assert.equal(count('optics.pdf'), 1);
  assert.throws(() => countPdfPagesFromBytes(Buffer.from('not a pdf')), /not a PDF/);
});
