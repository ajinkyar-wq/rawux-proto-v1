// Key faces. Face counts, positions and crop rects come from the real face
// pipeline (RetinaFace → ArcFace, see src/lib/faceDetection) once
// <FaceDetectionRunner /> has processed the sample photos; until then (and for
// photos where it finds nothing yet) they fall back to placeholder data.
// Eyes-open / sharpness scores are still mock.
//
// Face scores follow the Survey Mode prototype:
//   eyes: open | closed      focus: g = sharp, y = slightly soft, r = blurry

import { useSyncExternalStore } from "react";
import type { FaceRect } from "@/types/detection";
import { SAMPLE_COUNT } from "./cull-data";

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
  if (r) return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
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
