import { useSyncExternalStore } from "react";

// Which entry is active in the Masking panel's Masks list. The loupe canvas
// reads it: the brush only paints while the Brush Mask entry is the active one.

export type MaskEntryId = "brush" | "subject" | "background";

let active: MaskEntryId = "brush";
const listeners = new Set<() => void>();

export const maskSelection = {
  set(id: MaskEntryId) {
    if (id === active) return;
    active = id;
    listeners.forEach((l) => l());
  },
};

export function useActiveMask(): MaskEntryId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => active,
    () => "brush" as MaskEntryId,
  );
}
