import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { sliderKey, useAlbumHistoryContext } from "../history/album-history";
import { metaFor } from "./image-meta";

// Histogram at the top of every loupe editing panel — built to the Figma
// "Accordion / Histogram" spec (Raw Rendering Editing, node 13364:27495):
//   • header: the same accordion header as the other panel sections
//   • 104px chart on surface-2 (#242424) with a 12 × 5 grid of surface-1
//     (#1c1c1c) cells, 1px apart
//   • smooth R / G / B channel curves: tinted areas where a channel rises
//     above the others, grey where they overlap, channel lines on top
//   • 18px shadow / highlight clipping buttons in the top corners
//   • EXIF row (11 / medium, #ababab)
// It stays stuck to the top of the panel while the sliders scroll under it.
//
// The curves are generated per image (stable for the same image) and shift
// with the image's Exposure slider, so edits visibly move them.

const W = 316;
const H = 104;
const N = 160;

// Collapsed state survives switching tools and images.
let savedOpen = true;

function rng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One tonal "scene" per image: a sharp shadow peak, a broad body of
// midtones / highlights, and a tail into the whites. Every channel weights the
// body bumps differently, so channels pull apart in places (a blue-heavy
// midtone, warm highlights) and overlap elsewhere — like a real photo.
function scene(image: number) {
  const r = rng(image * 97 + 13);
  const ch = () => [0.7 + r() * 0.6, 0.7 + r() * 0.6, 0.7 + r() * 0.6];
  return [
    { c: 10 + r() * 14, w: 2.2 + r() * 2, h: 0.75 + r() * 0.25, tint: [1, 1, 1.05] },
    { c: 28 + r() * 14, w: 7 + r() * 6, h: 0.3 + r() * 0.2, tint: ch() },
    { c: 45 + r() * 15, w: 7 + r() * 7, h: 0.45 + r() * 0.35, tint: ch() },
    { c: 62 + r() * 14, w: 7 + r() * 8, h: 0.4 + r() * 0.4, tint: ch() },
    { c: 80 + r() * 10, w: 5 + r() * 5, h: 0.25 + r() * 0.3, tint: ch() },
  ];
}

function channel(image: number, chn: 0 | 1 | 2, shift: number): number[] {
  const peaks = scene(image);
  const start = Math.max(4, peaks[0].c - 6);
  // About half the photos clip a little in the very brightest whites.
  const spike = rng(image * 17)() < 0.5 ? 0.18 + rng(image * 19)() * 0.25 : 0;
  const raw = Array.from({ length: N }, (_, i) => {
    const x = (i / (N - 1)) * 100 - shift;
    let y = 0;
    for (const p of peaks) {
      const c = p.c + (chn - 1) * 0.8;
      y += p.h * p.tint[chn] * Math.exp(-((x - c) ** 2) / (2 * p.w * p.w));
    }
    // Nothing in the deepest blacks; a soft floor between the bumps.
    const ramp = Math.min(1, Math.max(0, (x - start) / 3));
    y = (y + 0.04) * ramp;
    y += spike * Math.exp(-((x - 99.3) ** 2) / 0.6);
    return y;
  });
  // Light smoothing so the lines read like a real histogram, not a formula.
  return raw.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -2; k <= 2; k++) {
      const v = raw[i + k];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    return sum / n;
  });
}

const toPath = (ys: number[], max: number, close: boolean) => {
  const pts = ys.map(
    (y, i) => `${((i / (N - 1)) * W).toFixed(1)},${(H - (y / max) * H * 0.9).toFixed(1)}`,
  );
  return close ? `M0,${H} L${pts.join(" L")} L${W},${H} Z` : `M${pts.join(" L")}`;
};

export function Histogram({ image }: { image: number }) {
  const [open, setOpenState] = useState(savedOpen);
  const [clipLow, setClipLow] = useState(false);
  const [clipHigh, setClipHigh] = useState(false);
  const setOpen = (v: boolean) => {
    savedOpen = v;
    setOpenState(v);
  };

  // Exposure (slider position 0–100, centre 50) nudges the curves sideways.
  const history = useAlbumHistoryContext();
  const exposure = history?.getValue(image, sliderKey("edit", "Light", "Exposure")) ?? 50;
  const shift = ((exposure - 50) / 50) * 12;

  const red = channel(image, 0, shift);
  const green = channel(image, 1, shift);
  const blue = channel(image, 2, shift);
  const lum = red.map((v, i) => Math.min(v, green[i], blue[i]));
  const max = Math.max(...red, ...green, ...blue, 0.01);
  const m = metaFor(image);

  return (
    <section
      // Collapsed, the header still gets the bottom padding the open chart
      // body would give it, so it doesn't sit on the divider.
      className={`sticky -top-3 z-20 -mx-3 -mt-3 mb-3 flex shrink-0 flex-col border-b border-white/5 bg-[#1a1a1a] px-3 pt-1.5 ${
        open ? "" : "pb-1.5"
      }`}
    >
      {/* Same accordion header as the other sections (WHITE BALANCE, LIGHT…). */}
      <div className="flex h-6 items-center justify-between">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-200"
        >
          <CaretDown
            size={12}
            weight="fill"
            className={`text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          Histogram
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-2.5 py-2.5">
          <div
            className="relative h-[104px] w-full overflow-hidden bg-[#242424]"
            style={{
              // 12 × 5 grid of surface-1 cells, 1px apart, 1px in from the edge.
              backgroundImage:
                "linear-gradient(to right, #242424 1px, transparent 1px), linear-gradient(to bottom, #242424 1px, transparent 1px), linear-gradient(#1c1c1c, #1c1c1c)",
              backgroundSize:
                "calc((100% - 1px) / 12) calc((100% - 1px) / 5), calc((100% - 1px) / 12) calc((100% - 1px) / 5), calc(100% - 2px) calc(100% - 2px)",
              backgroundPosition: "0 0, 0 0, 1px 1px",
              backgroundRepeat: "repeat, repeat, no-repeat",
            }}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-hidden
            >
              {/* Where a channel rises above the others it shows its colour;
                  the shared part is grey; channel lines on top. */}
              <path d={toPath(blue, max, true)} fill="#1e2a52" />
              <path d={toPath(green, max, true)} fill="rgba(52,74,46,0.85)" />
              <path d={toPath(red, max, true)} fill="rgba(78,52,40,0.7)" />
              <path d={toPath(lum, max, true)} fill="#5a5e6b" />
              <path
                d={toPath(green, max, false)}
                fill="none"
                stroke="#3a9a4f"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={toPath(red, max, false)}
                fill="none"
                stroke="#e4514a"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={toPath(blue, max, false)}
                fill="none"
                stroke="#3d5ff2"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ClipButton
              side="left"
              on={clipLow}
              onClick={() => setClipLow(!clipLow)}
              label="Show shadow clipping"
            />
            <ClipButton
              side="right"
              on={clipHigh}
              onClick={() => setClipHigh(!clipHigh)}
              label="Show highlight clipping"
            />
          </div>

          <div className="flex items-center justify-between whitespace-nowrap text-[11px] font-medium leading-3 text-[#ababab]">
            <span>ISO {m.iso}</span>
            <span>{m.focal}mm</span>
            <span>{m.aperture}</span>
            <span>{m.shutter} sec</span>
          </div>
        </div>
      )}
    </section>
  );
}

function ClipButton({
  side,
  on,
  onClick,
  label,
}: {
  side: "left" | "right";
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={onClick}
      className={`absolute top-1.5 flex size-[18px] items-center justify-center rounded-[2px] p-1 ${
        side === "left" ? "left-1.5" : "right-1.5"
      } ${on ? "bg-[#5a5a5a]" : "bg-[#303030] hover:bg-[#3a3a3a]"}`}
    >
      <img src="/histogram/clip-triangle.svg" alt="" width={12} height={12} className="size-3" />
    </button>
  );
}
