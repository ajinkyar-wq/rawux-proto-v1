import { createContext, useContext, useEffect, useRef, useState } from "react";
import { sliderDisplay, sliderKey, sliderOp, type AlbumHistory } from "../history/album-history";
import type { ViewMode } from "../Toolbar";
import type { Gradient } from "../loupe/slider-primitives";
import { useKeyDispatcher } from "./useKeyDispatcher";
import type { ShortcutMode } from "./useShortcutMode";

/**
 * Speed edit keys, as in the locked Export push prototype (Delayed Hold):
 * hold a slider's key to quick-edit that slider, release to finish.
 *
 * While the key is held:
 *   - trackpad / mouse wheel (either axis) adjusts the value;
 *   - ↑ / ↓ nudge it (⇧ = 5×);
 *   - Space resets it to default.
 * A HUD over the image mirrors the slider once something actually moves.
 *
 * Works from ANY screen (Grid, Loupe, Survey; Cull or Enhance), not only with
 * the Edit panel open. It edits the current image, writing to the same album
 * history keys the loupe Edit panel reads, so the panel shows the new value and
 * each hold is one Undo step.
 */

/** The speed-edit sliders: ids match the Keyboard Shortcuts modal's bindings. */
export const SPEED_SLIDERS: Record<
  string,
  { label: string; scope: string; initial: number; max?: number; gradient?: Gradient }
> = {
  temperature: {
    label: "Temperature",
    scope: "White Balance",
    initial: 50,
    max: 10000,
    gradient: "temperature",
  },
  tint: { label: "Tint", scope: "White Balance", initial: 55, gradient: "tint" },
  exposure: { label: "Exposure", scope: "Light", initial: 50 },
  contrast: { label: "Contrast", scope: "Light", initial: 50 },
  highlights: { label: "Highlights", scope: "Light", initial: 50 },
  shadows: { label: "Shadows", scope: "Light", initial: 75 },
  whites: { label: "Whites", scope: "Light", initial: 75 },
  blacks: { label: "Blacks", scope: "Light", initial: 75 },
  texture: { label: "Texture", scope: "Presence", initial: 60 },
  clarity: { label: "Clarity", scope: "Presence", initial: 55 },
  dehaze: { label: "Dehaze", scope: "Presence", initial: 35 },
  vibrance: { label: "Vibrance", scope: "Presence", initial: 75, gradient: "rainbow" },
  saturation: { label: "Saturation", scope: "Presence", initial: 0, gradient: "rainbow" },
};

const TOOL = "edit" as const;
const keyOf = (id: string) => sliderKey(TOOL, SPEED_SLIDERS[id].scope, SPEED_SLIDERS[id].label);
const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** The slider being speed-edited, so the Edit panel can highlight its row. */
export const SpeedEditContext = createContext<{ scope: string; label: string } | null>(null);
export const useSpeedEditTarget = () => useContext(SpeedEditContext);

export function useSpeedEdit({
  history,
  image,
  view,
  enabled,
  shortcutMode,
  lookupSliderForKey,
}: {
  history: AlbumHistory;
  /** The current image (Loupe / Survey) or the primary grid selection. */
  image: number;
  view: ViewMode;
  /** Off while a modal is open. */
  enabled: boolean;
  shortcutMode: ShortcutMode;
  lookupSliderForKey: (key: string) => string | null;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Armed by the key, but the HUD waits for the first real adjustment.
  const [editing, setEditing] = useState(false);

  // Latest state for the window listeners registered once.
  const live = useRef({ history, image, view });
  live.current = { history, image, view };
  const activeRef = useRef<string | null>(null);
  // Value when the hold started (undefined = slider was at default).
  const startRef = useRef<{ stored: number | undefined; pos: number; image: number } | null>(null);
  const wheelAccum = useRef(0);

  const valueOf = (id: string, img = live.current.image) =>
    live.current.history.getValue(img, keyOf(id)) ?? SPEED_SLIDERS[id].initial;

  const setValue = (next: number) => {
    const id = activeRef.current;
    const start = startRef.current;
    if (!id || !start) return;
    setEditing(true);
    const v = clamp(next);
    if (v !== valueOf(id, start.image)) live.current.history.setLive(start.image, keyOf(id), v);
  };

  const enter = (id: string) => {
    if (!SPEED_SLIDERS[id]) return;
    const { history: h, image: img } = live.current;
    activeRef.current = id;
    startRef.current = { stored: h.getValue(img, keyOf(id)), pos: valueOf(id, img), image: img };
    wheelAccum.current = 0;
    setActiveId(id);
    setEditing(false);
  };

  // Release: one history step for the whole hold (if anything changed).
  const exit = () => {
    const id = activeRef.current;
    const start = startRef.current;
    activeRef.current = null;
    startRef.current = null;
    setActiveId(null);
    setEditing(false);
    if (!id || !start) return;
    const end = valueOf(id, start.image);
    if (Math.round(end) === Math.round(start.pos)) return;
    const s = SPEED_SLIDERS[id];
    live.current.history.record({
      kind: "change",
      op: sliderOp(s.scope, s.label),
      value: sliderDisplay(end, s.max ?? 100),
      view: live.current.view,
      tool: TOOL,
      images: [start.image],
      effects: [{ image: start.image, key: keyOf(id), prev: start.stored, next: end }],
    });
  };

  // A modal opening mid-hold ends the hold.
  useEffect(() => {
    if (!enabled && activeRef.current) exit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useKeyDispatcher({
    speedEditEnabled: enabled,
    allowOverlap: shortcutMode === "speedToggle",
    holdForSlider: shortcutMode === "hold",
    lookupSpeedEdit: lookupSliderForKey,
    enterSpeedEdit: enter,
    exitSpeedEdit: exit,
  });

  // While held: arrows / Space / wheel drive the slider. Capture phase so the
  // album's own keys (and page scroll) don't also react.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const id = activeRef.current;
      if (!id) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        e.stopPropagation();
        setValue(SPEED_SLIDERS[id].initial);
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        const step = e.shiftKey ? 5 : 1;
        setValue(valueOf(id, startRef.current?.image) + (e.key === "ArrowUp" ? step : -step));
      }
    };
    const onWheel = (e: WheelEvent) => {
      const id = activeRef.current;
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      // Whichever axis dominates drives the value; up / right adds.
      const raw = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? -e.deltaY : -e.deltaX;
      wheelAccum.current += raw * (100 / 300);
      const delta = Math.trunc(wheelAccum.current);
      if (delta === 0) return;
      wheelAccum.current -= delta;
      setValue(valueOf(id, startRef.current?.image) + delta);
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = activeId ? SPEED_SLIDERS[activeId] : null;
  const pos = activeId ? valueOf(activeId, startRef.current?.image) : 0;
  return {
    activeId,
    /** True while a key is held: blocks the album's other plain keys. */
    holding: !!activeId,
    target: s ? { scope: s.scope, label: s.label } : null,
    hud: s
      ? {
          visible: editing,
          label: s.label,
          // HUD shows the panel's readout scale.
          value: Number(sliderDisplay(pos, s.max ?? 100).replace("+", "")),
          min: s.max && s.max !== 100 ? 0 : -100,
          max: s.max && s.max !== 100 ? s.max : 100,
          defaultValue: Number(sliderDisplay(s.initial, s.max ?? 100).replace("+", "")),
        }
      : null,
  };
}
