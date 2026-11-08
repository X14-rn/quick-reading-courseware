import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import PdfPage from './PdfPage';
import StudyDock from './StudyDock';
import { usePersistentChoice, usePersistentNumber } from '../hooks/usePersistentChoice';

const PAGE_LABEL_H = 28; // per-page heading above each page

// `sidebar` (the selected point's study content) is shown beside the pages in full screen.
// In full screen each page is fitted whole into the window (100 %); with a translation
// ("AA_tr.pdf") and the split mode on, every page is shown as a locked pair: translation | original.
const SourcePreview = forwardRef(function SourcePreview({ title, description, groups, bindings, translations = {}, focus, supplement, onReturn, sidebar, onFullscreenChange, panelMode = 'pinned', onPanelMode }, ref) {
  const panel = useRef(null), scroller = useRef(null), targets = useRef(new Map());
  const zoomRef = useRef(1), zoomAnchor = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(false);
  fullscreenRef.current = fullscreen;
  const [readerMode, setReaderMode] = usePersistentChoice('qr-viewer.reader-mode', ['single', 'split'], 'single');
  const [studyWidth, setStudyWidth] = usePersistentNumber('qr-viewer.study-width', 420, 260, 900);
  const [fitHeight, setFitHeight] = useState(0);
  useEffect(() => { onFullscreenChange?.(fullscreen); }, [fullscreen, onFullscreenChange]);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1), [activeKey, setActiveKey] = useState(null);
  const active = useRef(null), pinnedScroll = useRef(null), pinnedPage = useRef(false), userScroll = useRef(-Infinity);
  const markUserScroll = () => { userScroll.current = performance.now(); };
  const pages = useMemo(() => groups.flatMap(({ document: doc, pages }) => bindings[doc.id]
    ? pages.map(page => ({ key: `${doc.id}/${page}`, filename: doc.filename, page })) : []), [groups, bindings]);
  const activeIndex = Math.max(0, pages.findIndex(p => p.key === activeKey));
  const currentPage = pages[activeIndex];
  const hasTranslation = groups.some(g => translations[g.document.id]);
  const split = fullscreen && readerMode === 'split' && !supplement;
  // Full screen: fit a whole page (label included) into the visible height.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!fullscreen || !el) { setFitHeight(0); return; }
    const measure = () => { const cs = getComputedStyle(el); setFitHeight(Math.max(120, el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - PAGE_LABEL_H)); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, [fullscreen]);
  function changeZoom(next) {
    next = Math.max(.5, Math.min(3, next));
    if (next === zoomRef.current) return;
    const el = scroller.current;
    if (el && !zoomAnchor.current) {
      const viewport = el.getBoundingClientRect();
      const cx = viewport.left + el.clientWidth / 2, cy = viewport.top + el.clientHeight / 2;
      // Preserve the source point at the viewport center, including after panning.
      // Anchor to an individual page: document headings and page gaps do not scale.
      let nearest, distance = Infinity;
      for (const target of targets.current.values()) {
        const page = target.querySelector('.pdf-page');
        if (!page) continue;
        const rect = page.getBoundingClientRect();
        const d = Math.max(rect.top - cy, cy - rect.bottom, 0);
        if (d < distance) { nearest = { page, rect }; distance = d; }
      }
      if (nearest) {
        const { page, rect } = nearest;
        zoomAnchor.current = { page, x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
      }
    }
    zoomRef.current = next; setZoom(next);
  }
  function jumpTo(key) {
    const target = targets.current.get(key), el = scroller.current;
    if (!target || !el) return;
    active.current = key; setActiveKey(key);
    el.scrollTop = target.offsetTop;
    // At the end, the browser may clamp scrollTop. Keep the requested page
    // selected until a different scroll position signals manual scrolling.
    pinnedScroll.current = el.scrollTop; pinnedPage.current = true;
  }
  function flipPage(delta) {
    const index = Math.max(0, pages.findIndex(p => p.key === active.current));
    const next = Math.max(0, Math.min(pages.length - 1, index + delta));
    if (pages[next]) jumpTo(pages[next].key);
  }
  function trackScroll() {
    const el = scroller.current;
    if (!el || pinnedScroll.current === el.scrollTop) return;
    // While a jumped-to page is pinned, scroll changes caused by pages resizing (fit
    // changes, pages finishing loading) are not the reader scrolling: stay on that page.
    if (pinnedScroll.current !== null && pinnedPage.current && performance.now() - userScroll.current > 400) { if (active.current) jumpTo(active.current); return; }
    pinnedScroll.current = null;
    let key = pages[0]?.key;
    for (const page of pages) {
      const target = targets.current.get(page.key);
      if (target && target.offsetTop <= el.scrollTop + 20) key = page.key;
      else break;
    }
    if (key) { active.current = key; setActiveKey(key); }
  }
  useEffect(() => {
    // If the reader was closed (e.g. Esc) while the browser was still entering native
    // full screen, leave native full screen as soon as it arrives instead of getting stuck.
    const change = () => {
      if (!document.fullscreenElement) setFullscreen(false);
      else if (document.fullscreenElement === panel.current && !fullscreenRef.current) document.exitFullscreen().catch(() => {});
    };
    const key = e => { if (e.key === 'Escape' && !e.target.closest?.('input, textarea, select, [contenteditable="true"]')) { setFullscreen(false); if (document.fullscreenElement === panel.current) document.exitFullscreen().catch(() => {}); } };
    document.addEventListener('fullscreenchange', change);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('fullscreenchange', change); document.removeEventListener('keydown', key); };
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const held = new Set();
    let frame = null, lastTime = null;
    const stopScrolling = () => {
      held.clear();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null; lastTime = null;
    };
    const animateScroll = time => {
      const direction = Number(held.has('ArrowDown')) - Number(held.has('ArrowUp'));
      const el = scroller.current;
      markUserScroll();
      if (el && lastTime !== null) el.scrollTop += direction * 600 * Math.min(time - lastTime, 32) / 1000;
      lastTime = time;
      frame = held.size ? requestAnimationFrame(animateScroll) : null;
    };
    const key = e => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.shiftKey && e.key !== '+') || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!held.has(e.key)) {
          held.add(e.key);
          markUserScroll();
          if (scroller.current) scroller.current.scrollTop += e.key === 'ArrowDown' ? 40 : -40;
          if (frame === null) frame = requestAnimationFrame(animateScroll);
        }
        return;
      }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); return; }
      const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (delta) { e.preventDefault(); flipPage(delta); }
      else if (['+', '=', '-', '0'].includes(e.key)) {
        e.preventDefault();
        changeZoom(e.key === '0' ? 1 : zoomRef.current + (e.key === '-' ? -.25 : .25));
      }
    };
    const release = e => {
      held.delete(e.key);
      if (!held.size) stopScrolling();
    };
    const wheel = e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY) changeZoom(zoomRef.current + (e.deltaY < 0 ? .25 : -.25));
    };
    const el = scroller.current;
    document.addEventListener('keydown', key);
    document.addEventListener('keyup', release);
    window.addEventListener('blur', stopScrolling);
    document.addEventListener('visibilitychange', stopScrolling);
    el?.addEventListener('wheel', wheel, { passive: false });
    return () => {
      stopScrolling();
      document.removeEventListener('keydown', key); document.removeEventListener('keyup', release);
      window.removeEventListener('blur', stopScrolling); document.removeEventListener('visibilitychange', stopScrolling);
      el?.removeEventListener('wheel', wheel);
    };
  }, [fullscreen, pages]);
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current, el = scroller.current;
    if (anchor && el && anchor.page.isConnected) {
      const rect = anchor.page.getBoundingClientRect(), viewport = el.getBoundingClientRect();
      el.scrollLeft += rect.left + anchor.x * rect.width - (viewport.left + el.clientWidth / 2);
      el.scrollTop += rect.top + anchor.y * rect.height - (viewport.top + el.clientHeight / 2);
      pinnedScroll.current = el.scrollTop; pinnedPage.current = false; // keep this exact view, not the page top
    }
    zoomAnchor.current = null;
  }, [zoom]);
  // Pages that finish loading change size: keep a jumped-to page in view.
  useEffect(() => {
    const stack = scroller.current?.firstElementChild;
    if (!stack) return;
    const ro = new ResizeObserver(() => { if (pinnedScroll.current !== null && pinnedPage.current && active.current) jumpTo(active.current); });
    ro.observe(stack);
    return () => ro.disconnect();
  }, [fullscreen, split]);
  // Page sizes change when the fit height changes: stay on the same page.
  useLayoutEffect(() => { if (active.current) jumpTo(active.current); }, [fitHeight, split]);
  useLayoutEffect(() => {
    if (active.current) jumpTo(active.current);
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [fullscreen]);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
    active.current = null; setActiveKey(null); pinnedScroll.current = null;
    setError(''); zoomAnchor.current = null; zoomRef.current = 1; setZoom(1);
    if (scroller.current) scroller.current.scrollLeft = 0;
  }, [title, groups]);
  useEffect(() => {
    if (!pages.some(p => p.key === active.current)) {
      active.current = pages[0]?.key || null; setActiveKey(active.current);
    }
  }, [pages]);
  useEffect(() => {
    if (!focus) return;
    jumpTo(`${focus.document_id}/${focus.page}`);
  }, [focus, groups, bindings]);
  async function enterFullscreen() {
    if (fullscreenRef.current || !groups.length) return;
    // Render the reader (and, in auto-hide mode, the panel that holds it) before asking
    // the browser for native full screen, so the request comes from a visible element.
    flushSync(() => { setFullscreen(true); onFullscreenChange?.(true); });
    fullscreenRef.current = true;
    // The viewport overlay is also available where native fullscreen is denied.
    try { await panel.current.requestFullscreen?.(); } catch { /* Keep the viewport overlay. */ }
  }
  async function toggleFullscreen() {
    if (fullscreen) {
      setFullscreen(false);
      if (document.fullscreenElement === panel.current) await document.exitFullscreen().catch(e => setError(e.message));
    } else await enterFullscreen();
  }
  useImperativeHandle(ref, () => ({ enterFullscreen, canOpen: () => groups.length > 0 }));
  const showStudy = fullscreen && !!sidebar && !supplement;
  return <section ref={panel} className={`preview${fullscreen ? ' preview-fullscreen' : ''}${showStudy ? ' with-study' : ''}`} aria-label="Original source preview">
    <div className="preview-heading"><div><h2>{title || 'Original courseware'}</h2>{fullscreen && !supplement && description && <p className="preview-description">{description}</p>}<small>{supplement ? 'Unresolved source material' : 'All cited source pages'} · physical PDF page numbers</small></div>
      <div className="preview-actions">{fullscreen && !supplement && <button aria-pressed={readerMode === 'split'}
        title={hasTranslation ? 'Switch between the original only and translation | original side by side'
          : 'Side-by-side view: associate a translation named like "AA_tr.pdf" for "AA.pdf" (Associate PDFs) to fill the left side'}
        onClick={() => setReaderMode(m => m === 'split' ? 'single' : 'split')}>{readerMode === 'split' ? 'Original only' : 'Translation | Original'}</button>}
      <button disabled={!groups.length} onClick={toggleFullscreen}>{fullscreen ? 'Exit Full Screen' : 'Full Screen'}</button></div></div>
    {fullscreen && <div className="pdf-reading-status" title="Ctrl + wheel or +/−: zoom; 0: fit page; ←/→: previous/next page; hold ↑/↓: continuous scrolling; Esc: exit">
      <output aria-label="Current source page">{currentPage ? `Source ${activeIndex + 1} of ${pages.length} · ${currentPage.filename} · page ${currentPage.page}` : 'Associate PDFs to navigate source pages'}</output>
      <output aria-label="PDF zoom">{Math.round(zoom * 100)}%</output>
    </div>}
    {supplement && <button className="return-sources" onClick={onReturn}>Return to knowledge point sources</button>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="preview-body">
    <div className="preview-pages" ref={scroller} onScroll={trackScroll} onWheel={markUserScroll} onPointerDown={markUserScroll} onTouchStart={markUserScroll}
      onKeyDown={e => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) markUserScroll(); }}>
      <div className="preview-page-stack" style={{ width: `${zoom * 100}%` }}>
      {!groups.length && <p>Select a knowledge point with source references.</p>}
      {groups.map(({ document: doc, pages, label }) => <section className="source-document" key={doc.id} aria-label={doc.filename}>
        <h3>{doc.filename} — {label}</h3>
        {split && bindings[doc.id] && !translations[doc.id] && <p className="pair-missing" title={`To read it side by side, associate "${(bindings[doc.id].name || doc.filename).replace(/\.pdf$/i, '')}_tr.pdf"`}>No translation for this file — original only.</p>}
        {!bindings[doc.id] ? <p className="warning">Missing PDF: {doc.filename}. Associate this PDF to view {label}.</p> : pages.map(page =>
          <article className={`source-page${split && translations[doc.id] ? ' paired' : ''}`} key={page} ref={el => { const key = `${doc.id}/${page}`; if (el) targets.current.set(key, el); else targets.current.delete(key); }} data-document={doc.id} data-page={page}>
            {split && translations[doc.id] ? <>
              <div className="pair-cell translation"><h4>{translations[doc.id].name} · page {page}</h4>
                <PdfPage binding={translations[doc.id]} page={page} filename={translations[doc.id].name} fitHeight={fitHeight * zoom}/></div>
              <div className="pair-cell original"><h4>{doc.filename} · Physical page {page}</h4>
                <PdfPage binding={bindings[doc.id]} page={page} filename={doc.filename} fitHeight={fitHeight * zoom}/></div>
            </> : <><h4>{doc.filename} · Physical page {page}</h4><PdfPage binding={bindings[doc.id]} page={page} filename={doc.filename} fitHeight={fitHeight * zoom}/></>}
          </article>)}
      </section>)}
      </div>
    </div>
    {showStudy && <StudyDock mode={panelMode} onMode={onPanelMode} width={studyWidth} onWidth={setStudyWidth} label={title || 'Study panel'}>{sidebar}</StudyDock>}
    </div>
  </section>;
});
export default SourcePreview;
