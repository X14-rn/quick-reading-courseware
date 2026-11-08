// Dependency-free physical page count of a PDF (Node.js built-ins only).
// Reads the page-tree root's /Count, including PDFs whose objects sit in
// compressed object streams (PDF 1.5+). Falls back to pypdf / pdfinfo only if
// the file cannot be parsed this way (e.g. encrypted object streams).
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const MAX_STREAM = 64 * 1024 * 1024;

// Text segments to search: the file itself plus every decompressed object stream.
function segments(buf) {
  const raw = buf.toString('latin1');
  const out = [raw];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(raw))) {
    const head = raw.slice(Math.max(0, m.index - 400), m.index);
    const dictStart = head.lastIndexOf('<<');
    if (dictStart < 0 || !/\/Type\s*\/ObjStm/.test(head.slice(dictStart)) || !/\/FlateDecode/.test(head.slice(dictStart))) continue;
    const start = m.index + m[0].length, end = raw.indexOf('endstream', start);
    if (end < 0 || end - start > MAX_STREAM) continue;
    try { out.push(inflateSync(buf.subarray(start, end)).toString('latin1')); } catch { /* damaged or not zlib: skip */ }
  }
  return out;
}

// Largest /Count among /Type /Pages dictionaries = the root of the page tree.
export function countPdfPagesFromBytes(buf) {
  if (buf.subarray(0, 1024).toString('latin1').indexOf('%PDF-') < 0) throw new Error('not a PDF file');
  let best = 0, leaves = 0;
  for (const text of segments(buf)) {
    const re = /\/Type\s*\/Pages\b/g;
    let m;
    while ((m = re.exec(text))) {
      const open = text.lastIndexOf('<<', m.index), close = text.indexOf('>>', m.index);
      const window = text.slice(open < 0 ? Math.max(0, m.index - 300) : open, close < 0 ? m.index + 300 : close);
      const c = /\/Count\s+(\d+)/.exec(window);
      if (c) best = Math.max(best, Number(c[1]));
    }
    leaves += (text.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
  }
  if (best > 0) return best;
  if (leaves > 0) return leaves;
  throw new Error('page tree not found');
}

export function pageCount(path) {
  try { return countPdfPagesFromBytes(readFileSync(path)); } catch (nativeError) {
    const python = process.env.PYTHON || 'python3';
    const py = spawnSync(python, ['-c', 'import sys; from pypdf import PdfReader; print(len(PdfReader(sys.argv[1]).pages))', path], { encoding: 'utf8' });
    if (py.status === 0) return Number(py.stdout.trim());
    const info = spawnSync('pdfinfo', [path], { encoding: 'utf8' });
    const match = info.status === 0 && /^Pages:\s+(\d+)/m.exec(info.stdout);
    if (match) return Number(match[1]);
    throw new Error(`Cannot count pages of ${path} (${nativeError.message}); as a fallback install pypdf (pip install pypdf) or poppler pdfinfo`);
  }
}
