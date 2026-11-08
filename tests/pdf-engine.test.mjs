import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

test('patched PDF engine renders every synthetic fixture page with scripting/eval disabled', async () => {
  const root=dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
  let rendered=0;
  for (const name of ['waves.pdf','optics.pdf','source-ranges.pdf']) {
    const task=getDocument({data:new Uint8Array(readFileSync(`fixtures/${name}`)),enableScripting:false,isEvalSupported:false,standardFontDataUrl:`${root}/standard_fonts/`});
    try {
      const pdf=await task.promise;
      for(let n=1;n<=pdf.numPages;n++) {
        const page=await pdf.getPage(n), viewport=page.getViewport({scale:.5});
        const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
        await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        assert.ok(pixels.some((value,i)=>i%4!==3 && value<240), `${name} page ${n} must contain rendered text`);
        rendered++;
      }
    } finally { await task.destroy(); }
  }
  assert.equal(rendered,20);
});
