import * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  RotateCw,
} from "lucide-react";
import { IconTooltip } from "./IconTooltip";

export function Divider() {
  return <div className="mx-1 h-4 w-px bg-white/10" />;
}

// forwardRef + prop spreading so it works as a Radix Tooltip `asChild` trigger
// (the tooltip clones this and forwards ref/handlers onto the <button>).
export const ToolbarBtn = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ children, active, className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      {...props}
      className={`rounded p-1.5 ${active ? "bg-white/10" : "hover:bg-white/5"} ${className ?? ""}`}
    >
      {children}
    </button>
  );
});
ToolbarBtn.displayName = "ToolbarBtn";

export function ActionCard({
  icon,
  label,
  completedLabel,
  onClick,
  status = "idle",
}: {
  icon: React.ReactNode;
  label: string;
  /** Label shown after the action is complete, indicating clicking restarts it. */
  completedLabel?: string;
  onClick?: () => void;
  status?: "idle" | "running" | "complete";
}) {
  const running = status === "running";
  const complete = status === "complete";
  const displayLabel = complete && completedLabel ? completedLabel : label;
  const btn = (
    <button
      onClick={onClick}
      disabled={running}
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-md border bg-[#222] py-2.5 transition-colors ${
        running ? "cursor-wait border-white/10" : "border-white/10 hover:bg-[#262626]"
      }`}
    >
      <span className="text-neutral-300">
        {running ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : icon}
      </span>
      <span className="text-[11px] text-neutral-400">{displayLabel}</span>

      {complete && (
        <RotateCw
          className="absolute right-1.5 top-1.5 h-3 w-3 text-neutral-500"
          strokeWidth={1.75}
        />
      )}
    </button>
  );
  return complete ? <IconTooltip label="Click to run again">{btn}</IconTooltip> : btn;
}

export function Checkbox({
  checked,
  onChange,
}: {
  checked?: boolean;
  onChange?: (next: boolean) => void;
}) {
  // Controlled when onChange is provided; otherwise renders as a static visual.
  if (onChange) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(!checked);
        }}
        className={`flex h-[18px] w-[18px] items-center justify-center rounded ${
          checked ? "bg-[#3b5bff]" : "border border-white/15 bg-transparent"
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </button>
    );
  }
  return (
    <span
      className={`flex h-[18px] w-[18px] items-center justify-center rounded ${
        checked ? "bg-[#3b5bff]" : "border border-white/15 bg-transparent"
      }`}
    >
      {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </span>
  );
}

export function Select({
  label,
  className,
  muted,
}: {
  label: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <button
      className={`flex items-center justify-between gap-1 rounded border border-white/10 bg-[#222] px-2 py-1.5 text-[11px] hover:bg-[#262626] ${
        muted ? "text-neutral-400" : "text-neutral-200"
      } ${className ?? ""}`}
    >
      <span className="truncate">{label}</span>
      <ChevronDown className="h-3 w-3 shrink-0 text-neutral-400" strokeWidth={1.75} />
    </button>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  bigStep = 5,
  smallStep = 1,
  min = -100,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  bigStep?: number;
  smallStep?: number;
  min?: number;
  max?: number;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-[12px] text-neutral-200">{label}</span>
      <span className="w-8 text-right text-[11px] tabular-nums text-neutral-400">
        {value > 0 ? `+${value}` : value}
      </span>
      <div className="flex items-center overflow-hidden rounded border border-white/10 bg-[#222]">
        <StepperBtn onClick={() => onChange(clamp(value - bigStep))} title={`-${bigStep}`}>
          <ChevronsLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </StepperBtn>
        <StepperBtn onClick={() => onChange(clamp(value - smallStep))} title={`-${smallStep}`}>
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </StepperBtn>
        <StepperBtn onClick={() => onChange(clamp(value + smallStep))} title={`+${smallStep}`}>
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </StepperBtn>
        <StepperBtn onClick={() => onChange(clamp(value + bigStep))} title={`+${bigStep}`}>
          <ChevronsRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </StepperBtn>
      </div>
    </div>
  );
}

function StepperBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      className="flex h-7 w-9 items-center justify-center text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
    >
      {children}
    </button>
  );
  return title ? <IconTooltip label={title}>{btn}</IconTooltip> : btn;
}

/**
 * Generic dropdown that opens a menu of options and reports selection.
 * Closes on outside click and Escape.
 */
export function Dropdown({
  value,
  options,
  onChange,
  size = "md",
  placeholder,
}: {
  value: string | null;
  options: string[];
  onChange: (v: string) => void;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const sizeClasses = {
    sm: "h-7 px-2 text-[11px]",
    md: "h-8 px-2.5 text-[12px]",
    lg: "h-9 px-3 text-[13px]",
  }[size];
  const itemClasses = {
    sm: "h-7 px-2 text-[11px]",
    md: "h-8 px-2.5 text-[12px]",
    lg: "h-9 px-3 text-[13px]",
  }[size];

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded border border-white/10 bg-[#242424] text-white hover:bg-[#2a2a2a] ${sizeClasses}`}
      >
        <span className={value ? "" : "text-neutral-500"}>{value ?? placeholder ?? "Select"}</span>
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded border border-white/10 bg-[#1c1c1c] shadow-xl">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full items-center text-left text-white hover:bg-white/[0.06] ${itemClasses} ${
                  active ? "bg-white/[0.06]" : ""
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Draggable horizontal slider. Returns a value in [0, 100].
 * Drag handle, click on track to jump, keyboard arrows.
 */
export function RangeSlider({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (v: number) => void;
  /** Fires once when a drag ends / after a keyboard nudge (history step). */
  onCommit?: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  // Latest callbacks for the document listeners registered once on mount.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChangeRef.current(pct);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientX(e.clientX);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      onCommitRef.current?.();
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      className="relative h-4 cursor-pointer select-none"
      onMouseDown={(e) => {
        draggingRef.current = true;
        updateFromClientX(e.clientX);
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/10" />
      <div
        className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#3b5bff]"
        style={{ width: `${value}%` }}
      />
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onChange(Math.max(0, value - 2));
          if (e.key === "ArrowRight") onChange(Math.min(100, value + 2));
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") onCommit?.();
        }}
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-[#3b5bff] bg-white active:cursor-grabbing"
        style={{ left: `${value}%` }}
      />
    </div>
  );
}

/**
 * Compact 88×12 slider used in the bottom bar to drive thumbnail size.
 * Returns a value in [0, 100]. Drag handle, click-to-jump, keyboard arrows.
 */
export function ThumbnailSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(pct);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientX(e.clientX);
    };
    const handleUp = () => {
      draggingRef.current = false;
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      onMouseDown={(e) => {
        draggingRef.current = true;
        updateFromClientX(e.clientX);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onChange(Math.max(0, value - 5));
        if (e.key === "ArrowRight") onChange(Math.min(100, value + 5));
      }}
      className="relative h-3 w-[88px] cursor-pointer select-none"
    >
      {/* Full track */}
      <div className="absolute inset-y-[5px] left-0 right-0 rounded-full bg-[#474747]" />
      {/* Active fill */}
      <div
        className="absolute inset-y-[5px] left-0 rounded-full bg-[#777777]"
        style={{ width: `${value}%` }}
      />
      {/* Handle */}
      <div
        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-[#474747] ring-1 ring-white/10 active:cursor-grabbing"
        style={{ left: `${value}%` }}
      />
    </div>
  );
}
