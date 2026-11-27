import { useSyncExternalStore } from "react";

// Zoom preferences (PRD: Common Zoom UX). Persisted in the browser so they
// survive reloads. Persist Zoom lives here so a future Preferences screen can
// bind to the same store as the zoom dropdown entry.

export const MAX_ZOOM = 1600;
// Menu presets (Figma zoom menu). Fit and Fill are listed separately.
export const ZOOM_PRESETS = [6, 12, 25, 33, 50, 66, 100, 200, 300, 400, 800, 1600];

// Persist Zoom is set per workspace: on by default while culling (compare the
// same detail across frames), off by default in Edit / Retouch (each image
// opens at Fit).
export type ZoomMode = "cull" | "edit";
type ZoomPrefs = { persistZoomCull: boolean; persistZoomEdit: boolean; educationSeen: boolean };

const KEY = "rawux.zoomPrefs.v2";
const DEFAULTS: ZoomPrefs = { persistZoomCull: true, persistZoomEdit: false, educationSeen: false };

export const persistZoomKey = (mode: ZoomMode) =>
  mode === "cull" ? "persistZoomCull" : "persistZoomEdit";

function load(): ZoomPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    // educationSeen is session-only: a page reload shows the note again.
    return raw ? { ...DEFAULTS, ...JSON.parse(raw), educationSeen: false } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let prefs: ZoomPrefs | null = null;
const listeners = new Set<() => void>();
const read = (): ZoomPrefs => (prefs ??= load());

export function getZoomPrefs(): ZoomPrefs {
  return read();
}

export function setZoomPrefs(patch: Partial<ZoomPrefs>) {
  prefs = { ...read(), ...patch };
  try {
    const { educationSeen: _session, ...persisted } = prefs;
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function useZoomPrefs(): ZoomPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULTS,
  );
}
