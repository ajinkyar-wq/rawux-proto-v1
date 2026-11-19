import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Crop,
  SlidersHorizontal,
  Eye,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shapes,
  Zap,
} from "lucide-react";
import type { ActionStatus } from "../action-status";
import { setEditPrefs, useEditPrefs, type EditPrefs } from "./edit-prefs";
import { Section } from "../loupe/EditPanel";

// Grid-view editing panels.
//
// UI-1 "AI Editing" rail tab (AIEditingPanel):
//   Before AI Edit: AI Profiles (preview + profile name + customize) → AI tool
//   toggles (Crop & Straighten / Masking / Denoise) → pinned "Edit N Photos".
//   After AI Edit: all of that is replaced by a collapsible "Editing" section
//   (Restart re-runs AI Edit) holding the Quick Edits steppers.
//
// UI-2 splits this up: the toggles get their own "AI Tools" tab
// (AIToolsPanel) and the profile / Quick Edits move into the combined
// Edit & Retouch panel (EditRetouchPanel.tsx) via EditingSection.

const AI_TOOLS = [
  { id: "crop", label: "AI Crop & Straighten" },
  { id: "mask", label: "AI Masking" },
  { id: "denoise", label: "AI Denoise" },
] as const;
type ToolId = (typeof AI_TOOLS)[number]["id"];

export const PHOTO_COUNT = 300;

export function AIEditingPanel({
  status,
  onRunEdit,
  onRestart,
  onBrowseProfiles,
}: {
  status: ActionStatus;
  // Starts the AI Edit right away with the selected profile.
  onRunEdit: () => void;
  // Restart: back to Edit Preferences (previous choices kept).
  onRestart?: () => void;
  // Opens the Start Editing modal (browse / create AI Profiles).
  onBrowseProfiles: () => void;
}) {
  if (status === "complete")
    return (
      <div className="-mr-2 flex min-h-0 flex-1 animate-[fadeIn_220ms_ease-out] flex-col gap-2 overflow-y-auto pr-2">
        <EditingSection
          status={status}
          onRunEdit={onRunEdit}
          onRestart={onRestart}
          onBrowseProfiles={onBrowseProfiles}
        />
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
        <h2 className="shrink-0 text-[15px] font-semibold text-white">Edit Preferences</h2>
        <EditPreferences onBrowseProfiles={onBrowseProfiles} withTools />
      </div>
      <EditRunButton status={status} onClick={onRunEdit} className="mt-3" />
    </div>
  );
}

// UI-2 "AI Tools" rail tab: Crop & Straighten / Masking / Denoise on their own.
export function AIToolsPanel() {
  return (
    <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
        <Shapes className="h-3.5 w-3.5" strokeWidth={1.5} />
        AI Tools
      </span>
      <AIToolToggles />
    </div>
  );
}

// Collapsible "Editing" section. Before AI Edit: profile + Edit button
// (`withProfile`); after: Restart + Quick Edits.
export function EditingSection({
  status,
  onRunEdit,
  onRestart,
  onBrowseProfiles,
  withProfile = false,
  withTools = false,
}: {
  status: ActionStatus;
  onRunEdit: () => void;
  onRestart?: () => void;
  onBrowseProfiles: () => void;
  withProfile?: boolean;
  /** One-tab layout: the AI tool toggles sit between the profile and the Edit button. */
  withTools?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const done = status === "complete";
  if (done)
    return (
      <section className="flex shrink-0 flex-col gap-4">
        <EditingSummary onRestart={onRestart ?? onRunEdit} />
        <QuickEdits />
      </section>
    );
  return (
    <section className="flex shrink-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between">
        <SectionToggle
          title="Editing"
          open={open}
          onToggle={() => setOpen((v) => !v)}
          info={done}
        />
        {done && (
          <button
            type="button"
            onClick={onRunEdit}
            className="rounded-md bg-white/10 px-2 py-1 text-[11px] text-neutral-200 hover:bg-white/15 hover:text-white"
          >
            Restart
          </button>
        )}
      </div>
      {open &&
        (done ? (
          <QuickEdits />
        ) : withProfile ? (
          <>
            <EditPreferences onBrowseProfiles={onBrowseProfiles} withTools={withTools} />
            <EditRunButton status={status} onClick={onRunEdit} />
          </>
        ) : null)}
    </section>
  );
}

// After AI Edit: what was applied — profile · colour profile, then the AI
// tools that ran — with Restart to run it again.
function EditingSummary({ onRestart }: { onRestart: () => void }) {
  const prefs = useEditPrefs();
  const cropOnly = prefs.profile === CROP_ONLY;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between pb-0.5">
        <span className="text-[14px] text-white">Editing Complete</span>
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 text-[13px] text-neutral-300 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          Restart
        </button>
      </div>
      <p className="text-[11.5px] leading-4 text-neutral-400">
        {cropOnly ? CROP_ONLY : `${prefs.profile}  ·  ${prefs.colorProfile}`}
      </p>
      <p className="text-[11.5px] leading-4 text-neutral-400">{toolsSummary(prefs)}</p>
    </div>
  );
}

function toolsSummary(p: EditPrefs) {
  const style = p.cropStyle.split(" - ").pop();
  const tools = [
    p.cropping && `AI Cropping (${style}, ${p.cropRatio})`,
    p.straighten && "AI Straightening",
    p.masking && "AI Masking",
  ].filter(Boolean);
  return tools.length ? tools.join(" · ") : "No AI tools";
}

// "▾ Title" collapsible section header.
export function SectionToggle({
  title,
  open,
  onToggle,
  info,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  info?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 text-[13px] font-medium text-white"
    >
      <ChevronDown
        className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
        strokeWidth={2}
      />
      {title}
      {info && <Info className="h-3 w-3 text-neutral-500" strokeWidth={1.75} />}
    </button>
  );
}

// AI Profile picker: inline dropdown. Picking a profile here just selects it —
// the "Edit N Photos" button then starts editing directly. Only "Explore
// Profiles" / "Create or Browse AI Profiles" open the Start Editing modal.
const CROP_ONLY = "Crop & Straighten only";
type Profile = {
  name: string;
  kind: "instant" | "downloaded";
  format: "RAW" | "JPEG";
  // Instant profiles: tinted tile with the profile mark.
  tint?: string;
  // Downloaded profiles: one photo, or three for a collage thumbnail.
  photos?: string[];
  adjusted?: boolean;
};

const photo = (seed: string) => `https://picsum.photos/seed/aiprofile-${seed}/160/100`;

const INSTANT_PROFILES: Profile[] = [
  { name: "My Style 3", kind: "instant", format: "RAW", tint: "#f5c8fa" },
  { name: "My Style 4", kind: "instant", format: "RAW", tint: "#e8d491" },
  { name: "My Style 9", kind: "instant", format: "RAW", tint: "#f5c8fa" },
  { name: "My Style 10", kind: "instant", format: "RAW", tint: "#e8d491" },
];

const DOWNLOADED_PROFILES: Profile[] = [
  { name: "Graicard", kind: "downloaded", format: "RAW", photos: [photo("graicard")] },
  { name: "True to Life", kind: "downloaded", format: "RAW", photos: [photo("truelife")] },
  { name: "Brownies", kind: "downloaded", format: "RAW", photos: [photo("brownies")] },
  { name: "Crispy Cream", kind: "downloaded", format: "RAW", photos: [photo("crispy")] },
  { name: "Leo by Esteban Ruiz", kind: "downloaded", format: "RAW", photos: [photo("leo")] },
  {
    name: "Portra 400 by Maya Lin",
    kind: "downloaded",
    format: "RAW",
    photos: [photo("portra-a"), photo("portra-b"), photo("portra-c")],
  },
  {
    name: "Fuji 400H by Mark Cole",
    kind: "downloaded",
    format: "RAW",
    photos: [photo("fuji-a"), photo("fuji-b"), photo("fuji-c")],
  },
  // JPEG profiles can't run on this RAW album — listed but disabled.
  {
    name: "Lemon Zest",
    kind: "downloaded",
    format: "JPEG",
    photos: [photo("lemon")],
    adjusted: true,
  },
  {
    name: "Tropical Sorbet",
    kind: "downloaded",
    format: "JPEG",
    photos: [photo("sorbet")],
    adjusted: true,
  },
  { name: "JPEG Graicard", kind: "downloaded", format: "JPEG", photos: [photo("jpeg-graicard")] },
];

const ALL_PROFILES = [...INSTANT_PROFILES, ...DOWNLOADED_PROFILES];

// Edit Preferences body: AI Profile picker, then (for a real profile)
// Customize + Color Profile, then the AI Cropping / Straightening / Masking
// controls. "Crop & Straighten only" drops the profile extras and locks
// AI Masking to "Subject Mask Only".
function EditPreferences({
  onBrowseProfiles,
  withTools,
}: {
  onBrowseProfiles: () => void;
  // False when AI tools live in their own rail tab (UI-2 separate tabs).
  withTools: boolean;
}) {
  const prefs = useEditPrefs();
  const profile = prefs.profile;
  const setProfile = (p: string) => setEditPrefs({ profile: p });
  const cropOnly = profile === CROP_ONLY;
  return (
    <div className="flex shrink-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <ProfileBlock profile={profile} onChange={setProfile} onBrowseProfiles={onBrowseProfiles} />
        {!cropOnly && (
          <button
            type="button"
            className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-white/[0.08] text-[12px] text-white hover:bg-white/[0.12]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
            Customize Profile
          </button>
        )}
      </div>
      {!cropOnly && (
        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-neutral-200">Color Profile</span>
          <Select
            options={COLOR_PROFILES}
            value={prefs.colorProfile}
            onChange={(v) => setEditPrefs({ colorProfile: v })}
          />
        </div>
      )}
      {withTools && <AIToolPreferences cropOnly={cropOnly} />}
    </div>
  );
}

const COLOR_PROFILES = [
  "Adobe Color",
  "Adobe Standard",
  "Adobe Portrait",
  "Adobe Landscape",
  "Camera Matching",
];
const CROP_STYLES = [
  "General - Loose",
  "General - Aggressive",
  "Portrait - Loose",
  "Portrait - Aggressive",
];
const CROP_RATIOS = ["Original", "2 : 3", "4 : 5", "5 : 7", "1 : 1", "16 : 9"];
const MASK_TYPES = [
  "Subject Mask Only",
  "Subject + Sky",
  "Subject + Background",
  "Subject + Sky + Background",
];
const FEATHER_LABELS = ["Sharp", "Medium", "Soft"];

function AIToolPreferences({ cropOnly }: { cropOnly: boolean }) {
  const prefs = useEditPrefs();
  const { cropping, straighten, masking } = prefs;
  const setCropping = (v: boolean) => setEditPrefs({ cropping: v });
  const setStraighten = (v: boolean) => setEditPrefs({ straighten: v });
  const setMasking = (v: boolean) => setEditPrefs({ masking: v });
  const [feather, setFeather] = useState(50);
  const featherIdx = feather < 34 ? 0 : feather > 66 ? 2 : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <PrefToggle label="AI Cropping" checked={cropping} onChange={setCropping} />
        {cropping && (
          <div className="flex gap-2">
            <Select
              options={CROP_STYLES}
              className="flex-[3]"
              value={prefs.cropStyle}
              onChange={(v) => setEditPrefs({ cropStyle: v })}
            />
            <Select
              options={CROP_RATIOS}
              className="flex-[2]"
              value={prefs.cropRatio}
              onChange={(v) => setEditPrefs({ cropRatio: v })}
            />
          </div>
        )}
      </div>

      <PrefToggle label="AI Straightening" checked={straighten} onChange={setStraighten} />

      <div className="flex flex-col gap-2">
        <PrefToggle label="AI Masking" checked={masking} onChange={setMasking} />
        {masking && (
          // Crop & Straighten only supports a subject mask, so the picker is locked.
          <Select
            options={MASK_TYPES}
            disabled={cropOnly}
            value={cropOnly ? MASK_TYPES[0] : prefs.maskType}
            onChange={(v) => setEditPrefs({ maskType: v })}
          />
        )}
      </div>

      {masking && (
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[12px] text-neutral-200">
            Mask Feathering
            <Info className="h-3 w-3 text-neutral-500" strokeWidth={1.75} />
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={feather}
            onChange={(e) => setFeather(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-1 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:bg-neutral-400"
            style={{
              background: `linear-gradient(to right, #3b5bff ${feather}%, #3a3a3a ${feather}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider">
            {FEATHER_LABELS.map((l, i) => (
              <span key={l} className={i === featherIdx ? "text-neutral-200" : "text-neutral-500"}>
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrefToggle({
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
      <span className="flex items-center gap-1.5 text-[12px] text-neutral-200">
        {label}
        <Info className="h-3 w-3 text-neutral-500" strokeWidth={1.75} />
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-[#3b5bff]" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// Custom dropdown (not the native <select>) so the menu matches the app's
// dark styling, like the AI Profile picker.
function Select({
  options,
  defaultValue,
  disabled,
  className = "",
  value: controlled,
  onChange,
}: {
  options: string[];
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  /** Controlled value (kept in the shared Edit Preferences). */
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [local, setLocal] = useState(defaultValue ?? options[0]);
  const value = controlled ?? local;
  const setValue = (v: string) => {
    setLocal(v);
    onChange?.(v);
  };
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
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 w-full items-center rounded-md border pl-2.5 pr-2 text-left text-[12px] ${
          disabled
            ? "cursor-not-allowed border-white/10 text-neutral-500"
            : `text-white hover:border-white/25 ${open ? "border-white/25" : "border-white/15"}`
        }`}
      >
        <span className="flex-1 truncate">{value}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            disabled ? "text-neutral-600" : "text-neutral-400"
          } ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-white/15 bg-[#1c1c1c] py-1 shadow-2xl">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                setValue(o);
                setOpen(false);
              }}
              className={`flex h-8 w-full items-center px-2.5 text-left text-[12px] text-white ${
                o === value ? "bg-[#2b3242]" : "hover:bg-white/[0.05]"
              }`}
            >
              <span className="truncate">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileBlock({
  profile,
  onChange,
  onBrowseProfiles,
}: {
  profile: string;
  onChange: (p: string) => void;
  onBrowseProfiles: () => void;
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

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
  };
  const browse = () => {
    setOpen(false);
    onBrowseProfiles();
  };
  const selected = ALL_PROFILES.find((p) => p.name === profile);

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-neutral-200">AI Profile</span>
        <button
          type="button"
          onClick={browse}
          className="flex items-center gap-1 text-[11.5px] text-neutral-400 hover:text-white"
        >
          <Search className="h-3 w-3" strokeWidth={1.75} />
          Explore Profiles
        </button>
      </div>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-[52px] w-full items-center gap-2 rounded-lg border border-white/15 bg-[#1c1c1c] px-2.5 hover:bg-[#222]"
        >
          {selected ? <ProfileRowContent profile={selected} /> : <CropOnlyContent />}
          <ChevronDown
            className={`ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={1.75}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[420px] overflow-y-auto rounded-lg border border-white/15 bg-[#1c1c1c] py-1 shadow-2xl">
            <button
              type="button"
              onClick={browse}
              className="flex h-9 w-full items-center gap-2.5 px-3 text-left text-[12.5px] text-white hover:bg-white/[0.05]"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Create or Browse AI Profiles
            </button>
            <button
              type="button"
              onClick={() => pick(CROP_ONLY)}
              className={`flex h-9 w-full items-center gap-2.5 px-3 text-left text-[12.5px] text-white hover:bg-white/[0.05] ${
                profile === CROP_ONLY ? "bg-[#2b3242]" : ""
              }`}
            >
              <Crop className="h-4 w-4" strokeWidth={1.5} />
              {CROP_ONLY}
            </button>
            {(
              [
                ["Instant Profile", INSTANT_PROFILES],
                ["Downloaded", DOWNLOADED_PROFILES],
              ] as const
            ).map(([heading, list]) => (
              <div key={heading}>
                <div className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {heading}
                </div>
                {list.map((p) => {
                  const unavailable = p.format === "JPEG";
                  return (
                    <button
                      key={p.name}
                      type="button"
                      disabled={unavailable}
                      title={
                        unavailable ? "JPEG profiles can't be applied to RAW photos" : undefined
                      }
                      onClick={() => pick(p.name)}
                      className={`flex min-h-[52px] w-full items-center gap-2 px-3 py-2 text-left disabled:cursor-not-allowed ${
                        p.name === profile ? "bg-[#2b3242]" : "hover:bg-white/[0.05]"
                      }`}
                    >
                      <ProfileRowContent profile={p} dimmed={unavailable} />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRowContent({ profile, dimmed }: { profile: Profile; dimmed?: boolean }) {
  return (
    <>
      <ProfileThumb profile={profile} dimmed={dimmed} />
      {profile.kind === "instant" ? (
        <Zap className="h-3.5 w-3.5 shrink-0 fill-[#d9c03a] text-[#d9c03a]" strokeWidth={1.5} />
      ) : (
        <span
          className={`flex h-4 shrink-0 items-center rounded-[3px] bg-[#001e36] px-[3px] text-[8.5px] font-bold text-[#31a8ff] ${
            dimmed ? "opacity-40" : ""
          }`}
        >
          LrC
        </span>
      )}
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span className="flex min-w-0 max-w-full items-center gap-1.5">
          <span
            className={`truncate text-[12.5px] ${dimmed ? "text-neutral-500" : "text-neutral-300"}`}
          >
            {profile.name}
          </span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              profile.format === "RAW" ? "bg-[#2f6b45] text-white" : "bg-[#24406e] text-[#8fb0e8]"
            }`}
          >
            {profile.format}
          </span>
        </span>
        {profile.adjusted && (
          <span className="flex items-center gap-1 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-neutral-500">
            <SlidersHorizontal className="h-2.5 w-2.5" strokeWidth={1.75} />
            Adjusted
          </span>
        )}
      </span>
    </>
  );
}

function ProfileThumb({ profile, dimmed }: { profile: Profile; dimmed?: boolean }) {
  const box = `h-[34px] w-[56px] shrink-0 overflow-hidden rounded ${dimmed ? "opacity-40" : ""}`;
  if (profile.tint)
    return (
      <span
        className={`flex items-center justify-center ${box}`}
        style={{ backgroundColor: profile.tint }}
      >
        <ProfileMark />
      </span>
    );
  const photos = profile.photos ?? [];
  if (photos.length > 1)
    return (
      <span className={`flex gap-px bg-white p-px ${box}`}>
        {photos.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            className="h-full min-w-0 flex-1 rounded-[2px] object-cover"
          />
        ))}
      </span>
    );
  return (
    <span className={`bg-neutral-800 ${box}`}>
      {photos[0] && <img src={photos[0]} alt="" className="h-full w-full object-cover" />}
    </span>
  );
}

function CropOnlyContent() {
  return (
    <>
      <span className="flex h-[34px] shrink-0 items-center px-1">
        <Crop className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
      </span>
      <span className="truncate text-[12.5px] text-neutral-300">{CROP_ONLY}</span>
    </>
  );
}

// Placeholder profile glyph shown on the tinted thumbnail.
function ProfileMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 21 L10.5 4 Q12 1 13.5 4 L19 21 M7.5 13.5 H15 Q19 13.5 18 17.5 Q17 21 13 20 Q9 19 11 15"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AIToolToggles() {
  const [tools, setTools] = useState<Set<ToolId>>(new Set());
  const toggleTool = (id: ToolId) =>
    setTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="flex shrink-0 flex-col border-t border-white/5">
      {AI_TOOLS.map((tool) => {
        const on = tools.has(tool.id);
        return (
          <button
            key={tool.id}
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => toggleTool(tool.id)}
            className="flex h-9 items-center justify-between border-b border-white/5 text-left"
          >
            <span className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-400">
              {tool.label}
            </span>
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                on ? "bg-[#2f55d4]" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${
                  on ? "left-3.5 bg-white" : "left-0.5 bg-neutral-400"
                }`}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EditRunButton({
  status,
  onClick,
  className = "",
}: {
  status: ActionStatus;
  onClick: () => void;
  className?: string;
}) {
  const running = status === "running";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running}
      className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-[#2f55d4] text-[12.5px] font-medium text-white hover:bg-[#3a60e0] disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {running && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
      {running ? "Editing…" : `Edit ${PHOTO_COUNT} Photos`}
    </button>
  );
}

/* ------------------------------ Quick Edits ----------------------------- */

const QUICK_EDIT_GROUPS = [
  { title: "White Balance", sliders: ["Temperature", "Tint"] },
  {
    title: "Presence",
    sliders: ["Exposure", "Contrast", "Highlights", "Shadows", "Blacks", "Whites"],
  },
];
const BIG_STEP = 5;

function QuickEdits() {
  const [values, setValues] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const nudge = (label: string, delta: number) =>
    setValues((v) => ({ ...v, [label]: Math.max(-100, Math.min(100, (v[label] ?? 0) + delta)) }));
  const resetGroup = (sliders: string[]) =>
    setValues((v) => {
      const next = { ...v };
      sliders.forEach((l) => delete next[l]);
      return next;
    });
  const toggleHidden = (title: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    // Same accordion as the loupe panel sections (WHITE BALANCE, LIGHT…).
    <Section title="Quick Edits">
      {QUICK_EDIT_GROUPS.map((group, gi) => (
        <section
          key={group.title}
          className={`flex flex-col gap-1.5 ${gi > 0 ? "border-t border-white/5 pt-2" : ""}`}
        >
          <div className="flex h-7 items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-300">
              {group.title}
            </span>
            <div className="flex items-center gap-2 text-neutral-500">
              <button
                type="button"
                aria-label={`Toggle ${group.title}`}
                onClick={() => toggleHidden(group.title)}
                className={`hover:text-neutral-300 ${hidden.has(group.title) ? "opacity-40" : ""}`}
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={`Reset ${group.title}`}
                onClick={() => resetGroup(group.sliders)}
                className="hover:text-neutral-300"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          {group.sliders.map((label) => (
            <div key={label} className="flex h-7 items-center justify-between">
              <span className="text-[12px] text-neutral-400">{label}</span>
              <div className="flex h-6 items-center rounded bg-[#242424]">
                <StepBtn label={`${label} -${BIG_STEP}`} onClick={() => nudge(label, -BIG_STEP)}>
                  <Tri dir="left" double />
                </StepBtn>
                <StepBtn label={`${label} -1`} onClick={() => nudge(label, -1)}>
                  <Tri dir="left" />
                </StepBtn>
                <StepBtn label={`${label} +1`} onClick={() => nudge(label, 1)}>
                  <Tri dir="right" />
                </StepBtn>
                <StepBtn
                  label={`${label} +${BIG_STEP}`}
                  onClick={() => nudge(label, BIG_STEP)}
                  last
                >
                  <Tri dir="right" double />
                </StepBtn>
              </div>
            </div>
          ))}
        </section>
      ))}
    </Section>
  );
}

function StepBtn({
  children,
  label,
  onClick,
  last,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  last?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-full w-7 items-center justify-center text-neutral-300 hover:text-white ${
        last ? "" : "border-r border-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

// Filled triangle(s) used by the Quick Edits steppers.
function Tri({ dir, double }: { dir: "left" | "right"; double?: boolean }) {
  const one = dir === "left" ? "M5 0 L0 4 L5 8 Z" : "M0 0 L5 4 L0 8 Z";
  const two = dir === "left" ? "M10 0 L5 4 L10 8 Z" : "M5 0 L10 4 L5 8 Z";
  return (
    <svg
      width={double ? 10 : 5}
      height={8}
      viewBox={`0 0 ${double ? 10 : 5} 8`}
      fill="currentColor"
      aria-hidden
    >
      <path d={one} />
      {double && <path d={two} />}
    </svg>
  );
}
