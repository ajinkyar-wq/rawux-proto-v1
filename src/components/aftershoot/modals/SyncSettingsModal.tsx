import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, X } from "lucide-react";
import type { Tool } from "../history/album-history";
import { toolOfKey } from "../history/edit-state";

// "Sync and Copy Settings": which of the image's settings Sync / Paste carry
// across images — every editing slider plus Crop, Masking, Retouching and
// Background. Opened from the gear next to the loupe footer's Sync button, and
// by Sync itself (unless "Always use these settings" is on).

/* ---------------- Which stored keys each checkbox covers ---------------- */

// Stored keys are `tool:scope/label` (see sliderKey in album-history).
type ParsedKey = { tool: Tool | null; scope: string; label: string };
function parseKey(key: string): ParsedKey {
  const colon = key.indexOf(":");
  // Seeded summary keys ("preset", "crop", "mask") have no scope.
  if (colon < 0)
    return { tool: toolOfKey(key), scope: "", label: key.charAt(0).toUpperCase() + key.slice(1) };
  const slash = key.indexOf("/", colon);
  return {
    tool: toolOfKey(key),
    scope: key.slice(colon + 1, slash),
    label: key.slice(slash + 1),
  };
}
type Match = (k: ParsedKey) => boolean;

/** Whole tool (Crop, Masking). */
const tool =
  (t: Tool): Match =>
  (k) =>
    k.tool === t;
/** Everything in these sections, incl. their tabs ("Color Mixer · Hue"). */
const scope =
  (t: Tool, ...scopes: string[]): Match =>
  (k) =>
    k.tool === t && scopes.some((s) => k.scope === s || k.scope.startsWith(`${s} · `));
/** These controls in one section (multi-value ones like "Position.x" too). */
const labels =
  (t: Tool, sc: string, ...names: string[]): Match =>
  (k) =>
    k.tool === t &&
    k.scope === sc &&
    names.some((n) => k.label === n || k.label.startsWith(`${n}.`));
const none: Match = () => false;

type Leaf = { label: string; match: Match };
type Group = { name: string; match?: Match; children?: Leaf[] };

const WB_PROFILE = labels("edit", "White Balance", "WB Profile");
const MIXER_ALL = scope("edit", "Color Mixer · All");
const RETOUCH_SECTIONS = [
  "Face Blemish",
  "Face Wrinkles",
  "Teeth",
  "Face Skin",
  "Eyes",
  "Hair",
  "Body Skin",
];

const COLUMNS: Group[][] = [
  [
    { name: "Color Profile", match: labels("edit", "", "Color Profile") },
    { name: "AI Profile & Preset", match: labels("edit", "", "AI Profile", "Preset") },
    {
      name: "White Balance",
      children: [
        // The WB Profile dropdown travels with either slider.
        {
          label: "Temperature",
          match: (k) => labels("edit", "White Balance", "Temperature")(k) || WB_PROFILE(k),
        },
        {
          label: "Tint",
          match: (k) => labels("edit", "White Balance", "Tint")(k) || WB_PROFILE(k),
        },
      ],
    },
    {
      name: "Light",
      children: ["Exposure", "Contrast", "Highlights", "Shadows", "Whites", "Blacks"].map((l) => ({
        label: l,
        match: labels("edit", "Light", l),
      })),
    },
    {
      name: "Presence",
      children: [
        { label: "Texture", match: labels("edit", "Presence", "Texture") },
        { label: "Clarity", match: labels("edit", "Presence", "Clarity") },
        { label: "De-Haze", match: labels("edit", "Presence", "Dehaze") },
        { label: "Vibrance", match: labels("edit", "Presence", "Vibrance") },
        { label: "Saturation", match: labels("edit", "Presence", "Saturation") },
      ],
    },
  ],
  [
    {
      name: "Curve",
      children: [
        { label: "Parametric Curve", match: none },
        { label: "Point Curve", match: scope("edit", "Curves") },
      ],
    },
    {
      name: "HSL",
      // The mixer's ALL tab travels with any of the three.
      children: ["Hue", "Saturation", "Luminance"].map((l) => ({
        label: l,
        match: (k: ParsedKey) => scope("edit", `Color Mixer · ${l}`)(k) || MIXER_ALL(k),
      })),
    },
    { name: "Color Grading", match: scope("edit", "Color Grading") },
    {
      name: "Effects",
      children: [
        { label: "Vignette", match: none },
        { label: "Grain", match: none },
      ],
    },
    {
      name: "Detail",
      children: [
        { label: "AI Denoise*", match: none },
        { label: "Sharpening", match: scope("edit", "Sharpening") },
        { label: "Manual Noise Reduction", match: scope("edit", "Manual noise reduction") },
      ],
    },
  ],
  [
    {
      name: "Lens Corrections",
      children: [
        { label: "Remove Chromatic Aberration", match: none },
        { label: "Enable Profile Corrections", match: none },
      ],
    },
    {
      name: "Calibration",
      children: [
        { label: "Shadows Tint", match: scope("edit", "Shadows") },
        { label: "Red Primary", match: scope("edit", "Red primary") },
        { label: "Green Primary", match: scope("edit", "Green primary") },
        { label: "Blue Primary", match: scope("edit", "Blue primary") },
      ],
    },
    { name: "Crop & Straighten Angle", match: tool("crop") },
    { name: "Masking", match: tool("mask") },
  ],
  [
    {
      name: "Retouching",
      children: [
        { label: "Retouch Preset", match: labels("retouch", "", "Preset") },
        ...RETOUCH_SECTIONS.map((s) => ({ label: s, match: scope("retouch", s) })),
      ],
    },
    {
      name: "Background",
      children: [
        { label: "Backdrop", match: labels("background", "", "Background") },
        { label: "Fill & Position", match: labels("background", "", "Fill", "Position") },
        {
          label: "Flip & Rotation",
          match: labels("background", "", "Flip Horizontal", "Flip Vertical", "Rotation"),
        },
        { label: "AI Shadows", match: labels("background", "", "AI Shadows", "Intensity") },
      ],
    },
  ],
];

const GROUPS = COLUMNS.flat();
// Leaf ids: "Group/Child", or just "Group" for groups without children.
const leafIds = (g: Group) =>
  g.children ? g.children.map((c) => `${g.name}/${c.label}`) : [g.name];
const ALL_LEAVES = GROUPS.flatMap(leafIds);
const MATCHERS: [string, Match][] = GROUPS.flatMap((g) =>
  g.children
    ? g.children.map((c): [string, Match] => [`${g.name}/${c.label}`, c.match])
    : [[g.name, g.match ?? none] as [string, Match]],
);

/* ---------------- Settings store (shared by Sync and Paste) ---------------- */

export type SyncSettings = { selected: Set<string>; alwaysUse: boolean };
// Everything is on by default: Sync carries the whole image.
export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  selected: new Set(ALL_LEAVES),
  alwaysUse: false,
};

let current = DEFAULT_SYNC_SETTINGS;
const listeners = new Set<() => void>();
export function setSyncSettings(s: SyncSettings) {
  current = s;
  listeners.forEach((l) => l());
}
export const getSyncSettings = () => current;
export function useSyncSettings(): SyncSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => DEFAULT_SYNC_SETTINGS,
  );
}

/** Whether a stored key is carried by Sync / Paste under these settings. */
export function syncMatcher(s: SyncSettings): (key: string) => boolean {
  const on = MATCHERS.filter(([id]) => s.selected.has(id)).map(([, m]) => m);
  return (key) => {
    const k = parseKey(key);
    return on.some((m) => m(k));
  };
}

export const allSettingsSelected = (s: SyncSettings) => ALL_LEAVES.every((l) => s.selected.has(l));

/* ---------------- Modal ---------------- */

type CheckState = "on" | "off" | "mixed";
const stateOf = (leaves: string[], sel: Set<string>): CheckState => {
  const n = leaves.filter((l) => sel.has(l)).length;
  return n === 0 ? "off" : n === leaves.length ? "on" : "mixed";
};

export function SyncSettingsModal({
  initial,
  onClose,
  onSave,
  sync,
}: {
  initial: SyncSettings;
  onClose: () => void;
  /** Saves the settings (and, from Sync, runs the sync with them). */
  onSave: (s: SyncSettings) => void;
  /** Opened by Sync: the primary button syncs the current image to `count` others. */
  sync?: { from: string; count: number };
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

  const nothing = selected.size === 0;
  const photos = sync && (sync.count === 1 ? "1 photo" : `${sync.count} photos`);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Sync and Copy Settings"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-[880px] max-w-full flex-col rounded-xl border border-white/15 bg-[#1c1c1c] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-white">Sync and Copy Settings</h2>
            <p className="mt-1.5 text-[13px] text-neutral-400">
              {sync
                ? `Select the settings to sync from ${sync.from} to ${photos}.`
                : "Select all the settings that you want to use when syncing or copying edits."}
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
                const leaves = leafIds(g);
                return (
                  <div key={g.name} className="flex flex-col gap-2">
                    <CheckRow
                      label={g.name}
                      state={stateOf(leaves, selected)}
                      onToggle={() => toggle(leaves)}
                    />
                    {g.children?.map((c) => {
                      const id = `${g.name}/${c.label}`;
                      return (
                        <CheckRow
                          key={id}
                          label={c.label}
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
            label="Always use these settings"
            state={alwaysUse ? "on" : "off"}
            onToggle={() => setAlwaysUse((v) => !v)}
          />
          <button
            type="button"
            disabled={!!sync && nothing}
            onClick={() => {
              onSave({ selected, alwaysUse });
              onClose();
            }}
            className="h-9 rounded-md bg-[#3b5bff] px-5 text-[13px] font-medium text-white hover:bg-[#4a68ff] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sync ? "Sync" : "Save"}
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
