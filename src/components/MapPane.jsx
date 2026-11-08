import React, { useEffect, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useEdgesState, useNodesState } from '@xyflow/react';

// Single-line card: the title is never wrapped or cut; badges float on the top-right corner.
function NodeCard({ node, data, onToggle }) {
  return <div className="card" title={data.label}>
    <span className="card-title">{data.label}</span>
    {(data.hiddenMatches > 0 || data.noteCount > 0) && <span className="card-badges">
      {data.hiddenMatches > 0 && <span className="badge-match" title={`${data.hiddenMatches} search match(es) inside`}>{data.hiddenMatches}</span>}
      {data.noteCount > 0 && <span className="badge-notes" title={`${data.noteCount} note(s)`}>✎{data.noteCount}</span>}
    </span>}
    {data.childCount > 0 && <button className="card-toggle" aria-label={`${data.collapsed ? 'Expand' : 'Collapse'} ${data.label}`}
      onClick={e => { e.stopPropagation(); onToggle(node.id); }}>{data.collapsed ? '+' : '−'}</button>}
  </div>;
}

export const MAP_KEYS = '↑↓←→ move · Enter expand/collapse · F full screen · +/− zoom · Ctrl+Enter fit';

// Map canvas plus its toolbar: search with match navigation, expand/collapse all, fit.
export default function MapPane({ graph, selected, search, noteCounts, onSelect, onToggle, onExpandAll, onCollapseAll, onInit, onFit }) {
  const decorated = useMemo(() => graph.nodes.map(n => {
    const match = search.matchSet.has(n.id), current = search.currentId === n.id;
    const data = { ...n.data, hiddenMatches: search.hidden.get(n.id) || 0, noteCount: noteCounts[n.id] || 0 };
    return { ...n,
      className: [n.data.kind, n.data.importance && `imp-${n.data.importance}`, match && 'match', current && 'match-current',
        data.hiddenMatches && 'has-hidden-match', selected === n.id && 'selected'].filter(Boolean).join(' '),
      data: { ...data, label: <NodeCard node={n} data={data} onToggle={onToggle}/> } };
  }), [graph, selected, search, noteCounts, onToggle]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  // Re-decorating creates new node objects; keep React Flow's measured size, or nodes
  // whose DOM size did not change are never re-measured and stay hidden.
  useEffect(() => {
    setNodes(prev => {
      const measured = new Map(prev.map(n => [n.id, n.measured]));
      return decorated.map(n => measured.get(n.id) ? { ...n, measured: measured.get(n.id) } : n);
    });
    setEdges(graph.edges);
  }, [decorated, graph.edges, setNodes, setEdges]);
  const count = search.matches.length;
  return <section className="map-pane">
    <div className="toolbar" role="search">
      <input aria-label="Search knowledge points" placeholder="Search titles, key points and notes" value={search.query}
        onChange={e => search.setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search.step(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') { search.setQuery(''); e.currentTarget.blur(); } }}/>
      {search.query.trim() && <output className="match-count" aria-label="Search matches">{count ? `${search.index + 1 > 0 ? search.index + 1 : '–'}/${count}` : 'No matches'}</output>}
      <button aria-label="Previous match" title="Previous match (Shift+Enter)" disabled={!count} onClick={() => search.step(-1)}>↑</button>
      <button aria-label="Next match" title="Next match (Enter)" disabled={!count} onClick={() => search.step(1)}>↓</button>
      <span className="toolbar-sep"/>
      <button onClick={onExpandAll} title="Expand every branch and fit the map">Expand all</button>
      <button onClick={onCollapseAll} title="Collapse every branch to the chapters and fit the map">Collapse all</button>
      <button onClick={onFit} title="Fit the map to the window (Ctrl+Enter)">Fit</button>
      <span className="key-help" tabIndex={0} title={MAP_KEYS} aria-label={`Keyboard shortcuts: ${MAP_KEYS}`}>⌨</span>
    </div>
    <div className="map-canvas">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onInit={onInit}
        onNodeClick={(_, n) => onSelect(n.id)} fitView minZoom={.1} maxZoom={2.5} nodesDraggable={false} nodesFocusable={false}
        edgesFocusable={false} disableKeyboardA11y zoomActivationKeyCode={null}>
        <Background/><Controls position="bottom-left" showInteractive={false}/>
        <MiniMap position="bottom-left" style={{ width: 160, height: 100 }} pannable zoomable/>
      </ReactFlow>
    </div>
  </section>;
}
