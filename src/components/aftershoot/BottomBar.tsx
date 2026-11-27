import { useEffect, useRef, useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { SprayCanIcon } from "./loupe/loupe-rail-config";
import { Check, ChevronDown, Eye, Flag, Info, Link2, Link2Off, Minus, Plus } from "lucide-react";
import { IconTooltip } from "./IconTooltip";
import { RatingChip } from "./RatingChip";
import { GradientSlider } from "./loupe/slider-primitives";
import { persistZoomKey, setZoomPrefs, useZoomPrefs, ZOOM_PRESETS, type ZoomMode } from "./zoom-prefs";

// Before/after glyphs from Figma (Compare-Before-Custom / Compare-After-Custom).
function CompareIcon({ after, className }: { after: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden>
      {after ? (
        <>
          <path d="M12.9167 3.125C12.5715 3.125 12.2917 3.40482 12.2917 3.75V16.25C12.2917 16.5952 12.5715 16.875 12.9167 16.875H16.4583C17.1487 16.875 17.7083 16.3154 17.7083 15.625V4.375C17.7083 3.68464 17.1487 3.125 16.4583 3.125H12.9167Z" />
          <path d="M9.375 17.9167V2.08333C9.375 1.73816 9.65482 1.45833 10 1.45833C10.3452 1.45833 10.625 1.73816 10.625 2.08333V17.9167C10.625 18.2618 10.3452 18.5417 10 18.5417C9.65482 18.5417 9.375 18.2618 9.375 17.9167Z" />
          <path d="M2.29167 15.625V4.375C2.29167 3.68464 2.85131 3.125 3.54167 3.125H7.08333C7.42851 3.125 7.70833 3.40482 7.70833 3.75C7.70833 4.09518 7.42851 4.375 7.08333 4.375H3.54167V15.625H7.08333C7.42851 15.625 7.70833 15.9048 7.70833 16.25C7.70833 16.5952 7.42851 16.875 7.08333 16.875H3.54167C2.85131 16.875 2.29167 16.3154 2.29167 15.625Z" />
        </>
      ) : (
        <>
          <path d="M7.08333 3.125C7.42851 3.125 7.70833 3.40482 7.70833 3.75V16.25C7.70833 16.5952 7.42851 16.875 7.08333 16.875H3.54167C2.85131 16.875 2.29167 16.3154 2.29167 15.625V4.375C2.29167 3.68464 2.85131 3.125 3.54167 3.125H7.08333Z" />
          <path d="M10.625 17.9167V2.08333C10.625 1.73816 10.3452 1.45833 10 1.45833C9.65482 1.45833 9.375 1.73816 9.375 2.08333V17.9167C9.375 18.2618 9.65482 18.5417 10 18.5417C10.3452 18.5417 10.625 18.2618 10.625 17.9167Z" />
          <path d="M17.7083 15.625V4.375C17.7083 3.68464 17.1487 3.125 16.4583 3.125H12.9167C12.5715 3.125 12.2917 3.40482 12.2917 3.75C12.2917 4.09518 12.5715 4.375 12.9167 4.375H16.4583V15.625H12.9167C12.5715 15.625 12.2917 15.9048 12.2917 16.25C12.2917 16.5952 12.5715 16.875 12.9167 16.875H16.4583C17.1487 16.875 17.7083 16.3154 17.7083 15.625Z" />
        </>
      )}
    </svg>
  );
}

function ZoomRow({
  selected,
  onClick,
  children,
  role = "option",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role === "option" ? selected : undefined}
      aria-checked={role === "menuitemcheckbox" ? selected : undefined}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 whitespace-nowrap px-3 py-1.5 text-left text-[12px] hover:bg-white/10 ${
        selected ? "text-white" : "text-[#ababab] hover:text-white"
      }`}
    >
      <span className="tabular-nums">{children}</span>
      {selected && <Check className="h-3.5 w-3.5 text-[#e2e2e2]" strokeWidth={2.25} />}
    </button>
  );
}

// Loupe-only: "Fit" button + actual-zoom percentage dropdown.
function ImageZoomControl({
  fit,
  percent,
  onFit,
  onPercent,
  education,
  fillPercent,
  mode = "cull",
}: {
  fit: boolean;
  percent: number;
  onFit: () => void;
  onPercent: (p: number) => void;
  /** Show the one-time "new zoom" note (Loupe only). */
  education?: boolean;
  /** Zoom at which the photo covers the whole canvas; omit to hide "Fill". */
  fillPercent?: number;
  /** Which Persist zoom setting the menu toggles (Cull vs Edit / Retouch). */
  mode?: ZoomMode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const zoomPrefs = useZoomPrefs();
  const { educationSeen } = zoomPrefs;
  const persistZoom = zoomPrefs[persistZoomKey(mode)];
  // One-time note: appears shortly after the bar mounts, goes away on its own,
  // on "Got it", or as soon as the user opens the zoom menu.
  const [note, setNote] = useState(false);
  useEffect(() => {
    if (!education || educationSeen) return;
    const show = window.setTimeout(() => setNote(true), 1200);
    return () => window.clearTimeout(show);
  }, [education, educationSeen]);
  useEffect(() => {
    if (!note) return;
    const hide = window.setTimeout(() => dismissNote(), 9000);
    return () => window.clearTimeout(hide);
  }, [note]);
  const dismissNote = () => {
    setNote(false);
    setZoomPrefs({ educationSeen: true });
  };
  useEffect(() => {
    if (open && note) dismissNote();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (fn: () => void) => {
    fn();
    setOpen(false);
  };
  // Presets split around 100%: below 100 / 100 / above 100 (like Lightroom).
  const groups = [
    ZOOM_PRESETS.filter((v) => v < 100),
    ZOOM_PRESETS.filter((v) => v === 100),
    ZOOM_PRESETS.filter((v) => v > 100),
  ].filter((g) => g.length);
  return (
    <div ref={ref} className="relative flex items-center gap-0 text-[12px] font-medium">
      {note && (
        <div
          role="status"
          onClick={dismissNote}
          className="absolute bottom-full right-0 z-50 mb-2 cursor-pointer rounded-lg bg-[#f6f6f6] px-2.5 py-2 text-left text-[12px] font-medium leading-4 text-[#474747] shadow-lg animate-in fade-in-0 slide-in-from-bottom-2"
        >
          <span className="whitespace-nowrap">Zoom just got a whole lot better</span>
          <span className="absolute -bottom-[3px] right-7 h-2 w-2 rotate-45 rounded-[1px] bg-[#f6f6f6]" />
        </div>
      )}
      <button
        type="button"
        onClick={onFit}
        className={`rounded px-1.5 py-0.5 ${fit ? "text-white" : "text-[#777] hover:text-white"}`}
      >
        Fit
      </button>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[#ababab] hover:text-white"
      >
        <span className="w-fit whitespace-nowrap tabular-nums">{Math.round(percent)}%</span>
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[132px] overflow-hidden rounded-lg border border-white/10 bg-[#212121] shadow-xl"
        >
          <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-[#ababab]">
            Zoom
          </div>
          {groups.map((g, gi) => (
            <div key={gi} className="border-b border-white/10 py-1">
              {g.map((v) => (
                <ZoomRow
                  key={v}
                  selected={!fit && Math.round(percent) === v}
                  onClick={() => pick(() => onPercent(v))}
                >
                  {v}%
                </ZoomRow>
              ))}
            </div>
          ))}
          <div className="border-b border-white/10 py-1">
            <ZoomRow selected={fit} onClick={() => pick(onFit)}>
              Fit
            </ZoomRow>
            {fillPercent !== undefined && (
              <ZoomRow
                selected={!fit && Math.abs(percent - fillPercent) < 0.5}
                onClick={() => pick(() => onPercent(fillPercent))}
              >
                Fill
              </ZoomRow>
            )}
          </div>
          <div className="py-1">
            <ZoomRow
              selected={persistZoom}
              role="menuitemcheckbox"
              onClick={() => setZoomPrefs({ [persistZoomKey(mode)]: !persistZoom })}
            >
              Persist zoom
            </ZoomRow>
          </div>
        </div>
      )}
    </div>
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
  imageZoom,
  center,
  syncZoom,
  cycle,
  showAfter = true,
  onToggleAfter,
  infoOpen,
  onToggleInfo,
}: {
  /** Floating image info card on the canvas (loupe): open state + toggle. */
  infoOpen?: boolean;
  onToggleInfo?: () => void;
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
  /** Loupe view: Fit + actual-zoom controls shown in place of the slider. */
  imageZoom?: {
    fit: boolean;
    percent: number;
    onFit: () => void;
    onPercent: (p: number) => void;
    /** Show the one-time "new zoom" note (Loupe only). */
    education?: boolean;
    fillPercent?: number;
    /** Cull (default) or Edit / Retouch: picks the Persist zoom setting. */
    mode?: ZoomMode;
  };
  /** Anything pinned to the true centre of the bar (Survey: photos-in-view slider). */
  center?: React.ReactNode;
  /** Survey: lock/unlock zoom + pan across every photo in view. */
  syncZoom?: { on: boolean; onToggle: () => void };
  /** Survey: cycle through the duplicate stack (, / .) instead of jumping scene. */
  cycle?: { on: boolean; onToggle: () => void };
  /** Loupe view: true = After state, false = Before. */
  showAfter?: boolean;
  /** When given, Before/After is controlled by the parent. */
  onToggleAfter?: () => void;
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
                  aria-pressed={!!infoOpen}
                  onClick={onToggleInfo}
                  className={`rounded-full hover:text-neutral-200 ${
                    infoOpen ? "text-white" : "text-neutral-500"
                  }`}
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

      {center && (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center">
          {center}
        </div>
      )}

      <div className="flex items-center gap-3">
        {imageZoom && (
          <>
            {cycle && (
              <>
                <IconTooltip
                  label={
                    cycle.on ? "Cycle through duplicates: on" : "Cycle through duplicates: off"
                  }
                  side="top"
                >
                  <button
                    type="button"
                    aria-pressed={cycle.on}
                    aria-label={
                      cycle.on ? "Cycle through duplicates: on" : "Cycle through duplicates: off"
                    }
                    onClick={cycle.onToggle}
                    className={`flex h-6 w-6 items-center justify-center rounded ${
                      cycle.on
                        ? "bg-white/10 text-white"
                        : "text-[#ababab] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <ArrowsClockwise className="h-4 w-4" />
                  </button>
                </IconTooltip>
                <div className="h-4 w-px bg-[#474747]" />
              </>
            )}
            <div className="flex items-center gap-1">
              {syncZoom && (
                <IconTooltip label={syncZoom.on ? "Sync zoom: on" : "Sync zoom: off"} side="top">
                  <button
                    type="button"
                    aria-pressed={syncZoom.on}
                    aria-label={
                      syncZoom.on
                        ? "Sync zoom is on: every photo zooms and pans together"
                        : "Sync zoom is off: each photo zooms and pans on its own"
                    }
                    onClick={syncZoom.onToggle}
                    className={`flex h-6 w-6 items-center justify-center rounded ${
                      syncZoom.on
                        ? "bg-white/10 text-white"
                        : "text-[#ababab] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {syncZoom.on ? (
                      <Link2 className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Link2Off className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </IconTooltip>
              )}
              <ImageZoomControl {...imageZoom} />
            </div>
            {(showCompare || showSprayCan || onToggleFilmstrip) && (
              <div className="h-4 w-px bg-[#474747]" />
            )}
            {showCompare && <CompareToggle after={showAfter} onToggle={onToggleAfter} />}
          </>
        )}
        {!imageZoom && showZoom && (
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
              <div className="w-[88px]">
                <GradientSlider value={zoom} onChange={onZoomChange} centered={false} />
              </div>
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
        {!imageZoom && showCompare && <CompareToggle after={showAfter} onToggle={onToggleAfter} />}
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
        <SprayCanIcon className="h-[18px] w-[18px]" />
      </button>
    </IconTooltip>
  );
}

// Before/After toggle. Shows the Before glyph first; clicking switches to the
// After glyph (and back). Controlled by the parent when `onToggle` is given.
function CompareToggle({ after, onToggle }: { after: boolean; onToggle?: () => void }) {
  const [localAfter, setLocalAfter] = useState(false);
  const isAfter = onToggle ? after : localAfter;
  return (
    <IconTooltip label={isAfter ? "After" : "Before"} side="top">
      <button
        type="button"
        aria-label={isAfter ? "Showing After" : "Showing Before"}
        onClick={onToggle ?? (() => setLocalAfter((v) => !v))}
        className="flex h-6 w-6 items-center justify-center rounded text-[#777] hover:bg-white/5 hover:text-white"
      >
        <CompareIcon after={isAfter} className="h-5 w-5" />
      </button>
    </IconTooltip>
  );
}
