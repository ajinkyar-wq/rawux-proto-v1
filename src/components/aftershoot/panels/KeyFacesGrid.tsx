import { useState } from "react";
import { GradientSlider } from "../loupe/slider-primitives";
import { Eye, EyeOff, ScanFace, ScanLine } from "lucide-react";
import { photoUrl } from "../cull-data";
import { FOCUS_COLOR, FOCUS_LABEL, faceCount, faceScore, facePos } from "../faces";
import { IconTooltip } from "../IconTooltip";
import { Caret } from "./Caret";

// Key Faces grid.
//
// Plain (grid / loupe panels): no images, just empty face-card slots.
//   1. Always fill the panel — width and height — with the biggest cards possible.
//   2. Cards may be wider than tall (landscape rectangles) — preferred at low
//      counts because it uses the whole area with big cards.
//   3. Cards never go TALLER than wide. Square is the minimum aspect ratio.
//   4. If hitting the square floor still doesn't fit all cards in view, lock
//      tiles at that square size and let the grid scroll vertically.
//
// Interactive (Survey): pass `controls`. Each card is a crop of the photo
// around that face with its eyes / sharpness score; clicking one zooms every
// photo in the survey to that face. The header gains a size slider and a
// scores toggle.

export type FaceControls = {
  /** The face every photo is zoomed to, or null for the full photo. */
  active: number | null;
  onSelect: (k: number) => void;
  size: number;
  onSize: (v: number) => void;
  scores: boolean;
  onScores: (v: boolean) => void;
};

export const FACE_SIZE_MIN = 56;
export const FACE_SIZE_MAX = 150;
const CROP = 4; // face crops show 1/4 of the photo's width

export function KeyFacesGrid({
  selectedGridTile,
  controls,
}: {
  selectedGridTile: number;
  controls?: FaceControls;
}) {
  const count = faceCount(selectedGridTile);

  const [expanded, setExpanded] = useState(true);
  // Grid / loupe panels have no external controls, so they own the size +
  // scores state; Survey passes its own via `controls`.
  const [size, setSize] = useState(110);
  const [scores, setScores] = useState(true);
  const GAP = 4;

  const sizeValue = controls?.size ?? size;
  const onSize = controls?.onSize ?? setSize;
  const scoresOn = controls?.scores ?? scores;
  const onScores = controls?.onScores ?? setScores;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex shrink-0 items-center gap-2 text-[13px] font-medium text-white"
        >
          <Caret open={expanded} />
          Key Faces ({count})
        </button>
        {expanded && (
          <div className="ml-auto flex items-center gap-2">
            <ScanLine className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.5} />
            <div className="w-[88px]" aria-label="Face size" title="Face size">
              <GradientSlider
                value={((sizeValue - FACE_SIZE_MIN) / (FACE_SIZE_MAX - FACE_SIZE_MIN)) * 100}
                onChange={(pct) =>
                  onSize(Math.round(FACE_SIZE_MIN + (pct / 100) * (FACE_SIZE_MAX - FACE_SIZE_MIN)))
                }
                centered={false}
              />
            </div>
            <IconTooltip label="Key face scores" side="top">
              <button
                type="button"
                aria-pressed={scoresOn}
                aria-label="Key face scores"
                onClick={() => onScores(!scoresOn)}
                className={`flex h-7 w-7 items-center justify-center rounded border ${
                  scoresOn
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-transparent text-[#ababab] hover:bg-white/5 hover:text-white"
                }`}
              >
                <ScanFace className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </IconTooltip>
          </div>
        )}
      </div>
      {expanded && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${sizeValue}px, 1fr))`,
            gap: `${controls ? GAP + 2 : GAP}px`,
          }}
        >
          {Array.from({ length: count }).map((_, k) =>
            controls ? (
              <FaceCard key={k} image={selectedGridTile} k={k} controls={controls} />
            ) : (
              <PanelFaceCard key={k} image={selectedGridTile} k={k} scores={scoresOn} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

// Plain (grid-view) face card: a crop of the face with eyes / focus badges.
function PanelFaceCard({ image, k, scores }: { image: number; k: number; scores: boolean }) {
  const { x, y } = facePos(image, k);
  const { eyesOpen, focus } = faceScore(image, k);
  const pos = (f: number) => Math.max(0, Math.min(100, ((f * CROP - 0.5) / (CROP - 1)) * 100));
  return (
    <div
      style={{
        backgroundImage: `url(${photoUrl(image, 900)})`,
        backgroundSize: `${CROP * 100}%`,
        backgroundPosition: `${pos(x)}% ${pos(y)}%`,
      }}
      className="relative aspect-square bg-[#2d2d2d]"
    >
      {scores && (
        <span className="absolute bottom-1 left-1 flex gap-1">
          <span
            className="flex h-5 w-5 items-center justify-center rounded bg-black/80"
            title={eyesOpen ? "Eyes open" : "Eyes closed"}
          >
            {eyesOpen ? (
              <Eye className="h-3.5 w-3.5 text-[#e2c044]" strokeWidth={1.75} />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-[#e5484d]" strokeWidth={1.75} />
            )}
          </span>
          <span
            className="flex h-5 w-5 items-center justify-center rounded bg-black/80"
            title={FOCUS_LABEL[focus]}
          >
            <FocusDots color={FOCUS_COLOR[focus]} />
          </span>
        </span>
      )}
    </div>
  );
}

// 4×4 dot grid, rounded to a circle — the "focus sharpness" badge.
function FocusDots({ color }: { color: string }) {
  const pts = [-3, -1, 1, 3];
  return (
    <svg viewBox="-5 -5 10 10" className="h-3.5 w-3.5" aria-hidden>
      {pts.flatMap((cy) =>
        pts
          .filter((cx) => cx * cx + cy * cy <= 18)
          .map((cx) => <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={0.55} fill={color} />),
      )}
    </svg>
  );
}

function FaceCard({ image, k, controls }: { image: number; k: number; controls: FaceControls }) {
  const { x, y } = facePos(image, k);
  const { eyesOpen, focus } = faceScore(image, k);
  const on = controls.active === k;
  // Centre the crop on the face: background-position % is relative to the
  // overflow, so convert from "face at x of the photo".
  const pos = (f: number) => Math.max(0, Math.min(100, ((f * CROP - 0.5) / (CROP - 1)) * 100));
  const label = `Face ${k + 1}, eyes ${eyesOpen ? "open" : "closed"}, ${FOCUS_LABEL[focus].toLowerCase()}`;
  return (
    <button
      type="button"
      aria-label={`${label}. Zoom every photo to this face`}
      aria-pressed={on}
      onClick={() => controls.onSelect(k)}
      style={{
        backgroundImage: `url(${photoUrl(image, 900)})`,
        backgroundSize: `${CROP * 100}%`,
        backgroundPosition: `${pos(x)}% ${pos(y)}%`,
      }}
      className={`relative aspect-square bg-[#1f1f1f] ${
        on
          ? "outline outline-2 outline-white"
          : "outline outline-1 outline-white/10 hover:outline-white/40"
      }`}
    >
      {controls.scores && (
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-1 pb-0.5 pt-3">
          {eyesOpen ? (
            <Eye className="h-3.5 w-3.5 text-[#4cc38a]" strokeWidth={1.75} />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-[#e2c044]" strokeWidth={1.75} />
          )}
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: FOCUS_COLOR[focus] }}
            title={FOCUS_LABEL[focus]}
          />
        </span>
      )}
    </button>
  );
}
