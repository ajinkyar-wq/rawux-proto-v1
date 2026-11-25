import { useCallback, useEffect, useRef, useState } from "react";

export type BrushMode = "add" | "subtract";

// A stroke is stored in image-relative units so it survives zoom / resize:
// points are 0..1 of the frame, and the diameter is `size / 1000` of its width.
// Feather / opacity are captured per stroke, so changing them only affects what
// is painted afterwards.
type Stroke = {
  mode: BrushMode;
  size: number;
  feather: number;
  opacity: number;
  color: string;
  pts: { x: number; y: number }[];
};
type BBox = { x0: number; y0: number; x1: number; y1: number };
// A committed (Object Removal) brush removal: the painted shape, kept so it can
// be revealed on hover and pulled back for editing.
type Removal = { id: string; strokes: Stroke[]; bbox: BBox };
type Phase = "idle" | "hint" | "removing";

const REMOVE_MS = 2000; // mock removal duration

export type BrushState = {
  mode: BrushMode;
  setMode: (m: BrushMode) => void;
  size: number;
  setSize: React.Dispatch<React.SetStateAction<number>>;
  /** Edge softness, 0–100. */
  feather: number;
  setFeather: (n: number) => void;
  /** Paint colour and default opacity for the active tool. */
  color: string;
  defaultOpacity: number;
  /** Mask overlay opacity, 0–100. */
  opacity: number;
  setOpacity: (n: number) => void;
  /** Brush settings menu opened by right-click (client coords), or null. */
  menu: { x: number; y: number } | null;
  setMenu: (m: { x: number; y: number } | null) => void;
  strokes: React.MutableRefObject<Stroke[]>;
  /** Bumps whenever the strokes change outside a drag, so the canvas repaints. */
  epoch: number;
  clear: () => void;
  // Object Removal flow
  phase: Phase;
  setPhase: (p: Phase) => void;
  bbox: BBox | null;
  setBBox: (b: BBox | null) => void;
  removals: Removal[];
  remove: () => void;
  moveRemoval: (id: string, dx: number, dy: number) => void;
  deleteRemoval: (id: string) => void;
  /** Pull a removal back onto the canvas as live strokes to redraw it. */
  reopenRemoval: (id: string) => void;
};

export function useBrush(photoId: string | number, removal = false): BrushState {
  const color = removal ? REMOVAL_COLOR : MASK_COLOR;
  const defaultOpacity = removal ? 35 : 30;
  const [mode, setMode] = useState<BrushMode>("add");
  const [size, setSize] = useState(50);
  const [feather, setFeather] = useState(0);
  const [opacity, setOpacity] = useState(defaultOpacity);
  // Switching between Masking and Object Removal resets to that tool's look.
  useEffect(() => setOpacity(defaultOpacity), [defaultOpacity]);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [bbox, setBBox] = useState<BBox | null>(null);
  const [byImage, setByImage] = useState<Record<string, Removal[]>>({});
  const strokes = useRef<Stroke[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = String(photoId);
  const keyRef = useRef(key);
  keyRef.current = key;
  const bboxRef = useRef(bbox);
  bboxRef.current = bbox;

  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stopTimer, []);

  const clear = useCallback(() => {
    stopTimer();
    strokes.current = [];
    setPhase("idle");
    setBBox(null);
    setEpoch((n) => n + 1);
  }, []);

  const remove = useCallback(() => {
    stopTimer();
    setPhase("removing");
    const k = keyRef.current;
    timer.current = setTimeout(() => {
      timer.current = null;
      const b = bboxRef.current;
      if (b && strokes.current.length) {
        const r: Removal = { id: `${Date.now()}`, strokes: strokes.current, bbox: b };
        setByImage((p) => ({ ...p, [k]: [...(p[k] ?? []), r] }));
      }
      strokes.current = [];
      setPhase("idle");
      setBBox(null);
      setEpoch((n) => n + 1);
    }, REMOVE_MS);
  }, []);

  // Shift a finished removal by (dx, dy) as fractions of the frame.
  const moveRemoval = useCallback((id: string, dx: number, dy: number) => {
    const k = keyRef.current;
    setByImage((p) => ({
      ...p,
      [k]: (p[k] ?? []).map((r) =>
        r.id !== id
          ? r
          : {
              ...r,
              strokes: r.strokes.map((s) => ({
                ...s,
                pts: s.pts.map((q) => ({ x: q.x + dx, y: q.y + dy })),
              })),
              bbox: {
                x0: r.bbox.x0 + dx,
                y0: r.bbox.y0 + dy,
                x1: r.bbox.x1 + dx,
                y1: r.bbox.y1 + dy,
              },
            },
      ),
    }));
  }, []);

  const reopenRemoval = useCallback((id: string) => {
    const k = keyRef.current;
    setByImage((p) => {
      const r = (p[k] ?? []).find((x) => x.id === id);
      if (!r) return p;
      strokes.current = r.strokes;
      setBBox(r.bbox);
      setPhase("hint");
      setEpoch((n) => n + 1);
      return { ...p, [k]: (p[k] ?? []).filter((x) => x.id !== id) };
    });
  }, []);

  const deleteRemoval = useCallback((id: string) => {
    const k = keyRef.current;
    setByImage((p) => ({ ...p, [k]: (p[k] ?? []).filter((r) => r.id !== id) }));
  }, []);

  return {
    mode,
    setMode,
    size,
    setSize,
    feather,
    setFeather,
    opacity,
    setOpacity,
    color,
    defaultOpacity,
    menu,
    setMenu,
    strokes,
    epoch,
    clear,
    phase,
    setPhase,
    bbox,
    setBBox,
    removals: byImage[key] ?? [],
    remove,
    moveRemoval,
    deleteRemoval,
    reopenRemoval,
  };
}

// Masking paints red @ 30%; Object Removal keeps the raw-ux blue @ 35%.
const MASK_COLOR = "#ff0000";
const REMOVAL_COLOR = "rgb(59, 130, 246)";

// Draws a whole stroke as one path (so a translucent stroke never doubles up on
// itself). Subtract erases at full strength, softened by the stroke's feather.
function paintStroke(ctx: CanvasRenderingContext2D, W: number, H: number, s: Stroke) {
  const d = (s.size / 1000) * W;
  ctx.save();
  ctx.globalCompositeOperation = s.mode === "add" ? "source-over" : "destination-out";
  ctx.globalAlpha = s.mode === "add" ? s.opacity / 100 : 1;
  if (s.feather) ctx.filter = `blur(${(d * (s.feather / 100) * 0.35).toFixed(2)}px)`;
  ctx.fillStyle = s.color;
  ctx.strokeStyle = s.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = d;
  ctx.beginPath();
  if (s.pts.length === 1) {
    ctx.arc(s.pts[0].x * W, s.pts[0].y * H, d / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(s.pts[0].x * W, s.pts[0].y * H);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x * W, s.pts[i].y * H);
    ctx.stroke();
  }
  ctx.restore();
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function bboxOf(strokes: Stroke[], aspect: number): BBox | null {
  let b: BBox | null = null;
  for (const s of strokes) {
    if (s.mode !== "add") continue;
    const rx = s.size / 2000; // radius, as a fraction of the width
    const ry = rx * aspect; // …and of the height
    for (const p of s.pts) {
      const x0 = p.x - rx;
      const x1 = p.x + rx;
      const y0 = p.y - ry;
      const y1 = p.y + ry;
      b = b
        ? {
            x0: Math.min(b.x0, x0),
            y0: Math.min(b.y0, y0),
            x1: Math.max(b.x1, x1),
            y1: Math.max(b.y1, y1),
          }
        : { x0, y0, x1, y1 };
    }
  }
  return b && { x0: clamp01(b.x0), y0: clamp01(b.y0), x1: clamp01(b.x1), y1: clamp01(b.y1) };
}

// Paints the brush mask. Rendered inside the transformed photo frame, so it is
// exactly the image area (edge to edge), follows zoom / pan, and is clipped by
// the frame instead of spilling over the canvas.
//
// `removal` turns on the Object Removal flow: after each stroke a Cancel /
// Remove hint appears under the mask, and finished removals stay behind as dots
// that outline their mask on hover.
export function BrushCanvas({ brush, removal = false }: { brush: BrushState; removal?: boolean }) {
  const { mode, size, feather, opacity, strokes, epoch, phase, bbox, removals } = brush;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outlineRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const live = useRef({ mode, size, feather, opacity, phase, color: brush.color });
  live.current = { mode, size, feather, opacity, phase, color: brush.color };
  // Canvas as it was before the stroke in progress (redrawn under it each move).
  const base = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState<string | null>(null);
  // Dragging a removal's dot moves its mask (committed on release).
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  // Right-click menu on a removal: redraw it or delete it.
  const [rm, setRm] = useState<{ id: string; x: number; y: number } | null>(null);
  const [space, setSpace] = useState(false);
  const [panning, setPanning] = useState(false);
  const spaceRef = useRef(false);

  // Space = hand tool: hold it and drag to move the photo instead of painting.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return;
      e.preventDefault();
      const down = e.type === "keydown";
      spaceRef.current = down;
      setSpace(down);
      if (down && cursorRef.current) cursorRef.current.style.opacity = "0";
    };
    const onUp = () => setPanning(false);
    const onBlur = () => {
      spaceRef.current = false;
      setSpace(false);
      setPanning(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (!rm) return;
    const close = () => setRm(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [rm]);

  // Track the frame's zoom (--k) so ring / hint / dots stay a constant on-screen size.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = () => {
      const el = rootRef.current;
      if (el && el.offsetWidth) {
        const k = el.getBoundingClientRect().width / el.offsetWidth;
        if (Math.abs(k - last) > 0.0005) {
          last = k;
          el.style.setProperty("--k", String(k));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const repaint = useCallback(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const s of strokes.current) paintStroke(ctx, cv.width, cv.height, s);
  }, [strokes]);

  // Outline of the hovered removal: dilate its mask, then cut the mask out.
  const drawOutline = useCallback(() => {
    const cv = outlineRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const r = removals.find((x) => x.id === revealed);
    if (!r) return;
    const mask = document.createElement("canvas");
    mask.width = cv.width;
    mask.height = cv.height;
    const mctx = mask.getContext("2d")!;
    for (const s of r.strokes) paintStroke(mctx, mask.width, mask.height, s);
    const t = Math.max(2, cv.width / 600);
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      ctx.drawImage(mask, Math.cos(ang) * t, Math.sin(ang) * t);
    }
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }, [removals, revealed]);

  // Keep the backing stores matched to the frame (at 2× so zooming stays crisp).
  useEffect(() => {
    const cv = canvasRef.current;
    const out = outlineRef.current;
    if (!cv || !out) return;
    const fit = () => {
      const w = Math.min(3200, Math.round(cv.offsetWidth * (window.devicePixelRatio || 1) * 2));
      const h = Math.round((w * cv.offsetHeight) / Math.max(1, cv.offsetWidth));
      if (w > 0 && h > 0 && (cv.width !== w || cv.height !== h)) {
        cv.width = out.width = w;
        cv.height = out.height = h;
        repaint();
        drawOutline();
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [repaint, drawOutline]);

  useEffect(() => {
    repaint();
  }, [epoch, repaint]);
  useEffect(() => {
    drawOutline();
  }, [drawOutline]);

  const cur = useRef<Stroke | null>(null);
  const rel = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const hideCursor = () => {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  };
  const moveCursor = (e: React.PointerEvent) => {
    const el = cursorRef.current;
    if (!el) return;
    if (spaceRef.current || live.current.phase === "removing") {
      el.style.opacity = "0";
      return;
    }
    const { x, y } = rel(e);
    el.style.left = `${x * 100}%`;
    el.style.top = `${y * 100}%`;
    el.style.opacity = "1";
  };
  const finishStroke = () => {
    if (!cur.current) return;
    cur.current = null;
    if (!removal || !strokes.current.length) return;
    const cv = canvasRef.current;
    const b = bboxOf(strokes.current, cv ? cv.offsetWidth / Math.max(1, cv.offsetHeight) : 1);
    brush.setBBox(b);
    brush.setPhase(b ? "hint" : "idle");
  };

  const busy = phase === "removing";
  const showHint = removal && phase === "hint" && bbox;
  const showDots = removal && phase === "idle" && strokes.current.length === 0;
  // Hint / dots keep a constant on-screen size however far the frame is zoomed.
  const unscale = "scale(calc(1 / var(--k, 1)))";

  return (
    <div
      ref={rootRef}
      data-loupe-ui="brush"
      className="absolute inset-0 z-10"
      style={{
        cursor: space ? (panning ? "grabbing" : "grab") : busy ? "progress" : "none",
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey) return; // Cmd/Ctrl = marquee zoom
        if (spaceRef.current) {
          setPanning(true); // the loupe pans the photo
          return;
        }
        if (busy) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        if (live.current.phase === "hint") brush.setPhase("idle");
        const { x, y } = rel(e);
        const { mode: m, size: sz, feather: ft, opacity: op, color } = live.current;
        const s: Stroke = { mode: m, size: sz, feather: ft, opacity: op, color, pts: [{ x, y }] };
        cur.current = s;
        const cv = canvasRef.current;
        const ctx = cv?.getContext("2d");
        if (cv && ctx) {
          const snap = document.createElement("canvas");
          snap.width = cv.width;
          snap.height = cv.height;
          snap.getContext("2d")?.drawImage(cv, 0, 0);
          base.current = snap;
        }
        strokes.current.push(s);
        if (cv && ctx) paintStroke(ctx, cv.width, cv.height, s);
      }}
      onPointerMove={(e) => {
        moveCursor(e);
        const s = cur.current;
        if (!s) return;
        const { x, y } = rel(e);
        s.pts.push({ x: clamp01(x), y: clamp01(y) });
        const cv = canvasRef.current;
        const ctx = cv?.getContext("2d");
        if (cv && ctx && base.current) {
          ctx.clearRect(0, 0, cv.width, cv.height);
          ctx.drawImage(base.current, 0, 0);
          paintStroke(ctx, cv.width, cv.height, s);
        }
      }}
      onContextMenu={(e) => {
        // Right-click opens the brush settings instead of the photo menu.
        e.preventDefault();
        e.stopPropagation();
        brush.setMenu({ x: e.clientX, y: e.clientY });
      }}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
      onPointerLeave={() => {
        if (!cur.current) hideCursor();
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <canvas
        ref={outlineRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={drag ? { transform: `translate(${drag.dx * 100}%, ${drag.dy * 100}%)` } : undefined}
      />

      {showDots &&
        removals.map((r) => {
          const off = drag?.id === r.id ? drag : null;
          return (
            <button
              key={r.id}
              type="button"
              aria-label="Removal — drag to move, right-click for options"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                const rect = rootRef.current!.getBoundingClientRect();
                const sx = e.clientX;
                const sy = e.clientY;
                const b = r.bbox;
                const move = (ev: PointerEvent) => {
                  const dx = Math.max(-b.x0, Math.min(1 - b.x1, (ev.clientX - sx) / rect.width));
                  const dy = Math.max(-b.y0, Math.min(1 - b.y1, (ev.clientY - sy) / rect.height));
                  setDrag({ id: r.id, dx, dy });
                };
                const up = (ev: PointerEvent) => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                  const dx = Math.max(-b.x0, Math.min(1 - b.x1, (ev.clientX - sx) / rect.width));
                  const dy = Math.max(-b.y0, Math.min(1 - b.y1, (ev.clientY - sy) / rect.height));
                  setDrag(null);
                  if (Math.hypot(dx * rect.width, dy * rect.height) > 2)
                    brush.moveRemoval(r.id, dx, dy);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
              onPointerMove={(e) => {
                e.stopPropagation();
                hideCursor();
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = rootRef.current!.getBoundingClientRect();
                setRevealed(null);
                setRm({
                  id: r.id,
                  x: (e.clientX - rect.left) / rect.width,
                  y: (e.clientY - rect.top) / rect.height,
                });
              }}
              onPointerEnter={() => setRevealed(r.id)}
              onPointerLeave={() => setRevealed((v) => (v === r.id && !drag ? null : v))}
              className="absolute h-3 w-3 rounded-full border border-white/70 bg-blue-500 transition-colors hover:bg-blue-400"
              style={{
                left: `${((r.bbox.x0 + r.bbox.x1) / 2 + (off?.dx ?? 0)) * 100}%`,
                top: `${((r.bbox.y0 + r.bbox.y1) / 2 + (off?.dy ?? 0)) * 100}%`,
                transform: `translate(-50%, -50%) ${unscale}`,
                cursor: off ? "grabbing" : "grab",
              }}
            />
          );
        })}

      {rm && (
        <div
          className="absolute flex w-[120px] flex-col rounded-[8px] border border-[#303030] bg-[#1c1c1c] p-1 shadow-xl"
          style={{
            left: `${rm.x * 100}%`,
            top: `${rm.y * 100}%`,
            transform: unscale,
            transformOrigin: "top left",
            cursor: "default",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => {
            e.stopPropagation();
            hideCursor();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={() => {
              brush.reopenRemoval(rm.id);
              setRm(null);
            }}
            className="rounded-[5px] px-2.5 py-1.5 text-left text-[12px] text-[#e2e2e2] hover:bg-white/10"
          >
            Redraw
          </button>
          <button
            type="button"
            onClick={() => {
              brush.deleteRemoval(rm.id);
              setRm(null);
            }}
            className="rounded-[5px] px-2.5 py-1.5 text-left text-[12px] text-[#e2e2e2] hover:bg-white/10"
          >
            Delete
          </button>
        </div>
      )}

      {showHint && (
        <div
          className="absolute flex items-center gap-1 rounded-[8px] bg-black/70 p-1 backdrop-blur-sm"
          style={{
            left: `${Math.max(8, Math.min(92, ((bbox.x0 + bbox.x1) / 2) * 100))}%`,
            top: `${Math.min(94, bbox.y1 * 100)}%`,
            marginTop: "calc(10px / var(--k, 1))",
            transform: `translateX(-50%) ${unscale}`,
            transformOrigin: "top center",
            cursor: "default",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => {
            e.stopPropagation();
            hideCursor();
          }}
        >
          <button
            type="button"
            onClick={brush.clear}
            className="rounded-[5px] px-2.5 py-1 text-[12px] text-[#ababab] transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={brush.remove}
            className="rounded-[5px] bg-blue-500/80 px-2.5 py-1 text-[12px] font-medium text-white transition-colors hover:bg-blue-500"
          >
            Remove
          </button>
        </div>
      )}

      <div
        ref={cursorRef}
        aria-hidden
        className="brush-cursor pointer-events-none absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          width: `${size / 10}%`,
          // Hairlines stay 0.5px on screen however far the frame is zoomed.
          ["--hair" as string]: "calc(0.5px / var(--k, 1))",
        }}
      >
        {feather > 0 && <span className="brush-cursor-feather" />}
        <svg className="brush-cursor-glyph" viewBox="0 0 6 6" aria-hidden>
          <path
            d={mode === "subtract" ? "M0 3H6" : "M0 3H6M3 0V6"}
            stroke="#fff"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    </div>
  );
}
