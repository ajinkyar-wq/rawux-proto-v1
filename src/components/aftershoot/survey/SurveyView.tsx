import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { BottomBar } from "../BottomBar";
import { photoUrl } from "../cull-data";
import { AlbumFilmstrip } from "../loupe/AlbumFilmstrip";

// Lightroom-style Survey view: compare a set of photos side by side, all
// visible at once (no scrolling), the active one outlined. Click to make a
// photo active; double-click opens it in loupe; hover shows an "x" to drop it
// from the comparison set.
export function SurveyView({
  viewBar,
  selectedIndex,
  onSelectIndex,
  onOpenInLoupe,
  zoom,
  onZoomChange,
  cullComplete,
  cullFiltersVisible,
}: {
  // Filter row (ViewBar) — sits above the image area only.
  viewBar?: React.ReactNode;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onOpenInLoupe: (i: number) => void;
  zoom: number;
  onZoomChange: (v: number) => void;
  cullComplete: boolean;
  // Cull filters exist only for an Automated cull (see LoupeView).
  cullFiltersVisible: boolean;
}) {
  // The comparison set, seeded with two photos from the selected image. The
  // user adds more by clicking tiles in the filmstrip.
  const [members, setMembers] = useState<number[]>(() => {
    const start = Math.max(0, selectedIndex);
    return [start, start + 1];
  });

  // Clicking a filmstrip tile makes it active and adds it to the comparison
  // set (kept in album order).
  useEffect(() => {
    setMembers((prev) =>
      prev.includes(selectedIndex) ? prev : [...prev, selectedIndex].sort((a, b) => a - b),
    );
  }, [selectedIndex]);

  const remove = (idx: number) =>
    setMembers((prev) => (prev.length > 1 ? prev.filter((m) => m !== idx) : prev));

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {viewBar}
        <SurveyGrid
          members={members}
          active={selectedIndex}
          onActivate={onSelectIndex}
          onOpenInLoupe={onOpenInLoupe}
          onRemove={remove}
        />
        <AlbumFilmstrip
          selectedIndex={selectedIndex}
          onSelect={onSelectIndex}
          cullComplete={cullComplete}
        />
        <BottomBar zoom={zoom} onZoomChange={onZoomChange} showZoom={false} />
      </div>
    </div>
  );
}

const GAP = 12;
const MIN_TILE_EDGE = 80;

function SurveyGrid({
  members,
  active,
  onActivate,
  onOpenInLoupe,
  onRemove,
}: {
  members: number[];
  active: number;
  onActivate: (i: number) => void;
  onOpenInLoupe: (i: number) => void;
  onRemove: (i: number) => void;
}) {
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

  const { cols, tileW, tileH } = useMemo(
    () => layout(members.length, box.w, box.h, GAP),
    [members.length, box.w, box.h],
  );
  const rows = Math.ceil(members.length / cols);

  return (
    <div
      ref={wrapperRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${tileW}px)`,
          gridAutoRows: `${tileH}px`,
          gap: `${GAP}px`,
          width: cols * tileW + (cols - 1) * GAP,
          height: rows * tileH + (rows - 1) * GAP,
        }}
      >
        {members.map((idx) => {
          const isActive = idx === active;
          return (
            <button
              key={idx}
              onClick={() => onActivate(idx)}
              onDoubleClick={() => onOpenInLoupe(idx)}
              style={{ backgroundImage: `url(${photoUrl(idx, 800)})` }}
              className={`group relative rounded bg-[#1a1a1a] bg-contain bg-center bg-no-repeat transition-colors ${
                isActive
                  ? "ring-2 ring-inset ring-white"
                  : "ring-1 ring-inset ring-white/10 hover:ring-white/30"
              }`}
            >
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(idx);
                }}
                className="absolute right-1.5 top-1.5 hidden h-5 w-5 items-center justify-center rounded bg-black/60 text-neutral-200 hover:bg-black/80 group-hover:flex"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Pick the column count that maximizes the smaller tile edge so the whole set
// fits the viewport at the biggest possible size without scrolling.
function layout(
  count: number,
  width: number,
  height: number,
  gap: number,
): { cols: number; tileW: number; tileH: number } {
  if (count <= 0 || width <= 0 || height <= 0) {
    return { cols: 1, tileW: 0, tileH: 0 };
  }
  let best = { cols: 1, tileW: 0, tileH: 0, score: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const tileW = Math.floor((width - gap * (cols - 1)) / cols);
    const tileH = Math.floor((height - gap * (rows - 1)) / rows);
    if (tileW <= 0 || tileH <= 0) continue;
    const score = Math.min(tileW, tileH);
    if (score > best.score) best = { cols, tileW, tileH, score };
  }
  if (best.score < 0) {
    return { cols: 1, tileW: MIN_TILE_EDGE, tileH: MIN_TILE_EDGE };
  }
  return { cols: best.cols, tileW: best.tileW, tileH: best.tileH };
}
