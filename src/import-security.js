// Local resource budgets, not semantic limits or limits on mind-map depth.
export const MAX_JSON_BYTES = 25 * 1024 * 1024;
export const MAX_PDF_BYTES = 256 * 1024 * 1024;
export function checkFileSize(file, kind) {
  const max = kind === 'PDF' ? MAX_PDF_BYTES : MAX_JSON_BYTES;
  if (file.size > max) throw new Error(`${kind} exceeds the local import limit of ${max / 1024 / 1024} MiB. No content was imported or truncated.`);
}
export function importBudgetErrors(map) {
  if (!map || typeof map !== 'object') return [];
  const errors = [], stack = [map];
  let values = 0;
  while (stack.length) {
    const value = stack.pop();
    if (++values > 500000) return ['JSON exceeds the local structural resource budget; no content was truncated.'];
    if (value && typeof value === 'object') for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) return [`Unsafe JSON property: ${key}`];
      stack.push(value[key]);
    }
  }
  const docs = Array.isArray(map.documents) ? map.documents : [];
  let totalPages = 0;
  for (const doc of docs) {
    if (!Number.isSafeInteger(doc?.page_count) || doc.page_count < 1) return ['Invalid physical PDF page count'];
    totalPages += doc.page_count;
  }
  if (docs.length > 256 || totalPages > 50000) errors.push('Document/page inventory exceeds the local resource budget; no content was truncated.');
  const count = value => Array.isArray(value) ? value.length : 0;
  const nodes = count(map.v3?.nodes), refs = count(map.v3?.references), elements = count(map.source_coverage_register);
  if (nodes * nodes + refs * (nodes + docs.length) + nodes * refs + elements * nodes > 25000000)
    errors.push('Map exceeds the local validation workload budget; no content was truncated.');
  return errors;
}
export async function disposeBinding(binding) {
  if (!binding) return;
  try { if (binding.loading) await binding.loading.destroy(); else await binding.pdf?.destroy?.(); }
  finally { if (binding.url) URL.revokeObjectURL(binding.url); }
}
