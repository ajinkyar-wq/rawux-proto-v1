import { useEffect, useRef } from "react";
import { Flag } from "lucide-react";
import { CULL_IMAGES, photoUrl } from "./cull-data";
import { RatingChip } from "./RatingChip";
import type { Ratings } from "./use-ratings";

// Clickable image tile grid in the main canvas. Columns are driven by the
// bottom-bar zoom slider. Tiles come from the shared CULL_IMAGES dataset so the
// FilterBar and the side-panel Cull Filters filter the SAME images.
//
// Allowed to shrink (`min-h-0`) so a tall filmstrip below it doesn't push the
// bottom bar off-screen.

const MIN_COLS = 2;
const MAX_COLS = 5;

/** Map a 0-100 zoom percentage to a discrete column count.
 *  Slider far-left (0) = MAX_COLS smallest tiles (5).
 *  Slider far-right (100) = MIN_COLS biggest tiles (2). */
export function zoomToCols(zoom: number) {
  const span = MAX_COLS - MIN_COLS;
  const clamped = Math.max(0, Math.min(100, zoom));
  return MAX_COLS - Math.round((clamped / 100) * span);
}

export function CanvasGrid({
  selected,
  selection,
  onSelect,
  onOpenInLoupe,
  cols,
  ratingFilter,
  ratings,
  scrollTarget,
}: {
  selected: number;
  /** Multi-selection (⌘-click toggles, ⇧-click selects a range). */
  selection?: Set<number>;
  onSelect: (i: number, mode: "single" | "toggle" | "range") => void;
  onOpenInLoupe?: (i: number) => void;
  cols: number;
  /** Active rating filter (1..5; 0 = unrated). Empty/undefined = show all. */
  ratingFilter?: Set<number>;
  /** Shared rating state (override → cull rating → unrated). */
  ratings: Ratings;
  /** Scroll this tile into view (Undo/Redo landing in Grid). `n` re-triggers. */
  scrollTarget?: { id: number; n: number } | null;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollTarget) return;
    const scroller = scrollerRef.current;
    const el = scroller?.querySelector<HTMLElement>(`[data-tile-id="${scrollTarget.id}"]`);
    if (!scroller || !el) return;
    // Smooth-scroll so the user sees the grid travel to the affected images;
    // fall back to an instant jump if smooth scrolling didn't get there.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = window.setTimeout(() => {
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      if (Math.abs(top) > 4) el.scrollIntoView({ block: "start" });
    }, 700);
    return () => window.clearTimeout(t);
  }, [scrollTarget]);
  const { ratingOf, setRating } = ratings;
  const filterActive = !!ratingFilter && ratingFilter.size > 0;

  return (
    <div
      ref={scrollerRef}
      className="grid min-h-0 flex-1 gap-px overflow-auto bg-white/[0.04] p-px"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {CULL_IMAGES.map((img) => {
        const isPrimary = selected === img.id;
        const isSelected = selection ? selection.has(img.id) : isPrimary;
        const rating = ratingOf(img.id);
        // When a rating filter is active, hide tiles that don't match.
        if (filterActive && !ratingFilter!.has(rating)) return null;
        return (
          <div
            key={img.id}
            data-tile-id={img.id}
            onClick={(e) =>
              onSelect(img.id, e.shiftKey ? "range" : e.metaKey || e.ctrlKey ? "toggle" : "single")
            }
            onDoubleClick={() => onOpenInLoupe?.(img.id)}
            className={`flex cursor-pointer flex-col gap-1.5 bg-[#1a1a1a] p-2 text-left transition-colors hover:bg-white/[0.02] ${
              isSelected
                ? isPrimary
                  ? "bg-white/[0.05] ring-1 ring-inset ring-white/60"
                  : "bg-white/[0.04] ring-1 ring-inset ring-white/30"
                : ""
            }`}
          >
            {/* Filename */}
            <span className="truncate text-[11px] text-neutral-400">{img.name}</span>

            {/* Image placeholder */}
            <div
              className="aspect-[3/2] w-full rounded-sm bg-[#2a2a2a] bg-cover bg-center"
              style={{ backgroundImage: `url(${photoUrl(img.id, 480)})` }}
            />

            {/* Status footer: rating chip (clickable stars) + flag */}
            <div className="flex items-center justify-center gap-2 pt-0.5">
              <RatingChip rating={rating} onRate={(v) => setRating(img.id, v)} />
              <Flag className="h-3.5 w-3.5 shrink-0 text-neutral-500" strokeWidth={1.75} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
