import { useEffect, useRef, useState } from "react";
import { CULL_IMAGES, photoUrl } from "../cull-data";
import { ratingColorHex } from "../rating";
import { useAlbumHistoryContext } from "../history/album-history";
import { cropAspect, cropOf } from "./crop-config";
import { editLookOf } from "./edit-preview";
import { CroppedPhoto } from "./CroppedPhoto";
import { PhotoContextMenu } from "../PhotoContextMenu";

// Horizontal filmstrip of all images in the album, Lightroom style: every
// thumbnail is the same height and as wide as its photo's (cropped) shape, so
// a square crop is narrow and a 16:9 crop is wide. Selected tile outlined
// white; clicking a tile switches the loupe to that image. Height is
// drag-resizable via the grab handle on its top edge (double-click resets).
// Top edge keeps generous breathing room; the bottom edge is tight so the
// pill sits close to the bottom (independent values, not a shared VPAD).
const TOP_PAD = 10;
const BOTTOM_PAD = 10; // room for the thin horizontal scrollbar
const DEFAULT_HEIGHT = 108;
// Floor: below this, portrait thumbnails get thinner than their rating pill
// and the strip stops reading as photos.
const MIN_HEIGHT = 80;
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
  selection,
}: {
  selectedIndex: number;
  onSelect: (i: number, e?: React.MouseEvent) => void;
  // Ratings (pill colors) only appear after AI cull; before that they're grey.
  cullComplete?: boolean;
  // Survey: images currently in the comparison set get a soft outline.
  highlight?: number[];
  // Loupe: multi-selected images (⌘/⇧-click) get the same white outline.
  selection?: Set<number>;
}) {
  const inSet = highlight ? new Set(highlight) : null;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [stripHeight, setStripHeightState] = useState(() => Math.max(MIN_HEIGHT, savedHeight));
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
  // Crops live in the album history (per image, revert on Undo).
  const history = useAlbumHistoryContext();

  // Keep the current image centred in the strip: smoothly when it changes,
  // instantly on first show and whenever the strip resizes (panel opens,
  // strip height drag, window resize).
  const centerSelected = (behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current;
    const tile = selectedRef.current;
    if (!scroller || !tile) return;
    const s = scroller.getBoundingClientRect();
    const t = tile.getBoundingClientRect();
    const left = scroller.scrollLeft + (t.left - s.left) + t.width / 2 - scroller.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior });
  };
  const firstCenter = useRef(true);
  useEffect(() => {
    centerSelected(firstCenter.current ? "auto" : "smooth");
    firstCenter.current = false;
  }, [selectedIndex]);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const ro = new ResizeObserver(() => centerSelected("auto"));
    ro.observe(scroller);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    centerSelected("auto");
    // Re-centre when the strip height or any crop (tile widths) changes.
  }, [tileHeight, history?.cursor]);

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
        {Array.from({ length: ALBUM_TILE_COUNT }).map((_, i) => {
          const crop = cropOf(history, i);
          const width = Math.round(tileHeight * cropAspect(crop, i));
          return (
            <PhotoContextMenu key={i} id={i} surface="film">
              <button
                ref={i === selectedIndex ? selectedRef : undefined}
                onClick={(e) => onSelect(i, e)}
                style={{ width }}
                className="flex shrink-0 flex-col items-center gap-1"
              >
                {/* Thumbnail: only the cropped area of the photo, at its shape. */}
                <div
                  style={{ height: tileHeight, width }}
                  className={`relative overflow-hidden rounded-[3px] bg-[#242424] ${
                    i === selectedIndex || selection?.has(i)
                      ? "outline outline-[1.5px] outline-white"
                      : inSet?.has(i)
                        ? "outline outline-[1.5px] -outline-offset-1 outline-white/50"
                        : "outline outline-1 -outline-offset-1 outline-[#303030]"
                  }`}
                >
                  <CroppedPhoto
                    src={photoUrl(i, 240)}
                    crop={crop}
                    look={editLookOf(history, i)}
                    className="h-full w-full"
                  />
                </div>
                {/* Status pill below the image — the image's rating color once
                cull has run, grey/unrated before that. */}
                {cullComplete && (
                  <span
                    className="h-1 rounded-full"
                    style={{
                      backgroundColor: ratingColorHex(tileRating(i)),
                      // Never wider than its thumbnail, so pills don't run together.
                      width: Math.min(28, width - 8),
                    }}
                  />
                )}
              </button>
            </PhotoContextMenu>
          );
        })}
      </div>
    </div>
  );
}
