import { useState } from "react";
import { IconTooltip } from "./IconTooltip";
import {
  BOTTOM_RAIL,
  TAB_RAIL,
  type AppTab,
  type Layout,
  type RailItem,
  type RailKey,
} from "./rail-config";

export function Rail({
  layout,
  tab,
  activeRail,
  onSelect,
}: {
  layout: Layout;
  tab: AppTab;
  // null = panel collapsed, so no panel icon shows as active.
  activeRail: RailKey | null;
  onSelect: (key: RailKey) => void;
}) {
  // Spray Can is a mode toggle, not a panel — it keeps its own on/off state.
  const [sprayOn, setSprayOn] = useState(false);
  const select = (key: RailKey) => (key === "spray" ? setSprayOn((v) => !v) : onSelect(key));
  const isActive = (key: RailKey) => (key === "spray" ? sprayOn : activeRail === key);
  return (
    <div className="flex w-10 shrink-0 flex-col items-center justify-between border-l border-white/5 bg-[#141414] py-2">
      <RailGroup items={TAB_RAIL[layout][tab]} isActive={isActive} onSelect={select} />
      <RailGroup items={BOTTOM_RAIL} isActive={isActive} onSelect={select} />
    </div>
  );
}

function RailGroup({
  items,
  isActive,
  onSelect,
}: {
  items: RailItem[];
  isActive: (key: RailKey) => boolean;
  onSelect: (key: RailKey) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {items.map((item, i) =>
        item.kind === "divider" ? (
          <div key={`divider-${i}`} className="my-1 h-px w-5 bg-white/[0.06]" role="separator" />
        ) : (
          <RailIcon
            key={item.key}
            label={item.label}
            active={isActive(item.key)}
            onClick={() => onSelect(item.key)}
            icon={<item.icon className="h-[15px] w-[15px]" strokeWidth={1.5} />}
          />
        ),
      )}
    </div>
  );
}

function RailIcon({
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
        className={`rounded p-1.5 ${
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
