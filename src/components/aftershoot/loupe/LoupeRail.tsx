import { createContext, useContext, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AppTab } from "../rail-config";
import {
  loupeBottomRail,
  RAIL_ICON_ANIM_MS,
  SprayCanIcon,
  LOUPE_TAB_RAIL,
  type LoupeRailKey,
  type RailItem,
} from "./loupe-rail-config";

// Visual density matches the grid view's Rail (40px wide, 15px icons,
// 1.5 button padding) so the loupe rail doesn't look out of proportion
// vs the rest of the app. Dividers between sub-groups come from the
// Figma spec for node 93:5730.

// Long hover: the label pill only appears after the pointer rests on an icon.
const RAIL_TOOLTIP_DELAY_MS = 700;

// Once one tooltip has opened, the rest open instantly until the cursor leaves
// the rail (then the long-hover delay applies again).
const RailTooltipMode = createContext<{ instant: boolean; arm: () => void }>({
  instant: false,
  arm: () => {},
});

export function LoupeRail({
  tab,
  activeRail,
  onSelect,
  spray,
}: {
  tab: AppTab;
  // null = panel collapsed, so no icon is shown active.
  activeRail: LoupeRailKey | null;
  onSelect: (key: LoupeRailKey) => void;
  // Survey: Spray Can mode toggle, shown above Keyboard shortcuts.
  spray?: { on: boolean; onToggle: () => void };
}) {
  const bottom: RailItem[] = [
    ...(spray
      ? ([
          { kind: "icon", key: "spray", icon: SprayCanIcon, label: "Spray Can" },
          { kind: "divider" },
        ] as RailItem[])
      : []),
    ...loupeBottomRail(tab),
  ];
  const select = (key: LoupeRailKey) => (key === "spray" ? spray?.onToggle() : onSelect(key));
  const bottomActive = spray?.on ? "spray" : activeRail;
  // The Scissors (cull) icon is always shown — it doubles as the AI Cull
  // ingress before culling runs and the Key Faces toggle afterwards.
  return (
    <RailTooltipProvider>
      <RailGroup items={LOUPE_TAB_RAIL[tab]} activeRail={activeRail} onSelect={onSelect} />
      <RailGroup
        items={bottom}
        activeRail={bottomActive}
        onSelect={select}
        sprayOn={spray?.on}
        panelRail={activeRail}
      />
    </RailTooltipProvider>
  );
}

function RailGroup({
  items,
  activeRail,
  onSelect,
  sprayOn,
  panelRail,
}: {
  items: RailItem[];
  activeRail: LoupeRailKey | null;
  onSelect: (key: LoupeRailKey) => void;
  // Spray is its own on/off mode, independent of which panel is open.
  sprayOn?: boolean;
  panelRail?: LoupeRailKey | null;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      {items.map((item, i) =>
        item.kind === "divider" ? (
          <div key={`divider-${i}`} className="h-px w-full bg-white/[0.08]" role="separator" />
        ) : (
          <RailIconButton
            key={item.key}
            label={item.label}
            shortcut={item.shortcut}
            active={
              item.key === "spray"
                ? !!sprayOn
                : (panelRail !== undefined ? panelRail : activeRail) === item.key
            }
            onClick={() => onSelect(item.key)}
            icon={<item.icon className="h-5 w-5" />}
            accent={item.key === "oneClick"}
            animationMs={RAIL_ICON_ANIM_MS.get(item.icon)}
          />
        ),
      )}
    </div>
  );
}

// Shared with the grid view's Rail so both rails look identical.
export function RailTooltipProvider({ children }: { children: React.ReactNode }) {
  const [instant, setInstant] = useState(false);
  return (
    <RailTooltipMode.Provider value={{ instant, arm: () => setInstant(true) }}>
      <div
        onMouseLeave={() => setInstant(false)}
        className="flex w-[52px] shrink-0 flex-col items-center justify-between border-l border-white/[0.05] bg-[#1c1c1c] p-2"
      >
        {children}
      </div>
    </RailTooltipMode.Provider>
  );
}

export function RailIconButton({
  icon,
  label,
  shortcut,
  active,
  accent,
  animationMs = 0,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  /** Long-hover turns the button and its label pill blue, with white icon + text. */
  accent?: boolean;
  /** Hover animation length; the long-hover delay starts after it ends. */
  animationMs?: number;
  onClick?: () => void;
}) {
  const { instant, arm } = useContext(RailTooltipMode);
  return (
    // Rail sits on the right edge, so the label slides out to the left, flush
    // against the button (Figma "Long Hover"): #262626 pill, label + key badge.
    <Tooltip
      delayDuration={instant ? 0 : animationMs + RAIL_TOOLTIP_DELAY_MS}
      onOpenChange={(open) => open && arm()}
    >
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`group flex size-9 items-center justify-center rounded border-[0.5px] p-2 transition-colors data-[state=delayed-open]:rounded-l-none data-[state=delayed-open]:border-l-transparent data-[state=instant-open]:rounded-l-none data-[state=instant-open]:border-l-transparent ${
            active
              ? "border-[#5e5e5e] bg-[#303030] text-[#e2e2e2]"
              : `border-transparent text-[#ababab] hover:bg-[#e2e2e2]/5 hover:text-[#e2e2e2] ${
                  accent
                    ? "data-[state=delayed-open]:bg-[#2563EB] data-[state=instant-open]:bg-[#2563EB]"
                    : "data-[state=delayed-open]:bg-[#262626] data-[state=instant-open]:bg-[#262626]"
                }`
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={-1}
        className={`flex h-9 items-center gap-1.5 rounded-l rounded-r-none ${
          active
            ? "border-[0.5px] border-r-0 border-[#5e5e5e] bg-[#303030]"
            : accent
              ? "border-0 bg-[#2563EB]"
              : "border-0 bg-[#262626]"
        } pl-2 pr-1 py-0 text-[11px] leading-3 ${accent ? "text-white" : "text-[#e2e2e2]"}`}
      >
        {label}
        {shortcut && (
          <span className="flex h-4 min-w-4 px-0.75 items-center tracking-wide justify-center rounded-xs border-[0.5px] border-[#e4e4e7] bg-white text-[11px] font-normal text-[#474747]">
            {shortcut}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
