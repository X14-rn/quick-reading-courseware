import { useCallback, useEffect, useRef, useState } from 'react';
import { bindPdfBytes, bindTranslationBytes, isTranslationName, sha256Hex, translationTarget, validateMap } from '../contract';
import { checkFileSize, disposeBinding } from '../import-security';
import { isQuotaError, storage } from '../storage';

// Owns the imported map, the bound PDFs and their browser-local persistence.
// On start it restores the last session; PDFs are re-verified by hash and page count.
export function useMapSession() {
  const [map, setMap] = useState(null);
  const [bindings, setBindings] = useState({});
  // Optional translations ("AA_tr.pdf" for "AA.pdf"), by document id.
  const [translations, setTranslations] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [restoring, setRestoring] = useState(true);
  const [restoredUi, setRestoredUi] = useState(null);
  const busy = useRef(false), live = useRef(bindings), liveTr = useRef(translations), uiTimer = useRef(null);
  // The newest map, updated synchronously on import so a PDF import that follows
  // immediately (before React re-renders) never sees a stale or missing map.
  const current = useRef(null);
  live.current = bindings; liveTr.current = translations;
  const disposeAll = all => Object.values(all).forEach(b => disposeBinding(b).catch(() => {}));
  useEffect(() => () => { disposeAll(live.current); disposeAll(liveTr.current); }, []);

  // Bind every document of `data` whose exact bytes are already stored locally.
  const bindStored = useCallback(async data => {
    const next = {}, tr = {}, failed = [];
    for (const doc of data.documents) {
      try {
        const rec = await storage.get('pdfs', doc.pdf_sha256);
        if (rec?.bytes) next[doc.id] = await bindPdfBytes(rec.bytes, rec.name || doc.filename, doc);
      } catch (e) { failed.push(e.message); }
      try {
        const rec = await storage.get('pdfs', `tr:${doc.pdf_sha256}`);
        if (rec?.bytes) tr[doc.id] = await bindTranslationBytes(rec.bytes, rec.name, doc);
      } catch (e) { failed.push(e.message); }
    }
    return { next, tr, failed };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await storage.get('session', 'map');
        if (!saved) return;
        const problems = validateMap(saved);
        if (problems.length) { setNotice(`The saved session could not be restored: ${problems[0]}`); return; }
        const { next, tr, failed } = await bindStored(saved);
        if (cancelled) { disposeAll(next); disposeAll(tr); return; }
        current.current = saved; setMap(saved); setBindings(next); setTranslations(tr);
        setRestoredUi({ ui: await storage.get('session', 'ui').catch(() => null), at: Date.now() });
        setNotice(`Restored your last session: ${saved.project.title} · ${Object.keys(next).length}/${saved.documents.length} PDFs.`);
        if (failed.length) setError(`Some saved PDFs could not be reopened:\n${failed.join('\n')}`);
      } catch (e) {
        if (!cancelled) setNotice(`Session saving is unavailable in this browser (${e.message}). The viewer still works without it.`);
      } finally { if (!cancelled) setRestoring(false); }
    })();
    return () => { cancelled = true; };
  }, [bindStored]);

  const mapToken = useRef(0);
  // Persist a newly imported map in the background so PDF association is never blocked.
  const persistMap = useCallback(async (data, token) => {
    let message = '';
    try {
      // The view state is rewritten by the app for the new map (and sanitized on restore),
      // so it is not deleted here: a late delete could erase a selection made meanwhile.
      await storage.put('session', 'map', data);
      const keep = new Set(data.documents.flatMap(d => [d.pdf_sha256, `tr:${d.pdf_sha256}`]));
      for (const key of await storage.keys('pdfs')) if (!keep.has(key)) await storage.delete('pdfs', key);
      // Re-importing an updated map of the same course re-attaches its stored PDFs.
      const { next, tr } = await bindStored(data);
      if (token !== mapToken.current) { disposeAll(next); disposeAll(tr); return; }
      const mergedTr = { ...liveTr.current };
      for (const [id, b] of Object.entries(tr)) { if (mergedTr[id]) disposeBinding(b).catch(() => {}); else mergedTr[id] = b; }
      liveTr.current = mergedTr; setTranslations(mergedTr);
      const merged = { ...live.current };
      let added = 0;
      for (const [id, b] of Object.entries(next)) { if (merged[id]) disposeBinding(b).catch(() => {}); else { merged[id] = b; added++; } }
      if (added) { setBindings(merged); message = `Re-attached ${added} saved PDF(s).`; }
    } catch (e) { message = `This map will not be restored next time: ${isQuotaError(e) ? 'browser storage is full' : e.message}.`; }
    if (message && token === mapToken.current) setNotice(message);
  }, [bindStored]);

  const importMap = useCallback(async file => {
    if (!file) return;
    if (busy.current) { setError('Another import is in progress. Wait for it to finish, then select the file again.'); return; }
    busy.current = true;
    try {
      checkFileSize(file, 'JSON');
      const data = JSON.parse(await file.text());
      const problems = validateMap(data);
      if (problems.length) throw new Error(problems.slice(0, 12).join('\n'));
      disposeAll(live.current); disposeAll(liveTr.current);
      live.current = {}; liveTr.current = {}; current.current = data;
      setMap(data); setBindings({}); setTranslations({}); setError(''); setNotice(''); setRestoredUi(null);
      persistMap(data, ++mapToken.current);
    } catch (e) { setError(`Map import failed: ${e.message}`); }
    finally { busy.current = false; }
  }, [persistMap]);

  const importPdfs = useCallback(async files => {
    const map = current.current;
    if (!files.length) return;
    if (!map) { setError('Import a map JSON first, then associate its PDFs.'); return; }
    if (busy.current) { setError('Another import is in progress. Wait for it to finish, then select the files again.'); return; }
    busy.current = true;
    const next = { ...live.current }, nextTr = { ...liveTr.current }, failures = [], unsaved = [];
    const originals = files.filter(f => !isTranslationName(f.name)), trFiles = files.filter(f => isTranslationName(f.name));
    for (const file of originals) {
      try {
        checkFileSize(file, 'PDF');
        const bytes = await file.arrayBuffer();
        const hash = await sha256Hex(bytes);
        const doc = map.documents.find(d => d.pdf_sha256 === hash);
        if (!doc) throw new Error(`${file.name}: no matching document ID/hash in map`);
        const binding = await bindPdfBytes(bytes, file.name, doc, hash);
        if (next[doc.id]) disposeBinding(next[doc.id]).catch(() => {});
        next[doc.id] = binding;
        try { await storage.put('pdfs', hash, { name: file.name, bytes }); }
        catch (e) { unsaved.push(isQuotaError(e) ? `${file.name} (browser storage full)` : file.name); }
      } catch (e) { failures.push(e.message); }
    }
    // Translations after originals, so "AA_tr.pdf" also matches a just-associated "AA.pdf".
    const claimed = new Map();
    for (const file of trFiles) {
      try {
        checkFileSize(file, 'PDF');
        const doc = translationTarget(file.name, map.documents, next);
        if (!doc) throw new Error(`${file.name}: no source PDF named exactly ${file.name.replace(/_tr\.pdf$/i, '.pdf')} in this map (a translation must be the original's file name with "_tr" appended)`);
        if (claimed.has(doc.id)) throw new Error(`${file.name}: ${doc.filename} already has a translation in this selection (${claimed.get(doc.id)}); only one per original`);
        claimed.set(doc.id, file.name);
        const bytes = await file.arrayBuffer();
        const binding = await bindTranslationBytes(bytes, file.name, doc);
        if (nextTr[doc.id]) disposeBinding(nextTr[doc.id]).catch(() => {});
        nextTr[doc.id] = binding;
        try { await storage.put('pdfs', `tr:${doc.pdf_sha256}`, { name: file.name, bytes }); }
        catch (e) { unsaved.push(isQuotaError(e) ? `${file.name} (browser storage full)` : file.name); }
      } catch (e) { failures.push(e.message); }
    }
    live.current = next; liveTr.current = nextTr; setBindings(next); setTranslations(nextTr); setError(failures.join('\n'));
    if (unsaved.length) setNotice(`Not saved for next time: ${unsaved.join(', ')}. Re-associate them after reopening.`);
    busy.current = false;
  }, []);

  // Selection and collapse changes are written at once; search typing is debounced.
  const saveUi = useCallback((ui, { debounce = false } = {}) => {
    clearTimeout(uiTimer.current);
    const write = () => storage.put('session', 'ui', ui).catch(() => {});
    if (debounce) uiTimer.current = setTimeout(write, 400); else write();
  }, []);

  const closeMap = useCallback(async () => {
    clearTimeout(uiTimer.current);
    disposeAll(live.current); disposeAll(liveTr.current);
    mapToken.current++; live.current = {}; liveTr.current = {}; current.current = null;
    setMap(null); setBindings({}); setTranslations({}); setError(''); setRestoredUi(null);
    setNotice('Map closed. Your notes are kept and reappear when you import this course again.');
    await Promise.all([storage.delete('session', 'map'), storage.delete('session', 'ui'), storage.clear('pdfs')]).catch(() => {});
  }, []);

  return { map, bindings, translations, error, setError, notice, setNotice, restoring, restoredUi, importMap, importPdfs, saveUi, closeMap };
}
