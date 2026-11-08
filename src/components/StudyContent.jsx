import React from 'react';
import NotesEditor from './NotesEditor';

const KIND_LABEL = { definition: 'Definition', equation: 'Equation', condition: 'Condition', fact: 'Fact',
  procedure: 'Procedure', comparison: 'Comparison', example: 'Example', caution: 'Caution' };
const IMPORTANCE_LABEL = { core: 'Core', supporting: 'Supporting', context: 'Context' };

// Learner-facing content of a node: importance, key points (each linked to its
// first cited page), labeled supplements, slide-error notices and personal notes.
// Used in the side panel and in the full-screen study sidebar.
export default function StudyContent({ node, issues, elements, onJump, notes, notesApi }) {
  const errata = issues.filter(i => i.category === 'source_erratum');
  const otherIssues = issues.filter(i => i.category !== 'source_erratum');
  const firstPage = ids => {
    const e = ids.map(id => elements.get(id)).find(Boolean);
    return e ? { document_id: e.document_id, page: e.page } : null;
  };
  return <div className="study-content">
    {node.importance && <span className={`importance ${node.importance}`}>{IMPORTANCE_LABEL[node.importance]}</span>}
    {node.key_points?.length > 0 && <section className="key-points" aria-label="Key points">
      <h3>Key points</h3>
      <ul>{node.key_points.map((kp, i) => {
        const target = firstPage(kp.element_ids);
        return <li key={i} className={`kp ${kp.kind}`}>
          <span className="kp-kind">{KIND_LABEL[kp.kind] || kp.kind}</span>
          <span className="kp-text">{kp.text}</span>
          {target && <button className="kp-source" title="Show the source page for this key point" onClick={() => onJump(target)}>p. {target.page}</button>}
        </li>;
      })}</ul>
    </section>}
    {node.supplements?.length > 0 && <section className="supplements" aria-label="Supplementary explanation">
      <h3>Supplement <small>general knowledge, not from the course material</small></h3>
      <ul>{node.supplements.map((s, i) => <li key={i}>{s.text}</li>)}</ul>
    </section>}
    {errata.map((e, i) => <div key={`e${i}`} className="erratum" role="note">
      <b>Possible slide error:</b> {e.description}
      {e.standard_form && <div className="standard-form">Standard form: <span>{e.standard_form}</span></div>}
    </div>)}
    {otherIssues.map((e, i) => <p key={`i${i}`} className={e.severity === 'critical' ? 'issue critical' : 'issue'}>
      {e.severity === 'critical' ? 'Critical: ' : 'Note: '}{e.description}</p>)}
    {notesApi && <NotesEditor nodeId={node.id} notes={notes} api={notesApi}/>}
  </div>;
}
