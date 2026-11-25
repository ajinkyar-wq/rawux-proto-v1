import { useContext, useEffect, useRef } from "react";
import { Flag } from "lucide-react";
import { CULL_IMAGES, photoUrl } from "./cull-data";
import { RatingChip } from "./RatingChip";
import { useAlbumHistoryContext } from "./history/album-history";
import { FittedCroppedPhoto } from "./loupe/CroppedPhoto";
import { cropOf } from "./loupe/crop-config";
import { PhotoContextMenu, PhotoMenuContext } from "./PhotoContextMenu";
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
  // Crops live in the album history (per image).
  const history = useAlbumHistoryContext();
  const filterActive = !!ratingFilter && ratingFilter.size > 0;
  const flagged = useContext(PhotoMenuContext)?.flagged;

  return (
    // Scroller fills the canvas; the grid inside only takes the height its
    // rows need (a filtered, short list must not stretch rows to fill).
    <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto bg-[#1a1a1a]">
      <div
        className="grid content-start"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {CULL_IMAGES.map((img) => {
          const isPrimary = selected === img.id;
          const isSelected = selection ? selection.has(img.id) : isPrimary;
          const rating = ratingOf(img.id);
          // When a rating filter is active, hide tiles that don't match.
          if (filterActive && !ratingFilter!.has(rating)) return null;
          return (
            <PhotoContextMenu key={img.id} id={img.id} surface="grid">
              <div
                data-tile-id={img.id}
                onClick={(e) =>
                  onSelect(
                    img.id,
                    e.shiftKey ? "range" : e.metaKey || e.ctrlKey ? "toggle" : "single",
                  )
                }
                onDoubleClick={() => onOpenInLoupe?.(img.id)}
                className={`flex cursor-pointer flex-col gap-1.5 border-b border-r border-white/[0.06] bg-[#1a1a1a] p-2 text-left transition-colors hover:bg-white/[0.02] ${
                  isSelected
                    ? isPrimary
                      ? "bg-white/[0.05] ring-1 ring-inset ring-white/60"
                      : "bg-white/[0.04] ring-1 ring-inset ring-white/30"
                    : ""
                }`}
              >
                {/* Filename */}
                <span className="truncate text-[11px] text-neutral-400">{img.name}</span>

                {/* Photo: the tile keeps its 3:2 size; the cropped photo is
                  fitted inside it (portrait crops narrow, wide crops short). */}
                <FittedCroppedPhoto
                  src={photoUrl(img.id, 480)}
                  crop={cropOf(history, img.id)}
                  frameClassName="bg-[#2a2a2a]"
                  image={img.id}
                />

                {/* Status footer: rating chip (clickable stars) + flag */}
                <div className="flex items-center justify-center gap-2 pt-0.5">
                  <RatingChip rating={rating} onRate={(v) => setRating(img.id, v)} />
                  <Flag
                    className={`h-3.5 w-3.5 shrink-0 ${flagged?.has(img.id) ? "text-white" : "text-neutral-500"}`}
                    fill={flagged?.has(img.id) ? "currentColor" : "none"}
                    strokeWidth={1.75}
                  />
                </div>
              </div>
            </PhotoContextMenu>
          );
        })}
      </div>
    </div>
  );
}
