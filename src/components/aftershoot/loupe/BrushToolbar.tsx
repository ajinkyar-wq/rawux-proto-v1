import { useEffect, useRef, useState } from "react";
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

type BrushMode = "add" | "subtract";

// Visual-only floating brush toolbar for the Remove tool. State is local;
// the brush itself is wired up later.
export function BrushToolbar() {
  const [mode, setMode] = useState<BrushMode>("add");
  const [size, setSize] = useState(50);
  const [showSize, setShowSize] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={wrapRef}
      className="absolute right-4 top-4 z-30 flex items-start gap-2 text-[#e2e2e2]"
    >
      {showSize && !collapsed && (
        <div className="mt-[88px] flex w-[220px] flex-col gap-2.5 rounded border border-[#303030] bg-[#1c1c1c]/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#ababab]">Brush Size</span>
            <span className="font-medium">{size}</span>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="h-1 w-full cursor-pointer accent-[#e2e2e2]"
          />
        </div>
      )}

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
                  showSize ? "border-[#5e5e5e] bg-white/10" : "border-transparent hover:bg-white/5"
                }`}
              >
                <Circle size={16} className="text-[#ababab]" />
                <span className="text-[10px] font-medium leading-none tabular-nums text-[#ababab]">
                  {size}
                </span>
              </button>
            </IconTooltip>
            <IconTooltip label="Reset" side="left">
              <button type="button" className={btn(false)}>
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
  );
}
