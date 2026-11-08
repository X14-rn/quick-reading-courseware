// One pass over the nodes gives every structural lookup the UI needs,
// so nothing scans the node list repeatedly (no O(n²) loops).
export function indexTree(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const children = new Map(nodes.map(n => [n.id, []]));
  for (const n of nodes) if (n.parent_id !== null) children.get(n.parent_id)?.push(n);
  const root = nodes.find(n => n.parent_id === null) || null;
  // Pre-order (the visual top-to-bottom order of the map), iterative for deep trees.
  const order = [];
  const stack = root ? [root] : [];
  while (stack.length) {
    const n = stack.pop();
    order.push(n);
    const kids = children.get(n.id);
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return { byId, children, root, order };
}

export function ancestorsOf(tree, id) {
  const out = [];
  for (let n = tree.byId.get(tree.byId.get(id)?.parent_id); n; n = tree.byId.get(n.parent_id)) out.push(n.id);
  return out;
}

// Every node that has children. With keepRoot the chapters stay visible.
export function collapsibleIds(tree, { keepRoot = false } = {}) {
  const ids = [];
  for (const [id, kids] of tree.children) if (kids.length && !(keepRoot && id === tree.root?.id)) ids.push(id);
  return ids;
}

// Remove the ancestors of `id` from a collapsed set so the node becomes visible.
export function revealNode(tree, collapsed, id) {
  const ancestors = ancestorsOf(tree, id);
  if (!ancestors.some(a => collapsed.has(a))) return collapsed;
  const next = new Set(collapsed);
  for (const a of ancestors) next.delete(a);
  return next;
}
