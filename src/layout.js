import { indexTree } from './tree';

// Compact single-line cards: each card is as wide as its own title.
export const H = 40, GAP_X = 70, GAP_Y = 12, ROW = H + GAP_Y;
export const MIN_W = 90, MAX_W = 760;
// Horizontal room the card needs besides the text: padding plus the expand/collapse button.
export const CARD_PAD = 24, TOGGLE_W = 30;

// Fallback text measure for tests and non-browser use (≈ average glyph width at 14 px).
export const approxMeasure = text => text.length * 7.6;

export function cardWidth(node, hasChildren, measure = approxMeasure) {
  const w = Math.ceil(measure(node.title)) + CARD_PAD + (hasChildren ? TOGGLE_W : 0) + 6;
  return Math.max(MIN_W, Math.min(MAX_W, w));
}

// Left-to-right tidy layout of the visible tree. Column x positions come from the widest
// card of each depth over the WHOLE tree, so expanding or collapsing never moves columns.
// Search and selection do not change positions, so they are applied at render time.
export function layout(map, collapsed, tree = indexTree(map.v3.nodes), measure = approxMeasure) {
  if (typeof tree === 'string') tree = indexTree(map.v3.nodes); // legacy (map, collapsed, query) calls
  const { root, children } = tree;
  const widths = new Map(), depthOf = new Map(), colWidth = [];
  // Breadth-first pass over every node (not only visible ones): widths and column widths.
  const queue = root ? [[root, 0]] : [];
  for (let i = 0; i < queue.length; i++) {
    const [n, d] = queue[i];
    const kids = children.get(n.id);
    const w = cardWidth(n, kids.length > 0, measure);
    widths.set(n.id, w); depthOf.set(n.id, d);
    colWidth[d] = Math.max(colWidth[d] || 0, w);
    for (const k of kids) queue.push([k, d + 1]);
  }
  const colX = [0];
  for (let d = 1; d < colWidth.length; d++) colX[d] = colX[d - 1] + colWidth[d - 1] + GAP_X;

  let leaf = 0;
  const nodes = [], edges = [], yPositions = new Map();
  const pending = root ? [{ n: root, depth: 0, done: false }] : [];
  while (pending.length) {
    const { n, depth, done } = pending.pop();
    const visibleChildren = collapsed.has(n.id) ? [] : children.get(n.id);
    if (!done) {
      pending.push({ n, depth, done: true });
      for (let i = visibleChildren.length - 1; i >= 0; i--) pending.push({ n: visibleChildren[i], depth: depth + 1, done: false });
      continue;
    }
    const childYs = visibleChildren.map(c => yPositions.get(c.id));
    const mid = childYs.length / 2;
    const y = childYs.length ? (childYs.length % 2 ? childYs[Math.floor(mid)] : (childYs[mid - 1] + childYs[mid]) / 2) : leaf++ * ROW;
    const w = widths.get(n.id);
    nodes.push({ id: n.id, position: { x: colX[depth], y }, sourcePosition: 'right', targetPosition: 'left',
      width: w, height: H,
      data: { label: n.title, kind: n.kind, importance: n.importance, childCount: children.get(n.id).length, collapsed: collapsed.has(n.id), depth, w },
      style: { width: w, height: H } });
    visibleChildren.forEach(c => edges.push({ id: `${n.id}-${c.id}`, source: n.id, target: c.id, type: 'smoothstep', pathOptions: { borderRadius: 0 } }));
    yPositions.set(n.id, y);
  }
  return { nodes, edges };
}

// Spatial keyboard navigation over the visible layout.
// up/down: nearest card above/below in the same column; left: parent; right: the child
// nearest in height (or null when collapsed/leaf — the caller decides to expand).
export function neighbour(graph, tree, id, dir) {
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const cur = byId.get(id);
  if (!cur) return null;
  if (dir === 'left') return byId.has(tree.byId.get(id)?.parent_id) ? tree.byId.get(id).parent_id : null;
  if (dir === 'right') {
    const kids = (tree.children.get(id) || []).filter(k => byId.has(k.id));
    if (!kids.length) return null;
    let best = kids[0].id, dist = Infinity;
    for (const k of kids) { const d = Math.abs(byId.get(k.id).position.y - cur.position.y); if (d < dist) { dist = d; best = k.id; } }
    return best;
  }
  const sign = dir === 'down' ? 1 : -1;
  let best = null, dist = Infinity;
  for (const n of graph.nodes) {
    if (n.data.depth !== cur.data.depth || n.id === id) continue;
    const d = (n.position.y - cur.position.y) * sign;
    if (d > 0 && d < dist) { dist = d; best = n.id; }
  }
  return best;
}
