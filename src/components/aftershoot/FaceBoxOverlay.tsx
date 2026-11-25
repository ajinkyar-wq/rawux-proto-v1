import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FocusDots } from "./panels/KeyFacesGrid";
import { FOCUS_COLOR, faceCount, faceRect, faceScore, setHoveredFace, useFaceData, useHoveredFace, useScoresOnImage } from "./faces";

// Face boxes on the photo. Fill a box that is the photo's own frame (position:
// relative/absolute parent). `frameAspect` is the parent's width/height when the
// photo is letterboxed (object-contain) inside it; omit when the parent already
// matches the photo.
//
// The box of the face hovered in the Key Faces panel is outlined. With `onPick`
// every detected face is also a click target (zoom-in cursor, outlined on
// hover) — the same faces the panel lists. `scale` is the zoom applied to the
// parent so the outline stays 1px on screen.
export function FaceBoxOverlay({
  image,
  frameAspect,
  onPick,
  scale = 1,
}: {
  image: number;
  frameAspect?: number;
  onPick?: (k: number) => void;
  scale?: number;
}) {
  useFaceData();
  const hovered = useHoveredFace();
  const showScores = useScoresOnImage();
  const n = faceCount(image);
  const boxes: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const r = faceRect(image, k);
    if (!r || r.fx === undefined) continue;
    const on = hovered === k;
    if (!on && !onPick && !showScores) continue;
    const ar = r.ar ?? 1.5;
    let ox = 0, oy = 0, sw = 1, sh = 1;
    if (frameAspect) {
      if (ar > frameAspect) {
        sh = frameAspect / ar;
        oy = (1 - sh) / 2;
      } else {
        sw = ar / frameAspect;
        ox = (1 - sw) / 2;
      }
    }
    boxes.push(
      <div
        key={k}
        aria-hidden
        onMouseEnter={onPick ? () => setHoveredFace(k) : undefined}
        onMouseLeave={onPick ? () => setHoveredFace(null) : undefined}
        onPointerDown={onPick ? (e) => e.stopPropagation() : undefined}
        onClick={
          onPick
            ? (e) => {
                e.stopPropagation();
                onPick(k);
              }
            : undefined
        }
        onDoubleClick={onPick ? (e) => e.stopPropagation() : undefined}
        className={`absolute ${onPick ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{
          left: `${(ox + r.fx * sw) * 100}%`,
          top: `${(oy + r.fy! * sh) * 100}%`,
          width: `${r.fw! * sw * 100}%`,
          height: `${r.fh! * sh * 100}%`,
          boxSizing: "border-box",
          cursor: onPick ? "url(/cursors/face-zoom.svg) 17 17, zoom-in" : undefined,
          border: `${1 / scale}px solid ${on ? "#e2e2e2" : "transparent"}`,
        }}
      >
      </div>,
    );
    if (showScores)
      boxes.push(
        // Sibling of the box (not a child) so hovering the badges neither
        // outlines the face nor shows the face-zoom cursor.
        <div
          key={`s${k}`}
          className="pointer-events-none absolute"
          style={{
            left: `${(ox + r.fx * sw) * 100}%`,
            top: `${(oy + r.fy! * sh) * 100}%`,
            width: `${r.fw! * sw * 100}%`,
            height: `${r.fh! * sh * 100}%`,
          }}
        >
          <ScoreBadges image={image} k={k} scale={scale} />
        </div>,
    );
  }
  return <>{boxes}</>;
}

const EYES_BG = { open: "#15803d", closed: "#dc2626" };

// Eyes / focus badges under a face box; hovering them shows a tooltip that
// spells out both scores (Figma "Tooltip-big": light bubble, left beak).
function ScoreBadges({ image, k, scale }: { image: number; k: number; scale: number }) {
  const [tip, setTip] = useState(false);
  const { eyesOpen, focus } = faceScore(image, k);
  return (
    <span
      className="pointer-events-auto absolute left-1/2 top-full flex origin-top cursor-default gap-1"
      style={{ marginTop: 8 / scale, transform: `translateX(-50%) scale(${1.2 / scale})` }}
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(false)}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded bg-black/80">
        {eyesOpen ? (
          <Eye className="h-3.5 w-3.5 text-[#4cc38a]" strokeWidth={1.75} />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-[#e5484d]" strokeWidth={1.75} />
        )}
      </span>
      <span className="flex h-5 w-5 items-center justify-center rounded bg-black/80">
        <FocusDots color={FOCUS_COLOR[focus]} />
      </span>
      {tip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 flex -translate-y-1/2 flex-col gap-1 whitespace-nowrap rounded-lg bg-[#f6f6f6] px-2.5 py-2 shadow-lg"
        >
          <span
            aria-hidden
            className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-[#f6f6f6]"
          />
          <TipRow bg={eyesOpen ? EYES_BG.open : EYES_BG.closed} label={eyesOpen ? "Eyes Open" : "Eyes Closed"}>
            {eyesOpen ? <Eye className="h-4 w-4 text-white" strokeWidth={1.75} /> : <EyeOff className="h-4 w-4 text-white" strokeWidth={1.75} />}
          </TipRow>
          <TipRow bg={FOCUS_BG[focus]} label={FOCUS_TIP[focus]}>
            <FocusDots color="#fff" />
          </TipRow>
        </span>
      )}
    </span>
  );
}

const FOCUS_BG = { g: "#15803d", y: "#ca8a04", r: "#dc2626" } as const;
const FOCUS_TIP = { g: "Good Focus", y: "Soft Focus", r: "Out of Focus" } as const;

function TipRow({ bg, label, children }: { bg: string; label: string; children: React.ReactNode }) {
  return (
    <span className="relative flex items-center gap-1.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-[2px]" style={{ backgroundColor: bg }}>
        {children}
      </span>
      <span className="text-[12px] font-medium leading-4 text-[#474747]">{label}</span>
    </span>
  );
}
