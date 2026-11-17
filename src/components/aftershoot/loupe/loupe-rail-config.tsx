import {
  Camera,
  ClockCounterClockwise,
  Eraser,
  Info,
  Keyboard,
  SlidersHorizontal,
  Scissors,
  Sparkle,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";
import type { AppTab } from "../rail-config";

// Icon component accepting a className (phosphor icons + custom mask icons).
export type RailIcon = ComponentType<{ className?: string }>;

// Matches the Figma "Toolbar" component (node 93:5730). Order, dividers, and
// icon metaphors come straight from the design.
export type LoupeRailKey =
  | "oneClick" //     One Click workflow — opens a modal, not a panel
  | "ai" //            AI Culling         — Scissors
  | "edit" //          Editing Sliders   — Options icon
  | "crop" //          Crop
  | "mask" //          Masking            — Square slash
  | "retouch" //       Retouch            — User
  | "background" //    Background         — Image / landscape
  | "patch" //         Patch              — Eraser
  | "info" //          Info
  | "history" //       History
  | "camera" //       Camera / snapshot
  | "cloud" //         Cloud
  | "spray" //         Spray Can — a mode toggle, not a panel
  | "keyboard" //      Keyboard
  | "settings"; //     Settings

export type RailItem =
  | { kind: "icon"; key: LoupeRailKey; icon: RailIcon; label: string; shortcut?: string }
  | { kind: "divider" };

// Loupe rail (Figma node 22:26252): AI · Manual Editing / Crop / Masking ·
// Retouching / Background / Object Removal on top; Camera · History / Info ·
// Keyboard Shortcuts pinned to the bottom.
const CropIcon: RailIcon = ({ className }) => (
  <MaskSvg src="/rail/crop.svg" className={className} />
);
export const RetouchIcon: RailIcon = ({ className }) => (
  <MaskSvg src="/rail/retouch.svg" className={className} />
);
// One Click: filled blue sparkle; turns white while its long-hover pill is open (blue fill).
export const OneClickIcon: RailIcon = ({ className }) => (
  <Sparkle
    className={`${className ?? ""} text-[#2563EB] group-data-[state=delayed-open]:text-white group-data-[state=instant-open]:text-white`}
    weight="fill"
    color="currentColor"
  />
);
export const SprayCanIcon: RailIcon = ({ className }) => (
  <MaskSvg src="/rail/spraycan.svg" className={className} />
);
const MaskIcon: RailIcon = ({ className }) => (
  <MaskSvg src="/rail/mask.svg" className={className} />
);
const BackgroundIcon: RailIcon = ({ className }) => (
  <MaskSvg src="/rail/background.svg" className={className} />
);

// Custom Figma icons are single-colour SVGs; render them as a CSS mask so they
// follow the button's text colour (active / hover states).
function MaskSvg({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

const ONE_CLICK: RailItem = {
  kind: "icon",
  key: "oneClick",
  icon: OneClickIcon,
  label: "One Click",
};
const AI: RailItem = { kind: "icon", key: "ai", icon: Scissors, label: "AI Culling" };

export const LOUPE_TOP_RAIL: RailItem[] = [
  ONE_CLICK,
  { kind: "divider" },
  { kind: "icon", key: "edit", icon: SlidersHorizontal, label: "Manual Editing", shortcut: "E" },
  { kind: "icon", key: "crop", icon: CropIcon, label: "Crop & Rotate", shortcut: "R" },
  { kind: "icon", key: "mask", icon: MaskIcon, label: "Masking", shortcut: "M" },
  { kind: "divider" },
  { kind: "icon", key: "retouch", icon: RetouchIcon, label: "Retouching", shortcut: "⇧F" },
  {
    kind: "icon",
    key: "background",
    icon: BackgroundIcon,
    label: "Background Changer",
    shortcut: "⇧B",
  },
  { kind: "icon", key: "patch", icon: Eraser, label: "Object Removal", shortcut: "⇧J" },
];

const HISTORY_ITEM: RailItem = {
  kind: "icon",
  key: "history",
  icon: ClockCounterClockwise,
  label: "History",
};

// History, Info and Tethering are editing concerns — hidden in CULL, which keeps
// only the keyboard shortcuts.
export const loupeBottomRail = (tab: AppTab): RailItem[] => [
  ...(tab === "cull"
    ? []
    : ([
        { kind: "icon", key: "camera", icon: Camera, label: "Tethering" },
        { kind: "divider" },
        HISTORY_ITEM,
        { kind: "icon", key: "info", icon: Info, label: "Info" },
        { kind: "divider" },
      ] as RailItem[])),
  { kind: "icon", key: "keyboard", icon: Keyboard, label: "Keyboard shortcuts" },
];

// Loupe rail per app tab: CULL keeps culling only; ENHANCE carries the
// editing + retouching tools. History / Info are in the shared bottom group.
export const LOUPE_TAB_RAIL: Record<AppTab, RailItem[]> = {
  cull: [ONE_CLICK, { kind: "divider" }, AI],
  enhance: LOUPE_TOP_RAIL,
};

export const loupeRailInTab = (key: LoupeRailKey, tab: AppTab) =>
  [...LOUPE_TAB_RAIL[tab], ...loupeBottomRail(tab)].some(
    (item) => item.kind === "icon" && item.key === key,
  );

// Which tab a loupe tool belongs to (null = shared, e.g. History).
export const tabOfLoupeRail = (key: LoupeRailKey): AppTab | null =>
  loupeRailInTab(key, "cull") && loupeRailInTab(key, "enhance")
    ? null
    : loupeRailInTab(key, "cull")
      ? "cull"
      : "enhance";
