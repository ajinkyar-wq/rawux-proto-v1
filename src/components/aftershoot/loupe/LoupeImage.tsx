import { useLayoutEffect, useRef, useState } from "react";
import { photoUrl } from "../cull-data";

// Loupe canvas. `zoom` (0-100) scales the image from fit (1x) up to 3x.
//
// The frame is sized to the photo's own aspect ratio (fitted inside the
// canvas), so there are no letterbox bars beside or above the photo, and the
// overlay (e.g. the crop box) lines up with the photo itself.
export function LoupeImage({
  image,
  overlay,
  zoom = 0,
}: {
  image: number;
  overlay?: React.ReactNode;
  zoom?: number;
}) {
  const scale = 1 + (zoom / 100) * 2;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Photo aspect (width / height); 3:2 until the image reports its own.
  const [aspect, setAspect] = useState(1.5);

  // Track the canvas's content box so the frame refits on any resize
  // (window, side panel, filmstrip height).
  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setBox({ w: Math.max(0, w), h: Math.max(0, h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Largest frame with the photo's aspect that fits the canvas.
  const fitW = Math.min(box.w, box.h * aspect);
  const fitH = fitW / aspect;

  return (
    <div
      ref={canvasRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#1c1c1c] p-4"
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-sm transition-transform duration-150"
        style={{ width: fitW, height: fitH, transform: `scale(${scale})` }}
      >
        <img
          src={photoUrl(image, 1600)}
          alt=""
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            if (w && h) setAspect(w / h);
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {overlay}
      </div>
    </div>
  );
}
