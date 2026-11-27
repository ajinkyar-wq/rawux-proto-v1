import { useSyncExternalStore } from "react";

// Loupe duplicates-strip options (the gear before its first tile). Persisted
// in the browser so they survive reloads.
//   sortByImportance — tiles ordered by rating (the 5★ pick first)
//   cycle            — ↑ / ↓ and , / . wrap around inside the stack
//   colorBorder      — 5px rating-colour frame round the loupe canvas

export type DupStripPrefs = { sortByImportance: boolean; cycle: boolean; colorBorder: boolean };

const KEY = "rawux.dupStripPrefs.v1";
const DEFAULTS: DupStripPrefs = { sortByImportance: false, cycle: true, colorBorder: true };

function load(): DupStripPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let prefs: DupStripPrefs | null = null;
const listeners = new Set<() => void>();
const read = (): DupStripPrefs => (prefs ??= load());

export function setDupStripPrefs(patch: Partial<DupStripPrefs>) {
  prefs = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function useDupStripPrefs(): DupStripPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS,
  );
}
