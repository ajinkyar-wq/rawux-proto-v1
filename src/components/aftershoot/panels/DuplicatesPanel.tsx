import { useState } from "react";
import { ArrowDownUp, Copy, Flag, Repeat, Rows2, Rows3, Star, LayoutGrid } from "lucide-react";
import { photoUrl } from "../cull-data";
import { duplicateIds, duplicateCount, photoName } from "../duplicates";
import { ratingColorHex } from "../rating";
import { IconTooltip } from "../IconTooltip";
import type { Ratings } from "../use-ratings";
import { Caret } from "./Caret";

// Duplicates accordion for the right-side CULL tab. Replaces the old grid-view
// filmstrip — duplicates for the selected tile now live here, below Key Faces.
//
// Each grid tile has its own duplicate set; placeholder counts mirror the
// old DuplicatesStrip data until real backend duplicate groups are wired in.
//
// Header controls: sort by rating · compare toggle | layout (grid / large / list).

type Layout = "grid" | "large" | "list";

const LAYOUTS: { id: Layout; label: string; icon: typeof LayoutGrid }[] = [
  { id: "grid", label: "Grid", icon: LayoutGrid },
  { id: "large", label: "Large thumbnails", icon: Rows3 },
  { id: "list", label: "List", icon: Rows2 },
];

export function DuplicatesPanel({
  selectedGridTile,
  ratings,
}: {
  selectedGridTile: number;
  ratings?: Ratings;
}) {
  const count = duplicateCount(selectedGridTile);
  const [expanded, setExpanded] = useState(true);
  const [layout, setLayout] = useState<Layout>("grid");
  const [sorted, setSorted] = useState(false);
  const [compare, setCompare] = useState(false);
  const [active, setActive] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set([0]));

  const ratingOf = (id: number) => ratings?.ratingOf(id) ?? 0;
  const ids = duplicateIds(selectedGridTile);
  const shown = sorted ? [...ids].sort((a, b) => ratingOf(b) - ratingOf(a)) : ids;

  const toggleFlag = (id: number) =>
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-white"
        >
          <Caret open={expanded} />
          Duplicates ({count})
        </button>
        {expanded && count > 0 && (
          <div className="ml-auto flex items-center gap-1.5">
            <IconTooltip label="Sort by rating">
              <ToolButton pressed={sorted} onClick={() => setSorted((v) => !v)} label="Sort by rating">
                <ArrowDownUp className="h-4 w-4" strokeWidth={1.5} />
              </ToolButton>
            </IconTooltip>
            <IconTooltip label="Compare">
              <ToolButton pressed={compare} onClick={() => setCompare((v) => !v)} label="Compare">
                <Repeat className="h-4 w-4" strokeWidth={1.5} />
              </ToolButton>
            </IconTooltip>
            <span className="mx-0.5 h-5 w-px bg-white/10" />
            <div className="flex rounded bg-white/[0.06] p-0.5">
              {LAYOUTS.map(({ id, label, icon: Icon }) => (
                <IconTooltip key={id} label={label}>
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={layout === id}
                    onClick={() => setLayout(id)}
                    className={`flex h-6 w-8 items-center justify-center rounded-sm ${
                      layout === id ? "bg-white/10 text-white" : "text-[#ababab] hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </IconTooltip>
              ))}
            </div>
          </div>
        )}
      </div>

      {expanded &&
        (count > 0 ? (
          <div className={`grid gap-1 ${layout === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
            {shown.map((id) => (
              <DuplicateTile
                key={id}
                image={selectedGridTile}
                id={id}
                layout={layout}
                rating={ratingOf(id)}
                selected={active === id}
                flagged={flagged.has(id)}
                onSelect={() => setActive(id)}
                onFlag={() => toggleFlag(id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-neutral-500">
            <Copy className="h-8 w-8" strokeWidth={1.5} />
            <div className="text-[15px]">No Duplicates Found</div>
          </div>
        ))}
    </div>
  );
}

function ToolButton({
  pressed,
  onClick,
  label,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded border ${
        pressed
          ? "border-white/25 bg-white/10 text-white"
          : "border-white/15 text-[#ababab] hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function DuplicateTile({
  image,
  id,
  layout,
  rating,
  selected,
  flagged,
  onSelect,
  onFlag,
}: {
  image: number;
  id: number;
  layout: Layout;
  rating: number;
  selected: boolean;
  flagged: boolean;
  onSelect: () => void;
  onFlag: () => void;
}) {
  const list = layout === "list";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={`flex cursor-pointer gap-1.5 rounded border p-1 ${list ? "items-center" : "flex-col"} ${
        selected ? "border-white/50" : "border-transparent hover:border-white/15"
      }`}
    >
      <div
        style={{ backgroundImage: `url(${photoUrl(image, 240)})` }}
        className={`rounded-[3px] bg-[#2d2d2d] bg-cover bg-center ${
          list ? "aspect-[3/2] w-16 shrink-0" : "aspect-[3/2] w-full"
        }`}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-neutral-300">
          {photoName(id)}
        </span>
        <span
          className="flex h-5 items-center gap-1 rounded px-1.5 text-[12px] font-medium text-white"
          style={{ backgroundColor: ratingColorHex(rating) }}
        >
          {rating}
          <Star className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
        </span>
        <button
          type="button"
          aria-label={flagged ? "Unflag" : "Flag"}
          aria-pressed={flagged}
          onClick={(e) => {
            e.stopPropagation();
            onFlag();
          }}
          className={flagged ? "text-white" : "text-neutral-600 hover:text-neutral-300"}
        >
          <Flag className="h-4 w-4" strokeWidth={1.5} fill={flagged ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}
