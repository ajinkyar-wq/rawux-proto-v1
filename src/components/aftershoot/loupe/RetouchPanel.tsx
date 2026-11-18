import { useState } from "react";
import { Checkbox } from "../primitives";
import { InlineSelectRow, Section } from "./EditPanel";
import {
  createRetouchPreset,
  RETOUCH_PRESET_NAMES,
  RETOUCH_PRESET_NONE,
  RetouchPresetsBrowser,
} from "./BrowsePanels";
import { useHistoryChoice } from "../history/album-history";
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
  const [preset, setPreset] = useHistoryChoice("Preset", RETOUCH_PRESET_NAMES, RETOUCH_PRESET_NONE);

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

      {/* "Presets ........ Retouch Preset" — underlined link that opens the list. */}
      <InlineSelectRow
        label="Presets"
        value={preset}
        options={RETOUCH_PRESET_NAMES}
        onChange={setPreset}
        variant="link"
        browse={{
          id: "retouchPresets",
          title: "Retouching Presets",
          onCreate: createRetouchPreset,
          createLabel: "Create retouching preset",
          emptyValue: RETOUCH_PRESET_NONE,
          emptyLabel: "Select Retouch Preset",
          render: (v, pick) => <RetouchPresetsBrowser value={v} onPick={pick} />,
        }}
      />

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
