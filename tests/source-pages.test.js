import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { formatPages, groupSources } from '../src/source-pages';
import { validateMap } from '../src/contract';

describe('source page summaries', () => {
  it('shows a single physical page', () => expect(formatPages([8])).toBe('page 8'));
  it('combines continuous pages without dropping their individual references', () => expect(formatPages([8, 9, 10, 11])).toBe('pages 8-11'));
  it('sorts and deduplicates scattered pages without filling gaps', () => expect(formatPages([17, 8, 15, 12, 16, 8])).toBe('pages 8, 12, 15-17'));
  it('keeps different documents separate and follows document order', () => {
    const docs = [{ id: 'a', filename: 'a.pdf' }, { id: 'b', filename: 'b.pdf' }];
    expect(groupSources(docs, [{ document_id: 'b', page: 8 }, { document_id: 'a', page: 12 }, { document_id: 'a', page: 8 }, { document_id: 'a', page: 8 }])).toEqual([
      { document: docs[0], pages: [8, 12], label: 'pages 8, 12' },
      { document: docs[1], pages: [8], label: 'page 8' }
    ]);
  });
  it('does not give a grouping node sources from unrelated learning points', () => expect(groupSources([{ id: 'a' }], [])).toEqual([]));
  it('accepts the explicitly synthetic range navigation fixture', () => {
    const fixture = JSON.parse(fs.readFileSync('fixtures/synthetic-page-ranges.json', 'utf8'));
    expect(validateMap(fixture)).toEqual([]);
    const groups = groupSources(fixture.documents, fixture.v3.references.filter(r => r.node_id === 'R2'));
    expect(groups.map(g => g.pages)).toEqual([[8, 12, 15, 16, 17], [1]]);
  });
});
