import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Eye } from "lucide-react";
import type { ActionStatus } from "../action-status";

// Grid-view "AI Retouching" rail tab:
//   Presets (retouch preset picker) → Subject Sync (faces found across the
//   album) → Smart Object Removal (distraction checklist).

const RETOUCH_PRESETS = ["Student Portraits", "Natural Retouch", "Soft Glow"];
const SUBJECT_COUNTS = [562, 560, 200, 200];
const DISTRACTIONS = [
  { id: "exit-signs", label: "Exit Signs", count: 30 },
  { id: "fire-alarms", label: "Fire Alarms", count: 80 },
  { id: "fire-extinguishers", label: "Fire Extinguishers", count: 3 },
  { id: "sockets", label: "Sockets", count: 40 },
  { id: "thermostats", label: "Thermostats", count: 8 },
  { id: "garbage-cans", label: "Garbage Cans", count: 3 },
];

export function AIRetouchingPanel(_props: { status: ActionStatus; onRunRetouch: () => void }) {
  return (
    <div className="-mr-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-2">
      <RetouchingContent />
    </div>
  );
}

// Presets → Subject Sync → Smart Object Removal. Also embedded in the UI-2
// combined Edit & Retouch panel.
export function RetouchingContent() {
  const [preset, setPreset] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {/* Presets */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 pb-3">
        <span className="text-[12px] text-neutral-500">Presets</span>
        <PresetPicker value={preset} onChange={setPreset} />
      </div>

      {/* Subject Sync */}
      <section className="flex shrink-0 flex-col gap-2 border-b border-white/5 pb-3">
        <SectionTitle title="Subject Sync" badge="New" badgeClass="bg-[#1e2a4a] text-white" />
        <p className="text-[11px] leading-snug text-neutral-400">
          Apply presets on subjects identified across the entire album
        </p>
        <div className="mt-1 flex items-start justify-between">
          {SUBJECT_COUNTS.map((n, i) => (
            <button key={i} type="button" className="flex flex-col items-center gap-1">
              <span className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6b5a50] to-[#3a302b] ring-1 ring-inset ring-white/10 hover:ring-white/30" />
              <span className="text-[10px] text-neutral-500">{n}</span>
            </button>
          ))}
          <button type="button" className="flex flex-col items-center gap-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#262626] text-neutral-400 hover:text-white">
              <Eye className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <span className="text-[10px] text-neutral-500">View More</span>
          </button>
        </div>
      </section>

      {/* Smart Object Removal */}
      <section className="flex shrink-0 flex-col gap-2">
        <SectionTitle
          title="Smart Object Removal"
          badge="Beta"
          badgeClass="border border-white/20 text-white"
        />
        <p className="text-[11px] leading-snug text-neutral-400">
          Smart object detection will automatically identify and remove distractions you select
        </p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {DISTRACTIONS.map((d) => {
            const on = checked.has(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggle(d.id)}
                className="flex min-w-0 items-center gap-1 rounded-md bg-[#242424] px-1.5 py-2 text-left hover:bg-[#2a2a2a]"
              >
                <span className="truncate text-[10px] text-neutral-200">{d.label}</span>
                <span className="shrink-0 text-[10px] text-neutral-500">{d.count}</span>
                <span
                  className={`ml-auto flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] ${
                    on ? "bg-[#3b5bff]" : "border border-white/20"
                  }`}
                >
                  {on && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SectionTitle({
  title,
  badge,
  badgeClass,
}: {
  title: string;
  badge: string;
  badgeClass: string;
}) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-200">
      {title}
      <span
        className={`rounded px-1.5 py-px text-[10px] font-medium normal-case tracking-normal ${badgeClass}`}
      >
        {badge}
      </span>
    </h3>
  );
}

// Borderless text dropdown ("Retouch Preset ⌄").
function PresetPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] text-neutral-200 hover:text-white"
      >
        {value ?? "Retouch Preset"}
        <ChevronDown className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-md border border-white/10 bg-[#222] py-1 shadow-lg">
          {RETOUCH_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[12px] text-neutral-200 hover:bg-white/5"
            >
              {p}
              {p === value && <Check className="h-3 w-3" strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
