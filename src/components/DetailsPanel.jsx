import React from 'react';
import StudyContent from './StudyContent';

// Top of the side panel: the selected point, its study content and source buttons,
// plus the separate list of unresolved source material.
export default function DetailsPanel({ map, node, sourceGroups, supplements, study, onSource, onSupplement }) {
  return <div className="details">
    <h2>{node?.title || 'Select a knowledge point'}</h2>
    {node && <>
      <p>{node.objective}</p>
      {node.uncertainty && <p className="warning">Uncertainty ({node.uncertainty.category}): {node.uncertainty.affected_content}</p>}
      <StudyContent node={node} {...study}/>
      <h3>Source pages</h3>
      {sourceGroups.length
        ? sourceGroups.map(({ document: d, pages, label }) => <button className="reference" key={d.id} onClick={() => onSource({ document_id: d.id, page: pages[0] })}>
            <b>{d.filename}</b><span>{label}</span></button>)
        : <p>This node has no direct citations. Select a learning point for its sources.</p>}
    </>}
    {supplements.length > 0 && <section>
      <h3>Unresolved source material</h3>
      {supplements.map(e => {
        const d = map.documents.find(x => x.id === e.document_id);
        return <button className="reference" key={e.id} onClick={() => onSupplement(e)}><b>{d.filename} · page {e.page}</b><span>{e.locator} — {e.note}</span></button>;
      })}
    </section>}
  </div>;
}
