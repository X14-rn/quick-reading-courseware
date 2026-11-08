import React, { useEffect, useRef, useState } from 'react';
import Splitter from './Splitter';

// Right panel with two modes:
//  pinned   – docked beside the map (map shrinks to make room);
//  autohide – a slim edge tab stays visible; hovering or clicking it slides the
//             panel over the map, and it retracts when the pointer leaves.
// It never opens just because a map node was selected (study the map undisturbed),
// and stays open while you type in it or read in full screen.
// Its width (left edge) and the split between the details and the source preview
// can be dragged; both are remembered by the caller.
export default function SidePanel({ mode, onMode, label, holdOpen, width, onWidth, share, onShare, top, bottom }) {
  const auto = mode === 'autohide';
  const [open, setOpen] = useState(false), [focusWithin, setFocusWithin] = useState(false);
  const timer = useRef(null), body = useRef(null), base = useRef(0), dragging = useRef(false);
  useEffect(() => { setOpen(false); }, [mode]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const schedule = (value, delay) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(value), delay); };
  const expanded = !auto || open || focusWithin || holdOpen;
  const pin = <button className="pin-toggle" aria-controls="source-panel" aria-pressed={!auto}
    aria-label={auto ? 'Pin panel' : 'Auto-hide panel'}
    title={auto ? 'Pin: dock the panel beside the map' : 'Auto-hide: let the panel slide away to a thin edge tab'}
    onClick={() => onMode(auto ? 'pinned' : 'autohide')}>{auto ? '📌 Pin' : '⇥ Auto-hide'}</button>;
  return <aside id="source-panel" className={`side-panel ${auto ? 'autohide' : 'pinned'} ${expanded ? 'expanded' : 'collapsed'}`}
    onMouseEnter={() => auto && schedule(true, 120)} onMouseLeave={() => auto && !dragging.current && schedule(false, 450)}
    onFocus={() => auto && setFocusWithin(true)}
    onBlur={e => { if (auto && !e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false); }}
    onKeyDown={e => { if (auto && e.key === 'Escape' && !e.target.closest('textarea, input')) { setFocusWithin(false); setOpen(false); e.currentTarget.blur?.(); } }}>
    {auto && !expanded && <button className="panel-tab" aria-label="Show sources and notes" aria-expanded="false" onClick={() => setOpen(true)}>
      <span>{label}</span></button>}
    {expanded && <Splitter label="Resize side panel" value={Math.round(width)}
      onStart={() => { base.current = width; dragging.current = true; }} onDrag={d => onWidth(base.current - d)}
      onEnd={() => { dragging.current = false; }}/>}
    <div className="panel-body" hidden={!expanded} ref={body}>
      <div className="panel-top" style={{ flex: `0 0 ${share * 100}%` }}>
        <div className="panel-bar"><span className="panel-bar-label">Knowledge point</span>{pin}</div>
        {top}
      </div>
      <Splitter orientation="horizontal" label="Resize details and source preview" value={Math.round(share * 100)}
        onStart={() => { base.current = share; }} onDrag={d => { const h = body.current?.clientHeight || 1; onShare(base.current + d / h); }}/>
      <div className="panel-bottom">{bottom}</div>
    </div>
  </aside>;
}
