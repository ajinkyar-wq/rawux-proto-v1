import { useSyncExternalStore } from "react";

// Prototype feature flags. Toggled in Settings → Advanced, remembered in this
// browser (localStorage). Everything is OFF by default.

export type FlagId = "browsePanels";

export const FLAGS: { id: FlagId; label: string; description: string }[] = [
  {
    id: "browsePanels",
    label: "Browse panels for AI Profiles & Presets",
    description:
      "Clicking the underlined AI Profile / Preset / Retouch Preset value opens a browse panel beside the side panel. Off: clicking it does nothing.",
  },
];

const STORAGE_KEY = "editor.flags.v1";
const listeners = new Set<() => void>();

function read(): Partial<Record<FlagId, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

let state = read();

export function setFlag(id: FlagId, on: boolean) {
  state = { ...state, [id]: on };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useFlag(id: FlagId): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state[id] ?? false,
    () => false,
  );
}
