"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded bg-[#f6f6f6] px-1.5 py-1 text-[11px] font-medium leading-3 text-[#474747] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Keycap chips shown after a tooltip label (Figma "Tooltip / Small"). */
function TooltipKeys({ keys }: { keys: string | string[] }) {
  const list = Array.isArray(keys) ? keys : [keys];
  return (
    <span className="flex items-center gap-0.5">
      {list.map((k, i) => (
        <kbd
          key={i}
          className="flex h-4 min-w-4 items-center justify-center rounded-[2px] border-[0.5px] border-[#e4e4e7] bg-white px-0.5 font-sans text-[11px] font-normal leading-none text-[#474747]"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}

export { TooltipKeys, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
