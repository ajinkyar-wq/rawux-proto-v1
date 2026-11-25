import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { photoUrl } from "../cull-data";
import { FaceBoxOverlay } from "../FaceBoxOverlay";
import type { CropRect } from "./crop-config";

// Loupe canvas. `zoom` (0-100) scales the image from fit (1x) up to 3x.
//
// The frame is sized to the photo's own aspect ratio (fitted inside the
// canvas), so there are no letterbox bars beside or above the photo, and the
// overlay (e.g. the crop box) lines up with the photo itself.
//
// With `crop`, the frame takes the crop's shape and shows only that part of
// the photo (the applied crop). Without it, the whole photo is shown — used
// while the Crop tool is open so the crop box can be adjusted.
export function LoupeImage({
  image,
  rotation = 0,
  cropBox,
  crop,
  overlay,
  canvasOverlay,
  zoom = 0,
  actualZoom = null,
  onMetrics,
  onActualZoomChange,
  onPullToSurvey,
  onScrollStep,
  focus,
  onPickFace,
  onPointClick,
  onMarqueeZoom,
  badge,
}: {
  image: number;
  /** Straightening angle in degrees (photo rotates inside the frame). */
  rotation?: number;
  /**
   * Crop tool open: the level crop box (in % of the full photo). The frame
   * doesn't clip, so the rotated photo and the box's edge handles stay
   * visible around it.
   */
  cropBox?: CropRect;
  /** Applied crop, in % of the photo. Omit to show the full photo. */
  crop?: CropRect;
  overlay?: React.ReactNode;
  /** Rendered over the canvas area (not the photo) — unaffected by zoom. */
  canvasOverlay?: React.ReactNode;
  zoom?: number;
  /** Actual image zoom in % of the photo's natural pixels; null = fit. */
  actualZoom?: number | null;
  /** Reports the % at which the photo currently "fits" the canvas. */
  onMetrics?: (m: { fitPercent: number }) => void;
  /** Pinch / ctrl+wheel zoom requests, as actual % of natural pixels. */
  onActualZoomChange?: (percent: number) => void;
  /** Cull tab: pinching out past fit pulls into Survey Mode. */
  onPullToSurvey?: () => void;
  /** Plain wheel / two-finger scroll while at fit: -1 = previous photo, 1 = next. */
  onScrollStep?: (dir: -1 | 1) => void;
  /** Photo point (fractions) to centre while zoomed — e.g. a clicked key face. */
  focus?: { x: number; y: number } | null;
  /** Face boxes on the photo become click targets that call this with the face index. */
  onPickFace?: (k: number) => void;
  /** Click on the photo: the point (fractions of the photo). Omit to leave clicks alone. */
  onPointClick?: (p: { x: number; y: number }) => void;
  /** Cmd / Ctrl + drag a rectangle: the photo point at its centre and the actual % that fills the canvas with it. */
  onMarqueeZoom?: (z: { x: number; y: number; percent: number }) => void;
  badge?: React.ReactNode;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Photo aspect (width / height); 3:2 until the image reports its own.
  const [aspect, setAspect] = useState(1.5);
  const [naturalW, setNaturalW] = useState(1600);

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

  // Largest frame with the (cropped) photo's aspect that fits the canvas.
  const frameAspect = crop ? (crop.w / crop.h) * aspect : aspect;
  const frameNaturalW = crop ? (naturalW * crop.w) / 100 : naturalW;
  const fitW = Math.min(box.w, box.h * frameAspect);
  const fitH = fitW / frameAspect;
  const fitPercent = frameNaturalW > 0 ? (fitW / frameNaturalW) * 100 : 100;
  const scale =
    actualZoom != null && fitPercent > 0 ? actualZoom / fitPercent : 1 + (zoom / 100) * 2;

  // Centre `focus` (clamped so the photo's edges never pull inside the frame).
  // Manual panning (scroll while zoomed) on top of the focus-derived offset.
  const [userPan, setUserPan] = useState({ x: 0, y: 0 });
  useEffect(() => setUserPan({ x: 0, y: 0 }), [focus?.x, focus?.y, image]);
  const limX = Math.max(0, ((scale - 1) * fitW) / 2);
  const limY = Math.max(0, ((scale - 1) * fitH) / 2);
  const pan = (() => {
    if (scale <= 1.01) return { x: 0, y: 0 };
    const lim = (f: number) => ((scale - 1) * f) / 2;
    const c = (v: number, l: number) => Math.max(-l, Math.min(l, v));
    if (!focus) return { x: c(userPan.x, limX), y: c(userPan.y, limY) };
    // Photo fractions → fractions of the (possibly cropped) frame.
    const fx = crop ? (focus.x - crop.x / 100) / (crop.w / 100) : focus.x;
    const fy = crop ? (focus.y - crop.y / 100) / (crop.h / 100) : focus.y;
    return {
      x: c(c(-(fx - 0.5) * fitW * scale, lim(fitW)) + userPan.x, limX),
      y: c(c(-(fy - 0.5) * fitH * scale, lim(fitH)) + userPan.y, limY),
    };
  })();

  // Pinch to zoom. Trackpad pinch arrives as wheel events with ctrlKey set;
  // touch screens use a two-pointer pinch. Both scale the current actual zoom.
  const currentPercent = fitPercent * scale;
  const live = useRef({ currentPercent, fitPercent, onActualZoomChange, onPullToSurvey, onScrollStep, pan, limX, limY, userPan });
  live.current = { currentPercent, fitPercent, onActualZoomChange, onPullToSurvey, onScrollStep, pan, limX, limY, userPan };
  const stepRef = useRef({ last: 0, prev: 0, decay: 0, stepped: false });
  // Pull-to-survey progress (0-1), driving the ring pill.
  const [pull, setPull] = useState(0);
  const pullRef = useRef({ acc: 0, start: 0, lock: false, timer: 0 as number });
  const [dragging, setDragging] = useState(false);
  const draggedRef = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);
  // Cmd (Mac) / Ctrl (Windows) held → marquee-zoom cursor; drag draws the rectangle.
  const [modHeld, setModHeld] = useState(false);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const marqueeCb = useRef({ onMarqueeZoom, crop, box });
  marqueeCb.current = { onMarqueeZoom, crop, box };
  useEffect(() => {
    if (!onMarqueeZoom) return;
    const sync = (e: KeyboardEvent) => setModHeld(e.metaKey || e.ctrlKey);
    const off = () => setModHeld(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", off);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", off);
    };
  }, [!!onMarqueeZoom]);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const apply = (factor: number) => {
      const {
        currentPercent: cur,
        fitPercent: fit,
        onActualZoomChange: cb,
        onPullToSurvey: pullCb,
      } = live.current;
      // With Survey available, fit is the floor; otherwise allow 25% of fit.
      const next = Math.min(800, Math.max(pullCb ? fit : fit * 0.25, cur * factor));
      cb?.(next);
    };
    // Keep pinching out while already at fit: fill the ring, then open Survey.
    const pullWheel = (e: WheelEvent) => {
      const { currentPercent: cur, fitPercent: fit, onPullToSurvey: cb } = live.current;
      const pr = pullRef.current;
      if (!cb) return false;
      if (pr.lock) return true;
      const active = pr.acc > 0;
      if (!active && (cur > fit * 1.01 || e.deltaY <= 0)) return false;
      const now = Date.now();
      if (!active) {
        pr.start = now;
        pr.acc = 0;
      }
      pr.acc = Math.max(0, pr.acc + e.deltaY * (e.deltaMode === 1 ? 16 : 1));
      window.clearTimeout(pr.timer);
      if (pr.acc <= 0) {
        setPull(0);
        return true;
      }
      const p = Math.min(1, pr.acc / 40, (now - pr.start) / 300);
      if (p >= 1) {
        pr.acc = 0;
        pr.lock = true;
        setPull(1);
        window.setTimeout(() => {
          pr.lock = false;
          setPull(0);
          live.current.onPullToSurvey?.();
        }, 160);
        return true;
      }
      pr.timer = window.setTimeout(() => {
        pr.acc = 0;
        setPull(0);
      }, 350);
      setPull(Math.max(0.03, p));
      return true;
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        e.preventDefault();
        const L = live.current;
        const k = e.deltaMode === 1 ? 16 : 1;
        // Drop trackpad momentum: once deltas keep shrinking, it's the OS tail.
        const g = stepRef.current;
        const now = Date.now();
        const mag = Math.max(Math.abs(e.deltaX), Math.abs(e.deltaY));
        if (now - g.last > 120) {
          g.decay = 0;
          g.prev = 0;
          g.stepped = false;
        } else if (g.decay > 0 && mag > g.prev * 1.3 + 2) {
          g.decay = 0;
          g.stepped = false; // a fresh flick during the tail
        }
        if (mag < g.prev) g.decay++;
        else if (mag > g.prev) g.decay = 0;
        g.prev = mag;
        g.last = now;
        if (g.decay >= 3) return;
        if (L.currentPercent <= L.fitPercent * 1.01) {
          // At fit: one filmstrip step per scroll gesture.
          if (!g.stepped && Math.abs(e.deltaY) >= 4) {
            g.stepped = true;
            L.onScrollStep?.(e.deltaY > 0 ? 1 : -1);
          }
          return;
        }
        // Zoomed: pan the photo.
        const c = (v: number, l: number) => Math.max(-l, Math.min(l, v));
        const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        const base = { x: L.pan.x - L.userPan.x, y: L.pan.y - L.userPan.y };
        setUserPan({
          x: c(L.pan.x - dx * k, L.limX) - base.x,
          y: c(L.pan.y - dy * k, L.limY) - base.y,
        });
        return;
      }
      e.preventDefault();
      if (pullWheel(e)) return;
      apply(Math.exp(-e.deltaY * 0.01));
    };
    const pointers = new Map<number, { x: number; y: number }>();
    let lastDist = 0;
    const dist = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    // Drag to pan while zoomed. Only counts as a drag past a small threshold,
    // so a plain click still reaches the photo's click handler.
    let drag: { id: number; sx: number; sy: number; px: number; py: number; active: boolean } | null =
      null;
    const endDrag = () => {
      drag = null;
      setDragging(false);
    };
    let mq: { id: number; sx: number; sy: number } | null = null;
    const mqRect = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
      return {
        x0: cl(mq!.sx, r.left, r.right) - r.left,
        y0: cl(mq!.sy, r.top, r.bottom) - r.top,
        x1: cl(e.clientX, r.left, r.right) - r.left,
        y1: cl(e.clientY, r.top, r.bottom) - r.top,
      };
    };
    const onDown = (e: PointerEvent) => {
      if (e.button === 0 && (e.metaKey || e.ctrlKey) && marqueeCb.current.onMarqueeZoom) {
        mq = { id: e.pointerId, sx: e.clientX, sy: e.clientY };
        draggedRef.current = true; // swallow the click
        setMarquee({ ...mqRect(e) });
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        return;
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      draggedRef.current = false;
      if (pointers.size === 2) {
        lastDist = dist();
        endDrag();
      } else if (pointers.size === 1 && e.button === 0) {
        const L = live.current;
        if (L.currentPercent > L.fitPercent * 1.01) {
          drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, px: L.pan.x, py: L.pan.y, active: false };
        }
      }
    };
    const onMove = (e: PointerEvent) => {
      if (mq && mq.id === e.pointerId) {
        setMarquee(mqRect(e));
        return;
      }
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const d = dist();
        if (lastDist > 0) apply(d / lastDist);
        lastDist = d;
      } else if (drag && drag.id === e.pointerId) {
        const dx = e.clientX - drag.sx;
        const dy = e.clientY - drag.sy;
        if (!drag.active) {
          if (Math.hypot(dx, dy) < 4) return;
          drag.active = true;
          draggedRef.current = true;
          setDragging(true);
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
        const L = live.current;
        const c = (v: number, l: number) => Math.max(-l, Math.min(l, v));
        const base = { x: L.pan.x - L.userPan.x, y: L.pan.y - L.userPan.y };
        setUserPan({
          x: c(drag.px + dx, L.limX) - base.x,
          y: c(drag.py + dy, L.limY) - base.y,
        });
      }
    };
    const onUp = (e: PointerEvent) => {
      if (mq && mq.id === e.pointerId) {
        const m = mqRect(e);
        mq = null;
        setMarquee(null);
        const { onMarqueeZoom: cb, crop: cr, box: bx } = marqueeCb.current;
        const fr = frameRef.current?.getBoundingClientRect();
        const w = Math.abs(m.x1 - m.x0);
        const h = Math.abs(m.y1 - m.y0);
        if (e.type === "pointerup" && cb && fr && w >= 8 && h >= 8 && fr.width > 0) {
          const c = el.getBoundingClientRect();
          const fx = (c.left + (m.x0 + m.x1) / 2 - fr.left) / fr.width;
          const fy = (c.top + (m.y0 + m.y1) / 2 - fr.top) / fr.height;
          const k = Math.min(bx.w / w, bx.h / h);
          const L = live.current;
          const clamp = (v: number) => Math.max(0, Math.min(1, v));
          cb({
            x: cr ? cr.x / 100 + clamp(fx) * (cr.w / 100) : clamp(fx),
            y: cr ? cr.y / 100 + clamp(fy) * (cr.h / 100) : clamp(fy),
            percent: Math.min(800, Math.max(L.fitPercent, L.currentPercent * k)),
          });
        }
        return;
      }
      pointers.delete(e.pointerId);
      lastDist = 0;
      if (drag && drag.id === e.pointerId) endDrag();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  useEffect(() => {
    if (fitPercent > 0) onMetrics?.({ fitPercent });
  }, [fitPercent, onMetrics]);

  return (
    <div
      ref={canvasRef}
      style={{
        touchAction: "none",
        cursor: marquee || modHeld
          ? "url(/cursors/marquee-zoom.svg) 15 15, crosshair"
          : dragging
            ? "grabbing"
            : undefined,
      }}
      onDragStart={(e) => e.preventDefault()}
      className="relative select-none flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#1c1c1c] p-4"
    >
      <div
        ref={frameRef}
        onClick={
          onPointClick
            ? (e) => {
                if (draggedRef.current) {
                  draggedRef.current = false;
                  return;
                }
                // The frame is transformed, so its rect already includes zoom + pan.
                const r = e.currentTarget.getBoundingClientRect();
                const fx = (e.clientX - r.left) / r.width;
                const fy = (e.clientY - r.top) / r.height;
                onPointClick({
                  x: crop ? crop.x / 100 + fx * (crop.w / 100) : fx,
                  y: crop ? crop.y / 100 + fy * (crop.h / 100) : fy,
                });
              }
            : undefined
        }
        className={`relative shrink-0 ${cropBox ? "" : "overflow-hidden"} ${
          modHeld
            ? "[cursor:inherit]"
            : scale > 1.01
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : onPointClick
              ? "cursor-zoom-in"
              : ""
        }`}
        style={{
          width: fitW,
          height: fitH,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition: dragging ? "none" : "transform 160ms ease-out",
        }}
      >
        {/* The whole photo, placed so the frame shows the crop, rotated about
            the photo's own centre at its normal size (never zoomed). The crop
            is already constrained to the rotated photo, so no empty corners
            show through the frame. */}
        <div
          className="absolute"
          style={{
            ...(crop
              ? {
                  width: `${(100 / crop.w) * 100}%`,
                  height: `${(100 / crop.h) * 100}%`,
                  left: `${(-crop.x / crop.w) * 100}%`,
                  top: `${(-crop.y / crop.h) * 100}%`,
                }
              : { inset: 0 }),
            ...(rotation
              ? { transform: `rotate(${rotation}deg)`, transition: "transform 80ms linear" }
              : null),
          }}
        >
          <img
            src={photoUrl(image, 1600)}
            alt=""
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
              if (w && h) {
                setAspect(w / h);
                setNaturalW(w);
              }
            }}
            className="absolute inset-0 h-full w-full max-w-none object-cover"
          />
          <FaceBoxOverlay image={image} onPick={onPickFace} scale={scale * (crop ? 1 : 1)} />
        </div>
        {overlay}
      </div>
      {badge}
      {marquee && (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: Math.min(marquee.x0, marquee.x1),
            top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0),
            height: Math.abs(marquee.y1 - marquee.y0),
            border: "1px dashed #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.45)",
          }}
        />
      )}
      {onPullToSurvey && (
        <div
          role="status"
          aria-live="polite"
          aria-hidden={pull <= 0}
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex items-center gap-2.5 whitespace-nowrap rounded-full border border-white/[0.12] bg-[rgba(18,18,18,0.5)] py-[5px] pl-[5px] pr-4 text-[13px] tracking-[0.01em] text-white/90 shadow-[0_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-[14px]"
          style={{
            transform: `translate(-50%, -50%) scale(${pull > 0 ? 0.94 + 0.06 * Math.min(1, pull * 3) : 0.94})`,
            opacity: pull > 0 ? Math.min(1, 0.3 + pull * 2) : 0,
            transition:
              pull > 0
                ? "opacity .12s linear, transform .12s linear"
                : "opacity .2s ease-out, transform .2s ease-out",
          }}
        >
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden className="shrink-0">
            <circle
              cx="15"
              cy="15"
              r="13"
              fill="rgba(255,255,255,.06)"
              stroke="rgba(255,255,255,.16)"
              strokeWidth="1.5"
            />
            <circle
              cx="15"
              cy="15"
              r="13"
              fill="none"
              stroke="#f2f2f2"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={`${(pull * 81.68).toFixed(1)} 200`}
              transform="rotate(-90 15 15)"
              style={{
                transition: `stroke-dasharray ${pull > 0 ? ".12s linear" : ".2s ease-out"}`,
              }}
            />
            <svg x="8" y="8" width="14" height="14" viewBox="0 0 20 20">
              <path
                d="M10.5 17H14a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3h-3.5zm-1-14H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h3.5z"
                fill="#e8e8e8"
              />
            </svg>
          </svg>
          <span>Keep zooming out to compare in Survey Mode</span>
        </div>
      )}
      {canvasOverlay}
    </div>
  );
}
