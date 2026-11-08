import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { validateMap } from '../src/contract';

const fixture = JSON.parse(fs.readFileSync('fixtures/synthetic-valid.json', 'utf8'));
const copy = () => structuredClone(fixture);

describe('versioned viewer contract', () => {
  it('accepts the synthetic two-document map', () => expect(validateMap(fixture)).toEqual([]));
  it('accepts the synthetic demo course (schema 1.1) and refuses to mark it complete', () => {
    const sample = JSON.parse(fs.readFileSync('fixtures/demo-laser-optics.json', 'utf8'));
    expect(validateMap(sample)).toEqual([]);
    const falseComplete = structuredClone(sample); falseComplete.validation.status = 'complete';
    expect(validateMap(falseComplete).join(' ')).toMatch(/Complete status requires/);
  });
  it('rejects a physical page outside the source PDF', () => {
    const bad = JSON.parse(fs.readFileSync('fixtures/synthetic-invalid-page.json', 'utf8'));
    expect(validateMap(bad).join(' ')).toMatch(/invalid document or physical page/);
  });
  it('rejects a fabricated source evidence link', () => {
    const bad = copy(); bad.v3.references[0].element_ids = ['E3'];
    expect(validateMap(bad).join(' ')).toMatch(/unsupported element/);
  });
  it('rejects false coverage and a false complete status', () => {
    const bad = copy(); bad.validation.counts.mapped = 2; bad.validation.status = 'complete';
    expect(validateMap(bad).join(' ')).toMatch(/Coverage count mapped/);
    expect(validateMap(bad).join(' ')).toMatch(/Complete status requires/);
  });
  it('rejects a cycle and V2/V3 drift', () => {
    const bad = copy(); bad.v3.nodes[0].parent_id = 'N2';
    expect(validateMap(bad).join(' ')).toMatch(/parent cycle/);
    expect(validateMap(bad).join(' ')).toMatch(/copy V2 nodes/);
  });
  it('rejects unresolved items missing from supplement', () => {
    const bad = copy(); bad.source_coverage_register.push({ id: 'E4', document_id: 'waves', page: 2, kind: 'figure', locator: 'unreadable figure', status: 'unresolved', node_ids: [], verification: 'unresolved', note: 'Not legible', uncertainty: { category: 'extraction', affected_content: 'figure', source_evidence: 'waves physical page 2', attempts: ['Reinspect page image'] } });
    bad.page_inventory[1].element_ids.push('E4');
    bad.validation.counts.registered++; bad.validation.counts.unresolved++;
    expect(validateMap(bad).join(' ')).toMatch(/Unresolved supplement/);
  });
  it('rejects omitted physical pages and false verified status', () => {
    const bad = copy(); bad.page_inventory.pop();
    expect(validateMap(bad).join(' ')).toMatch(/Missing page inventory optics\/1/);
    const pending = copy(); pending.source_coverage_register[0].verification = 'pending'; pending.validation.status = 'complete';
    expect(validateMap(pending).join(' ')).toMatch(/unverified without structured uncertainty/);
    expect(validateMap(pending).join(' ')).toMatch(/Complete status requires/);
  });
});

describe('schema 1.1 learning content', () => {
  const v11 = JSON.parse(fs.readFileSync('fixtures/synthetic-valid-1.1.json', 'utf8'));
  const copy11 = () => structuredClone(v11);
  it('accepts a 1.1 map with key points, importance, supplements and an erratum', () => expect(validateMap(v11)).toEqual([]));
  it('requires key points on 1.1 learning points', () => {
    const bad = copy11(); bad.v2.nodes[1].key_points = []; bad.v3.nodes[1].key_points = [];
    expect(validateMap(bad).join(' ')).toMatch(/at least one key point/);
  });
  it('rejects key points citing evidence outside their node', () => {
    const bad = copy11(); bad.v2.nodes[1].key_points[0].element_ids = ['E3']; bad.v3.nodes[1].key_points[0].element_ids = ['E3'];
    expect(validateMap(bad).join(' ')).toMatch(/not in its evidence/);
  });
  it('rejects a critical source erratum and 1.1 fields under 1.0', () => {
    const bad = copy11(); bad.validation.issues[0].severity = 'critical'; bad.validation.status = 'blocked';
    expect(validateMap(bad).join(' ')).toMatch(/noncritical/);
    const old = copy11(); old.schema_version = 'qr-courseware-map/1.0';
    expect(validateMap(old).join(' ')).toMatch(/require schema_version/);
  });
  it('enforces supplement and key-point limits in the browser validator', () => {
    const bad = copy11(); bad.v2.nodes[1].supplements = bad.v3.nodes[1].supplements = Array(4).fill({ purpose: 'bridge', text: 'x' });
    expect(validateMap(bad).length).toBeGreaterThan(0);
  });
});
