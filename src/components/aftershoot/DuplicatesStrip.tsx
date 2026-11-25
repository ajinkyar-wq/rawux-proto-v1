import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { photoUrl } from "./cull-data";
import { useAlbumHistoryContext } from "./history/album-history";
import { CroppedPhoto } from "./loupe/CroppedPhoto";
import { cropAspect, cropOf } from "./loupe/crop-config";
import { IconTooltip } from "./IconTooltip";
import { duplicateCount } from "./duplicates";

// Strip is contextual: each grid tile has its own duplicate set.
// Toggle tab is anchored on the bottom edge in BOTH expanded and collapsed states.
//
// Two sizes:
//   - "default": tall strip used in the grid view (120 high) — drag-resizable.
//   - "compact": short strip used above the album filmstrip in loupe view —
//     same height/tile size as AlbumFilmstrip below so they line up (fixed).

const SIZE_TOKENS = {
  default: { strip: 120, vpad: 8 },
  compact: { strip: 64, vpad: 8 },
} as const;

type Size = keyof typeof SIZE_TOKENS;

const MIN_HEIGHT = 64;
const MAX_HEIGHT = 320;

export function DuplicatesStrip({
  expanded,
  onToggle,
  selectedGridTile,
  activeDup = 0,
  onSelectDup,
  size = "default",
}: {
  expanded: boolean;
  onToggle: () => void;
  selectedGridTile: number;
  // Which photo of the set is showing (0 = the image itself), and a handler
  // to switch to another one. Without a handler the tiles are display-only.
  activeDup?: number;
  onSelectDup?: (k: number) => void;
  size?: Size;
}) {
  const count = duplicateCount(selectedGridTile);
  const selectedIndex = activeDup;
  const { strip, vpad } = SIZE_TOKENS[size];

  // The grid-view ("default") strip is drag-resizable; the compact loupe strip
  // stays a fixed height so it lines up with the album filmstrip below it.
  const resizable = size === "default";
  const [stripHeight, setStripHeight] = useState<number>(strip);
  const tileH = stripHeight - vpad * 2;
  const tileW = Math.round((tileH * 3) / 2);

  // Drag the top edge to grow the strip upward / shrink it downward.
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = stripHeight;
    function onMove(ev: PointerEvent) {
      const next = startHeight + (startY - ev.clientY);
      setStripHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next)));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="relative shrink-0">
      <CollapseTab expanded={expanded} onToggle={onToggle} />

      {expanded && (
        <div className="relative border-t border-white/[0.05] bg-[#1c1c1c]">
          {resizable && (
            // Invisible drag hit-area on the top edge — no visible handle.
            <div
              onPointerDown={startResize}
              title="Drag to resize duplicates"
              className="absolute inset-x-0 -top-1 z-[5] h-2 cursor-ns-resize"
            />
          )}
          <FilmstripRow
            tileCount={count}
            image={selectedGridTile}
            selectedIndex={selectedIndex}
            onSelect={onSelectDup}
            stripHeight={resizable ? stripHeight : strip}
            tileHeight={resizable ? tileH : strip - vpad * 2}
            tileWidth={resizable ? tileW : Math.round(((strip - vpad * 2) * 3) / 2)}
          />
        </div>
      )}
    </div>
  );
}

function CollapseTab({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <IconTooltip label={expanded ? "Hide duplicates" : "Show duplicates"} side="top">
      <button
        onClick={onToggle}
        className="absolute bottom-0 left-1/2 z-10 flex h-4 w-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-md border border-white/10 bg-[#1c1c1c] text-[#ababab] hover:text-white"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "" : "rotate-180"}`}
          strokeWidth={1.75}
        />
      </button>
    </IconTooltip>
  );
}

function FilmstripRow({
  tileCount,
  image,
  selectedIndex,
  onSelect,
  stripHeight,
  tileHeight,
  tileWidth,
}: {
  tileCount: number;
  image: number;
  selectedIndex: number;
  onSelect?: (k: number) => void;
  stripHeight: number;
  tileHeight: number;
  tileWidth: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  // Duplicates are the same picture, so every tile shows this image's crop:
  // same height, as wide as the crop's shape (like the album filmstrip).
  const crop = cropOf(useAlbumHistoryContext(), image);
  const width = Math.round(tileHeight * cropAspect(crop, image)) || tileWidth;

  // Scroll the selected tile into view (left-aligned, not center-padded).
  useEffect(() => {
    const tile = selectedRef.current;
    if (!tile) return;
    tile.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [selectedIndex, tileCount]);

  return (
    <div
      ref={scrollerRef}
      className="flex items-center overflow-x-auto"
      style={{ height: stripHeight }}
    >
      {/* Inner track is centered via mx-auto when the tiles are narrower than
          the strip; once they overflow it scrolls horizontally. */}
      <div className="mx-auto flex items-center gap-2 px-2">
        {Array.from({ length: tileCount }).map((_, i) => (
          <button
            type="button"
            key={i}
            aria-label={`Duplicate ${i + 1} of ${tileCount}`}
            aria-pressed={i === selectedIndex}
            onClick={() => onSelect?.(i)}
            ref={i === selectedIndex ? selectedRef : undefined}
            style={{ height: tileHeight, width }}
            className={`relative shrink-0 overflow-hidden rounded-[3px] bg-[#242424] ${
              onSelect ? "cursor-pointer" : ""
            } ${
              i === selectedIndex
                ? "outline outline-[1.5px] outline-white"
                : "outline outline-1 -outline-offset-1 outline-[#303030] hover:outline-white/40"
            }`}
          >
            <CroppedPhoto src={photoUrl(image, 240)} crop={crop} className="h-full w-full" />
          </button>
        ))}
      </div>
    </div>
  );
}
