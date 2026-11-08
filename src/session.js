// Serializable view state, sanitized against the map it is restored into.
export function snapshotUi({ selected, collapsed, query }) {
  return { selected: selected || null, collapsed: [...collapsed], query: query || '' };
}

export function restoreUi(ui, tree) {
  const valid = id => typeof id === 'string' && tree.byId.has(id);
  return {
    selected: valid(ui?.selected) ? ui.selected : null,
    collapsed: new Set(Array.isArray(ui?.collapsed) ? ui.collapsed.filter(valid) : []),
    query: typeof ui?.query === 'string' ? ui.query.slice(0, 200) : ''
  };
}
