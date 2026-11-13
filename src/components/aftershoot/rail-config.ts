import { Bandage, Keyboard, Palette, Scissors, Shapes, SprayCan } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RailKey =
  // Grid-view side panel tabs: AI Culling / AI Editing / AI Retouching.
  | "cull"
  | "edit"
  | "retouch"
  // UI-2 only: combined Edit & Retouch panel, and the AI Tools tab.
  | "editRetouch"
  | "aiTools"
  | "info"
  | "history"
  | "cloud"
  | "spray"
  | "keyboard"
  | "settings";

export type RailItem =
  { kind: "icon"; key: RailKey; icon: LucideIcon; label: string } | { kind: "divider" };

// Top-level app tabs (toolbar CULL / ENHANCE switch, as in the main app).
// Culling lives in CULL; editing + retouching live in ENHANCE.
export type AppTab = "cull" | "enhance";

// Which layout the album was opened with (picked on the landing screen).
//   ui1: ENHANCE has separate AI Editing / AI Retouching tabs; Crop &
//        Straighten / Masking / Denoise are toggles inside AI Editing.
//   ui2: Editing + Retouching share one panel; Crop & Straighten / Masking /
//        Denoise get their own AI Tools tab.
export type Layout = "ui1" | "ui2";

const CULL_RAIL: RailItem[] = [{ kind: "icon", key: "cull", icon: Scissors, label: "AI Culling" }];

export const TAB_RAIL: Record<Layout, Record<AppTab, RailItem[]>> = {
  ui1: {
    cull: CULL_RAIL,
    enhance: [
      { kind: "icon", key: "edit", icon: Palette, label: "AI Editing" },
      { kind: "icon", key: "retouch", icon: Bandage, label: "AI Retouching" },
    ],
  },
  ui2: {
    cull: CULL_RAIL,
    enhance: [
      { kind: "icon", key: "editRetouch", icon: Palette, label: "Edit & Retouch" },
      { kind: "icon", key: "aiTools", icon: Shapes, label: "AI Crop, Masking & Denoise" },
    ],
  },
};

// Default grid side panel when landing on a tab.
export const TAB_DEFAULT_RAIL: Record<Layout, Record<AppTab, RailKey>> = {
  ui1: { cull: "cull", enhance: "edit" },
  ui2: { cull: "cull", enhance: "editRetouch" },
};

// Grid panel that shows an AI action's results once it finishes.
export const railForAction = (layout: Layout, action: "cull" | "edit" | "retouch"): RailKey =>
  action === "cull" ? "cull" : layout === "ui2" ? "editRetouch" : action;

// Bottom: Spray Can (a mode toggle, not a panel) and Keyboard Shortcuts.
export const BOTTOM_RAIL: RailItem[] = [
  { kind: "icon", key: "spray", icon: SprayCan, label: "Spray Can" },
  { kind: "icon", key: "keyboard", icon: Keyboard, label: "Keyboard shortcuts" },
];
