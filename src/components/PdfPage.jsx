import React, { useEffect, useRef, useState } from 'react';

// Offscreen pages retain a correctly sized placeholder, not a rendered bitmap.
// fitHeight (px): in full screen, limit the page so its whole height fits the window.
export default function PdfPage({ binding, page, filename, fitHeight = 0 }) {
  const container = useRef(null);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(1 / Math.SQRT2);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = container.current;
    // One callback can batch several changes (e.g. during zoom); the last entry is current.
    const observer = new IntersectionObserver(entries => setVisible(entries[entries.length - 1].isIntersecting), {
      root: el.closest('.preview-pages'), rootMargin: '500px 0px'
    });
    const resize = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el); resize.observe(el);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, []);
  useEffect(() => {
    if (!visible || !binding || !width) return;
    let cancelled = false, task;
    const el = container.current;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', `${filename} · Physical PDF page ${page}`);
    setError(''); setReady(false);
    (async () => {
      try {
        const pdfPage = await binding.pdf.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        setRatio(base.width / base.height);
        const scale = Math.min(width * Math.min(window.devicePixelRatio || 1, 2) / base.width,
          Math.sqrt(12000000 / (base.width * base.height)));
        const viewport = pdfPage.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        task = pdfPage.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
        await task.promise;
        if (cancelled) return;
        el.appendChild(canvas); setReady(true);
      } catch (e) {
        if (!cancelled) setError(`Cannot render ${filename}, page ${page}: ${e.message}`);
      }
    })();
    return () => { cancelled = true; task?.cancel(); canvas.remove(); };
  }, [visible, binding, page, width, filename]);
  return <><div ref={container} className="pdf-page" style={{ aspectRatio: ratio, ...(fitHeight ? { maxWidth: Math.round(fitHeight * ratio), marginInline: 'auto' } : null) }} aria-busy={visible && !ready && !error}>
    {(!visible || !ready) && !error && <span className="page-placeholder">{visible ? 'Loading' : 'Scroll to view'} page {page}</span>}
  </div>{error && <p className="error" role="alert">{error}</p>}</>;
}
