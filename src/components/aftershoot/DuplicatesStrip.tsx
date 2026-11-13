import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { photoUrl } from "./cull-data";
import { IconTooltip } from "./IconTooltip";

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

// Placeholder per-tile duplicate counts — real data would come from the
// selected image's duplicate group on the backend.
const DUPLICATE_COUNTS = [12, 5, 8, 3, 20, 7, 15, 4, 11];

export function DuplicatesStrip({
  expanded,
  onToggle,
  selectedGridTile,
  size = "default",
}: {
  expanded: boolean;
  onToggle: () => void;
  selectedGridTile: number;
  size?: Size;
}) {
  const count = DUPLICATE_COUNTS[selectedGridTile % DUPLICATE_COUNTS.length];
  // The selected duplicate is the leftmost (first) tile.
  const selectedIndex = 0;
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
        <div className="relative border-t border-white/[0.05] bg-[#111111]">
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
            stripHeight={resizable ? stripHeight : strip}
            tileHeight={resizable ? tileH : strip - vpad * 2}
            tileWidth={resizable ? tileW : Math.round(((strip - vpad * 2) * 3) / 2)}
          />
        </div>
      )}
    </div>
  );
}

function CollapseTab({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <IconTooltip label={expanded ? "Hide duplicates" : "Show duplicates"} side="top">
      <button
        onClick={onToggle}
        className="absolute bottom-0 left-1/2 z-10 flex h-4 w-8 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-md border border-white/10 bg-[#111111] text-[#ababab] hover:text-white"
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
  stripHeight,
  tileHeight,
  tileWidth,
}: {
  tileCount: number;
  image: number;
  selectedIndex: number;
  stripHeight: number;
  tileHeight: number;
  tileWidth: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

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
          <div
            key={i}
            ref={i === selectedIndex ? selectedRef : undefined}
            style={{
              height: tileHeight,
              width: tileWidth,
              backgroundImage: `url(${photoUrl(image, 240)})`,
            }}
            className={`shrink-0 rounded-[3px] bg-[#242424] bg-cover bg-center ${
              i === selectedIndex
                ? "outline outline-[1.5px] outline-white"
                : "outline outline-1 -outline-offset-1 outline-[#303030]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
