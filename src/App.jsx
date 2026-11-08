import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';
import './style.css';
import { groupSources } from './source-pages';
import { layout, neighbour, H } from './layout';
import { indexTree, collapsibleIds, revealNode } from './tree';
import { findMatches, hiddenMatchCounts, stepMatch } from './search';
import { restoreUi, snapshotUi } from './session';
import { useMapSession } from './hooks/useMapSession';
import { useNotes } from './hooks/useNotes';
import { usePersistentChoice, usePersistentNumber } from './hooks/usePersistentChoice';
import { Header, StatusBar, Footer } from './components/Chrome';
import MapPane from './components/MapPane';
import SidePanel from './components/SidePanel';
import DetailsPanel from './components/DetailsPanel';
import StudyContent from './components/StudyContent';
import SourcePreview from './components/SourcePreview';

const EDITABLE = 'input, textarea, select, [contenteditable="true"], [role="separator"]';
// One canvas measures card titles with the same font as .card-title.
function makeMeasure() {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = '600 14px Inter, "Segoe UI", Arial, sans-serif';
    return text => ctx.measureText(text).width;
  } catch { return undefined; }
}
const nextFrame = fn => { let b; const a = requestAnimationFrame(() => { b = requestAnimationFrame(fn); }); return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); }; };

export default function App() {
  const session = useMapSession();
  const { map, bindings } = session;
  const notes = useNotes(map?.project.id);
  const [panelMode, setPanelMode] = usePersistentChoice('qr-viewer.panel-mode', ['pinned', 'autohide'], 'pinned');
  const [panelWidth, setPanelWidth] = usePersistentNumber('qr-viewer.panel-width', 460, 300, 1600);
  const [panelShare, setPanelShare] = usePersistentNumber('qr-viewer.panel-share', .42, .12, .85);
  const preview = useRef(null), workspace = useRef(null), toggleAnchor = useRef(null);
  const measure = useMemo(makeMeasure, []);
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState(null), [focus, setFocus] = useState(null), [supplement, setSupplement] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set()), [query, setQuery] = useState(''), [matchIndex, setMatchIndex] = useState(-1);
  const [flow, setFlow] = useState(null), [centerOn, setCenterOn] = useState(null), [fitAt, setFitAt] = useState(0);

  const tree = useMemo(() => map ? indexTree(map.v3.nodes) : null, [map]);
  const graph = useMemo(() => map ? layout(map, collapsed, tree, measure) : { nodes: [], edges: [] }, [map, collapsed, tree, measure]);
  const leafCount = useMemo(() => map ? map.v3.nodes.filter(n => n.kind === 'learning_point').length : 0, [map]);

  // A new map starts clean; a restored session then re-applies its saved view.
  useEffect(() => { setSelected(null); setFocus(null); setSupplement(null); setCollapsed(new Set()); setQuery(''); }, [map]);
  useEffect(() => {
    if (!session.restoredUi || !tree) return;
    const ui = restoreUi(session.restoredUi.ui, tree);
    setSelected(ui.selected); setCollapsed(ui.collapsed); setQuery(ui.query);
  }, [session.restoredUi, tree]);
  const { saveUi } = session;
  const lastSaved = React.useRef(null);
  useEffect(() => {
    if (!map) return;
    const onlyQuery = lastSaved.current && lastSaved.current.selected === selected && lastSaved.current.collapsed === collapsed;
    lastSaved.current = { selected, collapsed };
    saveUi(snapshotUi({ selected, collapsed, query }), { debounce: onlyQuery });
  }, [map, selected, collapsed, query, saveUi]);

  // Fit a new map only. Changing the panel (pin/auto-hide/resize) keeps the map where it is.
  useEffect(() => flow ? nextFrame(() => flow.fitView({ padding: .2, duration: 200 })) : undefined, [map, flow]);
  // Expanding or collapsing a branch keeps that card at the same place on screen.
  useLayoutEffect(() => {
    const a = toggleAnchor.current;
    toggleAnchor.current = null;
    if (!a || !flow) return;
    const n = graph.nodes.find(x => x.id === a.id);
    if (!n) return;
    const dx = n.position.x - a.x, dy = n.position.y - a.y;
    if (!dx && !dy) return;
    const v = flow.getViewport();
    flow.setViewport({ x: v.x - dx * v.zoom, y: v.y - dy * v.zoom, zoom: v.zoom });
  }, [graph, flow]);
  useEffect(() => { if (fitAt && flow) return nextFrame(() => { flow.fitView({ padding: .2, duration: 250 }); setFitAt(0); }); }, [fitAt, graph, flow]);
  useEffect(() => {
    if (!centerOn || !flow) return;
    const n = graph.nodes.find(x => x.id === (centerOn.id || centerOn));
    if (!n) return;
    const { id, keepZoom } = typeof centerOn === 'string' ? { id: centerOn } : centerOn;
    return nextFrame(() => {
      setCenterOn(null);
      const v = flow.getViewport(), box = workspace.current?.querySelector('.map-canvas')?.getBoundingClientRect();
      const w = n.data.w;
      if (keepZoom && box) {
        // Keyboard moves: pan only when the card is (partly) off screen.
        const left = n.position.x * v.zoom + v.x, top = n.position.y * v.zoom + v.y, m = 24;
        if (left >= m && top >= m && left + w * v.zoom <= box.width - m && top + H * v.zoom <= box.height - m) return;
        flow.setCenter(n.position.x + w / 2, n.position.y + H / 2, { zoom: v.zoom, duration: 200 });
      } else flow.setCenter(n.position.x + w / 2, n.position.y + H / 2, { zoom: Math.max(flow.getZoom(), .8), duration: 300 });
    });
  }, [centerOn, graph, flow]);

  const matches = useMemo(() => tree ? findMatches(tree, query, notes.notesByNode) : [], [tree, query, notes.notesByNode]);
  useEffect(() => setMatchIndex(-1), [query]);
  const select = useCallback(id => { setSelected(id); setFocus(null); setSupplement(null); }, []);
  const search = useMemo(() => ({
    query, setQuery, matches, matchSet: new Set(matches), index: matchIndex, currentId: matches[matchIndex] ?? null,
    hidden: tree ? hiddenMatchCounts(tree, matches, collapsed) : new Map(),
    step: delta => {
      const i = stepMatch(matchIndex, matches.length, delta);
      if (i < 0) return;
      const id = matches[i];
      setMatchIndex(i); setCollapsed(c => revealNode(tree, c, id)); select(id); setCenterOn(id);
    }
  }), [query, matches, matchIndex, tree, collapsed, select]);

  const toggle = useCallback(id => {
    const n = graph.nodes.find(x => x.id === id);
    if (n) toggleAnchor.current = { id, x: n.position.x, y: n.position.y };
    setCollapsed(prev => { const c = new Set(prev); c.has(id) ? c.delete(id) : c.add(id); return c; });
  }, [graph]);
  const fit = useCallback(() => flow?.fitView({ padding: .2, duration: 200 }), [flow]);

  // Map keyboard: arrows move the selection, Enter expands/collapses, F opens the full-screen
  // reader, +/− zoom, Ctrl+Enter fits. Inactive while typing or reading in full screen.
  const keyState = useRef({});
  keyState.current = { tree, graph, selected, collapsed, flow, fullscreen, toggle, select, fit };
  useEffect(() => {
    const onKey = e => {
      const k = keyState.current;
      if (!k.tree || k.fullscreen || e.altKey || e.metaKey || e.defaultPrevented) return;
      if (e.target.closest?.(EDITABLE)) return;
      const arrows = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      if (arrows[e.key] && !e.ctrlKey) {
        e.preventDefault();
        const cur = k.selected && k.graph.nodes.some(n => n.id === k.selected) ? k.selected : null;
        if (!cur) { const id = k.tree.root?.id; if (id) { k.select(id); setCenterOn({ id, keepZoom: true }); } return; }
        const dir = arrows[e.key];
        const kids = k.tree.children.get(cur) || [];
        if (dir === 'right' && kids.length && k.collapsed.has(cur)) { k.toggle(cur); return; }
        const next = neighbour(k.graph, k.tree, cur, dir);
        if (next) { k.select(next); setCenterOn({ id: next, keepZoom: true }); }
        return;
      }
      if (e.key === 'Enter') {
        if (e.ctrlKey) { e.preventDefault(); k.fit(); return; }
        if (e.target.closest?.('button, a, summary')) return; // let focused controls work
        if (k.selected && (k.tree.children.get(k.selected) || []).length) { e.preventDefault(); k.toggle(k.selected); }
        return;
      }
      if (e.ctrlKey) return; // leave browser shortcuts alone
      if (e.key === '+' || e.key === '=') { e.preventDefault(); k.flow?.zoomIn({ duration: 150 }); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); k.flow?.zoomOut({ duration: 150 }); }
      else if ((e.key === 'f' || e.key === 'F') && k.selected) { e.preventDefault(); preview.current?.enterFullscreen(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const expandAll = () => { setCollapsed(new Set()); setFitAt(Date.now()); };
  const collapseAll = () => { setCollapsed(new Set(collapsibleIds(tree, { keepRoot: true }))); setFitAt(Date.now()); };

  const selectedNode = selected ? tree?.byId.get(selected) : null;
  const elementIndex = useMemo(() => new Map((map?.source_coverage_register || []).map(e => [e.id, e])), [map]);
  const nodeIssues = useMemo(() => map && selected ? map.validation.issues.filter(i => i.node_id === selected) : [], [map, selected]);
  const sourceGroups = useMemo(() => map ? groupSources(map.documents, map.v3.references.filter(r => r.node_id === selected)) : [], [map, selected]);
  const previewGroups = useMemo(() => supplement ? groupSources(map.documents, [supplement]) : sourceGroups, [map, supplement, sourceGroups]);
  const unresolved = useMemo(() => map?.source_coverage_register.filter(e => e.status === 'unresolved') || [], [map]);
  const noteCounts = useMemo(() => Object.fromEntries(Object.entries(notes.notesByNode).map(([k, v]) => [k, v.length])), [notes.notesByNode]);
  const jump = useCallback(target => { setSupplement(null); setFocus({ ...target, at: Date.now() }); }, []);
  const study = { issues: nodeIssues, elements: elementIndex, onJump: jump, notes: notes.notesByNode[selected] || [], notesApi: notes.ready ? notes : null };

  return <div className="app">
    <Header map={map} onImportMap={session.importMap} onImportPdfs={session.importPdfs} onCloseMap={session.closeMap}/>
    {session.error && <div className="error" role="alert">{session.error}</div>}
    {notes.error && <div className="error" role="alert">{notes.error}</div>}
    {session.notice && <div className="notice" role="status">{session.notice}<button aria-label="Dismiss message" onClick={() => session.setNotice('')}>×</button></div>}
    {!map ? <main className="welcome">{session.restoring
      ? <><h2>Opening your last session…</h2><p>Checking the saved map and PDFs.</p></>
      : <><h2>Open a courseware map</h2><p>Import a validated V3 JSON file, then choose its original PDFs. Files stay in this browser: the map, PDFs and your notes are saved locally so the session reopens next time.</p></>}</main> : <>
      <StatusBar map={map} bindings={bindings} translations={session.translations} leafCount={leafCount} notes={notes} onImportNotes={async f => { const msg = await notes.importNotes(f); if (msg) session.setNotice(msg); }}/>
      <div ref={workspace} className={`workspace panel-${panelMode}`} style={{ '--panel-w': `${panelWidth}px` }}>
        <MapPane graph={graph} selected={selected} search={search} noteCounts={noteCounts} onInit={setFlow} onFit={fit}
          onSelect={select} onToggle={toggle} onExpandAll={expandAll} onCollapseAll={collapseAll}/>
        <SidePanel mode={panelMode} onMode={setPanelMode} holdOpen={fullscreen} label={selectedNode?.title || 'Sources & notes'}
          width={panelWidth} onWidth={w => setPanelWidth(Math.min(w, (workspace.current?.clientWidth || 1600) - 260))}
          share={panelShare} onShare={setPanelShare}
          top={<DetailsPanel map={map} node={selectedNode} sourceGroups={sourceGroups} supplements={unresolved} study={study}
            onSource={target => { setSupplement(null); setFocus(target); }} onSupplement={e => { setSupplement(e); setFocus({ document_id: e.document_id, page: e.page }); }}/>}
          bottom={<SourcePreview ref={preview} title={selectedNode?.title} description={selectedNode?.objective} groups={previewGroups} bindings={bindings} translations={session.translations}
            focus={focus} supplement={supplement} onReturn={() => { setSupplement(null); setFocus(null); }}
            sidebar={selectedNode ? <StudyContent node={selectedNode} {...study}/> : null} onFullscreenChange={setFullscreen} panelMode={panelMode} onPanelMode={setPanelMode}/>}/>
      </div>
      <Footer map={map}/>
    </>}
  </div>;
}
