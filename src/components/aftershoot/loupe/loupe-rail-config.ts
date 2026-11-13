import {
  Crop,
  Eraser,
  History,
  Image as ImageIcon,
  Keyboard,
  Scissors,
  SlidersHorizontal,
  SquareSlash,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppTab } from "../rail-config";

// Matches the Figma "Toolbar" component (node 93:5730). Order, dividers, and
// icon metaphors come straight from the design.
export type LoupeRailKey =
  | "ai" //            AI Culling         — Scissors
  | "edit" //          Editing Sliders   — Options icon
  | "crop" //          Crop
  | "mask" //          Masking            — Square slash
  | "retouch" //       Retouch            — User
  | "background" //    Background         — Image / landscape
  | "patch" //         Patch              — Eraser
  | "info" //          Info
  | "history" //       History
  | "cloud" //         Cloud
  | "keyboard" //      Keyboard
  | "settings"; //     Settings

export type RailItem =
  { kind: "icon"; key: LoupeRailKey; icon: LucideIcon; label: string } | { kind: "divider" };

// Loupe rail (Figma "Loupe - Editing Sliders"): Culling · Manual Editing /
// Crop / Masking · Retouching Sliders / Background / Object Removal · History,
// with only Keyboard Shortcuts pinned to the bottom.
export const LOUPE_TOP_RAIL: RailItem[] = [
  { kind: "icon", key: "ai", icon: Scissors, label: "AI Culling" },
  { kind: "divider" },
  { kind: "icon", key: "edit", icon: SlidersHorizontal, label: "Manual Editing" },
  { kind: "icon", key: "crop", icon: Crop, label: "Manual Crop" },
  { kind: "icon", key: "mask", icon: SquareSlash, label: "Manual Masking" },
  { kind: "divider" },
  { kind: "icon", key: "retouch", icon: User, label: "Retouching Sliders" },
  { kind: "icon", key: "background", icon: ImageIcon, label: "Background" },
  { kind: "icon", key: "patch", icon: Eraser, label: "Object Removal" },
  { kind: "divider" },
  { kind: "icon", key: "history", icon: History, label: "History" },
];

export const LOUPE_BOTTOM_RAIL: RailItem[] = [
  { kind: "icon", key: "keyboard", icon: Keyboard, label: "Keyboard shortcuts" },
];

// Loupe rail per app tab: CULL keeps culling only; ENHANCE carries the
// editing + retouching tools. History is available in both.
export const LOUPE_TAB_RAIL: Record<AppTab, RailItem[]> = {
  cull: [
    { kind: "icon", key: "ai", icon: Scissors, label: "AI Culling" },
    { kind: "divider" },
    { kind: "icon", key: "history", icon: History, label: "History" },
  ],
  enhance: LOUPE_TOP_RAIL.slice(2), // everything after "AI Culling" + its divider
};

export const loupeRailInTab = (key: LoupeRailKey, tab: AppTab) =>
  LOUPE_TAB_RAIL[tab].some((item) => item.kind === "icon" && item.key === key);

// Which tab a loupe tool belongs to (null = shared, e.g. History).
export const tabOfLoupeRail = (key: LoupeRailKey): AppTab | null =>
  loupeRailInTab(key, "cull") && loupeRailInTab(key, "enhance")
    ? null
    : loupeRailInTab(key, "cull")
      ? "cull"
      : "enhance";
