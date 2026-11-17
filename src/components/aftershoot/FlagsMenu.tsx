import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { FLAGS, setFlag, useFlag, type FlagId } from "./feature-flags";

// ⋮ in the app bar: a small menu of prototype feature flags (all off by
// default, remembered in this browser).
export function FlagsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Prototype flags"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex size-6 shrink-0 items-center justify-center rounded hover:bg-white/5 hover:text-white ${
          open ? "bg-white/10 text-white" : "text-[#ababab]"
        }`}
      >
        <MoreVertical className="size-4" strokeWidth={1.5} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[300px] rounded-lg border border-white/15 bg-[#1c1c1c] p-1.5 shadow-2xl">
          <div className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Prototype flags
          </div>
          {FLAGS.map((f) => (
            <FlagItem key={f.id} id={f.id} label={f.label} description={f.description} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlagItem({ id, label, description }: { id: FlagId; label: string; description: string }) {
  const on = useFlag(id);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setFlag(id, !on)}
      className="flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left hover:bg-white/[0.05]"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[12.5px] text-neutral-100">{label}</span>
        <span className="text-[11px] leading-snug text-neutral-500">{description}</span>
      </span>
      <span
        className={`relative mt-0.5 h-4 w-7 shrink-0 rounded-full transition-colors ${
          on ? "bg-[#3b5bff]" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            on ? "left-3.5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
