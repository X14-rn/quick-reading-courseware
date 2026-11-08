import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, copyFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateExport, checkPdfs } from '../scripts/validate-export.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const load = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
const schema = load('schemas/qr-courseware-map-1.1.schema.json');
const fixture = () => load('fixtures/synthetic-valid.json');
const errors = map => validateExport(map, schema).join('\n');

test('synthetic fixtures and the demo course satisfy the shared contract', () => {
  for (const path of ['fixtures/synthetic-valid.json','fixtures/synthetic-valid-1.1.json','fixtures/demo-laser-optics.json']) {
    assert.deepEqual(validateExport(load(path), schema), [], path);
  }
});
test('schema rejects missing fields, extra properties, invalid types and duplicate evidence', () => {
  const mutations = [m => delete m.documents[0].pdf_sha256, m => m.project.surprise = true,
    m => m.documents[0].page_count = '2', m => m.v3.nodes[0].evidence_ids = ['same','same']];
  for (const mutate of mutations) { const m=fixture();mutate(m);assert.ok(validateExport(m,schema).length); }
});
test('invalid physical page fixture fails navigation validation', () => {
  assert.match(errors(load('fixtures/synthetic-invalid-page.json')), /physical page/);
});
test('broken reciprocal mapping and missing page ledger fail', () => {
  const m=fixture();m.page_inventory.pop();assert.match(errors(m),/Missing page inventory/);
  const n=fixture();n.source_coverage_register[0].node_ids=[];assert.match(errors(n),/asymmetric|mapped without a node/);
});
test('tree corruption and unequal V2/V3 fail', () => {
  const m=fixture();m.v3.nodes[1].parent_id=m.v3.nodes[1].id;assert.match(errors(m),/parent cycle/);
  const n=fixture();n.v3.nodes[0].title='changed';assert.match(errors(n),/copy V2/);
});
test('unverified elements need uncertainty and critical defects require blocked', () => {
  const m=fixture();m.source_coverage_register[0].verification='pending';delete m.source_coverage_register[0].uncertainty;
  assert.match(errors(m),/structured uncertainty/);
  const n=fixture();n.validation.issues.push({severity:'critical',code:'bad',description:'material defect'});
  assert.match(errors(n),/Critical issues require blocked/);
});
function otherwiseComplete() {
  const m=fixture();m.project.scope='full_source';m.project.provenance='chatgpt_reviewed';
  m.page_inventory.forEach(p=>p.inspection='inspected');
  m.source_coverage_register.forEach(e=>e.verification='verified');
  m.validation.status='complete';m.validation.issues=[];
  m.v2.reviews=[{round:1,findings:[],corrections:[],confirming_pass:true}];return m;
}
test('a stale confirming pass cannot authorize complete after changes', () => {
  const m=otherwiseComplete();assert.deepEqual(validateExport(m,schema),[]);
  m.v2.reviews.push({round:2,findings:['defect'],corrections:['changed'],confirming_pass:false});
  assert.match(errors(m),/final confirming/);
});
test('confirming passes reject corrections and non-increasing rounds', () => {
  const m=otherwiseComplete();m.v2.reviews[0].corrections=['split'];assert.match(errors(m),/cannot contain material corrections/);
  const n=otherwiseComplete();n.v2.reviews.push({...n.v2.reviews[0]});assert.match(errors(n),/increase strictly/);
});
test('PDF binding accepts renamed originals, rejects changed bytes and wrong page counts', () => {
  const dir=mkdtempSync(join(tmpdir(),'qr-pdfs-'));
  try {
    copyFileSync(resolve(root,'fixtures/waves.pdf'),join(dir,'renamed-waves.pdf'));
    copyFileSync(resolve(root,'fixtures/optics.pdf'),join(dir,'renamed-optics.pdf'));
    const m=fixture();assert.deepEqual(checkPdfs(m,dir),[]);
    m.documents[0].page_count+=1;assert.match(checkPdfs(m,dir).join('\n'),/physical pages/);
    writeFileSync(join(dir,'renamed-waves.pdf'),'changed');
    assert.match(checkPdfs(fixture(),dir).join('\n'),/Missing exact PDF bytes/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});
test('CLI returns nonzero for malformed JSON and reports semantics separately', () => {
  const dir=mkdtempSync(join(tmpdir(),'qr-json-'));
  try {
    writeFileSync(join(dir,'bad.json'),'{');
    const cli=resolve(root,'scripts/validate-export.mjs');
    assert.equal(spawnSync(process.execPath,[cli,join(dir,'bad.json')]).status,2);
    const ok=spawnSync(process.execPath,[cli,resolve(root,'fixtures/synthetic-valid.json')],{encoding:'utf8'});
    assert.equal(ok.status,0);assert.equal(JSON.parse(ok.stdout).semantic_review,'not_proven_by_validator');
  } finally {rmSync(dir,{recursive:true,force:true});}
});
