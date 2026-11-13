import { useState } from "react";
import { Eye, Flag, Info, Minus, Plus, SprayCan } from "lucide-react";
import { IconTooltip } from "./IconTooltip";
import { RatingChip } from "./RatingChip";
import { ThumbnailSlider } from "./primitives";

// Before/after compare glyph: a rounded square split vertically with the left
// half filled solid (matches the requested button design).
function CompareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.5 6.5a2 2 0 0 1 2-2H11a.5.5 0 0 1 .5.5v14a.5.5 0 0 1-.5.5H5.5a2 2 0 0 1-2-2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BottomBar({
  zoom,
  onZoomChange,
  showZoom = true,
  showSprayCan = true,
  filmstripOpen,
  onToggleFilmstrip,
  rating,
  onRate,
  index = 0,
  total = 232,
  imageName,
  countSuffix,
  showCompare = true,
}: {
  /** 0-100 percentage driving thumbnail/grid size. */
  zoom: number;
  onZoomChange: (v: number) => void;
  /** Hide the thumbnail-size slider (e.g. in loupe view). */
  showZoom?: boolean;
  /** Hide the spray can button (e.g. in loupe view). */
  showSprayCan?: boolean;
  /** When provided, shows the filmstrip collapse toggle (loupe view). */
  filmstripOpen?: boolean;
  onToggleFilmstrip?: () => void;
  /** Current image's rating (loupe view only). When provided, shows a rating
   *  chip that stays in sync with the grid tiles. Omitted in grid view. */
  rating?: number;
  onRate?: (value: number) => void;
  /** 0-based index of the current image, for the "n / total" counter. */
  index?: number;
  total?: number;
  /** Current image's file name (loupe view only), shown after the counter. */
  imageName?: string;
  /** Text after the counter, e.g. "Images" in grid view ("1 / 232 Images"). */
  countSuffix?: string;
  /** Hide the Before/After toggle (grid view). */
  showCompare?: boolean;
}) {
  return (
    <div className="relative flex h-10 shrink-0 items-center justify-between border-t border-white/[0.05] bg-[#1c1c1c] px-2">
      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-1.5">
          <Eye className="h-4 w-4 text-[#888]" strokeWidth={1.5} />
          <span className="text-[12px] font-medium leading-4 text-[#ababab]">
            {index + 1} / {total}
            {countSuffix && ` ${countSuffix}`}
          </span>
        </div>
        {imageName && (
          <>
            <div className="h-4 w-px bg-[#333]" />
            <div className="flex items-center gap-2">
              <span className="max-w-[180px] truncate text-[12px] font-medium text-neutral-200">
                {imageName}
              </span>
              <IconTooltip label="Image info" side="top">
                <button
                  type="button"
                  aria-label="Image info"
                  className="rounded-full text-neutral-500 hover:text-neutral-200"
                >
                  <Info className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </IconTooltip>
            </div>
          </>
        )}
      </div>

      {/* Rating chip pinned to the true center of the bar (loupe view only),
          independent of the left counter and right controls. */}
      {rating !== undefined && onRate && (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          <RatingChip rating={rating} onRate={onRate} />
          <Flag className="h-3.5 w-3.5 shrink-0 text-neutral-500" strokeWidth={1.75} />
        </div>
      )}

      <div className="flex items-center gap-3">
        {showZoom && (
          <>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => onZoomChange(Math.max(0, zoom - 10))}
                className="rounded p-0.5 text-[#888] hover:text-white"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <ThumbnailSlider value={zoom} onChange={onZoomChange} />
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => onZoomChange(Math.min(100, zoom + 10))}
                className="rounded p-0.5 text-[#888] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
            {(onToggleFilmstrip || showSprayCan || showCompare) && (
              <div className="h-4 w-px bg-[#474747]" />
            )}
          </>
        )}
        {onToggleFilmstrip && (
          <FilmstripToggle open={!!filmstripOpen} onToggle={onToggleFilmstrip} />
        )}
        {showSprayCan && <SprayCanToggle />}
        {showCompare && <CompareToggle />}
      </div>
    </div>
  );
}

// Filmstrip show/hide glyph: a strip of tiles with a chevron above it that
// points down when the strip is open (click to hide) and up when hidden.
function FilmstripIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d={open ? "M8 6l4 4 4-4" : "M8 10l4-4 4 4"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5" y="14" width="14" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

// Toggles the loupe album filmstrip open/closed.
function FilmstripToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <IconTooltip label={open ? "Hide filmstrip" : "Show filmstrip"} side="top">
      <button
        type="button"
        aria-pressed={open}
        onClick={onToggle}
        className={`flex h-6 w-6 items-center justify-center rounded ${
          open ? "bg-white/10 text-white" : "text-[#ababab] hover:bg-white/5 hover:text-white"
        }`}
      >
        <FilmstripIcon open={open} className="h-[18px] w-[18px]" />
      </button>
    </IconTooltip>
  );
}

// Spray Can ("paint"/auto-sync) mode toggle. Sits next to Compare in every
// view's bottom bar (grid, loupe, survey).
function SprayCanToggle() {
  const [active, setActive] = useState(false);
  return (
    <IconTooltip label="Spray Can" side="top">
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setActive((v) => !v)}
        className={`flex h-6 w-6 items-center justify-center rounded ${
          active ? "bg-white/10 text-white" : "text-[#ababab] hover:bg-white/5 hover:text-white"
        }`}
      >
        <SprayCan className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>
    </IconTooltip>
  );
}

// Before/After compare toggle. The filled-left panel icon matches Lightroom's
// before/after metaphor; clicking switches the active (highlighted) state.
function CompareToggle() {
  const [active, setActive] = useState(false);
  return (
    <IconTooltip label="Before / After" side="top">
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setActive((v) => !v)}
        className={`flex h-6 w-6 items-center justify-center rounded ${
          active ? "bg-white/10 text-white" : "text-[#ababab] hover:bg-white/5 hover:text-white"
        }`}
      >
        <CompareIcon className="h-[18px] w-[18px]" />
      </button>
    </IconTooltip>
  );
}
