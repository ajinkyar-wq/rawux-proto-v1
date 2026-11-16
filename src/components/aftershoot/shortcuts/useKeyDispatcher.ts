import { useEffect, useRef } from 'react';
import { matchShortcut, normalizeKey, shortcutForKey } from './shortcutRegistry';
import { eventHasModifier, type ShortcutModifier } from './useShortcutMode';

/**
 * The ONE keyboard router for plain keys. Behaviour depends on the chosen
 * shortcut mode (see useShortcutMode):
 *
 * A key that is only a slider key speed-edits (hold, exit on keyup); a key that
 * is only a shortcut runs it. A key that is BOTH (a slider sharing a FIXED
 * shortcut's key) depends on the mode:
 *
 * DELAYED HOLD (holdForSlider):
 *     tap (released within HOLD_FOR_SLIDER_MS) -> run the shortcut
 *     hold past HOLD_FOR_SLIDER_MS             -> speed edit until keyup
 *
 * DOUBLE-PRESS (allowOverlap):
 *     1st press           -> enter speed edit
 *     double press (fast) -> run the shortcut
 *
 * HOLD MODIFIER (shortcutModifier): bare key -> slider, modifier+key -> shortcut.
 *
 * Modified combos (Cmd+K, Shift+1) always route straight to the registry.
 */

const DOUBLE_PRESS_MS = 350;
/** Delayed Hold: how long a shared key must be held before it speed-edits. */
const HOLD_FOR_SLIDER_MS = 300;

interface DispatcherDeps {
  /** Speed edit master toggle (SE button) AND no modal open. */
  speedEditEnabled: boolean;
  /** Double-Press: a key can be both a slider key and a shortcut; double-press = shortcut. */
  allowOverlap?: boolean;
  /** Delayed Hold: a shared key runs its shortcut on tap, speed-edits on hold. */
  holdForSlider?: boolean;
  /**
   * Hold Modifier: a key can be both a slider key and a shortcut; the bare key
   * speed-edits and MODIFIER+key runs the shortcut. When set, this modifier
   * is consumed for overlapping keys instead of routing to a plain combo.
   */
  shortcutModifier?: ShortcutModifier | null;
  lookupSpeedEdit: (key: string) => string | null;
  enterSpeedEdit: (sliderId: string) => void;
  exitSpeedEdit: () => void;
}

export function useKeyDispatcher(deps: DispatcherDeps) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const activeHoldRef = useRef<string | null>(null);
  // For overlap mode: timestamp of the last tap per key, to detect double-press.
  const lastTapRef = useRef<{ key: string; at: number } | null>(null);
  // Delayed Hold: a shared key that's down but not yet held long enough to
  // speed-edit. Releasing it in this window runs its shortcut.
  const holdTimerRef = useRef<number | null>(null);
  const pendingTapRef = useRef<{ key: string; run: () => void } | null>(null);

  useEffect(() => {
    const isTyping = () => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const d = depsRef.current;
      if (isTyping()) return;

      // ── Hold Modifier: chosen modifier + a SHARED key runs the shortcut ──
      // (The bare key speed-edits, below. Only applies to keys that are both a
      //  slider key and a shortcut. Matched on the physical key, since e.g.
      //  ⌥E on a Mac reports a dead key rather than "e".)
      const physical = /^(Key[A-Z]|Digit\d)$/.test(e.code ?? '');
      if (d.shortcutModifier && eventHasModifier(e, d.shortcutModifier) && (physical || e.key.length === 1)) {
        const key = normalizeKey(e);
        const sliderId = d.speedEditEnabled ? d.lookupSpeedEdit(key) : null;
        const sc = shortcutForKey(key); // bare-key shortcut owner
        if (sliderId && sc) {
          e.preventDefault();
          if (!e.repeat) sc.run();
          return;
        }
        // Not an overlap — fall through to normal combo handling below.
      }

      // ── Modified combos: registry only, never speed edit ────────────────
      if (e.metaKey || e.ctrlKey || e.altKey) {
        const sc = matchShortcut(e);
        if (sc) {
          e.preventDefault();
          sc.run();
        }
        return;
      }

      // Tab / Escape / arrows are owned by useShiftNavigation & friends.
      if (e.key === 'Tab' || e.key === 'Escape') return;

      // Swallow auto-repeat and any other key while a slider hold is active,
      // so a stray keypress can't fire a shortcut mid speed-edit.
      if (e.repeat || activeHoldRef.current) {
        if (activeHoldRef.current) e.preventDefault();
        return;
      }

      const key = normalizeKey(e);
      // ⇧ held with a speed edit key is still a speed edit (arrows then move 5×).
      const shiftedSpeedEdit = e.shiftKey && d.speedEditEnabled && !!d.lookupSpeedEdit(key);
      if (e.key.length !== 1 || (e.shiftKey && !shiftedSpeedEdit)) {
        // Non-printable / Shift combos -> registry only.
        const sc = matchShortcut(e);
        if (sc) { e.preventDefault(); sc.run(); }
        return;
      }

      const sliderId = d.speedEditEnabled ? d.lookupSpeedEdit(key) : null;
      const shortcut = matchShortcut(e);

      // ── Delayed Hold: key is BOTH a slider key and a shortcut ───────────
      if (d.holdForSlider && sliderId && shortcut) {
        e.preventDefault();
        if (pendingTapRef.current) return;
        pendingTapRef.current = { key, run: shortcut.run };
        holdTimerRef.current = window.setTimeout(() => {
          holdTimerRef.current = null;
          // Still down after the delay -> it's a hold: speed edit until keyup.
          if (pendingTapRef.current?.key !== key) return;
          pendingTapRef.current = null;
          activeHoldRef.current = key;
          depsRef.current.enterSpeedEdit(sliderId);
        }, HOLD_FOR_SLIDER_MS);
        return;
      }

      // ── Double-Press overlap: key is BOTH a slider key and a shortcut ─────────
      if (d.allowOverlap && sliderId && shortcut) {
        const now = Date.now();
        const last = lastTapRef.current;
        if (last && last.key === key && now - last.at < DOUBLE_PRESS_MS) {
          // Double press -> the shortcut wins.
          lastTapRef.current = null;
          e.preventDefault();
          shortcut.run();
          return;
        }
        // First tap -> speed edit. The timestamp is re-stamped on KEY UP (see
        // onKeyUp) so the double-press window measures the gap BETWEEN presses,
        // not from the start of a press the user may have held for a while.
        lastTapRef.current = { key, at: now };
        e.preventDefault();
        activeHoldRef.current = key;
        d.enterSpeedEdit(sliderId);
        return;
      }

      // ── Slider-only key -> speed edit ───────────────────────────────────
      if (sliderId) {
        e.preventDefault();
        activeHoldRef.current = key;
        d.enterSpeedEdit(sliderId);
        return;
      }

      // ── Shortcut-only key -> run it ─────────────────────────────────────
      if (shortcut) {
        e.preventDefault();
        shortcut.run();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e);
      if (pendingTapRef.current?.key === key) {
        // Released before the hold delay: a tap, so run the shortcut.
        const { run } = pendingTapRef.current;
        pendingTapRef.current = null;
        if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
        run();
        return;
      }
      if (activeHoldRef.current === key) {
        activeHoldRef.current = null;
        // Restart the double-press window from the moment the key is RELEASED.
        // Timing from keydown meant any press held longer than the window (i.e.
        // a normal tap) could never register a double press.
        if (lastTapRef.current?.key === key) {
          lastTapRef.current = { key, at: Date.now() };
        }
        depsRef.current.exitSpeedEdit();
      }
    };

    // Lost focus mid-hold: bail out cleanly.
    const onBlur = () => {
      pendingTapRef.current = null;
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (activeHoldRef.current) {
        activeHoldRef.current = null;
        depsRef.current.exitSpeedEdit();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
