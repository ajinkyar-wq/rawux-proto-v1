import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";

// Lightroom-style version history list. Used by both the grid-view Rail
// (history) and the loupe Rail (history) — a single global view.

type HistoryEntry = {
  id: string;
  // Original-only entries skip the timestamp/source row pattern.
  date: string; // e.g. "Apr 23, 2026, 4:18 pm"  OR  "Mar 27, 2026, 3:07 pm"
  source?: string; // e.g. "Desktop"
  // Optional CSS background hint so each thumbnail looks slightly distinct.
  swatch?: string;
};

type HistoryGroup = {
  id: string;
  label: string; // "April 2026", "March 2026", "Original", ...
  entries: HistoryEntry[];
  // "Original" group renders a slightly different row variant.
  variant?: "auto" | "original";
};

const HISTORY: HistoryGroup[] = [
  {
    id: "apr2026",
    label: "April 2026",
    entries: [
      {
        id: "a1",
        date: "Apr 23, 2026, 4:18 pm",
        source: "Desktop",
        swatch: "linear-gradient(135deg, #4a5a2a, #2a3a1a)",
      },
      {
        id: "a2",
        date: "Apr 15, 2026, 6:23 pm",
        source: "Desktop",
        swatch: "linear-gradient(135deg, #5a6a3a, #3a4a2a)",
      },
      {
        id: "a3",
        date: "Apr 8, 2026, 11:40 am",
        source: "Desktop",
        swatch: "linear-gradient(135deg, #6a7a4a, #4a5a3a)",
      },
    ],
  },
  {
    id: "mar2026",
    label: "March 2026",
    entries: [
      {
        id: "m1",
        date: "Mar 30, 2026, 5:16 pm",
        source: "Desktop",
        swatch: "linear-gradient(135deg, #5a6a4a, #3a4a2a)",
      },
      {
        id: "m2",
        date: "Mar 29, 2026, 2:07 pm",
        source: "Desktop",
        swatch: "linear-gradient(135deg, #5a6a4a, #3a4a2a)",
      },
      {
        id: "m3",
        date: "Mar 29, 2026, 1:57 pm",
        source: "Desktop",
        swatch: "linear-gradient(135deg, #6a7a5a, #4a5a3a)",
      },
    ],
  },
  {
    id: "original",
    label: "Original",
    variant: "original",
    entries: [
      {
        id: "orig",
        date: "Mar 27, 2026, 3:07 pm",
        swatch: "linear-gradient(135deg, #6a7a5a, #4a5a3a)",
      },
    ],
  },
];

type HistoryTab = "auto" | "named";

export function HistoryPanel() {
  const [tab, setTab] = useState<HistoryTab>("auto");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h2 className="text-[12px] font-semibold text-white">Versions</h2>
      <Tabs active={tab} onChange={setTab} />

      {tab === "auto" ? (
        <div className="flex flex-col gap-3">
          {HISTORY.map((group) => (
            <HistoryGroupView key={group.id} group={group} />
          ))}
        </div>
      ) : (
        <NamedEmpty />
      )}
    </div>
  );
}

function Tabs({ active, onChange }: { active: HistoryTab; onChange: (t: HistoryTab) => void }) {
  const items: { id: HistoryTab; label: string }[] = [
    { id: "auto", label: "Auto" },
    { id: "named", label: "Named" },
  ];
  return (
    <div className="flex items-center gap-3 border-b border-white/5">
      {items.map((i) => (
        <button
          key={i.id}
          onClick={() => onChange(i.id)}
          className={`-mb-px border-b px-1 pb-2 text-[11px] font-semibold tracking-wider transition-colors ${
            active === i.id
              ? "border-white text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {i.label.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function HistoryGroupView({ group }: { group: HistoryGroup }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[12px] font-semibold text-white"
      >
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
          strokeWidth={1.75}
        />
        {group.label}
      </button>
      {open && (
        <div className="flex flex-col gap-1">
          {group.entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} isOriginal={group.variant === "original"} />
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryRow({ entry, isOriginal }: { entry: HistoryEntry; isOriginal: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded p-1 hover:bg-white/[0.03]">
      <div
        className="h-9 w-12 shrink-0 rounded-sm bg-[#2a2a2a]"
        style={entry.swatch ? { background: entry.swatch } : undefined}
      />
      <div className="min-w-0 flex-1">
        {isOriginal ? (
          <>
            <div className="truncate text-[11px] text-neutral-300">Original</div>
            <div className="truncate text-[10px] text-neutral-500">{entry.date}</div>
          </>
        ) : (
          <>
            <div className="truncate text-[11px] text-neutral-200">{entry.date}</div>
            <div className="truncate text-[10px] text-neutral-500">{entry.source}</div>
          </>
        )}
      </div>
      <button
        type="button"
        title="More"
        className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
      >
        <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function NamedEmpty() {
  return (
    <div className="flex flex-1 items-center justify-center py-8 text-center text-[11px] text-neutral-500">
      No named versions yet.
    </div>
  );
}
