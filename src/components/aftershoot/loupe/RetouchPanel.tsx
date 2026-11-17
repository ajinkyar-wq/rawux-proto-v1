import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Checkbox, Dropdown } from "../primitives";
import { IconTooltip } from "../IconTooltip";
import { Section } from "./EditPanel";
import { SliderRow } from "./slider-primitives";

type Subject = "all" | "masculine" | "feminine" | "elderly" | "child" | "individual";

const SUBJECTS: { id: Subject; label: string }[] = [
  { id: "all", label: "All Subject" },
  { id: "masculine", label: "Masculine" },
  { id: "feminine", label: "Feminine" },
  { id: "elderly", label: "Elderly" },
  { id: "child", label: "Child" },
  { id: "individual", label: "Individual" },
];

const PRESETS = ["Natural Retouch", "Soft Glow", "Bold Contrast", "Matte Film"];

const SECTIONS: { title: string; rows: string[] }[] = [
  { title: "Face Blemish", rows: ["Acne", "Freckle", "Spots"] },
  { title: "Face Wrinkles", rows: ["Smile Lines", "Forehead"] },
  { title: "Teeth", rows: ["Brighten", "Whiten"] },
  { title: "Face Skin", rows: ["Smoothen", "Brighten", "Remove Shine"] },
  { title: "Eyes", rows: ["Brighten", "Eyebags", "Glass Glare"] },
  { title: "Hair", rows: ["Flyaway"] },
  { title: "Body Skin", rows: ["Blemish", "Smoothen"] },
];

export function RetouchPanel() {
  const [subject, setSubject] = useState<Subject>("all");
  const [individual, setIndividual] = useState(true);
  const [showFaceFrame, setShowFaceFrame] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <SubjectChips
        active={subject}
        onChange={setSubject}
        individual={individual}
        onIndividualChange={setIndividual}
      />

      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] leading-4 text-[#ababab]">
        <Checkbox checked={showFaceFrame} onChange={setShowFaceFrame} />
        Show face frames
      </label>

      <PresetsSection preset={preset} onPresetChange={setPreset} />

      {SECTIONS.map((s) => (
        <Section key={s.title} title={s.title}>
          {s.rows.map((label) => (
            <SliderRow key={label} label={label} />
          ))}
        </Section>
      ))}
    </div>
  );
}

/* ---------------- Subject chips ---------------- */

function SubjectChips({
  active,
  onChange,
  individual,
  onIndividualChange,
}: {
  active: Subject;
  onChange: (s: Subject) => void;
  individual: boolean;
  onIndividualChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {SUBJECTS.map((s) => {
        if (s.id === "individual") {
          // The Individual chip behaves like an independent toggle.
          return (
            <Chip key={s.id} active={individual} onClick={() => onIndividualChange(!individual)}>
              {s.label}
            </Chip>
          );
        }
        return (
          <Chip key={s.id} active={active === s.id} onClick={() => onChange(s.id)}>
            {s.label}
          </Chip>
        );
      })}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-6 items-center gap-1 overflow-clip rounded border-[0.5px] border-solid bg-[#242424] px-2 py-1 text-[13px] leading-4 transition-colors ${
        active
          ? "border-[#777] text-[#e2e2e2]"
          : "border-transparent text-[#ababab] hover:border-[#474747]"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Presets ---------------- */

function PresetsSection({
  preset,
  onPresetChange,
}: {
  preset: string | null;
  onPresetChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="flex flex-col gap-3 border-t border-white/5 pt-3">
      <div className="flex h-6 items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-200"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
            strokeWidth={2}
          />
          Presets
        </button>
        <IconTooltip label="Add preset">
          <button
            type="button"
            className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </IconTooltip>
      </div>
      {open && (
        <Dropdown
          value={preset}
          options={PRESETS}
          onChange={onPresetChange}
          placeholder="Select a preset..."
          size="sm"
        />
      )}
    </section>
  );
}
