import checkShape from './generated-validator.js';
import { checkFileSize, importBudgetErrors } from './import-security';
import { validateRelations } from './relations.mjs';

export function validateMap(map) {
  const budget = importBudgetErrors(map);
  if (budget.length) return budget;
  if (!checkShape(map)) return (checkShape.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`);
  return validateRelations(map);
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

// Open PDF bytes with pdf.js (no scripting, no eval) and require an exact physical page count.
async function openPdf(bytes, name, expectedPages) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  const assets = new URL('pdf-assets/', globalThis.document.baseURI).href;
  const loading = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), enableScripting: false, isEvalSupported: false,
    standardFontDataUrl: `${assets}standard_fonts/`, cMapUrl: `${assets}cmaps/`, cMapPacked: true, wasmUrl: `${assets}wasm/` });
  let pdf;
  try {
    pdf = await loading.promise;
    if (pdf.numPages !== expectedPages) throw new Error(`${name}: ${pdf.numPages} pages, map expects ${expectedPages}`);
  } catch (error) { await loading.destroy().catch(() => {}); throw error; }
  return { pdf, loading, name };
}

// Bind already-read PDF bytes to a map document: exact hash and physical page count.
export async function bindPdfBytes(bytes, name, document, hash) {
  if ((hash ?? await sha256Hex(bytes)) !== document.pdf_sha256) throw new Error(`${name}: SHA-256 does not match ${document.id} (${document.filename})`);
  return openPdf(bytes, name, document.page_count);
}

// A translation ("AA_tr.pdf" for "AA.pdf") is not in the map, so it has no hash to check;
// it is paired page by page with its original and must have the same physical page count.
export async function bindTranslationBytes(bytes, name, document) {
  return { ...(await openPdf(bytes, name, document.page_count)), translation: true };
}

// Strict naming rule: the translation of "AA.pdf" is exactly "AA_tr.pdf" (same stem, same
// letter case, "_tr" appended). One translation per original.
const stem = n => String(n || '').replace(/\.pdf$/i, '');
export const isTranslationName = n => /_tr\.pdf$/i.test(String(n || '')) && /_tr$/.test(stem(n));
// The original is identified by the map's filename or by the name of the PDF the user associated.
// Returns null when no original, or more than one, has exactly that name.
export function translationTarget(fileName, documents, bindings = {}) {
  if (!isTranslationName(fileName)) return null;
  const base = stem(fileName).slice(0, -3);
  const hits = documents.filter(d => stem(d.filename) === base || stem(bindings[d.id]?.name) === base);
  return hits.length === 1 ? hits[0] : null;
}

export async function bindPdf(file, document) {
  checkFileSize(file, 'PDF');
  return bindPdfBytes(await file.arrayBuffer(), file.name, document);
}
