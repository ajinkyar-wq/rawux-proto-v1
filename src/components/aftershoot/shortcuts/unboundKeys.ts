import { useSyncExternalStore } from "react";

// Shortcuts (and speed edit sliders) that lost their key while the user was
// editing in the modal: setting a key elsewhere took it. They're marked with a
// ! on the row and on its section until they get a key again (set, undone or
// reverted). Closing and reopening the modal keeps them.

/** Speed edit sliders share the set with shortcut ids, so they're prefixed. */
export const sliderMark = (sliderId: string) => `slider:${sliderId}`;
export const isSliderMark = (mark: string) => mark.startsWith("slider:");

/** What a reassign banner's button jumps to: the row that just lost its key. */
export type FlashTarget = { sectionId: string; id: string; label: string; slider?: boolean };

let marked = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function markUnbound(ids: string[]) {
  if (!ids.length) return;
  marked = new Set([...marked, ...ids]);
  emit();
}

export function clearUnbound(id: string) {
  if (!marked.has(id)) return;
  marked = new Set([...marked].filter((x) => x !== id));
  emit();
}

export function clearAllUnbound() {
  if (!marked.size) return;
  marked = new Set();
  emit();
}

export function useUnboundKeys() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => marked,
  );
}
