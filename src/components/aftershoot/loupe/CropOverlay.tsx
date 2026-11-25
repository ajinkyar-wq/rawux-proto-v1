import { useContext, useRef } from "react";
import {
  SliderHistoryContext,
  useAlbumHistoryContext,
  useHistoryValues,
} from "../history/album-history";
import { cropOf, fitCropToRotation, straightenOf } from "./crop-config";

// Adjustable crop frame rendered over the loupe image.
//
// - Stored as percentages (0..100) of the container so it scales with the
//   image area without breakage on resize.
// - 8 resize handles (4 corners + 4 mid-sides) plus drag-to-move on the body.
// - Visuals: white corner brackets, mid-side stubs, 3x3 thirds grid lines.

type Rect = { x: number; y: number; w: number; h: number };
type DragMode =
  | { kind: "move"; startX: number; startY: number; orig: Rect }
  | {
      kind: "resize";
      handle: HandleId;
      startX: number;
      startY: number;
      orig: Rect;
    };

type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const MIN_SIZE = 10; // percent

export function CropOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  // Crop box lives in the album history: one step per move / resize.
  // Starts at the photo's current crop (its shape as shot, or a picked aspect
  // ratio) so the box matches what the canvas showed before opening Crop.
  const where = useContext(SliderHistoryContext);
  const history = useAlbumHistoryContext();
  const current = cropOf(history, where?.image ?? 0);
  const crop = useHistoryValues<keyof Rect>(
    "Crop Box",
    current,
    (r) => `${Math.round(r.w)}% × ${Math.round(r.h)}%`,
  );
  // Lightroom-style: while straightened, the box shown (and applied) is the
  // stored box shrunk to fit inside the rotated photo — never empty corners.
  const rect: Rect = fitCropToRotation(crop.value, straightenOf(history, where?.image ?? 0), where?.image ?? 0);
  const setRect = crop.onChange;
  const dragRef = useRef<DragMode | null>(null);

  // Convert mouse delta (px) to delta in percent of container size.
  const pxToPercent = (dx: number, dy: number) => {
    const el = containerRef.current;
    if (!el) return { dxp: 0, dyp: 0 };
    const { width, height } = el.getBoundingClientRect();
    return { dxp: (dx / width) * 100, dyp: (dy / height) * 100 };
  };

  const onPointerDownBody = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      orig: rect,
    };
  };

  const onPointerDownHandle = (handle: HandleId) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: "resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: rect,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const { dxp, dyp } = pxToPercent(e.clientX - d.startX, e.clientY - d.startY);

    if (d.kind === "move") {
      const x = clamp(d.orig.x + dxp, 0, 100 - d.orig.w);
      const y = clamp(d.orig.y + dyp, 0, 100 - d.orig.h);
      setRect({ ...d.orig, x, y });
      return;
    }

    // resize
    let { x, y, w, h } = d.orig;
    const right = x + w;
    const bottom = y + h;
    const h_ = d.handle;
    if (h_.includes("w")) {
      const newX = clamp(x + dxp, 0, right - MIN_SIZE);
      w = right - newX;
      x = newX;
    }
    if (h_.includes("e")) {
      w = clamp(w + dxp, MIN_SIZE, 100 - x);
    }
    if (h_.includes("n")) {
      const newY = clamp(y + dyp, 0, bottom - MIN_SIZE);
      h = bottom - newY;
      y = newY;
    }
    if (h_.includes("s")) {
      h = clamp(h + dyp, MIN_SIZE, 100 - y);
    }
    setRect({ x, y, w, h });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) crop.onCommit();
    dragRef.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Darken the area outside the crop using box-shadow trick on the frame */}
      <div
        className="absolute"
        style={{
          left: `${rect.x}%`,
          top: `${rect.y}%`,
          width: `${rect.w}%`,
          height: `${rect.h}%`,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
        }}
      />

      {/* Frame + handles */}
      <div
        className="absolute cursor-move"
        style={{
          left: `${rect.x}%`,
          top: `${rect.y}%`,
          width: `${rect.w}%`,
          height: `${rect.h}%`,
        }}
        onPointerDown={onPointerDownBody}
      >
        <ThirdsGrid />
        <CornerBrackets />
        <MidSideStubs />
        <ResizeHandles onPointerDownHandle={onPointerDownHandle} />
      </div>
    </div>
  );
}

function ThirdsGrid() {
  return (
    <>
      {/* Two vertical lines at 1/3 and 2/3 */}
      <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: "33.333%" }} />
      <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: "66.666%" }} />
      {/* Two horizontal lines at 1/3 and 2/3 */}
      <div className="absolute left-0 right-0 h-px bg-white/40" style={{ top: "33.333%" }} />
      <div className="absolute left-0 right-0 h-px bg-white/40" style={{ top: "66.666%" }} />
    </>
  );
}

function CornerBrackets() {
  const armLen = 18;
  const thickness = 2;
  const arm = `${armLen}px`;
  const thick = `${thickness}px`;
  // L-shaped white brackets at each corner.
  return (
    <>
      {/* NW */}
      <div
        className="pointer-events-none absolute -left-[2px] -top-[2px]"
        style={{ width: arm, height: thick, background: "white" }}
      />
      <div
        className="pointer-events-none absolute -left-[2px] -top-[2px]"
        style={{ width: thick, height: arm, background: "white" }}
      />
      {/* NE */}
      <div
        className="pointer-events-none absolute -right-[2px] -top-[2px]"
        style={{ width: arm, height: thick, background: "white" }}
      />
      <div
        className="pointer-events-none absolute -right-[2px] -top-[2px]"
        style={{ width: thick, height: arm, background: "white" }}
      />
      {/* SW */}
      <div
        className="pointer-events-none absolute -left-[2px] -bottom-[2px]"
        style={{ width: arm, height: thick, background: "white" }}
      />
      <div
        className="pointer-events-none absolute -left-[2px] -bottom-[2px]"
        style={{ width: thick, height: arm, background: "white" }}
      />
      {/* SE */}
      <div
        className="pointer-events-none absolute -right-[2px] -bottom-[2px]"
        style={{ width: arm, height: thick, background: "white" }}
      />
      <div
        className="pointer-events-none absolute -right-[2px] -bottom-[2px]"
        style={{ width: thick, height: arm, background: "white" }}
      />
    </>
  );
}

function MidSideStubs() {
  // Small perpendicular tick on the middle of each side.
  const len = 14;
  const thick = 2;
  return (
    <>
      {/* top */}
      <div
        className="pointer-events-none absolute -translate-x-1/2"
        style={{ left: "50%", top: -2, width: len, height: thick, background: "white" }}
      />
      {/* bottom */}
      <div
        className="pointer-events-none absolute -translate-x-1/2"
        style={{ left: "50%", bottom: -2, width: len, height: thick, background: "white" }}
      />
      {/* left */}
      <div
        className="pointer-events-none absolute -translate-y-1/2"
        style={{ top: "50%", left: -2, width: thick, height: len, background: "white" }}
      />
      {/* right */}
      <div
        className="pointer-events-none absolute -translate-y-1/2"
        style={{ top: "50%", right: -2, width: thick, height: len, background: "white" }}
      />
    </>
  );
}

function ResizeHandles({
  onPointerDownHandle,
}: {
  onPointerDownHandle: (h: HandleId) => (e: React.PointerEvent) => void;
}) {
  const base = "absolute h-3 w-3 rounded-full"; // invisible hit areas
  // Each handle gets a fat hit region for easier dragging.
  return (
    <>
      <span
        className={`${base} -left-1.5 -top-1.5 cursor-nwse-resize`}
        onPointerDown={onPointerDownHandle("nw")}
      />
      <span
        className={`${base} left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize`}
        onPointerDown={onPointerDownHandle("n")}
      />
      <span
        className={`${base} -right-1.5 -top-1.5 cursor-nesw-resize`}
        onPointerDown={onPointerDownHandle("ne")}
      />
      <span
        className={`${base} -right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize`}
        onPointerDown={onPointerDownHandle("e")}
      />
      <span
        className={`${base} -right-1.5 -bottom-1.5 cursor-nwse-resize`}
        onPointerDown={onPointerDownHandle("se")}
      />
      <span
        className={`${base} left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize`}
        onPointerDown={onPointerDownHandle("s")}
      />
      <span
        className={`${base} -left-1.5 -bottom-1.5 cursor-nesw-resize`}
        onPointerDown={onPointerDownHandle("sw")}
      />
      <span
        className={`${base} -left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize`}
        onPointerDown={onPointerDownHandle("w")}
      />
    </>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
