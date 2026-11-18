import { Shapes } from "lucide-react";
import {
  KeyboardIcon,
  OneClickIcon,
  PaletteIcon,
  RetouchIcon,
  ScissorsIcon,
  SprayCanIcon,
  type RailIcon,
} from "./loupe/loupe-rail-config";

export type RailKey =
  // Grid-view side panel tabs: AI Culling / AI Editing / AI Retouching.
  | "cull"
  | "edit"
  | "retouch"
  // UI-2 only: combined Edit & Retouch panel, and the AI Tools tab.
  | "editRetouch"
  // One-tab layout: Editing (with its AI tools) + Retouching in one panel.
  | "editRetouchAll"
  | "aiTools"
  | "info"
  | "history"
  | "oneClick"
  | "cloud"
  | "spray"
  | "keyboard"
  | "settings";

export type RailItem =
  { kind: "icon"; key: RailKey; icon: RailIcon; label: string } | { kind: "divider" };

// Top-level app tabs (toolbar CULL / ENHANCE switch, as in the main app).
// Culling lives in CULL; editing + retouching live in ENHANCE.
export type AppTab = "cull" | "enhance";

// Which layout the album was opened with (picked on the landing screen).
//   oneTab: ENHANCE has a single Editing & Retouching tab. Editing keeps its
//        AI Crop & Straighten / Masking / Denoise toggles; Retouching sits
//        below it in the same panel.
//   ui1: ENHANCE has separate AI Editing / AI Retouching tabs; Crop &
//        Straighten / Masking / Denoise are toggles inside AI Editing.
//   ui2: Editing + Retouching share one panel; Crop & Straighten / Masking /
//        Denoise get their own AI Tools tab.
export type Layout = "oneTab" | "ui1" | "ui2";

// One Click opens the import workflow modal (not a panel) — first in every tab,
// followed by a divider, same as the loupe rail.
const ONE_CLICK: RailItem[] = [
  { kind: "icon", key: "oneClick", icon: OneClickIcon, label: "One Click" },
  { kind: "divider" },
];

const CULL_RAIL: RailItem[] = [
  ...ONE_CLICK,
  { kind: "icon", key: "cull", icon: ScissorsIcon, label: "AI Culling" },
];

export const TAB_RAIL: Record<Layout, Record<AppTab, RailItem[]>> = {
  oneTab: {
    cull: CULL_RAIL,
    enhance: [
      ...ONE_CLICK,
      { kind: "icon", key: "editRetouchAll", icon: PaletteIcon, label: "Editing & Retouching" },
    ],
  },
  ui1: {
    cull: CULL_RAIL,
    enhance: [
      ...ONE_CLICK,
      { kind: "icon", key: "edit", icon: PaletteIcon, label: "AI Editing" },
      { kind: "icon", key: "retouch", icon: RetouchIcon, label: "AI Retouching" },
    ],
  },
  ui2: {
    cull: CULL_RAIL,
    enhance: [
      ...ONE_CLICK,
      { kind: "icon", key: "editRetouch", icon: PaletteIcon, label: "Edit & Retouch" },
      { kind: "icon", key: "aiTools", icon: Shapes, label: "AI Crop, Masking & Denoise" },
    ],
  },
};

// Default grid side panel when landing on a tab.
export const TAB_DEFAULT_RAIL: Record<Layout, Record<AppTab, RailKey>> = {
  oneTab: { cull: "cull", enhance: "editRetouchAll" },
  ui1: { cull: "cull", enhance: "edit" },
  ui2: { cull: "cull", enhance: "editRetouch" },
};

// Grid panel that shows an AI action's results once it finishes.
export const railForAction = (layout: Layout, action: "cull" | "edit" | "retouch"): RailKey =>
  action === "cull"
    ? "cull"
    : layout === "oneTab"
      ? "editRetouchAll"
      : layout === "ui2"
        ? "editRetouch"
        : action;

// Bottom: Spray Can (a mode toggle, not a panel) and Keyboard Shortcuts.
export const BOTTOM_RAIL: RailItem[] = [
  { kind: "icon", key: "spray", icon: SprayCanIcon, label: "Spray Can" },
  { kind: "divider" },
  { kind: "icon", key: "keyboard", icon: KeyboardIcon, label: "Keyboard shortcuts" },
];
