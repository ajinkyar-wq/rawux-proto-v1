import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, X } from "lucide-react";

// "Sync and Copy Settings": which sliders Sync / Copy carry across images.
// Opened from the gear next to the loupe footer's Sync button.

type Group = { name: string; children?: string[] };

const COLUMNS: Group[][] = [
  [
    { name: "Color Profile" },
    { name: "White Balance", children: ["Temperature", "Tint"] },
    {
      name: "Light",
      children: ["Exposure", "Contrast", "Highlights", "Shadows", "Whites", "Blacks"],
    },
    { name: "Presence", children: ["Texture", "Clarity", "De-Haze", "Vibrance", "Saturation"] },
  ],
  [
    { name: "Curve", children: ["Parametric Curve", "Point Curve"] },
    { name: "HSL", children: ["Hue", "Saturation", "Luminance"] },
    { name: "Color Grading" },
    { name: "Effects", children: ["Vignette", "Grain"] },
    { name: "Detail", children: ["AI Denoise*", "Sharpening", "Manual Noise Reduction"] },
  ],
  [
    {
      name: "Lens Corrections",
      children: ["Remove Chromatic Aberration", "Enable Profile Corrections"],
    },
    {
      name: "Calibration",
      children: ["Shadows Tint", "Red Primary", "Green Primary", "Blue Primary"],
    },
    { name: "Crop & Straighten Angle" },
  ],
  [{ name: "Masking" }],
];

const GROUPS = COLUMNS.flat();
// Leaf ids: "Group/Child", or just "Group" for groups without children.
const leavesOf = (g: Group) => (g.children ? g.children.map((c) => `${g.name}/${c}`) : [g.name]);
const ALL_LEAVES = GROUPS.flatMap(leavesOf);
const OFF_BY_DEFAULT = ["Crop & Straighten Angle", "Masking"];

export const DEFAULT_SYNC_SETTINGS = {
  selected: new Set(ALL_LEAVES.filter((l) => !OFF_BY_DEFAULT.includes(l))),
  alwaysUse: false,
};
export type SyncSettings = typeof DEFAULT_SYNC_SETTINGS;

type CheckState = "on" | "off" | "mixed";
const stateOf = (leaves: string[], sel: Set<string>): CheckState => {
  const n = leaves.filter((l) => sel.has(l)).length;
  return n === 0 ? "off" : n === leaves.length ? "on" : "mixed";
};

export function SyncSettingsModal({
  initial,
  onClose,
  onSave,
}: {
  initial: SyncSettings;
  onClose: () => void;
  onSave: (s: SyncSettings) => void;
}) {
  const [selected, setSelected] = useState(() => new Set(initial.selected));
  const [alwaysUse, setAlwaysUse] = useState(initial.alwaysUse);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Toggling a parent (or Select All) turns all its leaves on, unless they
  // already all are — then off.
  const toggle = (leaves: string[]) =>
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = leaves.every((l) => prev.has(l));
      leaves.forEach((l) => (allOn ? next.delete(l) : next.add(l)));
      return next;
    });

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Sync and Copy Settings"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-[820px] max-w-full flex-col rounded-xl border border-white/15 bg-[#1c1c1c] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-white">Sync and Copy Settings</h2>
            <p className="mt-1.5 text-[13px] text-neutral-400">
              Select all the sliders that you want to use when syncing or copying edits.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <CheckRow
          label="Select All"
          state={stateOf(ALL_LEAVES, selected)}
          onToggle={() => toggle(ALL_LEAVES)}
          className="mt-3"
        />

        <div className="mt-6 grid min-h-0 grid-cols-4 gap-x-6 overflow-y-auto pl-2">
          {COLUMNS.map((col, i) => (
            <div key={i} className="flex flex-col gap-4">
              {col.map((g) => {
                const leaves = leavesOf(g);
                return (
                  <div key={g.name} className="flex flex-col gap-2">
                    <CheckRow
                      label={g.name}
                      state={stateOf(leaves, selected)}
                      onToggle={() => toggle(leaves)}
                    />
                    {g.children?.map((c) => {
                      const id = `${g.name}/${c}`;
                      return (
                        <CheckRow
                          key={id}
                          label={c}
                          state={selected.has(id) ? "on" : "off"}
                          onToggle={() => toggle([id])}
                          className="pl-7"
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <CheckRow
            label="Always use these slider settings"
            state={alwaysUse ? "on" : "off"}
            onToggle={() => setAlwaysUse((v) => !v)}
          />
          <button
            type="button"
            onClick={() => {
              onSave({ selected, alwaysUse });
              onClose();
            }}
            className="h-9 rounded-md bg-[#3b5bff] px-5 text-[13px] font-medium text-white hover:bg-[#4a68ff]"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CheckRow({
  label,
  state,
  onToggle,
  className = "",
}: {
  label: string;
  state: CheckState;
  onToggle: () => void;
  className?: string;
}) {
  const on = state !== "off";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "mixed" ? "mixed" : on}
      onClick={onToggle}
      className={`flex items-start gap-2.5 self-start text-left text-[13px] text-neutral-200 hover:text-white ${className}`}
    >
      <span
        className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] ${
          on ? "bg-[#3b5bff]" : "border border-white/20 bg-white/[0.04]"
        }`}
      >
        {state === "on" && <Check className="h-3 w-3 text-white" strokeWidth={2.5} />}
        {state === "mixed" && <Minus className="h-3 w-3 text-white" strokeWidth={2.5} />}
      </span>
      {label}
    </button>
  );
}
