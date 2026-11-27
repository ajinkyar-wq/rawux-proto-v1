import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { photoUrl } from "./cull-data";
import { useAlbumHistoryContext } from "./history/album-history";
import { CroppedPhoto } from "./loupe/CroppedPhoto";
import { cropAspect, cropOf } from "./loupe/crop-config";
import { editLookOf } from "./loupe/edit-preview";
import { IconTooltip } from "./IconTooltip";
import { dupId, duplicateCount, stackOrder } from "./duplicates";
import { Check, Gear } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ratingColorHex } from "./rating";
import { setDupStripPrefs, useDupStripPrefs, type DupStripPrefs } from "./loupe/dup-strip-prefs";

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
  ratingOf,
  withMenu = false,
}: {
  expanded: boolean;
  onToggle: () => void;
  selectedGridTile: number;
  // Which photo of the set is showing (0 = the image itself), and a handler
  // to switch to another one. Without a handler the tiles are display-only.
  activeDup?: number;
  onSelectDup?: (k: number) => void;
  size?: Size;
  /** Photo ratings: drive Sort by Importance and the colour bars. */
  ratingOf?: (id: number) => number;
  /** Loupe: gear before the first tile with the strip options. */
  withMenu?: boolean;
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
            ratingOf={ratingOf}
            withMenu={withMenu}
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
  ratingOf,
  withMenu,
}: {
  ratingOf?: (id: number) => number;
  withMenu: boolean;
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
  const history = useAlbumHistoryContext();
  const crop = cropOf(history, image);
  const look = editLookOf(history, image);
  const width = Math.round(tileHeight * cropAspect(crop, image)) || tileWidth;
  // Options only apply where the menu is shown (loupe).
  const prefs = useDupStripPrefs();
  const rate = ratingOf ?? (() => 0);
  const order = stackOrder(image, rate, withMenu && prefs.sortByImportance);
  // Each tile always shows its rating colour bar (when ratings are known).
  const showBars = !!ratingOf;

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
        {withMenu && <StripMenu prefs={prefs} />}
        {order.map((i, pos) => (
          <div key={i} className="relative shrink-0">
            <button
              type="button"
              aria-label={`Duplicate ${pos + 1} of ${tileCount}`}
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
              <CroppedPhoto
                src={photoUrl(image, 240)}
                crop={crop}
                look={look}
                className="h-full w-full"
              />
            </button>
            {showBars && (
              <span
                aria-hidden
                className="absolute -bottom-[6px] left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full"
                style={{ background: ratingColorHex(rate(dupId(image, i))) }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Strip options (gear before the first tile) ---------------- */

// Figma dropdown spec (same cells as the photo context menu); a ticked option
// reads brighter, with the check on the right.
const MENU_PANEL =
  "z-[200] flex min-w-[220px] flex-col gap-0.5 rounded-lg border border-[#474747] bg-[#242424] p-1 shadow-2xl";
const MENU_CELL =
  "flex cursor-default select-none items-center gap-3 rounded px-2 py-2 text-[12px] font-medium leading-4 outline-none data-[highlighted]:bg-[rgba(226,226,226,0.1)] data-[highlighted]:text-[#e2e2e2] data-[state=checked]:text-[#e2e2e2] data-[state=unchecked]:text-[#ababab]";

const OPTIONS: { key: keyof DupStripPrefs; label: string; divider?: boolean }[] = [
  { key: "sortByImportance", label: "Sort by Importance" },
  { key: "cycle", label: "Cycle through Duplicates" },
  { key: "colorBorder", label: "Show color border", divider: true },
];

function StripMenu({ prefs }: { prefs: DupStripPrefs }) {
  return (
    <DropdownMenu.Root>
      <IconTooltip label="Duplicate options">
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Duplicate options"
            className="flex size-7 shrink-0 items-center justify-center rounded text-[#ababab] hover:bg-white/5 hover:text-white data-[state=open]:text-white"
          >
            <Gear size={16} weight="light" />
          </button>
        </DropdownMenu.Trigger>
      </IconTooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className={MENU_PANEL}
        >
          {OPTIONS.map((o) => (
            <div key={o.key} className="contents">
              {o.divider && <DropdownMenu.Separator className="mx-2 h-px bg-[#474747]" />}
              <DropdownMenu.CheckboxItem
                checked={prefs[o.key]}
                onCheckedChange={(v) => setDupStripPrefs({ [o.key]: v === true })}
                // Keep the menu open so several options can be toggled.
                onSelect={(e) => e.preventDefault()}
                className={MENU_CELL}
              >
                <span className="flex-1">{o.label}</span>
                <span className="flex size-4 items-center justify-center">
                  <DropdownMenu.ItemIndicator>
                    <Check size={16} weight="light" />
                  </DropdownMenu.ItemIndicator>
                </span>
              </DropdownMenu.CheckboxItem>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
