import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { indexTree, ancestorsOf, collapsibleIds, revealNode } from '../src/tree';
import { findMatches, stepMatch, hiddenMatchCounts, searchText } from '../src/search';
import { addNote, updateNote, deleteNote, emptyNotes, parseNotesFile, mergeNotes, countNotes, MAX_NOTE_CHARS } from '../src/notes';
import { snapshotUi, restoreUi } from '../src/session';
import { layout } from '../src/layout';

const demo = JSON.parse(fs.readFileSync('fixtures/demo-laser-optics.json', 'utf8'));
const tree = indexTree(demo.v3.nodes);

describe('tree index', () => {
  it('orders nodes top-to-bottom and finds ancestors', () => {
    expect(tree.order[0].id).toBe('demo');
    expect(tree.order[1].id).toBe('c1');
    expect(ancestorsOf(tree, 'lc')).toEqual(['c3', 'demo']);
  });
  it('collapse-all keeps the chapters visible and reveal opens only the needed ancestors', () => {
    const ids = collapsibleIds(tree, { keepRoot: true });
    expect(ids).toHaveLength(9);
    const collapsed = new Set([...ids, 'demo']);
    const opened = revealNode(tree, collapsed, 'lc');
    expect(opened.has('c3')).toBe(false); expect(opened.has('demo')).toBe(false); expect(opened.has('c4')).toBe(true);
    expect(layout(demo, new Set(ids), tree).nodes).toHaveLength(10);
  });
  it('handles a 20 000-node chain without recursion or quadratic work', () => {
    const chain = Array.from({ length: 20000 }, (_, i) => ({ id: `n${i}`, parent_id: i ? `n${i - 1}` : null, title: 't' }));
    const t0 = Date.now(), t = indexTree(chain);
    expect(collapsibleIds(t)).toHaveLength(19999);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});

describe('search', () => {
  it('matches titles, objectives, key points, supplements and notes, in map order', () => {
    const ids = findMatches(tree, 'Coherence Length');
    expect(ids[0]).toBe('linewidth'); // map order: chapter 2 before chapter 3
    expect(ids).toContain('lc');
    expect(findMatches(tree, 'flash-lamp Nd:YAG')).toEqual(['spec']); // key point only
    expect(findMatches(tree, 'textbook relation')).toEqual([]);
    expect(findMatches(tree, 'my private mnemonic', { kep: [{ text: 'My private mnemonic' }] })).toEqual(['kep']);
    expect(findMatches(tree, '   ')).toEqual([]);
    expect(searchText({ title: 'A', objective: 'B' })).toBe('a\nb');
  });
  it('steps and wraps; collapsed groups count hidden matches at the outermost collapsed ancestor', () => {
    expect(stepMatch(-1, 3, 1)).toBe(0); expect(stepMatch(-1, 3, -1)).toBe(2);
    expect(stepMatch(2, 3, 1)).toBe(0); expect(stepMatch(0, 3, -1)).toBe(2); expect(stepMatch(-1, 0, 1)).toBe(-1);
    const counts = hiddenMatchCounts(tree, ['lc', 'mz', 'kep'], new Set(['c3', 'demo']));
    expect(counts.get('demo')).toBe(3); expect(counts.has('c3')).toBe(false);
  });
});

describe('notes (pure, and import treated as untrusted)', () => {
  const s0 = emptyNotes('p');
  it('adds, edits and deletes with validation', () => {
    const s1 = addNote(s0, 'n1', '  hello  ', '2026-01-01T00:00:00Z', 'a');
    expect(s1.notes.n1).toEqual([{ id: 'a', text: 'hello', created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z' }]);
    expect(() => addNote(s0, 'n1', '   ')).toThrow(/empty/);
    expect(() => addNote(s0, 'n1', 'x'.repeat(MAX_NOTE_CHARS + 1))).toThrow(/limited/);
    const s2 = updateNote(s1, 'n1', 'a', 'bye', '2026-01-02T00:00:00Z');
    expect(s2.notes.n1[0].text).toBe('bye'); expect(s2.notes.n1[0].created).toBe('2026-01-01T00:00:00Z');
    expect(deleteNote(s2, 'n1', 'a').notes).toEqual({});
    expect(countNotes(s2)).toBe(1);
    expect(s0.notes).toEqual({}); // immutable
  });
  it('rejects malformed, foreign-project, prototype-polluting or oversized imports', () => {
    expect(() => parseNotesFile('{', 'p')).toThrow(/valid JSON/);
    expect(() => parseNotesFile('{"schema":"x","notes":{}}', 'p')).toThrow(/qr-notes/);
    expect(() => parseNotesFile('{"schema":"qr-notes/1","project_id":"q","notes":{}}', 'p')).toThrow(/belong to project/);
    expect(() => parseNotesFile('{"schema":"qr-notes/1","project_id":"p","notes":{"__proto__":[]}}', 'p')).toThrow(/invalid entry/);
    expect({}.polluted).toBeUndefined();
    expect(() => parseNotesFile('{"schema":"qr-notes/1","project_id":"p","notes":{"n":[{"id":1,"text":"a"}]}}', 'p')).toThrow(/invalid note/);
    expect(() => parseNotesFile(JSON.stringify({ schema: 'qr-notes/1', project_id: 'p', notes: { n: [{ id: 'a', text: 'x'.repeat(MAX_NOTE_CHARS + 1) }] } }), 'p')).toThrow(/limited/);
    const ok = parseNotesFile(JSON.stringify({ schema: 'qr-notes/1', project_id: 'p', notes: { n: [{ id: 'a', text: 'hi', created: '1', updated: '1', extra: '<script>' }] } }), 'p');
    expect(ok.notes.n[0]).toEqual({ id: 'a', text: 'hi', created: '1', updated: '1' }); // unknown fields dropped
  });
  it('merges by note ID, newest update wins', () => {
    const a = { ...s0, notes: { n: [{ id: 'x', text: 'old', created: '1', updated: '1' }] } };
    const b = { ...s0, notes: { n: [{ id: 'x', text: 'new', created: '1', updated: '2' }, { id: 'y', text: 'other', created: '3', updated: '3' }] } };
    expect(mergeNotes(a, b).notes.n.map(n => n.text)).toEqual(['new', 'other']);
    expect(mergeNotes(b, a).notes.n.map(n => n.text)).toEqual(['new', 'other']);
  });
});

describe('session view state', () => {
  it('restores only IDs that exist in the current map and bounds the query', () => {
    const ui = restoreUi({ selected: 'ghost', collapsed: ['c3', 'ghost', 5], query: 'q'.repeat(1000) }, tree);
    expect(ui.selected).toBeNull(); expect([...ui.collapsed]).toEqual(['c3']); expect(ui.query).toHaveLength(200);
    expect(restoreUi(null, tree)).toEqual({ selected: null, collapsed: new Set(), query: '' });
    expect(snapshotUi({ selected: 'lc', collapsed: new Set(['c1']), query: 'x' })).toEqual({ selected: 'lc', collapsed: ['c1'], query: 'x' });
  });
});

describe('compact layout and keyboard neighbours', () => {
  it('sizes cards to their titles, keeps columns fixed when branches open, and steps spatially', async () => {
    const { layout, neighbour, cardWidth, MIN_W, MAX_W } = await import('../src/layout');
    expect(cardWidth({ title: 'a' }, false)).toBe(MIN_W);
    expect(cardWidth({ title: 'x'.repeat(500) }, true)).toBe(MAX_W);
    const ids = collapsibleIds(tree, { keepRoot: true });
    const closed = layout(demo, new Set(ids), tree), open = layout(demo, new Set(), tree);
    const xs = g => new Map(g.nodes.map(n => [n.data.depth, n.position.x]));
    expect(xs(closed).get(1)).toBe(xs(open).get(1)); // expanding never moves a column
    const g = open;
    expect(neighbour(g, tree, 'c1', 'down')).toBe('c2');
    expect(neighbour(g, tree, 'c2', 'up')).toBe('c1');
    expect(neighbour(g, tree, 'c3', 'left')).toBe('demo');
    expect(tree.byId.get(neighbour(g, tree, 'c3', 'right')).parent_id).toBe('c3');
    expect(neighbour(g, tree, 'demo', 'left')).toBe(null);
    expect(neighbour(closed, tree, 'c3', 'right')).toBe(null); // collapsed: caller expands instead
  });
});

describe('translation pairing', () => {
  it('pairs AA_tr.pdf with AA.pdf by map filename or associated name, case-insensitively', async () => {
    const { translationTarget, isTranslationName } = await import('../src/contract');
    const docs = [{ id: 'a', filename: 'Lecture 2 - Lasers.pdf' }, { id: 'b', filename: 'optics.pdf' }];
    expect(isTranslationName('x_TR.PDF')).toBe(false); // "_tr" exactly
    expect(isTranslationName('x_tr.PDF')).toBe(true);
    expect(isTranslationName('x_tr.pdf.exe')).toBe(false);
    expect(translationTarget('Lecture 2 - Lasers_tr.pdf', docs).id).toBe('a');
    expect(translationTarget('OPTICS_tr.pdf', docs)).toBe(null); // exact name, case included
    expect(translationTarget('optics_tr.pdf', docs).id).toBe('b');
    expect(translationTarget('optics _tr.pdf', docs)).toBe(null);
    expect(translationTarget('renamed_tr.pdf', docs, { b: { name: 'renamed.pdf' } }).id).toBe('b');
    expect(translationTarget('other_tr.pdf', docs)).toBe(null);
    expect(translationTarget('optics.pdf', docs)).toBe(null);
  });
});
