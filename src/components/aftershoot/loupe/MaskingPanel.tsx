import { useState } from "react";
import { ChevronDown, Eye, Maximize2, Plus, RotateCcw } from "lucide-react";
import { Checkbox } from "../primitives";
import { IconTooltip } from "../IconTooltip";
import { SliderRow } from "./slider-primitives";

const MASKS = [
  { id: "subject", label: "Subject Mask" },
  { id: "background", label: "Background Mask" },
];

export function MaskingPanel() {
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <MasksList />

      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-300">
        <Checkbox checked={showOverlay} onChange={setShowOverlay} />
        Show Overlay
      </label>

      <div className="h-px bg-white/5" />

      <Section title="WHITE BALANCE">
        <SliderRow label="Temperature" gradient="temperature" initial={70} max={10000} />
        <SliderRow label="Tint" gradient="tint" />
      </Section>

      <div className="h-px bg-white/5" />

      <Section title="LIGHT">
        <SliderRow label="Exposure" />
        <SliderRow label="Contrast" />
        <SliderRow label="Highlights" />
        <SliderRow label="Shadows" />
        <SliderRow label="Whites" />
        <SliderRow label="Blacks" />
      </Section>

      <div className="h-px bg-white/5" />

      <Section title="PRESENCE">
        <SliderRow label="Texture" />
        <SliderRow label="Clarity" />
        <SliderRow label="Dehaze" />
        <SliderRow label="Vibrance" gradient="rainbow" />
        <SliderRow label="Saturation" gradient="rainbow" />
      </Section>
    </div>
  );
}

/* ---------------- MASKS list ---------------- */

function MasksList() {
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider text-neutral-400">
          MASKS
        </span>
        <IconTooltip label="Add mask">
          <button
            type="button"
            className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </IconTooltip>
      </div>

      <div className="flex flex-col gap-1.5">
        {MASKS.map((m) => (
          <MaskRow key={m.id} label={m.label} />
        ))}
      </div>
    </section>
  );
}

function MaskRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-black">
        <div className="h-3 w-4 rounded-t-full bg-white/70" />
      </div>
      <span className="flex-1 text-[11px] text-white">{label}</span>
      <IconTooltip label="Isolate mask">
        <button
          type="button"
          className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
        >
          <Maximize2 className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </IconTooltip>
      <IconTooltip label="Toggle visibility">
        <button
          type="button"
          className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
        >
          <Eye className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </IconTooltip>
    </div>
  );
}

/* ---------------- Section ---------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-neutral-300"
        >
          <ChevronDown
            className={`h-3 w-3 text-neutral-400 transition-transform ${
              open ? "" : "-rotate-90"
            }`}
            strokeWidth={1.75}
          />
          {title}
        </button>
        <div className="flex items-center gap-1">
          <IconTooltip label="Toggle visibility">
            <button
              type="button"
              className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
            >
              <Eye className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </IconTooltip>
          <IconTooltip label="Reset section">
            <button
              type="button"
              className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </IconTooltip>
        </div>
      </div>
      {open && <div className="flex flex-col gap-1.5">{children}</div>}
    </section>
  );
}
