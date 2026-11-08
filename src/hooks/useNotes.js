import { useCallback, useEffect, useRef, useState } from 'react';
import { addNote, countNotes, deleteNote, emptyNotes, mergeNotes, NOTES_SCHEMA, parseNotesFile, updateNote } from '../notes';
import { storage } from '../storage';

// Personal notes for the current project, persisted locally after every change.
export function useNotes(projectId) {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const dirty = useRef(false);

  useEffect(() => {
    setState(null); dirty.current = false;
    if (!projectId) return;
    let cancelled = false;
    storage.get('notes', projectId)
      .then(saved => { if (!cancelled) setState(saved?.schema === NOTES_SCHEMA && saved.project_id === projectId ? saved : emptyNotes(projectId)); })
      .catch(e => { if (!cancelled) { setState(emptyNotes(projectId)); setError(`Notes will not be kept after closing: ${e.message}`); } });
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    if (!state || !dirty.current) return;
    storage.put('notes', state.project_id, state).then(() => setError('')).catch(e => setError(`Saving notes failed: ${e.message}`));
  }, [state]);

  // Returns an error message (or '') so editors can show validation inline.
  const change = useCallback(fn => {
    try { dirty.current = true; setState(prev => fn(prev)); return ''; }
    catch (e) { return e.message; }
  }, []);
  const tryChange = useCallback(fn => {
    if (!state) return 'Notes are still loading.';
    try { fn(state); } catch (e) { return e.message; } // validate before queuing the update
    return change(fn);
  }, [state, change]);

  const add = useCallback((nodeId, text) => tryChange(s => addNote(s, nodeId, text)), [tryChange]);
  const update = useCallback((nodeId, noteId, text) => tryChange(s => updateNote(s, nodeId, noteId, text)), [tryChange]);
  const remove = useCallback((nodeId, noteId) => tryChange(s => deleteNote(s, nodeId, noteId)), [tryChange]);

  const exportNotes = useCallback(() => {
    if (!state) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${state.project_id}-notes.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const importNotes = useCallback(async file => {
    if (!file || !state) return '';
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Notes file is larger than 10 MiB.');
      const incoming = parseNotesFile(await file.text(), state.project_id);
      dirty.current = true;
      setState(prev => mergeNotes(prev, incoming));
      return `Imported ${countNotes(incoming)} note(s).`;
    } catch (e) { setError(`Notes import failed: ${e.message}`); return ''; }
  }, [state]);

  return { notesByNode: state?.notes || {}, total: state ? countNotes(state) : 0, ready: !!state, error, add, update, remove, exportNotes, importNotes };
}
