import { useSyncExternalStore } from "react";

// White balance eyedropper. The WB Profile row turns picking on and registers
// what to do with a pick; the loupe canvas shows a crosshair layer over the
// photo while it's on, and a click there calls `pick()`.

type State = { active: boolean };
let state: State = { active: false };
let onPick: (() => void) | null = null;
const listeners = new Set<() => void>();

const set = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

export const wbPicker = {
  start(handler: () => void) {
    onPick = handler;
    set({ active: true });
  },
  stop() {
    onPick = null;
    if (state.active) set({ active: false });
  },
  /** A click on the photo: apply the pick and leave picking mode. */
  pick() {
    onPick?.();
    wbPicker.stop();
  },
};

export function useWbPickerActive(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state.active,
    () => false,
  );
}
