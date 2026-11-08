import React, { useEffect, useState } from 'react';

const when = iso => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); };

// Personal notes on one knowledge point: add, edit, delete. Ctrl/⌘+Enter saves.
export default function NotesEditor({ nodeId, notes = [], api }) {
  const [draft, setDraft] = useState(''), [editing, setEditing] = useState(null), [editText, setEditText] = useState('');
  const [confirming, setConfirming] = useState(null), [error, setError] = useState('');
  useEffect(() => { setDraft(''); setEditing(null); setConfirming(null); setError(''); }, [nodeId]);
  const keys = save => e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.stopPropagation(); e.currentTarget.blur(); }
  };
  const add = () => { const err = api.add(nodeId, draft); setError(err); if (!err) setDraft(''); };
  const save = id => { const err = api.update(nodeId, id, editText); setError(err); if (!err) setEditing(null); };
  return <section className="notes" aria-label="My notes">
    <h3>My notes{notes.length > 0 && <span className="count"> ({notes.length})</span>}</h3>
    {notes.length > 0 && <ul>{notes.map(n => <li key={n.id} className="note">
      {editing === n.id
        ? <><textarea aria-label="Edit note" value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={keys(() => save(n.id))} autoFocus rows={3}/>
            <div className="note-actions"><button onClick={() => save(n.id)}>Save</button><button onClick={() => setEditing(null)}>Cancel</button></div></>
        : <><p className="note-text">{n.text}</p>
            <div className="note-actions"><small>{when(n.updated)}</small>
              <button onClick={() => { setEditing(n.id); setEditText(n.text); setConfirming(null); }}>Edit</button>
              {confirming === n.id
                ? <button className="danger" onClick={() => { setError(api.remove(nodeId, n.id)); setConfirming(null); }}>Confirm delete</button>
                : <button onClick={() => setConfirming(n.id)}>Delete</button>}
            </div></>}
    </li>)}</ul>}
    <textarea aria-label="New note" placeholder="Add a note: a definition in your own words, a mnemonic, a question… (Ctrl+Enter to save)"
      value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={keys(add)} rows={2}/>
    <div className="note-actions"><button onClick={add} disabled={!draft.trim()}>Add note</button></div>
    {error && <p className="error inline" role="alert">{error}</p>}
  </section>;
}
