import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { PrimaryButton, SettingsModal } from "./SettingsModal";

const CROP_RATIOS = ["Default", "3:4", "5:7", "8.5:11", "2:3 / 4:6", "4:5 / 8:10"];
const CROP_STYLES = ["Loose", "Aggressive"] as const;
type CropStyle = (typeof CROP_STYLES)[number];

const AI_PROFILES = ["Lemon Zest", "Bold Punch", "Soft Pastel", "True Tone", "Cinematic"];

// The Edit Settings form: AI Profile + Crop/Straighten/Mask options. Reached
// after picking a style in the Explore view (or any path into editing).
// `initialProfile` pre-fills the AI Profile from the chosen style.
export function EditSettingsForm({
  onClose,
  onBack,
  onStart,
  initialProfile,
}: {
  onClose: () => void;
  onBack?: () => void;
  onStart: () => void;
  initialProfile?: string;
}) {
  const [straighten, setStraighten] = useState(true);
  const [crop, setCrop] = useState(true);
  const [masking, setMasking] = useState(false);
  const [cropStyle, setCropStyle] = useState<CropStyle>("Loose");
  const [cropRatio, setCropRatio] = useState("Default");
  const [profile, setProfile] = useState(initialProfile ?? "Lemon Zest");

  return (
    <SettingsModal
      title="Edit Settings"
      onClose={onClose}
      footer={<PrimaryButton label="Start AI Edit" onClick={onStart} />}
    >
      <div className="flex flex-col gap-4 pt-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 self-start text-[12px] text-neutral-400 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Back to styles
          </button>
        )}

        <Section title="AI Profile">
          <AIProfileRow value={profile} onChange={setProfile} />
        </Section>

        <Section title="Crop, Straighten and Mask">
          <div className="flex flex-col gap-3">
            <ToggleRow label="AI Straighten" checked={straighten} onChange={setStraighten} />
            <ToggleRow label="AI Crop" checked={crop} onChange={setCrop} />

            {crop && (
              <>
                <PillGroup
                  groupLabel="CROP STYLE"
                  options={[...CROP_STYLES]}
                  value={cropStyle}
                  onChange={(v) => setCropStyle(v as CropStyle)}
                />
                <PillGroup
                  groupLabel="CROP RATIO"
                  options={CROP_RATIOS}
                  value={cropRatio}
                  onChange={setCropRatio}
                />
              </>
            )}

            <ToggleRow label="AI Masking" checked={masking} onChange={setMasking} />
          </div>
        </Section>
      </div>
    </SettingsModal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[12px] font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function AIProfileRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center gap-2 rounded border border-white/10 bg-[#242424] px-2.5 hover:bg-[#2a2a2a]"
      >
        <div className="h-6 w-6 rounded border border-white/10" />
        <span className="flex h-5 items-center rounded bg-[#3b5bff] px-1.5 text-[10px] font-semibold text-white">
          LrC
        </span>
        <span className="flex-1 text-left text-[12px] text-white">{value}</span>
        <span className="flex h-5 items-center rounded bg-[#3b5bff] px-1.5 text-[10px] font-semibold text-white">
          JPEG
        </span>
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded border border-white/10 bg-[#1c1c1c] shadow-xl">
          {AI_PROFILES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`flex h-8 w-full items-center px-2.5 text-left text-[12px] text-white hover:bg-white/[0.06] ${
                p === value ? "bg-white/[0.06]" : ""
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-white">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-4 w-7 rounded-full transition-colors ${
        checked ? "bg-[#3b5bff]" : "bg-[#3a3a3a]"
      }`}
    >
      <span
        className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white transition-all ${
          checked ? "left-[14px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function PillGroup({
  groupLabel,
  options,
  value,
  onChange,
}: {
  groupLabel: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold tracking-wider text-neutral-500">{groupLabel}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex h-6 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-[#3b5bff] text-white"
                  : "border border-white/15 bg-transparent text-white hover:bg-white/5"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
