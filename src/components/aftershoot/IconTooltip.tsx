import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Thin wrapper to replace native `title=` on icon buttons with an instant
 * tooltip. The global TooltipProvider (in __root.tsx) sets delayDuration=0, so
 * these appear with no hover wait — important for demoing a new experience.
 *
 * Usage: wrap any trigger element (asChild forwards props to the child button).
 *   <IconTooltip label="Rotate left"><button>…</button></IconTooltip>
 */
export function IconTooltip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        className="border border-white/10 bg-[#222] text-[11px] font-medium text-white"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
