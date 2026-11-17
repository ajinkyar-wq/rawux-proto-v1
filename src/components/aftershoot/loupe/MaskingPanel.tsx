import { useState } from "react";
import { ArrowsOutSimple, Eye, PlusCircle } from "@phosphor-icons/react";
import { Checkbox } from "../primitives";
import { IconTooltip } from "../IconTooltip";
import { SliderRow } from "./slider-primitives";
import { Section } from "./EditPanel";

const MASKS = [
  { id: "subject", label: "Subject Mask" },
  { id: "background", label: "Background Mask" },
];

export function MaskingPanel() {
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <MasksList />

      <label className="flex cursor-pointer items-center gap-2 pb-1 text-[12px] text-neutral-200">
        <Checkbox checked={showOverlay} onChange={setShowOverlay} />
        Show Overlay
      </label>

      <Section title="White Balance">
        <SliderRow label="Temperature" gradient="temperature" initial={70} max={10000} />
        <SliderRow label="Tint" gradient="tint" />
      </Section>

      <Section title="Light">
        <SliderRow label="Exposure" />
        <SliderRow label="Contrast" />
        <SliderRow label="Highlights" />
        <SliderRow label="Shadows" />
        <SliderRow label="Whites" />
        <SliderRow label="Blacks" />
      </Section>

      <Section title="Presence">
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
    <section className="flex flex-col gap-3">
      <div className="flex h-6 items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-300">
          Masks
        </span>
        <IconTooltip label="Add mask">
          <button
            type="button"
            className="rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <PlusCircle size={16} weight="light" />
          </button>
        </IconTooltip>
      </div>

      <div className="flex flex-col gap-2">
        {MASKS.map((m) => (
          <MaskRow key={m.id} label={m.label} />
        ))}
      </div>
    </section>
  );
}

function MaskRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-black">
        <div className="h-4 w-5 rounded-t-full bg-white/70" />
      </div>
      <span className="flex-1 text-[12px] text-white">{label}</span>
      <IconTooltip label="Isolate mask">
        <button
          type="button"
          className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
        >
          <ArrowsOutSimple size={16} weight="light" />
        </button>
      </IconTooltip>
      <IconTooltip label="Toggle visibility">
        <button
          type="button"
          className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
        >
          <Eye size={16} weight="light" />
        </button>
      </IconTooltip>
    </div>
  );
}
