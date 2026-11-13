import { IconTooltip } from "../IconTooltip";
import type { AppTab } from "../rail-config";
import {
  LOUPE_BOTTOM_RAIL,
  LOUPE_TAB_RAIL,
  type LoupeRailKey,
  type RailItem,
} from "./loupe-rail-config";

// Visual density matches the grid view's Rail (40px wide, 15px icons,
// 1.5 button padding) so the loupe rail doesn't look out of proportion
// vs the rest of the app. Dividers between sub-groups come from the
// Figma spec for node 93:5730.

export function LoupeRail({
  tab,
  activeRail,
  onSelect,
}: {
  tab: AppTab;
  // null = panel collapsed, so no icon is shown active.
  activeRail: LoupeRailKey | null;
  onSelect: (key: LoupeRailKey) => void;
}) {
  // The Scissors (cull) icon is always shown — it doubles as the AI Cull
  // ingress before culling runs and the Key Faces toggle afterwards.
  return (
    <div className="flex w-10 shrink-0 flex-col items-center justify-between border-l border-white/[0.05] bg-[#141414] py-2">
      <RailGroup items={LOUPE_TAB_RAIL[tab]} activeRail={activeRail} onSelect={onSelect} />
      <RailGroup items={LOUPE_BOTTOM_RAIL} activeRail={activeRail} onSelect={onSelect} />
    </div>
  );
}

function RailGroup({
  items,
  activeRail,
  onSelect,
}: {
  items: RailItem[];
  activeRail: LoupeRailKey | null;
  onSelect: (key: LoupeRailKey) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {items.map((item, i) =>
        item.kind === "divider" ? (
          // Group break: extra space, no visible line (per loupe design).
          <div key={`divider-${i}`} className="h-0" role="separator" />
        ) : (
          <RailIconButton
            key={item.key}
            label={item.label}
            active={activeRail === item.key}
            onClick={() => onSelect(item.key)}
            icon={<item.icon className="h-[15px] w-[15px]" strokeWidth={1.5} />}
          />
        ),
      )}
    </div>
  );
}

function RailIconButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    // Rail sits on the right edge, so tooltips open to the left.
    <IconTooltip label={label} side="left">
      <button
        onClick={onClick}
        className={`rounded p-1.5 transition-colors ${
          active
            ? "bg-white/10 text-white"
            : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
        }`}
      >
        {icon}
      </button>
    </IconTooltip>
  );
}
