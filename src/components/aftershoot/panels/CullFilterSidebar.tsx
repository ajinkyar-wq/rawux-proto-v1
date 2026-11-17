import { useState } from "react";
import { Check, Flag, Images, Info, Minus, RotateCcw, Star } from "lucide-react";
import { Caret } from "./Caret";

// Cull Filters sidebar — appears in the AI Actions side panel after AI cull
// completes. It's the expanded, in-panel form of the FilterBar's "Cull Filters"
// dropdown: a checkbox tree of selections with rating chips, plus an
// All Photos footer row.
//
// Tree behavior:
//  - A parent checkbox reflects its children: checked (all on), unchecked
//    (all off), or indeterminate (some on). Clicking a parent checks/unchecks
//    ALL its children.
//  - A child checkbox toggles only itself.
//  - The expand chevron on a parent collapses/expands its children and does
//    NOT change any checkbox.

// Child rows toggle a RATING in the shared filter (also drives the grid and
// the FilterBar). Each row carries a trailing marker: a rating chip, a solid
// swatch, or an icon. "Highlights" has no rating of its own, so it toggles
// locally.
type Marker =
  | { kind: "stars"; stars: number; color: string }
  | { kind: "swatch"; color: string }
  | { kind: "sparkle" };
type Child = { id: string; label: string; count: number; marker: Marker; rating?: number };
type Parent = {
  id: string;
  label: string;
  count: number;
  stars?: number;
  children: Child[];
};

const GROUPS: Parent[] = [
  {
    id: "ai-selections",
    label: "AI Selections",
    count: 150,
    stars: 5,
    children: [
      { id: "highlights", label: "Highlights", count: 60, marker: { kind: "sparkle" } },
      {
        id: "selected",
        label: "Selected",
        count: 90,
        rating: 5,
        marker: { kind: "swatch", color: "#1f7a3a" },
      },
    ],
  },
  {
    id: "for-review",
    label: "For Review",
    count: 115,
    children: [
      {
        id: "maybe",
        label: "Maybe",
        count: 30,
        rating: 4,
        marker: { kind: "stars", stars: 4, color: "#2f6dd0" },
      },
      {
        id: "blurred",
        label: "Blurred",
        count: 40,
        rating: 2,
        marker: { kind: "stars", stars: 2, color: "#c2392f" },
      },
      {
        id: "closed-eyes",
        label: "Closed Eyes",
        count: 45,
        rating: 1,
        marker: { kind: "stars", stars: 1, color: "#7b3fd6" },
      },
    ],
  },
];

// Star-count chip, e.g. "5 ★". Outlined on a parent row, filled with the
// rating color on a child row.
function StarChip({ value, color }: { value: number; color?: string }) {
  return (
    <span
      className={`flex h-6 min-w-[44px] items-center justify-center gap-1 rounded px-1.5 text-[13px] font-medium text-white ${
        color ? "" : "border border-white/25"
      }`}
      style={color ? { backgroundColor: color } : undefined}
    >
      {value}
      <Star className="h-3 w-3 fill-current" strokeWidth={0} />
    </span>
  );
}

function MarkerView({ marker }: { marker: Marker }) {
  if (marker.kind === "stars") return <StarChip value={marker.stars} color={marker.color} />;
  if (marker.kind === "swatch")
    return <span className="h-6 w-6 rounded" style={{ backgroundColor: marker.color }} />;
  return <Sparkle className="h-5 w-5 text-white" />;
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
  onRestart,
}: {
  // Shared rating filter (1..5) driving the grid + FilterBar. A child row is
  // "checked" when its rating is in this set.
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
  onRestart?: () => void;
}) {
  const [open, setOpen] = useState(true);
  // Which parent groups are expanded.
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["ai-selections"]));
  // Rows without a rating of their own (Highlights) toggle locally.
  const [local, setLocal] = useState<Set<string>>(new Set(["highlights"]));

  const childChecked = (c: Child) =>
    c.rating !== undefined ? ratingFilter.has(c.rating) : local.has(c.id);

  const toggleChild = (c: Child) => {
    if (c.rating !== undefined) return onToggleRating(c.rating);
    setLocal((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
  };

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
      if (allOn === childChecked(c)) toggleChild(c);
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
    <div className="flex flex-col gap-2">
      {/* Header: collapse caret · title · info · Restart. */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[13px] font-medium text-white"
        >
          <Caret open={open} />
          Cull Filters
          <Info className="h-3.5 w-3.5 text-neutral-500" strokeWidth={1.75} />
        </button>
        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            Restart
          </button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-1">
          {/* My Selections (not part of the tree; flag glyph, no checkbox). */}
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded px-1 text-left text-neutral-400 hover:bg-white/[0.03]"
          >
            <Flag className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[13px]">My Selections</span>
            <span className="text-[13px] text-neutral-500">3</span>
          </button>

          <div className="-mx-3 border-t border-white/5" />

          {/* Selection tree */}
          {GROUPS.map((group) => {
            const isExpanded = expanded.has(group.id);
            return (
              <div key={group.id} className="flex flex-col gap-1">
                <div className="flex h-8 items-center gap-2 rounded px-1 hover:bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => toggleParent(group)}
                    className="flex items-center gap-2 text-left"
                  >
                    <Checkbox state={parentState(group)} />
                    <span className="text-[13px] text-white">{group.label}</span>
                    <span className="text-[13px] text-neutral-500">{group.count}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(group.id)}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                    className="rounded p-0.5 text-neutral-500 hover:text-neutral-300"
                  >
                    <Caret open={isExpanded} />
                  </button>
                  {group.stars !== undefined && (
                    <span className="ml-auto">
                      <StarChip value={group.stars} />
                    </span>
                  )}
                </div>

                {isExpanded &&
                  group.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => toggleChild(child)}
                      className="flex h-8 items-center gap-2 rounded pl-6 pr-0 text-left hover:bg-white/[0.03]"
                    >
                      <Checkbox state={childChecked(child) ? "on" : "off"} />
                      <span className="text-[13px] text-neutral-300">{child.label}</span>
                      <span className="text-[13px] text-neutral-500">{child.count}</span>
                      <span className="ml-auto">
                        <MarkerView marker={child.marker} />
                      </span>
                    </button>
                  ))}
              </div>
            );
          })}

          <div className="-mx-3 border-t border-white/5" />

          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded px-1 text-left text-neutral-400 hover:bg-white/[0.03]"
          >
            <Images className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="text-[13px]">All Photos</span>
            <span className="text-[13px] text-neutral-500">400</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Four-point sparkle used for "Highlights".
function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5C11.3 16.9 7.1 12.7 1.5 12 7.1 11.3 11.3 7.1 12 1.5z"
        fill="currentColor"
      />
    </svg>
  );
}
