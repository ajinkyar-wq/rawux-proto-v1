import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  FlipHorizontal,
  FlipVertical,
  DeviceRotate,
} from "@phosphor-icons/react";
import { IconTooltip } from "../IconTooltip";
import { Section } from "./EditPanel";
import { GradientSlider } from "./slider-primitives";
import { useHistoryChoice, useHistorySlider } from "../history/album-history";

import { CROP_ASPECTS } from "./crop-config";

const ASPECTS: string[] = [...CROP_ASPECTS];
const toDegrees = (pos: number) => ((pos - 50) / 50) * 45;

export function CropPanel() {
  const [aspect, setAspect] = useHistoryChoice("Aspect Ratio", ASPECTS, "Original");
  const [overlay, setOverlay] = useState("Thirds");
  // 0-100; midpoint = 0 deg. One history step per drag.
  const straighten = useHistorySlider("Straightening", 50, (p) => `${toDegrees(p).toFixed(2)}°`);

  // Map slider 0-100 to -45..+45 degrees for the readout.
  const degrees = toDegrees(straighten.value);

  return (
    <div className="flex flex-col gap-3">
      <Section title="Crop" first>
        <Row label="Aspect Ratio">
          <InlineDropdown value={aspect} onSelect={setAspect} options={ASPECTS} />
          <IconTooltip label="Switch orientation">
            <button
              type="button"
              className="ml-2 flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:text-white"
            >
              <DeviceRotate size={16} weight="light" />
            </button>
          </IconTooltip>
        </Row>

        <div className="flex items-center">
          <span className="w-[106px] shrink-0 truncate text-[12px] text-[#777]">Straightening</span>
          <div className="flex-1">
            <GradientSlider
              value={straighten.value}
              onChange={straighten.onChange}
              onCommit={straighten.onCommit}
            />
          </div>
          <span className="w-9 shrink-0 text-right text-[12px] font-medium tabular-nums text-[#777]">
            {degrees.toFixed(2)}
          </span>
        </div>

        <Row label="Crop Overlay">
          <InlineDropdown
            value={overlay}
            onSelect={setOverlay}
            options={["Thirds", "Golden Ratio", "Grid", "Diagonal", "None"]}
          />
        </Row>
      </Section>

      <Section title="Rotate & Flip">
        <div className="flex w-fit items-center gap-1 rounded-md bg-[#222] p-1">
          <ToolButton title="Flip horizontal">
            <FlipHorizontal size={16} weight="light" />
          </ToolButton>
          <ToolButton title="Flip vertical">
            <FlipVertical size={16} weight="light" />
          </ToolButton>
          <span className="mx-1 h-4 w-px bg-white/10" />
          <ToolButton title="Rotate left">
            <ArrowCounterClockwise size={16} weight="light" />
          </ToolButton>
          <ToolButton title="Rotate right">
            <ArrowClockwise size={16} weight="light" />
          </ToolButton>
        </div>
      </Section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="w-[106px] shrink-0 text-[12px] text-[#777]">{label}</span>
      <div className="flex flex-1 items-center justify-end">{children}</div>
    </div>
  );
}

function ToolButton({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <IconTooltip label={title}>
      <button
        type="button"
        className="flex h-7 w-8 items-center justify-center rounded text-neutral-500 hover:bg-white/5 hover:text-white"
      >
        {children}
      </button>
    </IconTooltip>
  );
}

function InlineDropdown({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[12px] text-neutral-200 hover:text-white"
      >
        {value}
        <CaretDown
          size={14}
          weight="light"
          className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded border border-white/10 bg-[#1c1c1c] shadow-xl">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className={`flex h-8 w-full items-center px-2.5 text-left text-[12px] text-white hover:bg-white/[0.06] ${
                opt === value ? "bg-white/[0.06]" : ""
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
