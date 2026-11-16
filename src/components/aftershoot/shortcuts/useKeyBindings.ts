import { useCallback, useEffect, useState } from 'react';

// v4: defaults run straight along the keyboard rows.
const STORAGE_KEY = 'editor.keyBindings.v4';

export type KeyBindings = Record<string, string>;

// Straight along the keyboard rows (Q W E R T Y U I O P, then A S D …), in
// slider-panel order. A speed edit key may share a press shortcut's key (tap
// runs the shortcut, hold adjusts the slider).
export const DEFAULT_BINDINGS: KeyBindings = {
  // White Balance
  temperature: 'q',
  tint: 'w',
  // Light
  exposure: 'e',
  contrast: 'r',
  highlights: 't',
  shadows: 'y',
  whites: 'u',
  blacks: 'i',
  // Presence
  texture: 'o',
  clarity: 'p',
  dehaze: 'a',
  vibrance: 's',
  saturation: 'd',
};

function load(): KeyBindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BINDINGS };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as KeyBindings;
  } catch {}
  return { ...DEFAULT_BINDINGS };
}

export function useKeyBindings() {
  const [bindings, setBindings] = useState<KeyBindings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    } catch {}
  }, [bindings]);

  /** Assign `key` to `sliderId`; another slider holding it loses it. */
  const setBinding = useCallback((sliderId: string, key: string | null) => {
    const normalized = key ? key.toLowerCase() : null;
    setBindings((prev) => {
      const next: KeyBindings = {};
      for (const [id, k] of Object.entries(prev)) {
        if (normalized && k.toLowerCase() === normalized) continue;
        if (id === sliderId) continue;
        next[id] = k;
      }
      if (normalized) next[sliderId] = normalized;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setBindings({}), []);
  /** Put back a whole set of keys at once (e.g. Discard Changes). */
  const replaceAll = useCallback((next: KeyBindings) => setBindings({ ...next }), []);
  const resetDefaults = useCallback(() => setBindings({ ...DEFAULT_BINDINGS }), []);

  const lookupSliderForKey = useCallback(
    (key: string): string | null => {
      const k = key.toLowerCase();
      for (const [id, bound] of Object.entries(bindings)) {
        if (bound.toLowerCase() === k) return id;
      }
      return null;
    },
    [bindings],
  );

  return { bindings, setBinding, clearAll, resetDefaults, replaceAll, lookupSliderForKey };
}
