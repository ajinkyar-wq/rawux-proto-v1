import { useState } from "react";
import { useCullStore } from "@/features/import/store/useCullStore";
import { RailIconButton, RailTooltipProvider } from "./loupe/LoupeRail";
import {
  BOTTOM_RAIL,
  TAB_RAIL,
  type AppTab,
  type Layout,
  type RailItem,
  type RailKey,
} from "./rail-config";

// Same rail design/layout as the loupe rail (shared RailTooltipProvider +
// RailIconButton); only the options differ.
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
  const openOneClick = useCullStore((s) => s.openOneClick);
  const select = (key: RailKey) => {
    if (key === "spray") setSprayOn((v) => !v);
    else if (key === "oneClick") openOneClick();
    else onSelect(key);
  };
  const isActive = (key: RailKey) => (key === "spray" ? sprayOn : activeRail === key);
  return (
    <RailTooltipProvider>
      <RailGroup items={TAB_RAIL[layout][tab]} isActive={isActive} onSelect={select} />
      <RailGroup items={BOTTOM_RAIL} isActive={isActive} onSelect={select} />
    </RailTooltipProvider>
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
    <div className="flex w-full flex-col items-center gap-2">
      {items.map((item, i) =>
        item.kind === "divider" ? (
          <div key={`divider-${i}`} className="h-px w-full bg-white/[0.08]" role="separator" />
        ) : (
          <RailIconButton
            key={item.key}
            label={item.label}
            active={isActive(item.key)}
            onClick={() => onSelect(item.key)}
            icon={<item.icon className="h-5 w-5" />}
            accent={item.key === "oneClick"}
          />
        ),
      )}
    </div>
  );
}
