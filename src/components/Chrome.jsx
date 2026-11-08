import React from 'react';

// Header, status bar and footer: import controls, map status, notes backup, validation summary.
export function Header({ map, onImportMap, onImportPdfs, onCloseMap }) {
  return <header>
    <div><h1>Quick Reading of Courseware</h1><small>Local knowledge map · original PDF pages</small></div>
    <div className="imports">
      <label className="button">Import V3 JSON<input type="file" accept=".json,application/json" onChange={e => { onImportMap(e.target.files?.[0]); e.target.value = ''; }}/></label>
      <label className="button secondary" title="Select the course PDFs. Optional translations named like AA_tr.pdf (for AA.pdf) are paired with their originals.">Associate PDFs<input type="file" accept=".pdf,application/pdf" multiple disabled={!map}
        onChange={e => { onImportPdfs([...e.target.files]); e.target.value = ''; }}/></label>
      {map && <button className="button secondary" onClick={onCloseMap} title="Close this map and forget its saved session (notes are kept)">Close map</button>}
    </div>
  </header>;
}

export function StatusBar({ map, bindings, translations = {}, leafCount, notes, onImportNotes }) {
  const missing = map.documents.filter(d => !bindings[d.id]);
  return <div className="status">
    <strong>{map.project.title}</strong><span className={`badge ${map.validation.status}`}>{map.validation.status}</span>
    <span>{map.project.scope.replace('_', ' ')}</span><span>{Object.keys(bindings).length}/{map.documents.length} PDFs bound</span>
    <span>{map.v3.nodes.length} nodes · <b className="leaf-count" title="Smallest knowledge points (learning points) — your review units">{leafCount} learning points</b></span>
    {Object.keys(translations).length > 0 && <span className="translation-count" title={'Translations paired with their originals:\n' + Object.entries(translations).map(([id, t]) => `${t.name} → ${map.documents.find(d => d.id === id)?.filename}`).join('\n')}>{Object.keys(translations).length} translation{Object.keys(translations).length === 1 ? '' : 's'}</span>}
    {missing.length > 0 && <span className="warning">Missing PDFs: {missing.map(d => d.filename).join(', ')}</span>}
    <span className="notes-tools">{notes.total} note{notes.total === 1 ? '' : 's'}
      <button disabled={!notes.total} onClick={notes.exportNotes} title="Download your notes as a JSON backup">Export notes</button>
      <label className="like-button" title="Merge notes from a backup file">Import notes<input type="file" accept="application/json" onChange={e => { onImportNotes(e.target.files?.[0]); e.target.value = ''; }}/></label>
    </span>
  </div>;
}

export function Footer({ map }) {
  const issues = map.validation.issues;
  return <footer>{map.validation.coverage_scope} · {map.validation.counts.registered} source records · {issues.length} issue(s)
    {issues.length > 0 && <details><summary>Validation issues</summary>
      <ul>{issues.map((i, n) => <li key={n}>{i.severity}: {i.code} — {i.description}</li>)}</ul></details>}</footer>;
}
