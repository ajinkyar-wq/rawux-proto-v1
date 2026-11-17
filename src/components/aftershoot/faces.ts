// Key faces (placeholder data). Every album image has a handful of detected
// faces. The sample pictures have no real faces, so each face gets a stable
// pseudo-random spot in the photo (used for the panel crop and for "zoom every
// photo to this face") plus eyes-open / sharpness scores.
//
// Face scores follow the Survey Mode prototype:
//   eyes: open | closed      focus: g = sharp, y = slightly soft, r = blurry

const FACE_COUNTS_PER_TILE = [9, 1, 4, 12, 18, 2, 6, 3, 16];

/** Number of key faces detected in an image. */
export const faceCount = (image: number) =>
  FACE_COUNTS_PER_TILE[image % FACE_COUNTS_PER_TILE.length];

function rnd(n: number) {
  const a = Math.sin(n) * 43758.5453;
  return a - Math.floor(a);
}

/** Where face k sits in the photo, as fractions (0-1) of its width / height. */
export function facePos(image: number, k: number) {
  return {
    x: 0.18 + rnd(image * 12.9898 + k * 78.233) * 0.64,
    y: 0.2 + rnd(image * 3.17 + k * 9.73) * 0.5,
  };
}

export type FaceFocus = "g" | "y" | "r";

/** Eyes-open and sharpness score of face k. */
export function faceScore(image: number, k: number): { eyesOpen: boolean; focus: FaceFocus } {
  const r1 = Math.floor(rnd(image * 9.1 + k * 4.7) * 100);
  const r2 = Math.floor(rnd(image * 5.3 + k * 11.9) * 100);
  return {
    eyesOpen: r1 >= 14,
    focus: r2 < 8 ? "r" : r2 < 22 ? "y" : "g",
  };
}

export const FOCUS_COLOR: Record<FaceFocus, string> = {
  g: "#4cc38a",
  y: "#e2c044",
  r: "#e5484d",
};

export const FOCUS_LABEL: Record<FaceFocus, string> = {
  g: "Sharp",
  y: "Slightly soft",
  r: "Out of focus",
};

/** Zoom used when jumping every photo to a face. */
export const FACE_ZOOM = 300;
