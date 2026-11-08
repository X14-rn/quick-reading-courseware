import { ancestorsOf } from './tree';

// Everything a learner can see or wrote on a node is searchable.
export function searchText(node, notes = []) {
  return [node.title, node.objective,
    ...(node.key_points || []).map(k => k.text),
    ...(node.supplements || []).map(s => s.text),
    ...notes.map(n => n.text)].join('\n').toLowerCase();
}

// Matches in map order (top to bottom), so next/previous walks the tree visually.
export function findMatches(tree, query, notesByNode = {}) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return tree.order.filter(n => searchText(n, notesByNode[n.id]).includes(q)).map(n => n.id);
}

export function stepMatch(index, count, delta) {
  if (!count) return -1;
  if (index < 0) return delta > 0 ? 0 : count - 1;
  return (index + delta + count) % count;
}

// Collapsed groups that hide matches get a badge with the hidden count.
export function hiddenMatchCounts(tree, matches, collapsed) {
  const counts = new Map();
  for (const id of matches) {
    const ancestors = ancestorsOf(tree, id);
    // The outermost collapsed ancestor is the one visible on screen.
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (collapsed.has(ancestors[i])) { counts.set(ancestors[i], (counts.get(ancestors[i]) || 0) + 1); break; }
    }
  }
  return counts;
}
