import { useEffect } from "react";

/**
 * Global app-shortcut registry.
 *
 * Every Lightroom-style shortcut in the app lives here. Components register
 * their shortcuts declaratively with `useShortcuts`, and the single
 * `useKeyDispatcher` consults this registry on every keydown. Nothing else
 * in the app should attach its own plain-key window listeners.
 *
 * Conflict policy with Speed Edit (decided in useKeyDispatcher):
 *   - key bound ONLY as a shortcut      -> fires instantly on keydown
 *   - key bound ONLY for speed edit     -> enters speed edit instantly
 *   - key bound in BOTH                 -> tap = shortcut, hold = speed edit
 */

export interface Combo {
  key: string; // normalized: lowercase char ('r', '1') or e.key for non-printables ('arrowleft', 'f1')
  mod?: boolean; // Cmd on macOS / Ctrl elsewhere
  shift?: boolean;
  alt?: boolean;
}

export interface Shortcut {
  id: string;
  combo: Combo;
  label: string;
  section: string; // 'Edit' | 'View' | 'Mode' | 'Navigation' | 'Tool' | ...
  run: () => void;
}

const registry = new Map<string, Shortcut>();

/**
 * Normalize a KeyboardEvent into a stable key string.
 * Shift+1 produces e.key === '!' — we use e.code for digits so that
 * { key: '1', shift: true } matches what the user actually pressed.
 */
export function normalizeKey(e: KeyboardEvent): string {
  if (e.code && e.code.startsWith("Digit")) return e.code.slice(5); // 'Digit1' -> '1'
  if (e.code && e.code.startsWith("Key")) return e.code.slice(3).toLowerCase(); // layout-stable letters
  return e.key.toLowerCase();
}

function comboId(c: Combo): string {
  return [c.mod ? "mod" : "", c.shift ? "shift" : "", c.alt ? "alt" : "", c.key.toLowerCase()]
    .filter(Boolean)
    .join("+");
}

function comboFromEvent(e: KeyboardEvent): string {
  return comboId({
    key: normalizeKey(e),
    mod: e.metaKey || e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
  });
}

export function registerShortcuts(shortcuts: Shortcut[]): () => void {
  const ids: string[] = [];
  for (const s of shortcuts) {
    const id = comboId(s.combo);
    if (registry.has(id) && registry.get(id)!.id !== s.id) {
      // Surface duplicate registrations during development.
      console.warn(
        `[shortcuts] combo "${id}" re-registered: "${registry.get(id)!.id}" -> "${s.id}"`,
      );
    }
    registry.set(id, s);
    ids.push(id);
  }
  return () => {
    for (const id of ids) registry.delete(id);
  };
}

/** Find the shortcut matching a keyboard event (or null). */
export function matchShortcut(e: KeyboardEvent): Shortcut | null {
  return registry.get(comboFromEvent(e)) ?? null;
}

/**
 * Is a bare (unmodified) key already owned by an app shortcut?
 *
 * App shortcuts (Crop=R, Masking=M, B&W=V, ...) are the PRIMARY, widely-used
 * bindings — they own their keys. Speed-edit is secondary and must never bind
 * a key this returns true for. `useKeyBindings` consults this so a slider can
 * never be assigned a reserved key (one key = one meaning, app shortcut wins).
 */
export function isKeyReservedByShortcut(key: string): boolean {
  return registry.has(comboId({ key: key.toLowerCase() }));
}

/**
 * Human label of the app shortcut that owns a bare key, or null if free.
 * Used by the bindings UI to explain a rejected speed-edit assignment.
 */
export function shortcutLabelForKey(key: string): string | null {
  return registry.get(comboId({ key: key.toLowerCase() }))?.label ?? null;
}

/** The full app shortcut that owns a bare key (id + label + combo), or null. */
export function shortcutForKey(key: string): Shortcut | null {
  return registry.get(comboId({ key: key.toLowerCase() })) ?? null;
}

/** All registered shortcuts — feed this to a help/cheat-sheet panel so it never goes stale. */
export function allShortcuts(): Shortcut[] {
  return [...registry.values()];
}

/**
 * Declaratively register shortcuts for the lifetime of a component.
 * Re-registers when deps change so `run` closures stay fresh.
 */
export function useShortcuts(factory: () => Shortcut[], deps: React.DependencyList) {
  useEffect(() => registerShortcuts(factory()), deps); // eslint-disable-line react-hooks/exhaustive-deps
}
