import { useEffect, useRef, useState } from "react";
import { CULL_IMAGES, photoUrl } from "../cull-data";
import { ratingColorHex } from "../rating";

// Horizontal filmstrip of all images in the album. Selected tile outlined
// white; clicking a tile switches the loupe to that image. Height is
// drag-resizable via the grab handle on its top edge (double-click resets).
// Top edge keeps generous breathing room; the bottom edge is tight so the
// pill sits close to the bottom (independent values, not a shared VPAD).
const TOP_PAD = 10;
const BOTTOM_PAD = 10; // room for the thin horizontal scrollbar
const DEFAULT_HEIGHT = 108;
const MIN_HEIGHT = 40;
const MAX_HEIGHT = 260;

// The height survives remounts (Loupe ↔ Grid ↔ Survey, CULL ↔ ENHANCE) and is
// shared by the Loupe and Survey strips, so it stays where the user left it.
let savedHeight = DEFAULT_HEIGHT;

const ALBUM_TILE_COUNT = 232; // matches the "1 / 232" in the bottom bar

// Each tile's rating comes from the shared cull dataset (wrapped to fill the
// strip), so filmstrip pills match the grid's per-image ratings/colors.
function tileRating(i: number) {
  return CULL_IMAGES[i % CULL_IMAGES.length].rating;
}

export function AlbumFilmstrip({
  selectedIndex,
  onSelect,
  cullComplete = false,
  highlight,
}: {
  selectedIndex: number;
  onSelect: (i: number, e?: React.MouseEvent) => void;
  // Ratings (pill colors) only appear after AI cull; before that they're grey.
  cullComplete?: boolean;
  // Survey: images currently in the comparison set get a soft outline.
  highlight?: number[];
}) {
  const inSet = highlight ? new Set(highlight) : null;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [stripHeight, setStripHeightState] = useState(() => savedHeight);
  const setStripHeight = (h: number) => {
    savedHeight = h;
    setStripHeightState(h);
  };
  const [resizing, setResizing] = useState(false);

  // Each tile = image + a status pill below it. Reserve room for the pill
  // (PILL_H) and the gap between them so nothing clips as the strip resizes.
  // image→pill gap, kept tight (matches BOTTOM_PAD so the pill region is even).
  // No pill before cull (nothing to show), so tiles get the full height.
  const PILL_H = cullComplete ? 4 : 0;
  const PILL_GAP = cullComplete ? 4 : 0;
  // The image keeps a ~16:10 ratio and scales with the strip height as it's dragged.
  const tileHeight = stripHeight - TOP_PAD - BOTTOM_PAD - PILL_H - PILL_GAP;
  const tileWidth = Math.round(tileHeight * 1.6);

  useEffect(() => {
    const tile = selectedRef.current;
    if (!tile) return;
    tile.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedIndex]);

  // Drag the top edge to grow the strip upward / shrink it downward.
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = stripHeight;
    setResizing(true);
    // Keep the resize cursor everywhere while dragging, not just on the handle.
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "ns-resize";

    function onMove(ev: PointerEvent) {
      // Dragging up (smaller clientY) makes the strip taller.
      const next = startHeight + (startY - ev.clientY);
      setStripHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next)));
    }
    function onUp() {
      setResizing(false);
      document.body.style.cursor = prevCursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className="relative shrink-0 border-t border-white/[0.05] bg-[#1c1c1c]"
      style={{ height: stripHeight }}
    >
      {/* Resize handle on the top edge: the edge line lights up on hover and
          a grab pill sits in the middle. Double-click resets the height. */}
      <div
        onPointerDown={startResize}
        onDoubleClick={() => setStripHeight(DEFAULT_HEIGHT)}
        title="Drag to resize filmstrip · double-click to reset"
        className="group absolute inset-x-0 -top-[5px] z-[5] flex h-[10px] cursor-ns-resize items-center justify-center"
      >
        <div
          className={`absolute inset-x-0 top-1/2 h-px -translate-y-1/2 transition-colors ${
            resizing ? "bg-white/40" : "bg-transparent group-hover:bg-white/25"
          }`}
        />
        <div
          className={`relative h-[4px] w-8 rounded-full transition-colors ${
            resizing ? "bg-white/70" : "bg-white/20 group-hover:bg-white/50"
          }`}
        />
      </div>

      <div
        ref={scrollerRef}
        className="flex h-full items-start justify-start gap-1.5 overflow-x-auto overflow-y-hidden px-2 [scrollbar-color:rgba(255,255,255,0.25)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar]:h-1"
        style={{ paddingTop: TOP_PAD, paddingBottom: BOTTOM_PAD }}
      >
        {Array.from({ length: ALBUM_TILE_COUNT }).map((_, i) => (
          <button
            key={i}
            ref={i === selectedIndex ? selectedRef : undefined}
            onClick={(e) => onSelect(i, e)}
            style={{ width: tileWidth }}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            {/* Image placeholder */}
            <div
              style={{
                height: tileHeight,
                width: tileWidth,
                backgroundImage: `url(${photoUrl(i, 240)})`,
              }}
              className={`rounded-[3px] bg-[#242424] bg-cover bg-center ${
                i === selectedIndex
                  ? "outline outline-[1.5px] outline-white"
                  : inSet?.has(i)
                    ? "outline outline-[1.5px] -outline-offset-1 outline-white/50"
                    : "outline outline-1 -outline-offset-1 outline-[#303030]"
              }`}
            />
            {/* Status pill below the image — the image's rating color once
                cull has run, grey/unrated before that. */}
            {cullComplete && (
              <span
                className="h-1 w-7 rounded-full"
                style={{ backgroundColor: ratingColorHex(tileRating(i)) }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
