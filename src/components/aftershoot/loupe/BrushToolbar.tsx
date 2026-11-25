import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowsInSimple,
  ArrowsOutSimple,
  Circle,
  Eraser,
  PaintBrush,
  Plus,
} from "@phosphor-icons/react";
import { IconTooltip } from "../IconTooltip";
import type { BrushState } from "./BrushLayer";
import { GradientSlider, ResetLabel } from "./slider-primitives";

// One controlled row in the brush settings: label · slider · readout. Same
// slider look as the edit panels, but the value lives in the brush state.
function BrushSliderRow({
  label,
  value,
  min,
  max,
  initial,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  initial: number;
  onChange: (v: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const toPos = (v: number) => ((v - min) / (max - min)) * 100;
  const fromPos = (p: number) => Math.round(min + (p / 100) * (max - min));
  const reset = () => onChange(initial);
  return (
    <div
      className="flex items-center"
      onMouseEnter={() => setFocused(true)}
      onMouseLeave={() => setFocused(false)}
    >
      <ResetLabel
        label={label}
        canReset={focused && value !== initial}
        onReset={reset}
        width={72}
        textClassName={focused ? "text-[#e2e2e2]" : "text-[#777]"}
      />
      <div className="flex-1">
        <GradientSlider
          value={toPos(value)}
          onChange={(p) => onChange(fromPos(p))}
          centered={false}
          focused={focused}
          onReset={reset}
          isDefault={value === initial}
        />
      </div>
      <span
        className={`w-9 shrink-0 text-right text-[12px] font-medium tabular-nums ${
          focused ? "text-[#e2e2e2]" : "text-[#777]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SettingsPanel({
  brush,
  className,
  style,
}: {
  brush: BrushState;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-loupe-ui
      className={`flex w-[260px] flex-col gap-3 rounded border border-[#303030] bg-[#1c1c1c]/95 p-4 shadow-xl backdrop-blur-sm ${className ?? ""}`}
      style={style}
      onContextMenu={(e) => e.preventDefault()}
    >
      <BrushSliderRow
        label="Brush Size"
        value={brush.size}
        min={1}
        max={200}
        initial={50}
        onChange={brush.setSize}
      />
      <BrushSliderRow
        label="Feather"
        value={brush.feather}
        min={0}
        max={100}
        initial={0}
        onChange={brush.setFeather}
      />
      <BrushSliderRow
        label="Opacity"
        value={brush.opacity}
        min={0}
        max={100}
        initial={brush.defaultOpacity}
        onChange={brush.setOpacity}
      />
    </div>
  );
}

// Visual-only floating brush toolbar for the Remove tool. State is local;
// the brush itself is wired up later.
export function BrushToolbar({ brush }: { brush: BrushState }) {
  const { mode, setMode, size, clear, menu, setMenu } = brush;
  const [showSize, setShowSize] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  // Right-click menu: the same settings, placed at the cursor inside the canvas.
  useLayoutEffect(() => {
    const parent = wrapRef.current?.offsetParent as HTMLElement | null;
    if (!menu || !parent) {
      setMenuPos(null);
      return;
    }
    const r = parent.getBoundingClientRect();
    const w = 260;
    const h = 150;
    setMenuPos({
      left: Math.max(8, Math.min(r.width - w - 8, menu.x - r.left + 12)),
      top: Math.max(8, Math.min(r.height - h - 8, menu.y - r.top + 12)),
    });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, setMenu]);

  useEffect(() => {
    if (!showSize) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSize(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [showSize]);

  const btn = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
      active ? "border-[#5e5e5e] bg-white/10" : "border-transparent bg-transparent hover:bg-white/5"
    }`;

  return (
    <>
      <div
        ref={wrapRef}
        data-loupe-ui
        className="absolute right-4 top-4 z-30 flex items-start gap-2 text-[#e2e2e2]"
      >
        {showSize && !collapsed && <SettingsPanel brush={brush} className="mt-[88px]" />}

        <div className="flex flex-col gap-2 rounded border border-[#303030] bg-[#1c1c1c] p-1.5 shadow-xl">
          <div className="flex flex-col gap-0.5">
            <IconTooltip label="Brush Add" side="left">
              <button type="button" onClick={() => setMode("add")} className={btn(mode === "add")}>
                <span className="relative">
                  <PaintBrush size={16} />
                  <Plus size={10} weight="bold" className="absolute -bottom-1 -right-1" />
                </span>
              </button>
            </IconTooltip>
            <IconTooltip label="Brush Subtract" side="left">
              <button
                type="button"
                onClick={() => setMode("subtract")}
                className={btn(mode === "subtract")}
              >
                <Eraser size={16} />
              </button>
            </IconTooltip>
          </div>

          {!collapsed && (
            <>
              <IconTooltip label="Brush size" side="left">
                <button
                  type="button"
                  onClick={() => setShowSize((v) => !v)}
                  className={`flex flex-col items-center gap-1 rounded-sm border px-1.5 py-2 transition-colors ${
                    showSize
                      ? "border-[#5e5e5e] bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <Circle size={16} className="text-[#ababab]" />
                  <span className="text-[10px] font-medium leading-none tabular-nums text-[#ababab]">
                    {size}
                  </span>
                </button>
              </IconTooltip>
              <IconTooltip label="Reset" side="left">
                <button type="button" onClick={clear} className={btn(false)}>
                  <ArrowCounterClockwise size={20} />
                </button>
              </IconTooltip>
              <div className="mx-1 h-px bg-[#303030]" />
            </>
          )}

          <IconTooltip label={collapsed ? "Expand toolbar" : "Collapse toolbar"} side="left">
            <button
              type="button"
              onClick={() => {
                setCollapsed((v) => !v);
                setShowSize(false);
              }}
              className={btn(false)}
            >
              {collapsed ? <ArrowsOutSimple size={20} /> : <ArrowsInSimple size={20} />}
            </button>
          </IconTooltip>
        </div>
      </div>
      {menu && menuPos && (
        <div ref={menuRef} className="absolute z-40" style={menuPos}>
          <SettingsPanel brush={brush} />
        </div>
      )}
    </>
  );
}
