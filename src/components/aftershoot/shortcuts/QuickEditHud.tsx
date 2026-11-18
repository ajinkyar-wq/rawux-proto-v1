import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface QuickEditHudProps {
  /** Shown only while a quick-edit key is actually being held. */
  visible: boolean;
  label: string;
  /** The bound key, e.g. "q". Rendered as a keycap next to the label. */
  keyHint?: string;
  value: number;
  min: number;
  max: number;
  defaultValue?: number;
}

/**
 * Bottom-centred HUD that mirrors the slider being quick-edited, so the user
 * gets visual feedback on the image itself instead of having to watch the
 * right-hand panel while holding the key.
 *
 * Portalled to <body> because the SliderPanel it lives in is a fixed 344px
 * column — the HUD needs to float over the whole editor.
 */
export function QuickEditHud({
  visible,
  label,
  keyHint,
  value,
  min,
  max,
  defaultValue = 0,
}: QuickEditHudProps) {
  // Keep the HUD mounted for one fade-out pass after the key is released.
  // The HUD belongs INSIDE the image canvas area, not over the filmstrip, so
  // it anchors to the canvas container rather than the viewport.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(visible);
  const hideTimerRef = useRef<number | null>(null);
  const lastRef = useRef<{
    label: string;
    keyHint?: string;
    value: number;
    min: number;
    max: number;
    defaultValue: number;
  } | null>(null);

  useEffect(() => {
    if (!visible) return;
    setHost(document.querySelector<HTMLElement>("[data-quick-edit-hud-host]"));
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setMounted(true);
    } else if (mounted) {
      hideTimerRef.current = window.setTimeout(() => {
        hideTimerRef.current = null;
        setMounted(false);
      }, 180);
    }
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [visible, mounted]);

  // Freeze the last shown values so the fade-out doesn't flash an empty HUD
  // once the key is released and the focused slider is gone.
  if (visible) {
    lastRef.current = { label, keyHint, value, min, max, defaultValue };
  }
  const shown = visible ? { label, keyHint, value, min, max, defaultValue } : lastRef.current;

  if (!mounted || !shown || !host) return null;

  const pct = ((shown.value - shown.min) / (shown.max - shown.min)) * 100;
  const defaultPct = ((shown.defaultValue - shown.min) / (shown.max - shown.min)) * 100;

  return createPortal(
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[6px] z-[30] flex justify-center px-[16px]"
      style={{ fontFamily: "Geist, sans-serif" }}
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-[10px] rounded-[8px] bg-[#1c1c1c]/92 px-[10px] py-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-[12px] transition-[opacity,transform] duration-150 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[6px]"
        }`}
      >
        {/* Label + keycap */}
        <div className="flex items-center gap-[5px] shrink-0">
          <span className="text-[11px] font-medium leading-[15px] text-[#e2e2e2] select-none">
            {shown.label}
          </span>
          {shown.keyHint && (
            <span className="flex h-[15px] min-w-[15px] items-center justify-center rounded-[3px] border border-[#474747] bg-[#2a2a2a] px-[3px] text-[9px] font-semibold uppercase text-[#e2e2e2] tabular-nums select-none">
              {shown.keyHint.toUpperCase()}
            </span>
          )}
        </div>

        {/* Track */}
        <div className="relative h-[12px] w-[170px] flex items-center">
          <div className="relative h-[4px] w-full rounded-[12px] bg-[#474747]">
            {/* Default tick */}
            <div
              className="absolute top-1/2 h-[4px] w-[1px] -translate-y-1/2 bg-[#777]"
              style={{ left: `${defaultPct}%` }}
            />
            {/* Handle */}
            <div
              className="absolute top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[36px] bg-[#1c1c1c] p-[2px]"
              style={{ left: `${pct}%` }}
            >
              <div className="h-[10px] w-[2px] rounded-[8px] bg-[#e2e2e2]" />
            </div>
          </div>
        </div>

        {/* Value */}
        <span className="w-[26px] shrink-0 text-right text-[11px] font-medium leading-[15px] text-[#e2e2e2] tabular-nums select-none">
          {shown.value}
        </span>
      </div>
    </div>,
    host,
  );
}
