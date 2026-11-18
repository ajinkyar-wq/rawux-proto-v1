import { useEffect, useState } from "react";

/**
 * Three shortcut UX prototypes, chosen on the entry screen. In all three an
 * EDITABLE shortcut never shares a key with a Speed Edit slider (taking its key
 * reassigns it); only a FIXED shortcut's key can be shared. The modes differ in
 * how a shared key reaches each action:
 *
 *  'hold'        (Delayed Hold) — tap = shortcut; hold ~300 ms = slider.
 *  'speedToggle' (Double-Press) — single press = slider, double press = shortcut.
 *  'modifier'    (Hold Modifier) — bare key = slider, modifier + key = shortcut.
 */
export type ShortcutMode = "hold" | "speedToggle" | "modifier";

const STORAGE_KEY = "editor.shortcutMode.v1";

export function readShortcutMode(): ShortcutMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "hold" || raw === "speedToggle" || raw === "modifier") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Mode 3 ('modifier'): speed-edit keys are always on (no toggle) and overlaps
 * ARE allowed. For a key shared by a slider AND a shortcut, the bare key
 * speed-edits and MODIFIER+key runs the shortcut. The modifier is chosen by
 * the user at the top of Speed Edit Keys.
 */
export type ShortcutModifier = "alt" | "ctrl" | "shift" | "meta";

const MODIFIER_KEY = "editor.shortcutModifier.v1";

export const MODIFIER_LABELS: Record<ShortcutModifier, string> = {
  alt: "Alt / Option",
  ctrl: "Ctrl",
  shift: "Shift",
  meta: "⌘ / Win",
};

export function readShortcutModifier(): ShortcutModifier {
  try {
    const raw = localStorage.getItem(MODIFIER_KEY);
    if (raw === "alt" || raw === "ctrl" || raw === "shift" || raw === "meta") return raw;
  } catch {
    /* ignore */
  }
  return "alt";
}

export function writeShortcutModifier(m: ShortcutModifier) {
  try {
    localStorage.setItem(MODIFIER_KEY, m);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("shortcutModifierChanged", { detail: m }));
}

/** True if the event carries the chosen modifier (and not typing). */
export function eventHasModifier(e: KeyboardEvent, m: ShortcutModifier): boolean {
  switch (m) {
    case "alt":
      return e.altKey;
    case "ctrl":
      return e.ctrlKey;
    case "shift":
      return e.shiftKey;
    case "meta":
      return e.metaKey;
  }
}

/** Reactive accessor for the chosen modifier. */
export function useShortcutModifier(): ShortcutModifier {
  const [m, setM] = useState<ShortcutModifier>(readShortcutModifier);
  useEffect(() => {
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail as ShortcutModifier | undefined;
      if (d) setM(d);
    };
    window.addEventListener("shortcutModifierChanged", onChange);
    return () => window.removeEventListener("shortcutModifierChanged", onChange);
  }, []);
  return m;
}

export function writeShortcutMode(mode: ShortcutMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** Reactive accessor for the chosen mode (null until the user picks one). */
export function useShortcutMode(): ShortcutMode | null {
  const [mode, setMode] = useState<ShortcutMode | null>(readShortcutMode);
  useEffect(() => {
    const onStorage = () => setMode(readShortcutMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return mode;
}
