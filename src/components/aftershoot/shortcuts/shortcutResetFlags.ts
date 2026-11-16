import { useSyncExternalStore } from 'react';
import type { MapKeys } from './shortcutMap';

// After the update migrated the user's keys, the modal marks every shortcut
// that changed, with the key the user had, so they can see what moved:
//  - 'reset'   : too many would change, everything went back to default;
//  - 'changed' : a few keys changed (the update dialog listed them).
// An editable row's mark clears once it gets a key again; dismissing the
// banner clears them all.

export type ChangeFlagKind = 'reset' | 'changed';

interface ChangeFlags {
  active: boolean;
  kind: ChangeFlagKind;
  /** Editable row id, or `fixedFlagKey(label)` for a fixed row -> the old key. */
  previous: MapKeys;
}

/** Fixed rows have no id: they're flagged by label. */
export const fixedFlagKey = (label: string) => `fixed:${label}`;

const EMPTY: ChangeFlags = { active: false, kind: 'changed', previous: {} };
let state: ChangeFlags = EMPTY;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Start (with the user's old keys) or clear (null) the change flags. */
export function setResetFlags(previous: MapKeys | null, kind: ChangeFlagKind = 'reset') {
  state = previous && Object.keys(previous).length ? { active: true, kind, previous: { ...previous } } : EMPTY;
  emit();
}

export function clearResetFlag(id: string) {
  if (!(id in state.previous)) return;
  const { [id]: _cleared, ...rest } = state.previous;
  state = { ...state, previous: rest };
  emit();
}

/** Dismissing the banner clears every mark. */
export function dismissResetBanner() {
  state = EMPTY;
  emit();
}

export function useResetFlags() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
