import { faceRect, useFaceData, useHoveredFace } from "./faces";

// Highlights the face being hovered in the Key Faces panel. Fill a box that is
// the photo's own frame (position: relative/absolute parent). `frameAspect` is
// the parent's width/height when the photo is letterboxed (object-contain)
// inside it; omit when the parent already matches the photo.
export function FaceBoxOverlay({ image, frameAspect }: { image: number; frameAspect?: number }) {
  useFaceData();
  const k = useHoveredFace();
  const r = k === null ? null : faceRect(image, k);
  if (!r || r.fx === undefined) return null;
  const ar = r.ar ?? 1.5;
  // Photo rect inside the parent (fractions of the parent).
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
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute rounded-[2px] border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_12px_rgba(255,255,255,0.35)]"
      style={{
        left: `${(ox + r.fx * sw) * 100}%`,
        top: `${(oy + r.fy! * sh) * 100}%`,
        width: `${r.fw! * sw * 100}%`,
        height: `${r.fh! * sh * 100}%`,
      }}
    />
  );
}
