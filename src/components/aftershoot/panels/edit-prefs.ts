import { useSyncExternalStore } from "react";

// What the user picked in the grid's Edit Preferences before running AI Edit.
// Kept outside the panel so the post-edit "Editing Complete" summary can show
// it (and the choices survive switching panels).

export type EditPrefs = {
  profile: string;
  colorProfile: string;
  cropping: boolean;
  cropStyle: string;
  cropRatio: string;
  straighten: boolean;
  masking: boolean;
  maskType: string;
};

let prefs: EditPrefs = {
  profile: "My Style 3",
  colorProfile: "Adobe Color",
  cropping: true,
  cropStyle: "General - Loose",
  cropRatio: "2 : 3",
  straighten: true,
  masking: true,
  maskType: "Subject Mask Only",
};
const listeners = new Set<() => void>();

export function setEditPrefs(patch: Partial<EditPrefs>) {
  prefs = { ...prefs, ...patch };
  listeners.forEach((l) => l());
}

export function useEditPrefs(): EditPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => prefs,
    () => prefs,
  );
}
