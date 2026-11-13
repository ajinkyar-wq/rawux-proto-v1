import { useState } from "react";
import { Check, ChevronDown, Flag, Minus, Star } from "lucide-react";

// Cull Filters sidebar — appears in the AI Actions side panel after AI cull
// completes. It's the expanded, in-panel form of the FilterBar's "Cull Filters"
// dropdown: a checkbox tree of selections with rating chips, plus a
// Duplicates / Unrated footer row.
//
// Tree behavior:
//  - A parent checkbox reflects its children: checked (all on), unchecked
//    (all off), or indeterminate (some on). Clicking a parent checks/unchecks
//    ALL its children.
//  - A child checkbox toggles only itself.
//  - The expand chevron on a parent collapses/expands its children and does
//    NOT change any checkbox.

// Each child row carries a solid color swatch and maps to a RATING (the shared
// filter dimension). Selected=5/green, Highlights=4/blue, Blurred=2/red,
// Closed Eyes=1/purple. Toggling a row toggles that rating in the shared
// filter, which also drives the grid and the FilterBar.
type Child = { id: string; label: string; count: number; color: string; rating: number };
type Parent = { id: string; label: string; count: number; stars: number; children: Child[] };

const GROUPS: Parent[] = [
  {
    id: "ai-selections",
    label: "AI Selections",
    count: 150,
    stars: 5,
    children: [
      { id: "selected", label: "Selected", count: 90, color: "#1f7a3a", rating: 5 }, // green
      { id: "highlights", label: "Highlights", count: 60, color: "#2f6dd0", rating: 4 }, // blue
    ],
  },
  {
    id: "for-review",
    label: "For Review",
    count: 115,
    stars: 0,
    children: [
      { id: "blurred", label: "Blurred", count: 70, color: "#c2392f", rating: 2 }, // red
      { id: "closed-eyes", label: "Closed Eyes", count: 45, color: "#7b3fd6", rating: 1 }, // purple
    ],
  },
];

// Star-count chip shown on a parent row, e.g. "5 ★" in an outlined pill.
function StarCountChip({ value }: { value: number }) {
  return (
    <span className="flex h-5 items-center gap-1 rounded border border-white/15 px-1.5 text-[11px] font-medium text-neutral-200">
      {value}
      <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
    </span>
  );
}

type TriState = "on" | "off" | "indeterminate";

function Checkbox({ state }: { state: TriState }) {
  const filled = state !== "off";
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
        filled ? "bg-[#3b5bff]" : "border border-white/20 bg-transparent"
      }`}
    >
      {state === "on" && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      {state === "indeterminate" && <Minus className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
    </span>
  );
}

export function CullFilterSidebar({
  ratingFilter,
  onToggleRating,
}: {
  // Shared rating filter (1..5) driving the grid + FilterBar. A child row is
  // "checked" when its rating is in this set.
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
}) {
  const [open, setOpen] = useState(true);
  // Which parent groups are expanded.
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ai-selections", "for-review"]));
  const [duplicates, setDuplicates] = useState(true);

  const childChecked = (c: Child) => ratingFilter.has(c.rating);

  const parentState = (p: Parent): TriState => {
    const on = p.children.filter(childChecked).length;
    if (on === 0) return "off";
    if (on === p.children.length) return "on";
    return "indeterminate";
  };

  const toggleParent = (p: Parent) => {
    // If every child is on, turn them all off; otherwise turn the off ones on.
    const allOn = p.children.every(childChecked);
    p.children.forEach((c) => {
      if (allOn) {
        if (childChecked(c)) onToggleRating(c.rating);
      } else if (!childChecked(c)) {
        onToggleRating(c.rating);
      }
    });
  };

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex shrink-0 flex-col gap-0.5 border-b border-white/5 pb-2">
      {/* Header: collapse chevron · title. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-white"
      >
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
          strokeWidth={1.75}
        />
        Cull Filters
      </button>

      {open && (
        <div className="flex flex-col">
          {/* My Selections (not part of the tree; flag glyph, no checkbox). */}
          <button
            type="button"
            className="flex items-center gap-2 rounded py-1 pl-0.5 pr-1 text-left hover:bg-white/[0.03]"
          >
            <Flag className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold text-white">My Selections</span>
            <span className="text-[12px] text-neutral-500">0</span>
          </button>

          <div className="my-1 border-t border-white/[0.06]" />

          {/* Selection tree */}
          {GROUPS.map((group) => {
            const isExpanded = expanded.has(group.id);
            return (
              <div key={group.id} className="flex flex-col">
                {/* Parent row: checkbox toggles all children; chevron expands;
                    star-count chip on the right. */}
                <div className="flex items-center gap-2 rounded py-1 pl-0.5 pr-1 hover:bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => toggleParent(group)}
                    className="flex items-center gap-2 text-left"
                  >
                    <Checkbox state={parentState(group)} />
                    <span className="text-[12px] font-semibold text-white">{group.label}</span>
                    <span className="text-[12px] text-neutral-500">{group.count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(group.id)}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                    className="rounded p-0.5 text-neutral-500 hover:text-neutral-300"
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${isExpanded ? "" : "-rotate-90"}`}
                      strokeWidth={1.75}
                    />
                  </button>
                  <span className="ml-auto">
                    <StarCountChip value={group.stars} />
                  </span>
                </div>

                {/* Children — checkbox / row / swatch all toggle the rating. */}
                {isExpanded &&
                  group.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => onToggleRating(child.rating)}
                      className="flex items-center gap-2 rounded py-1 pl-6 pr-1 text-left hover:bg-white/[0.03]"
                    >
                      <Checkbox state={childChecked(child) ? "on" : "off"} />
                      <span className="text-[12px] text-neutral-300">{child.label}</span>
                      <span className="text-[12px] text-neutral-500">{child.count}</span>
                      <span
                        className={`ml-auto h-4 w-4 rounded ${childChecked(child) ? "ring-1 ring-white/70" : ""}`}
                        style={{ backgroundColor: child.color }}
                      />
                    </button>
                  ))}
              </div>
            );
          })}

          <div className="my-1 border-t border-white/[0.06]" />

          {/* Footer: Duplicates (toggleable) · Unrated */}
          <div className="flex items-stretch gap-1.5">
            <button
              type="button"
              onClick={() => setDuplicates((v) => !v)}
              className={`flex flex-1 items-center gap-1.5 rounded-md border px-2 py-1.5 text-left ${
                duplicates
                  ? "border-white/15 bg-white/[0.04]"
                  : "border-transparent hover:bg-white/[0.03]"
              }`}
            >
              <Duplicate className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
              <span className="text-[12px] font-medium text-neutral-100">Duplicates</span>
              <span className="text-[12px] text-neutral-500">130</span>
            </button>
            <button
              type="button"
              className="flex flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-white/[0.03]"
            >
              <Star className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.75} />
              <span className="text-[12px] text-neutral-200">Unrated</span>
              <span className="text-[12px] text-neutral-500">5</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Small "stacked photos" duplicate glyph.
function Duplicate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <rect x="3" y="7" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 4h11a2 2 0 0 1 2 2v11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
