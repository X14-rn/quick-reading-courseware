import { useEffect, useState } from 'react';

// A small UI preference remembered in localStorage (falls back to the default).
export function usePersistentChoice(key, allowed, fallback) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return allowed.includes(v) ? v : fallback; } catch { return fallback; }
  });
  useEffect(() => { try { localStorage.setItem(key, value); } catch { /* storage disabled */ } }, [key, value]);
  return [value, setValue];
}

// A remembered number (sizes of resizable panels), clamped to [min, max].
export function usePersistentNumber(key, fallback, min, max) {
  const clamp = v => Math.max(min, Math.min(max, v));
  const [value, setValue] = useState(() => {
    try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && localStorage.getItem(key) !== null ? clamp(v) : fallback; } catch { return fallback; }
  });
  useEffect(() => { try { localStorage.setItem(key, String(value)); } catch { /* storage disabled */ } }, [key, value]);
  return [value, v => setValue(prev => clamp(typeof v === 'function' ? v(prev) : v))];
}
