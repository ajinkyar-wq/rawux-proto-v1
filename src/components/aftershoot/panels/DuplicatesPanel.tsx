import { useState } from "react";
import { ChevronDown, Copy } from "lucide-react";

// Duplicates accordion for the right-side CULL tab. Replaces the old grid-view
// filmstrip — duplicates for the selected tile now live here, below Key Faces.
//
// Each grid tile has its own duplicate set; placeholder counts mirror the
// old DuplicatesStrip data until real backend duplicate groups are wired in.
const DUPLICATE_COUNTS = [12, 5, 8, 3, 20, 7, 15, 4, 11];

export function DuplicatesPanel({ selectedGridTile }: { selectedGridTile: number }) {
  const count = DUPLICATE_COUNTS[selectedGridTile % DUPLICATE_COUNTS.length];
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex shrink-0 items-center gap-2 py-2 text-[13px] text-neutral-300 hover:text-white"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-500 transition-transform ${expanded ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
        Duplicates ({count})
      </button>

      {expanded &&
        (count > 0 ? (
          <div className="min-h-0 overflow-y-auto pb-2">
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/2] rounded-[3px] bg-[#242424] outline outline-1 -outline-offset-1 outline-[#303030]"
                />
              ))}
            </div>
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
