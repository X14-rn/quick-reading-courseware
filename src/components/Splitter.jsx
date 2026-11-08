import React, { useRef } from 'react';

// Drag handle between two areas. `onDrag(delta)` receives the pointer movement in px along
// the axis since the drag started; keyboard: arrow keys move by 24 px (Shift: 96 px).
// orientation "vertical" = a vertical bar that resizes widths; "horizontal" = resizes heights.
export default function Splitter({ orientation = 'vertical', label, onStart, onDrag, onEnd, value }) {
  const start = useRef(null);
  const axis = orientation === 'vertical' ? 'clientX' : 'clientY';
  return <div role="separator" tabIndex={0} aria-label={label} aria-orientation={orientation} aria-valuenow={value}
    className={`splitter splitter-${orientation}`}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); start.current = e[axis]; onStart?.(); document.body.classList.add('resizing'); }}
    onPointerMove={e => { if (start.current !== null) onDrag(e[axis] - start.current); }}
    onPointerUp={e => { if (start.current === null) return; start.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId); document.body.classList.remove('resizing'); onEnd?.(); }}
    onLostPointerCapture={() => { if (start.current !== null) { start.current = null; document.body.classList.remove('resizing'); onEnd?.(); } }}
    onKeyDown={e => {
      const keys = orientation === 'vertical' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
      const i = keys.indexOf(e.key);
      if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      onStart?.(); onDrag((i ? 1 : -1) * (e.shiftKey ? 96 : 24)); onEnd?.();
    }}/>;
}
