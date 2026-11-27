import { sliderKey, type AlbumHistory } from "../history/album-history";

// Live preview of the basic Edit sliders on the photo itself (loupe, filmstrip,
// grid, duplicates strip), so Sync / Reset / Undo visibly change the image.
// A cheap CSS approximation — White Balance, Light and Presence only:
//   brightness ← Exposure (+ a little Highlights / Shadows / Whites / Blacks)
//   contrast   ← Contrast, Clarity, Dehaze
//   saturate   ← Saturation, Vibrance
//   warm/cool and green/magenta colour washes ← Temperature, Tint

export type EditLook = {
  filter: string;
  washes: { color: string; opacity: number }[];
};

// Each slider's neutral position (0–100 track): nothing stored = zero, and
// White Balance's zero is As Shot. Must match EditPanel.
const DEFAULTS: Record<string, [scope: string, initial: number]> = {
  Temperature: ["White Balance", 50],
  Tint: ["White Balance", 55],
  Exposure: ["Light", 50],
  Contrast: ["Light", 50],
  Highlights: ["Light", 50],
  Shadows: ["Light", 50],
  Whites: ["Light", 50],
  Blacks: ["Light", 50],
  Clarity: ["Presence", 50],
  Dehaze: ["Presence", 50],
  Vibrance: ["Presence", 50],
  Saturation: ["Presence", 50],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The image's edit look, or null when every previewed slider is at default. */
export function editLookOf(history: AlbumHistory | null, image: number): EditLook | null {
  if (!history) return null;
  let moved = false;
  // Offset from default, in half-tracks (±1 ≈ the full side of a centred slider).
  const d = (label: keyof typeof DEFAULTS & string) => {
    const [scope, initial] = DEFAULTS[label];
    const v = history.getValue(image, sliderKey("edit", scope, label));
    if (v === undefined || Math.abs(v - initial) < 0.5) return 0;
    moved = true;
    return (v - initial) / 50;
  };
  const exposure = d("Exposure");
  const contrast = d("Contrast");
  const highlights = d("Highlights");
  const shadows = d("Shadows");
  const whites = d("Whites");
  const blacks = d("Blacks");
  const clarity = d("Clarity");
  const dehaze = d("Dehaze");
  const vibrance = d("Vibrance");
  const saturation = d("Saturation");
  const temp = d("Temperature");
  const tint = d("Tint");
  if (!moved) return null;

  const brightness = clamp(
    1 + 0.3 * exposure + 0.05 * highlights + 0.06 * shadows + 0.05 * whites + 0.04 * blacks,
    0.5,
    1.6,
  );
  const contrastF = clamp(1 + 0.25 * contrast + 0.08 * clarity + 0.12 * dehaze, 0.6, 1.6);
  const saturate = clamp(1 + 0.35 * saturation + 0.2 * vibrance, 0.3, 1.8);
  const washes: EditLook["washes"] = [];
  if (temp)
    washes.push({
      color: temp > 0 ? "rgb(255,150,40)" : "rgb(40,120,255)",
      opacity: clamp(Math.abs(temp) * 0.2, 0, 0.25),
    });
  if (tint)
    washes.push({
      color: tint > 0 ? "rgb(200,60,210)" : "rgb(60,200,90)",
      opacity: clamp(Math.abs(tint) * 0.15, 0, 0.2),
    });
  return {
    filter: `brightness(${brightness.toFixed(3)}) contrast(${contrastF.toFixed(3)}) saturate(${saturate.toFixed(3)})`,
    washes,
  };
}

/** Colour washes over the photo (put inside the photo's own box, after the <img>). */
export function EditWashes({ look }: { look: EditLook | null | undefined }) {
  if (!look?.washes.length) return null;
  return (
    <>
      {look.washes.map((w, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: w.color, opacity: w.opacity, mixBlendMode: "overlay" }}
        />
      ))}
    </>
  );
}
