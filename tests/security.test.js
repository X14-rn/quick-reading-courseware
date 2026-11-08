import { it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateMap } from '../src/contract';
import { MAX_JSON_BYTES, MAX_PDF_BYTES, checkFileSize, disposeBinding } from '../src/import-security';
import { securityPolicy } from '../security-policy.mjs';
import { layout, ROW } from '../src/layout';

const copy = () => JSON.parse(fs.readFileSync('fixtures/synthetic-valid.json', 'utf8'));
it('imports and runs the browser validator with string-code generation prohibited', () => {
  const result=spawnSync(process.execPath,['--disallow-code-generation-from-strings','--input-type=module','-e',`
    import validate from './src/generated-validator.js';
    import {readFileSync} from 'node:fs';
    const good=JSON.parse(readFileSync('fixtures/synthetic-valid.json','utf8'));
    if(!validate(good)) throw Error('Valid fixture rejected');
    if(validate({})) throw Error('Invalid fixture accepted');
    if(!validate.errors.length) throw Error('No validation errors');
  `],{encoding:'utf8'});
  expect(result.status,result.stderr).toBe(0);
});
it('rejects huge physical page counts before expanding page inventories', () => {
  const map = copy(); map.documents[0].page_count = 1e12;
  expect(validateMap(map).join(' ')).toMatch(/resource budget/);
});
it('rejects unsafe JSON keys without polluting object prototypes', () => {
  const map = copy(); map.v1 = JSON.parse('{"__proto__":{"polluted":true}}');
  expect(validateMap(map).join(' ')).toMatch(/Unsafe JSON/);
  expect({}.polluted).toBeUndefined();
});
it('checks file size before reading JSON or PDF bytes', () => {
  expect(() => checkFileSize({ size: MAX_JSON_BYTES + 1 }, 'JSON')).toThrow(/No content/);
  expect(() => checkFileSize({ size: MAX_PDF_BYTES + 1 }, 'PDF')).toThrow(/No content/);
  expect(() => checkFileSize({ size: 1000 }, 'PDF')).not.toThrow();
});
it('rejects excessive combined validation work without silently truncating nodes', () => {
  const map = copy(); map.v3.nodes = Array.from({length: 6000}, () => ({}));
  expect(validateMap(map).join(' ')).toMatch(/workload budget/);
  expect(map.v3.nodes).toHaveLength(6000);
});
it('disposes the PDF.js 6 loading task and always releases the object URL', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const destroy = vi.fn().mockResolvedValue();
  await disposeBinding({ loading: { destroy }, url: 'blob:local' });
  expect(destroy).toHaveBeenCalledOnce(); expect(revoke).toHaveBeenCalledWith('blob:local');
  await expect(disposeBinding({loading: { destroy: async () => { throw new Error('cleanup'); } }, url: 'blob:failed'})).rejects.toThrow('cleanup');
  expect(revoke).toHaveBeenCalledWith('blob:failed'); revoke.mockRestore();
});
it('blocks remote connections and JS evaluation while allowing local PDF workers and WebAssembly', () => {
  const policy = securityPolicy();
  expect(policy).toContain("connect-src 'self'");
  expect(policy).toContain("worker-src 'self' blob:");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy).not.toContain('https:');
  expect(policy).toContain("object-src 'none'");
  expect(securityPolicy(true)).toContain('ws://127.0.0.1:');
});
it('retains adaptive connector geometry and expands deep trees without recursion', () => {
  for (const count of [1,2,3,4,5]) {
    const root={id:'root',parent_id:null,title:'root'};
    const children=Array.from({length:count},(_,i)=>({id:`c${i}`,parent_id:'root',title:'child'}));
    const graph=layout({v3:{nodes:[root,...children]}},new Set(),'');
    const parent=graph.nodes.find(n=>n.id==='root');
    expect(parent.position.y).toBe((count-1)*ROW/2);
    expect(graph.edges.every(e=>e.type==='smoothstep'&&e.pathOptions.borderRadius===0)).toBe(true);
  }
  const chain=Array.from({length:12000},(_,i)=>({id:`n${i}`,parent_id:i?`n${i-1}`:null,title:'deep'}));
  expect(layout({v3:{nodes:chain}},new Set(),'').nodes).toHaveLength(12000);
});
