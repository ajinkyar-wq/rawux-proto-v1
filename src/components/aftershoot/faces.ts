// Key faces. Face counts, positions and crop rects come from the real face
// pipeline (RetinaFace → ArcFace, see src/lib/faceDetection) once
// <FaceDetectionRunner /> has processed the sample photos; until then (and for
// photos where it finds nothing yet) they fall back to placeholder data.
// Eyes-open / sharpness come from the worker's measurements (sharpness =
// Laplacian variance, eyes = contrast around the eye landmarks).
//
// Face scores follow the Survey Mode prototype:
//   eyes: open | closed      focus: g = sharp, y = slightly soft, r = blurry

import { useSyncExternalStore } from "react";
import type { FaceRect } from "@/types/detection";
import { SAMPLE_COUNT, photoAspect } from "./cull-data";

// ---- real detection results, keyed by sample-photo index ----
let detected = new Map<number, FaceRect[]>();
let version = 0;
const listeners = new Set<() => void>();

/** Called by FaceDetectionRunner as each sample photo is processed. */
export function setDetectedFaces(next: Map<number, FaceRect[]>) {
  detected = next;
  version++;
  listeners.forEach((l) => l());
}

let loading = false;
/** Called by FaceDetectionRunner: true while the model loads / photos are processed. */
export function setFacesLoading(v: boolean) {
  if (loading === v) return;
  loading = v;
  version++;
  listeners.forEach((l) => l());
}

/** True while detection is still running and this photo has no result yet. */
export const facesLoading = (image: number) => loading && !realFaces(image);

// Face card currently hovered in the Key Faces panel (index within a photo).
let hoveredFace: number | null = null;
const hoverListeners = new Set<() => void>();
export function setHoveredFace(k: number | null) {
  if (hoveredFace === k) return;
  hoveredFace = k;
  hoverListeners.forEach((l) => l());
}
export function useHoveredFace() {
  return useSyncExternalStore(
    (cb) => {
      hoverListeners.add(cb);
      return () => hoverListeners.delete(cb);
    },
    () => hoveredFace,
    () => null,
  );
}

// Grid view has no big canvas to zoom, so a face click there opens the photo in
// Loupe zoomed to that face: the handler is registered by the route, and the
// face is handed to LoupeView through `takePendingFace` when it mounts.
let openFaceHandler: ((k: number) => void) | null = null;
let pendingFace: number | null = null;
export const setOpenFaceHandler = (fn: ((k: number) => void) | null) => {
  openFaceHandler = fn;
};
export const openFace = (k: number) => openFaceHandler?.(k);
export const setPendingFace = (k: number | null) => {
  pendingFace = k;
};
export const takePendingFace = () => {
  const k = pendingFace;
  pendingFace = null;
  return k;
};

/** Subscribe a component to detection results so it re-renders as they arrive. */
export function useFaceData() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}

const sampleOf = (image: number) => ((image % SAMPLE_COUNT) + SAMPLE_COUNT) % SAMPLE_COUNT;
const realFaces = (image: number) => {
  const r = SAMPLE_COUNT ? detected.get(sampleOf(image)) : undefined;
  return r && r.length > 0 ? r : null;
};

/** The detected crop rect (fractions of the photo) for face k, if real data exists. */
export const faceRect = (image: number, k: number): FaceRect | null => realFaces(image)?.[k] ?? null;

const FACE_COUNTS_PER_TILE = [9, 1, 4, 12, 18, 2, 6, 3, 16];

/** Number of key faces detected in an image. */
export const faceCount = (image: number) =>
  realFaces(image)?.length ?? FACE_COUNTS_PER_TILE[image % FACE_COUNTS_PER_TILE.length];

function rnd(n: number) {
  const a = Math.sin(n) * 43758.5453;
  return a - Math.floor(a);
}

/** Where face k sits in the photo, as fractions (0-1) of its width / height. */
export function facePos(image: number, k: number) {
  const r = faceRect(image, k);
  if (r) return r.fx !== undefined ? { x: r.fx + r.fw! / 2, y: r.fy! + r.fh! / 2 } : { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  return {
    x: 0.18 + rnd(image * 12.9898 + k * 78.233) * 0.64,
    y: 0.2 + rnd(image * 3.17 + k * 9.73) * 0.5,
  };
}

/** Face centre as fractions of a frame that letterboxes the photo (object-contain). */
export function framePos(image: number, k: number, frameAspect: number) {
  const { x, y } = facePos(image, k);
  const ar = faceRect(image, k)?.ar ?? photoAspect(image);
  if (ar > frameAspect) {
    const sh = frameAspect / ar;
    return { x, y: (1 - sh) / 2 + y * sh };
  }
  const sw = ar / frameAspect;
  return { x: (1 - sw) / 2 + x * sw, y };
}

export type FaceFocus = "g" | "y" | "r";

// Thresholds on the worker's measurements (tuned on the sample album).
const SHARP_GOOD = 120; // Laplacian variance ≥ this → sharp
const SHARP_SOFT = 40; //  ≥ this → slightly soft, below → out of focus
const EYE_OPEN_MIN = 0.2; // eye-patch contrast ≥ this → eyes open

/** Eyes-open and sharpness score of face k (real when detected, else mock). */
export function faceScore(image: number, k: number): { eyesOpen: boolean; focus: FaceFocus } {
  const r = faceRect(image, k);
  if (r && r.sharp !== undefined && r.eyeContrast !== undefined) {
    return {
      eyesOpen: r.eyeContrast >= EYE_OPEN_MIN,
      focus: r.sharp >= SHARP_GOOD ? "g" : r.sharp >= SHARP_SOFT ? "y" : "r",
    };
  }
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
