import { useContext, useEffect, useRef, useState } from "react";
import {
  SliderHistoryContext,
  SliderScopeContext,
  sliderDisplay,
  useHistorySlider,
} from "../history/album-history";
import { useSpeedEditTarget } from "../shortcuts/useSpeedEdit";
import { useSliderFocus } from "./slider-focus";

// Track gradient variants used across loupe sliders.
export type Gradient =
  | "plain"
  | "temperature"
  | "tint"
  | "rainbow"
  // Color Mixer rows — single-hue gradient swatches.
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "aqua"
  | "blue"
  | "purple"
  | "magenta"
  // Calibration shadow tint (green→magenta-cyan).
  | "shadowTint"
  // Calibration primaries (left dark/desaturated → right saturated primary).
  | "redPrimaryHue"
  | "redPrimarySat"
  | "greenPrimaryHue"
  | "greenPrimarySat"
  | "bluePrimaryHue"
  | "bluePrimarySat";

const GRADIENT_CSS: Record<Gradient, string> = {
  plain: "rgba(255,255,255,0.15)",
  temperature: "linear-gradient(to right, #4a8bff 0%, #aaaaaa 50%, #f5a524 100%)",
  tint: "linear-gradient(to right, #3acf5b 0%, #aaaaaa 50%, #c14ad6 100%)",
  rainbow: "linear-gradient(to right, #4a8bff 0%, #3acf5b 33%, #f5a524 66%, #d63a3a 100%)",

  // Color mixer hue rows
  red: "linear-gradient(to right, #b54a4a 0%, #d63a3a 50%, #ff6b6b 100%)",
  orange: "linear-gradient(to right, #b88550 0%, #f5a524 50%, #ffb86b 100%)",
  yellow: "linear-gradient(to right, #a8a040 0%, #e0c81f 50%, #f0e070 100%)",
  green: "linear-gradient(to right, #4a8a4a 0%, #3acf5b 50%, #6be08c 100%)",
  aqua: "linear-gradient(to right, #4a9a9a 0%, #3acfcf 50%, #6be0e0 100%)",
  blue: "linear-gradient(to right, #4a6ab0 0%, #4a8bff 50%, #6ba8ff 100%)",
  purple: "linear-gradient(to right, #6a4ab0 0%, #8b3aff 50%, #a86bff 100%)",
  magenta: "linear-gradient(to right, #a04a8b 0%, #c14ad6 50%, #e06be0 100%)",

  // Calibration
  shadowTint: "linear-gradient(to right, #c8e060 0%, #aaaaaa 50%, #3acfcf 100%)",
  redPrimaryHue: "linear-gradient(to right, #b88550 0%, #c14a6a 50%, #d63a8b 100%)",
  redPrimarySat: "linear-gradient(to right, #555555 0%, #b54a4a 50%, #ff3a3a 100%)",
  greenPrimaryHue: "linear-gradient(to right, #e0c81f 0%, #3acf5b 50%, #3acfa0 100%)",
  greenPrimarySat: "linear-gradient(to right, #555555 0%, #3a9a4a 50%, #3acf5b 100%)",
  bluePrimaryHue: "linear-gradient(to right, #3acf5b 0%, #4a8bff 50%, #8b3aff 100%)",
  bluePrimarySat: "linear-gradient(to right, #555555 0%, #4a6ab0 50%, #4a8bff 100%)",
};

const DETENT_COOLDOWN_MS = 35;

/** Draggable track with a pill handle (halo'd), matching the raw-ux slider. */
export function GradientSlider({
  value,
  onChange,
  gradient = "plain",
  disabled = false,
  onCommit,
  centered = true,
  focused = false,
  onReset,
  detent = 0,
  isDefault,
}: {
  value: number;
  onChange: (v: number) => void;
  gradient?: Gradient;
  disabled?: boolean;
  /** Row is hovered / Tab-focused: show the active look. */
  focused?: boolean;
  /** Double-click the track: back to the default. */
  onReset?: () => void;
  /** Drag snaps to this step (in 0–100 track units) with a short cooldown. */
  detent?: number;
  /** Slider is at its default (unchanged). Defaults to centre / zero. */
  isDefault?: boolean;
  /** Fires once when a drag ends / after a keyboard nudge (history step). */
  onCommit?: () => void;
  /** Fill grows from the centre (signed range) instead of from the left. */
  centered?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  // Latest callbacks for the document listeners registered once on mount.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Ridged detents (from the Export push slider): drags commit in discrete
  // snaps, at most one per DETENT_COOLDOWN_MS, so they feel mechanical.
  const detentRef = useRef(detent);
  detentRef.current = detent;
  const valueRef = useRef(value);
  valueRef.current = value;
  const lastCommit = useRef(0);
  const pending = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const commitDetented = (raw: number) => {
    const step = detentRef.current;
    const v = step > 0 ? Math.max(0, Math.min(100, Math.round(raw / step) * step)) : raw;
    if (v === valueRef.current) return;
    const now = performance.now();
    const elapsed = now - lastCommit.current;
    if (elapsed >= DETENT_COOLDOWN_MS) {
      lastCommit.current = now;
      pending.current = null;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      onChangeRef.current(v);
    } else {
      pending.current = v;
      if (timer.current == null)
        timer.current = window.setTimeout(() => {
          timer.current = null;
          if (pending.current == null) return;
          lastCommit.current = performance.now();
          const next = pending.current;
          pending.current = null;
          onChangeRef.current(next);
        }, DETENT_COOLDOWN_MS - elapsed);
    }
  };

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    commitDetented(pct);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientX(e.clientX);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      // Land on the last detent before recording the history step.
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      if (pending.current != null) {
        onChangeRef.current(pending.current);
        pending.current = null;
      }
      onCommitRef.current?.();
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const active = !disabled && (hovered || dragging || focused);
  const hasGradient = gradient !== "plain";
  const fillLeft = centered ? Math.min(50, value) : 0;
  const fillWidth = centered ? Math.abs(value - 50) : value;
  // A moved slider's handle matches the track fill (light while hovered /
  // focused / dragging, the fill grey at rest — also right after a drag).
  // An unchanged slider keeps the original dark handle.
  const atDefault = isDefault ?? Math.abs(value - (centered ? 50 : 0)) < 0.01;
  const handleColor = atDefault
    ? dragging
      ? "bg-[#ababab]"
      : active
        ? "bg-[#5e5e5e]"
        : "bg-[#474747]"
    : active
      ? "bg-[#ababab]"
      : "bg-[#777]";

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      // Keyboard focus is handled by the row (Tab cycles sliders, ↑/↓ nudge).
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      onDoubleClick={() => !disabled && onReset?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => {
        if (disabled) return;
        draggingRef.current = true;
        setDragging(true);
        updateFromClientX(e.clientX);
      }}
      className={`relative h-[18px] select-none ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <div
        className={`absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full transition-colors ${
          hasGradient ? "" : active ? "bg-[#5e5e5e]" : "bg-[#474747]"
        }`}
        style={hasGradient ? { background: GRADIENT_CSS[gradient] } : undefined}
      >
        {!hasGradient && (
          <div
            className={`absolute top-0 h-full rounded-full transition-colors ${
              active ? "bg-[#ababab]" : "bg-[#777]"
            }`}
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
          />
        )}
      </div>
      {/* Handle: pill inside a dark halo */}
      <div
        className="pointer-events-none absolute top-1/2 flex h-[18px] w-2 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#1c1c1c]"
        style={{ left: `${value}%` }}
      >
        <div
          className={`rounded-full transition-[width,height,background-color] duration-150 ${handleColor} ${
            active ? "h-[14px] w-1" : "h-3 w-0.5"
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Compact slider row used in editing panels — left label, draggable
 * gradient slider, signed numeric readout.
 */
export function SliderRow({
  label,
  gradient = "plain",
  initial = 50,
  asShot,
  max = 100,
  disabled = false,
  labelWidth = 106,
  readoutWidth = 36,
  signed = true,
  onChange,
}: {
  label: string;
  gradient?: Gradient;
  initial?: number;
  /** White balance: reset goes back to the As Shot value instead of zero. */
  asShot?: number;
  max?: number;
  disabled?: boolean;
  labelWidth?: number;
  readoutWidth?: number;
  /** When false, the readout shows the raw 0..max value (e.g. Strength 0–100). */
  signed?: boolean;
  onChange?: (v: number) => void;
}) {
  // Value lives in the album history store (per image, reverts on Undo) when
  // rendered inside a loupe panel; otherwise it's local state.
  const slider = useHistorySlider(label, initial, (pos) => sliderDisplay(pos, max, signed));
  const value = slider.value;
  // Reset = zero: the centre of a ± slider, the left end of a 0–max one.
  // White balance resets to As Shot (Kelvin sliders have no meaningful zero).
  const resetTo = asShot ?? (signed && max === 100 ? 50 : signed ? initial : 0);
  const handleChange = (v: number) => {
    slider.onChange(v);
    onChange?.(v);
  };
  const display = !signed
    ? Math.round((value / 100) * max)
    : max === 100
      ? Math.round(((value - 50) / 50) * 100)
      : Math.round((value / 100) * max);
  const isMutedRow = disabled;

  // Interactions ported from the Export push editor slider:
  //   hover focuses the row; on a moved slider the label turns into "Reset";
  //   double-click the track resets; ↑/↓ nudge (⇧ = 5×); Tab cycles sliders;
  //   drags snap in detent steps.
  const range = signed && max === 100 ? 200 : max; // span of the readout
  const toPos = (displayStep: number) => (displayStep / range) * 100;
  const detent = toPos(range >= 4000 ? 50 : range >= 300 ? 5 : 2);
  const rowRef = useRef<HTMLDivElement>(null);
  const reset = () => {
    if (disabled || Math.abs(value - resetTo) < 0.01) return;
    slider.onChange(resetTo);
    onChange?.(resetTo);
    slider.onCommit();
  };
  const focus = useSliderFocus(rowRef, (dir, big) => {
    if (disabled) return;
    const step = toPos(Math.max(1, Math.round(range / 200))) * (big ? 5 : 1);
    const next = Math.max(0, Math.min(100, value + dir * step));
    if (next === value) return;
    slider.onChange(next);
    onChange?.(next);
    slider.onCommit();
  });
  const canReset = focus.focused && !disabled && Math.abs(value - resetTo) >= 0.01;
  // Highlight the row while its speed edit key is held.
  const speedTarget = useSpeedEditTarget();
  const scope = useContext(SliderScopeContext);
  const where = useContext(SliderHistoryContext);
  const speedEditing =
    !!speedTarget &&
    where?.tool === "edit" &&
    speedTarget.scope === scope &&
    speedTarget.label === label;
  return (
    <div
      ref={rowRef}
      data-slider-row
      data-slider-focused={focus.focused || undefined}
      onMouseEnter={focus.onMouseEnter}
      onMouseLeave={focus.onMouseLeave}
      className={`flex items-center ${isMutedRow ? "opacity-50" : ""}`}
    >
      <ResetLabel
        label={label}
        canReset={canReset}
        onReset={reset}
        width={labelWidth}
        textClassName={speedEditing || focus.focused ? "text-[#e2e2e2]" : "text-[#777]"}
      />
      <div className="flex-1">
        <GradientSlider
          value={value}
          onChange={handleChange}
          onCommit={slider.onCommit}
          gradient={gradient}
          disabled={disabled}
          centered={signed}
          focused={focus.focused}
          onReset={reset}
          detent={detent}
          isDefault={Math.abs(value - resetTo) < 0.01}
        />
      </div>
      <span
        className={`shrink-0 text-right text-[12px] font-medium tabular-nums ${
          focus.focused ? "text-[#e2e2e2]" : "text-[#777]"
        }`}
        style={{ width: readoutWidth }}
      >
        {signed && display > 0 && max === 100 ? `+${display}` : display}
      </span>
    </div>
  );
}

/**
 * Label that cross-fades to "Reset" on hover while `canReset` (the control
 * is off its default). Used by slider rows and dropdown rows.
 */
export function ResetLabel({
  label,
  canReset,
  onReset,
  width,
  textClassName,
}: {
  label: string;
  canReset: boolean;
  onReset: () => void;
  width?: number;
  textClassName: string;
}) {
  const [hovered, setHovered] = useState(false);
  const showReset = canReset && hovered;
  return (
    <div
      role={showReset ? "button" : undefined}
      aria-label={showReset ? `Reset ${label}` : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={showReset ? onReset : undefined}
      className={`relative grid shrink-0 select-none text-left text-[12px] ${
        showReset ? "cursor-pointer" : ""
      }`}
      style={{ width }}
    >
      <span
        className={`col-start-1 row-start-1 truncate transition-opacity duration-200 ${
          showReset ? "opacity-0" : "opacity-100"
        } ${textClassName}`}
      >
        {label}
      </span>
      <span
        aria-hidden={!showReset}
        className={`col-start-1 row-start-1 truncate text-[#e2e2e2] transition-opacity duration-200 ${
          showReset ? "opacity-100" : "opacity-0"
        }`}
      >
        Reset
      </span>
    </div>
  );
}
