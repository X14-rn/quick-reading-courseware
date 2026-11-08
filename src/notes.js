// Personal study notes, keyed by the map's stable node IDs so they survive
// re-importing an updated map of the same project. Pure functions; storage is separate.
export const NOTES_SCHEMA = 'qr-notes/1';
export const MAX_NOTE_CHARS = 5000;

export function emptyNotes(projectId) {
  return { schema: NOTES_SCHEMA, project_id: projectId, notes: {} };
}

const clean = text => {
  const t = String(text ?? '').trim();
  if (!t) throw new Error('A note cannot be empty.');
  if ([...t].length > MAX_NOTE_CHARS) throw new Error(`A note is limited to ${MAX_NOTE_CHARS} characters.`);
  return t;
};

// randomUUID needs a secure context (localhost is); fall back to 128 random bits otherwise.
const newId = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

export function addNote(state, nodeId, text, now = new Date().toISOString(), id = newId()) {
  const note = { id, text: clean(text), created: now, updated: now };
  return { ...state, notes: { ...state.notes, [nodeId]: [...(state.notes[nodeId] || []), note] } };
}

export function updateNote(state, nodeId, noteId, text, now = new Date().toISOString()) {
  const list = state.notes[nodeId] || [];
  if (!list.some(n => n.id === noteId)) return state;
  return { ...state, notes: { ...state.notes, [nodeId]: list.map(n => n.id === noteId ? { ...n, text: clean(text), updated: now } : n) } };
}

export function deleteNote(state, nodeId, noteId) {
  const list = (state.notes[nodeId] || []).filter(n => n.id !== noteId);
  const notes = { ...state.notes };
  if (list.length) notes[nodeId] = list; else delete notes[nodeId];
  return { ...state, notes };
}

export function countNotes(state) {
  return Object.values(state.notes).reduce((s, l) => s + l.length, 0);
}

// Imported files are untrusted: validate shape and limits, keep only plain text.
export function parseNotesFile(text, projectId) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Notes file is not valid JSON.'); }
  if (data?.schema !== NOTES_SCHEMA || typeof data.notes !== 'object' || data.notes === null || Array.isArray(data.notes))
    throw new Error(`Not a ${NOTES_SCHEMA} notes file.`);
  if (data.project_id !== projectId) throw new Error(`These notes belong to project "${data.project_id}", not "${projectId}".`);
  const notes = {};
  for (const [nodeId, list] of Object.entries(data.notes)) {
    if (['__proto__', 'prototype', 'constructor'].includes(nodeId) || !Array.isArray(list)) throw new Error('Notes file has an invalid entry.');
    notes[nodeId] = list.map(n => {
      if (typeof n?.id !== 'string' || typeof n.text !== 'string') throw new Error('Notes file has an invalid note.');
      return { id: n.id, text: clean(n.text), created: String(n.created || ''), updated: String(n.updated || n.created || '') };
    });
  }
  return { schema: NOTES_SCHEMA, project_id: projectId, notes };
}

// Merge by note ID; the more recently updated copy wins.
export function mergeNotes(current, incoming) {
  const notes = { ...current.notes };
  for (const [nodeId, list] of Object.entries(incoming.notes)) {
    const byId = new Map((notes[nodeId] || []).map(n => [n.id, n]));
    for (const n of list) { const old = byId.get(n.id); if (!old || n.updated > old.updated) byId.set(n.id, n); }
    notes[nodeId] = [...byId.values()].sort((a, b) => a.created.localeCompare(b.created));
  }
  return { ...current, notes };
}
