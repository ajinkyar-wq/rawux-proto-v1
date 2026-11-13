import { useState } from "react";
import { ChevronDown, Eye, Plus, RotateCcw } from "lucide-react";
import { Checkbox, Dropdown, RangeSlider } from "../primitives";
import { IconTooltip } from "../IconTooltip";
import { SliderScopeContext, sliderDisplay, useHistorySlider } from "../history/album-history";

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
    <div className="flex flex-col gap-2.5">
      <SubjectChips
        active={subject}
        onChange={setSubject}
        individual={individual}
        onIndividualChange={setIndividual}
      />

      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-neutral-300">
        <Checkbox checked={showFaceFrame} onChange={setShowFaceFrame} />
        Show Face frame
      </label>

      <PresetsSection preset={preset} onPresetChange={setPreset} />

      {SECTIONS.map((s) => (
        <SliderSection key={s.title} title={s.title} rows={s.rows} />
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
    <div className="flex flex-wrap items-center gap-1.5">
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
      className={`flex h-6 items-center rounded px-2 text-[11px] transition-colors ${
        active
          ? "bg-white/15 text-white"
          : "bg-[#222] text-neutral-400 hover:bg-[#262626] hover:text-neutral-200"
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[11px] font-semibold text-white"
        >
          <ChevronDown
            className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
            strokeWidth={1.75}
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
    </div>
  );
}

/* ---------------- Slider section (Face Blemish, etc.) ---------------- */

function SliderSection({ title, rows }: { title: string; rows: string[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-1.5">
      <SectionHeader title={title} open={open} onToggle={() => setOpen((v) => !v)} />
      {open && (
        <div className="flex flex-col gap-1.5">
          <SliderScopeContext.Provider value={title}>
            {rows.map((label) => (
              <SliderRow key={label} label={label} />
            ))}
          </SliderScopeContext.Provider>
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-[11px] font-semibold text-white"
      >
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
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
  );
}

function SliderRow({ label }: { label: string }) {
  // midpoint (50) = 0. Value is per image and recorded in history.
  const { value, onChange, onCommit } = useHistorySlider(label, 50, (p) => sliderDisplay(p));
  const display = Math.round(((value - 50) / 50) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-[88px] shrink-0 text-[11px] text-neutral-400">{label}</span>
      <div className="flex-1">
        <RangeSlider value={value} onChange={onChange} onCommit={onCommit} />
      </div>
      <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-neutral-400">
        {display > 0 ? `+${display}` : display}
      </span>
    </div>
  );
}
