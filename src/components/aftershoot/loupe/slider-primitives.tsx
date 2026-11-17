import { useContext, useEffect, useRef, useState } from "react";
import {
  SliderHistoryContext,
  SliderScopeContext,
  sliderDisplay,
  useHistorySlider,
} from "../history/album-history";
import { useSpeedEditTarget } from "../shortcuts/useSpeedEdit";

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

/** Draggable track with a pill handle (halo'd), matching the raw-ux slider. */
export function GradientSlider({
  value,
  onChange,
  gradient = "plain",
  disabled = false,
  onCommit,
  centered = true,
}: {
  value: number;
  onChange: (v: number) => void;
  gradient?: Gradient;
  disabled?: boolean;
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

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChangeRef.current(pct);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientX(e.clientX);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      onCommitRef.current?.();
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const active = !disabled && (hovered || dragging);
  const hasGradient = gradient !== "plain";
  const fillLeft = centered ? Math.min(50, value) : 0;
  const fillWidth = centered ? Math.abs(value - 50) : value;
  const handleColor = dragging ? "bg-[#ababab]" : active ? "bg-[#5e5e5e]" : "bg-[#474747]";

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(e) => {
        if (disabled) return;
        draggingRef.current = true;
        setDragging(true);
        updateFromClientX(e.clientX);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - 2));
        if (e.key === "ArrowRight") onChange(Math.min(100, value + 2));
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") onCommit?.();
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
    <div className={`flex items-center ${isMutedRow ? "opacity-50" : ""}`}>
      <span
        className={`shrink-0 truncate text-[12px] ${speedEditing ? "text-white" : "text-[#777]"}`}
        style={{ width: labelWidth }}
      >
        {label}
      </span>
      <div className="flex-1">
        <GradientSlider
          value={value}
          onChange={handleChange}
          onCommit={slider.onCommit}
          gradient={gradient}
          disabled={disabled}
          centered={signed}
        />
      </div>
      <span
        className="shrink-0 text-right text-[12px] font-medium tabular-nums text-[#777]"
        style={{ width: readoutWidth }}
      >
        {signed && display > 0 && max === 100 ? `+${display}` : display}
      </span>
    </div>
  );
}
