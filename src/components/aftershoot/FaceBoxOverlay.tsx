import { faceCount, faceRect, setHoveredFace, useFaceData, useHoveredFace } from "./faces";

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
  const n = faceCount(image);
  const boxes: React.ReactNode[] = [];
  for (let k = 0; k < n; k++) {
    const r = faceRect(image, k);
    if (!r || r.fx === undefined) continue;
    const on = hovered === k;
    if (!on && !onPick) continue;
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
        className={`absolute ${onPick ? "pointer-events-auto cursor-zoom-in" : "pointer-events-none"}`}
        style={{
          left: `${(ox + r.fx * sw) * 100}%`,
          top: `${(oy + r.fy! * sh) * 100}%`,
          width: `${r.fw! * sw * 100}%`,
          height: `${r.fh! * sh * 100}%`,
          boxSizing: "border-box",
          border: on ? `${1 / scale}px solid #e2e2e2` : "none",
        }}
      />,
    );
  }
  return <>{boxes}</>;
}
