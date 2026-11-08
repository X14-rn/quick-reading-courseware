import React, { useEffect, useRef, useState } from 'react';
import Splitter from './Splitter';

// Full-screen study panel. It follows the same pinned / auto-hide setting as the main
// side panel (one shared choice), with the same pin button in its top-right corner:
//  pinned   – docked right of the pages, width dragged at its left edge;
//  autohide – a slim edge tab; hovering or clicking slides the panel over the pages,
//             and it retracts when the pointer leaves (stays open while typing in it).
export default function StudyDock({ mode, onMode, width, onWidth, label, children }) {
  const auto = mode === 'autohide';
  const [open, setOpen] = useState(false), [focusWithin, setFocusWithin] = useState(false);
  const timer = useRef(null), base = useRef(0), dragging = useRef(false);
  useEffect(() => { setOpen(false); setFocusWithin(false); }, [mode]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const schedule = (value, delay) => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(value), delay); };
  const expanded = !auto || open || focusWithin;
  const resize = <Splitter label="Resize study panel" value={Math.round(width)}
    onStart={() => { base.current = width; dragging.current = true; }} onDrag={d => onWidth(base.current - d)}
    onEnd={() => { dragging.current = false; }}/>;
  return <div className={`study-dock ${auto ? 'autohide' : 'pinned'} ${expanded ? 'expanded' : 'collapsed'}`}
    onMouseEnter={() => auto && schedule(true, 120)} onMouseLeave={() => auto && !dragging.current && schedule(false, 450)}
    onFocus={() => auto && setFocusWithin(true)}
    onBlur={e => { if (auto && !e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false); }}>
    {auto && !expanded && <button className="panel-tab" aria-label="Show study panel" aria-expanded="false" onClick={() => setOpen(true)}>
      <span>{label}</span></button>}
    {expanded && <div className="study-float">
      {resize}
      <aside className="study-sidebar" aria-label="Study panel" style={{ width }}>
        <div className="panel-bar"><span className="panel-bar-label">Study panel</span>
          <button className="pin-toggle" aria-pressed={!auto} aria-label={auto ? 'Pin study panel' : 'Auto-hide study panel'}
            title={auto ? 'Pin: dock the panel beside the pages' : 'Auto-hide: let the panel slide away to a thin edge tab'}
            onClick={() => onMode(auto ? 'pinned' : 'autohide')}>{auto ? '📌 Pin' : '⇥ Auto-hide'}</button></div>
        <div className="study-sidebar-body">{children}</div>
      </aside>
    </div>}
  </div>;
}
