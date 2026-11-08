import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';

for (const production of [false,true]) test(`${production?'built':'development'} viewer serves security headers and local PDF assets`, async () => {
  if (production && !existsSync('dist/index.html')) assert.fail('dist/ is missing: run "npm run build" before this test.');
  // Vite's colour library always colours output on Windows, even when piped, and wraps the
  // port in ANSI codes. Disable colour, strip any codes, and buffer chunks before matching.
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(production?['preview']:[]),'--host','127.0.0.1','--port','0'],
    {stdio:['ignore','pipe','pipe'],env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});
  try {
    const url=await new Promise((resolve,reject)=>{
      let output='';
      const timeout=setTimeout(()=>reject(new Error(`Server startup timed out. Server output:\n${output}`)),30000);
      server.on('error',e=>{clearTimeout(timeout);reject(e);});
      server.on('exit',code=>{clearTimeout(timeout);reject(new Error(`Server exited: ${code}\n${output}`));});
      const read=chunk=>{
        output+=chunk.toString();
        const match=output.replace(/\x1b\[[0-9;]*m/g,'').match(/http:\/\/127\.0\.0\.1:\d+\//);
        if(match){clearTimeout(timeout);resolve(match[0]);}
      };
      server.stdout.on('data',read); server.stderr.on('data',read);
    });
    for(const path of ['', 'pdf-assets/standard_fonts/'+readdirSync('node_modules/pdfjs-dist/standard_fonts').find(f=>f.endsWith('.ttf')),
      'pdf-assets/wasm/'+readdirSync('node_modules/pdfjs-dist/wasm').find(f=>f.endsWith('.wasm'))]) {
      const r=await fetch(url+path,{headers:{Origin:'https://untrusted.invalid'}});
      assert.equal(r.status,200,path);
      assert.ok((await r.arrayBuffer()).byteLength>0,path);
      assert.ok(r.headers.get('content-security-policy').includes("frame-ancestors 'none'"));
      assert.equal(r.headers.get('x-content-type-options'),'nosniff');
      assert.equal(r.headers.get('access-control-allow-origin'),null);
    }
  } finally { server.kill(); }
});
