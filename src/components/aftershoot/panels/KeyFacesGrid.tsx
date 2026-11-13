import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Placeholder Key Faces grid. No images, no overlay badges — just empty
// face-card slots.
//
// Rules (in order of preference):
//  1. Always fill the panel — width and height — with the biggest cards possible.
//  2. Cards may be wider than tall (landscape rectangles) — that's preferred at
//     low counts because it uses the whole area with big cards.
//  3. Cards never go TALLER than wide. Square is the minimum aspect ratio.
//  4. If hitting the square floor still doesn't fit all cards in view, lock
//     tiles at that square size and let the grid scroll vertically.

const FACE_COUNTS_PER_TILE = [9, 1, 4, 12, 18, 2, 6, 3, 16];

export function KeyFacesGrid({
  selectedGridTile,
  cols = 2,
}: {
  selectedGridTile: number;
  cols?: number;
}) {
  const count = FACE_COUNTS_PER_TILE[selectedGridTile % FACE_COUNTS_PER_TILE.length];

  const [expanded, setExpanded] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const GAP = 4;
  const COLS = cols;
  const tile = box.w > 0 ? Math.floor((box.w - GAP * (COLS - 1)) / COLS) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex shrink-0 items-center gap-2 py-2 text-[13px] text-neutral-300 hover:text-white"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${expanded ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
        Key Faces ({count})
      </button>
      <div ref={wrapperRef} className={expanded ? "pb-2" : "hidden"}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridAutoRows: `${tile}px`,
            gap: `${GAP}px`,
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="rounded-sm bg-[#1f1f1f] ring-1 ring-inset ring-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
