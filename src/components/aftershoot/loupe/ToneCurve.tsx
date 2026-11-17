import { useContext, useRef, useState } from "react";
import { SliderHistoryContext, sliderKey, useAlbumHistoryContext } from "../history/album-history";

// Tone curve: Master / Red / Green / Blue channel selectors over a 4×4 grid.
//   click empty space  → add a point (and keep dragging it)
//   drag a point       → move it (end points move vertically only)
//   double-click point → remove it
// Each channel has its own points, stored per image in the album history, and
// every add / move / remove is ONE Undo step.

type Channel = "master" | "red" | "green" | "blue";
type Pt = { x: number; y: number }; // 0..100, y = output (up)

const CHANNELS: Channel[] = ["master", "red", "green", "blue"];
const LABEL: Record<Channel, string> = {
  master: "Master",
  red: "Red",
  green: "Green",
  blue: "Blue",
};
const COLOR: Record<Channel, string> = {
  master: "#d4d4d4",
  red: "#e5534b",
  green: "#3f9a55",
  blue: "#3b82e0",
};
const DEFAULT: Pt[] = [
  { x: 0, y: 0 },
  { x: 100, y: 100 },
];
const MIN_GAP = 2;

export function ToneCurve() {
  const [channel, setChannel] = useState<Channel>("master");
  const curves: Record<Channel, ReturnType<typeof useCurve>> = {
    master: useCurve("master"),
    red: useCurve("red"),
    green: useCurve("green"),
    blue: useCurve("blue"),
  };
  const curve = curves[channel];

  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ index: number; points: Pt[]; action: string } | null>(null);
  const [readout, setReadout] = useState<Pt | null>(null);

  const toPt = (e: { clientX: number; clientY: number }): Pt => {
    const r = boxRef.current!.getBoundingClientRect();
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 100, 0, 100),
      y: clamp((1 - (e.clientY - r.top) / r.height) * 100, 0, 100),
    };
  };

  const startDrag = (e: React.PointerEvent, points: Pt[], index: number, action: string) => {
    boxRef.current?.setPointerCapture(e.pointerId);
    drag.current = { index, points, action };
    setReadout(points[index]);
  };

  const onPointerDownEmpty = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = toPt(e);
    const pts = curve.points;
    // Insert at its x position, unless it lands on an existing point's column.
    if (pts.some((q) => Math.abs(q.x - p.x) < MIN_GAP)) return;
    const index = pts.findIndex((q) => q.x > p.x);
    const next = [...pts.slice(0, index), p, ...pts.slice(index)];
    curve.begin(); // snapshot BEFORE the point is inserted
    curve.setLive(next);
    startDrag(e, next, index, "Point added");
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = toPt(e);
    const pts = d.points;
    const last = pts.length - 1;
    const x =
      d.index === 0
        ? 0
        : d.index === last
          ? 100
          : clamp(p.x, pts[d.index - 1].x + MIN_GAP, pts[d.index + 1].x - MIN_GAP);
    const next = pts.map((q, i) => (i === d.index ? { x, y: p.y } : q));
    d.points = next;
    curve.setLive(next);
    setReadout(next[d.index]);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setReadout(null);
    curve.commit(d.action === "Point added" ? d.action : "Point moved");
  };

  const removePoint = (index: number) => {
    const pts = curve.points;
    if (index === 0 || index === pts.length - 1) return;
    curve.begin();
    curve.setLive(pts.filter((_, i) => i !== index));
    curve.commit("Point removed");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        {CHANNELS.map((c) => (
          <ChannelButton key={c} channel={c} active={c === channel} onClick={() => setChannel(c)} />
        ))}
      </div>

      <div
        ref={boxRef}
        onPointerDown={onPointerDownEmpty}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative aspect-square w-full cursor-crosshair touch-none select-none overflow-hidden border border-white/[0.06] bg-[#171717]"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {[25, 50, 75].map((v) => (
            <g
              key={v}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            >
              <line x1={v} y1={0} x2={v} y2={100} vectorEffect="non-scaling-stroke" />
              <line x1={0} y1={v} x2={100} y2={v} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {/* Baseline */}
          <line
            x1={0}
            y1={100}
            x2={100}
            y2={0}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {/* Other channels' edited curves, faint */}
          {CHANNELS.filter((c) => c !== channel && curves[c].edited).map((c) => (
            <path
              key={c}
              d={curvePath(curves[c].points)}
              fill="none"
              stroke={COLOR[c]}
              strokeOpacity={0.35}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path
            d={curvePath(curve.points)}
            fill="none"
            stroke={curve.edited ? COLOR[channel] : "#4a4a4a"}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Points (HTML so they stay round in any box size) */}
        {curve.edited &&
          curve.points.map((p, i) => (
            <span
              key={i}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.button !== 0) return;
                curve.begin();
                startDrag(e, curve.points, i, "Point moved");
              }}
              onDoubleClick={() => removePoint(i)}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 cursor-grab rounded-full border border-black/60 active:cursor-grabbing"
              style={{ left: `${p.x}%`, bottom: `${p.y}%`, background: COLOR[channel] }}
            />
          ))}

        {readout && (
          <span className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] tabular-nums text-neutral-400">
            {Math.round(readout.x * 2.55)} / {Math.round(readout.y * 2.55)}
          </span>
        )}
      </div>
    </div>
  );
}

function ChannelButton({
  channel,
  active,
  onClick,
}: {
  channel: Channel;
  active: boolean;
  onClick: () => void;
}) {
  const master = channel === "master";
  const ring = master ? "#8a8a8a" : COLOR[channel];
  return (
    <button
      type="button"
      title={LABEL[channel]}
      aria-label={`${LABEL[channel]} curve`}
      aria-pressed={active}
      onClick={onClick}
      className="flex h-4 w-4 items-center justify-center rounded-full"
      style={{
        border: `${master && active ? 3 : 1.5}px solid ${ring}`,
        background: master && active ? ring : "transparent",
      }}
    >
      {active && (
        <span
          className="block h-1.5 w-1.5 rounded-full"
          style={{ background: master ? "white" : COLOR[channel] }}
        />
      )}
    </button>
  );
}

/* ------------------------------ Curve state ------------------------------ */

// Points live in the album history store as numbers: `<ch>.n` (count) and
// `<ch>.x<i>` / `<ch>.y<i>`. Nothing stored = straight default line.
function useCurve(channel: Channel) {
  const history = useAlbumHistoryContext();
  const where = useContext(SliderHistoryContext);
  const [local, setLocal] = useState<Pt[]>(DEFAULT);
  const start = useRef<Record<string, number | undefined> | null>(null);
  const live = !!history && !!where;
  const key = (f: string) => (where ? sliderKey(where.tool, "Curves", `${channel}.${f}`) : "");
  const raw = (f: string) => (live ? history.getValue(where.image, key(f)) : undefined);

  const n = raw("n");
  const points: Pt[] = !live
    ? local
    : n === undefined
      ? DEFAULT
      : Array.from({ length: n }, (_, i) => ({ x: raw(`x${i}`) ?? 0, y: raw(`y${i}`) ?? 0 }));
  const latest = useRef(points);
  latest.current = points;

  const fieldsFor = (count: number) => [
    "n",
    ...Array.from({ length: count }, (_, i) => [`x${i}`, `y${i}`]).flat(),
  ];
  const valuesOf = (pts: Pt[]): Record<string, number> => ({
    n: pts.length,
    ...Object.fromEntries(
      pts.flatMap((p, i) => [
        [`x${i}`, p.x],
        [`y${i}`, p.y],
      ]),
    ),
  });

  const begin = () => {
    if (!live) return;
    start.current = Object.fromEntries(fieldsFor(points.length).map((f) => [f, raw(f)]));
  };

  const setLive = (pts: Pt[]) => {
    latest.current = pts;
    if (!live) return setLocal(pts);
    const vals = valuesOf(pts);
    Object.entries(vals).forEach(([f, v]) => history.setLive(where.image, key(f), v));
  };

  const commit = (action: string) => {
    const s = start.current;
    start.current = null;
    if (!live || !s) return;
    const end = latest.current;
    const next = valuesOf(end);
    const fields = new Set([...Object.keys(s), ...fieldsFor(end.length)]);
    const effects = [...fields]
      .map((f) => ({ image: where.image, key: key(f), prev: s[f], next: next[f] }))
      .filter((e) => e.prev !== e.next);
    if (effects.length === 0) return;
    history.record({
      kind: "change",
      op: `Curves · ${LABEL[channel]}`,
      value: action,
      view: "loupe",
      tool: where.tool,
      images: [where.image],
      effects,
    });
  };

  const edited =
    points.length !== 2 || points.some((p, i) => p.x !== DEFAULT[i].x || p.y !== DEFAULT[i].y);
  return { points, edited, begin, setLive, commit };
}

/* ------------------------------ Geometry ------------------------------ */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Smooth path through the points (monotone cubic — no overshoot), in the SVG's
// 0..100 box with y flipped.
function curvePath(pts: Pt[]): string {
  const f = monotone(pts);
  const steps = 80;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    const y = clamp(f(x), 0, 100);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${(100 - y).toFixed(2)}`;
  }
  return d;
}

function monotone(pts: Pt[]): (x: number) => number {
  const n = pts.length;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const dx = xs.slice(1).map((x, i) => x - xs[i]);
  const m = ys.slice(1).map((y, i) => (y - ys[i]) / dx[i]);
  const t = new Array<number>(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = dx[i];
    const s = (x - xs[i]) / h;
    const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
    const h10 = s ** 3 - 2 * s ** 2 + s;
    const h01 = -2 * s ** 3 + 3 * s ** 2;
    const h11 = s ** 3 - s ** 2;
    return h00 * ys[i] + h10 * h * t[i] + h01 * ys[i + 1] + h11 * h * t[i + 1];
  };
}
