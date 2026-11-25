/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any -- onnxruntime-web UMD build is loaded at runtime and ships no types here */
//
// Face pipeline worker: RetinaFace (detect + 5pt landmarks) → ArcFace (512-d
// embedding) → greedy cosine clustering → InsightFace genderage (gender/age).
// Ported from models/retinaface-eval.html, adapted to run off the main thread
// against ImageBitmaps and emit ModelSubject-shaped results.
//
// This is an ES module worker (Vite serves classic workers as ESM in dev, which
// breaks importScripts). The locally-bundled ONNX Runtime is a UMD build, so we
// fetch and eval it into the worker global — the module-worker equivalent of the
// <script src> tag the eval HTML used. It runs in sloppy mode and assigns
// `self.ort`, exactly like importScripts would have.

import type { WorkerRequest, WorkerResponse, WorkerSubject } from "./messages";
import type { SubjectCategory, FaceRect } from "@/types/detection";

// ORT is loaded lazily on the first "load" message (avoids top-level await,
// which the es2020 build target rejects).
let ort: any = null;
async function ensureOrt(): Promise<any> {
  if (ort) return ort;
  const src = await (await fetch("/ort/ort.min.js")).text();
  // ort.min.js is `"use strict"; var ort = (…)()`. Under strict-mode eval that
  // `var` stays local and never reaches `self`, so wrap it and return the
  // binding explicitly. (A classic <script src> isn't strict-scoped, hence it
  // "just worked" there.)
  ort = new Function(`${src}\nreturn ort;`)();
  // Single-threaded WASM avoids the SharedArrayBuffer / cross-origin-isolation
  // requirement that the multi-threaded build needs.
  ort.env.wasm.wasmPaths = "/ort/";
  ort.env.wasm.numThreads = 1;
  return ort;
}

const post = (msg: WorkerResponse, transfer: Transferable[] = []) =>
  (self as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

const log = (...args: unknown[]) => console.log("[face:worker]", ...args);

// ── Detection config (RetinaFace, MobileNet0.25, INT8) ──────────────────────
const INPUT_H = 608;
const INPUT_W = 640;
const STEPS = [8, 16, 32];
const MIN_SIZES = [[16, 32], [64, 128], [256, 512]];
const VARIANCES = [0.1, 0.2];
const CONF_THRESH = 0.5;
const NMS_THRESH = 0.4;
const VIS_THRESH = 0.6;     // min detection score to keep a face at all
const MIN_EMBED_SCORE = 2.0; // min logit to bother embedding (clustering quality)
// Laplacian-variance floor on the face crop — blurry/out-of-focus faces below
// this are filtered out of both the displayed key faces and clustering. Tunable;
// raise to be stricter. Per-face values are logged as `sharp=…` for calibration.
const SHARPNESS_MIN = 40;

// ── Recognition config (ArcFace, buffalo_s) ─────────────────────────────────
const ARCFACE_SIZE = 112;
const ARCFACE_TEMPLATE: Array<[number, number]> = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

// ── Attribute config (InsightFace genderage) ────────────────────────────────
const GENDERAGE_SIZE = 96;
const CLUSTER_SIM = 0.4; // cosine similarity threshold for same-person

let detectSession: any = null;
let arcSession: any = null;
let genderSession: any = null;
let anchors: number[][] | null = null;

type DetectedFace = { landmarks: Array<[number, number]> | null; score: number; x1: number; y1: number; x2: number; y2: number };

type CollectedFace = {
  imageIndex: number;
  score: number;
  embedding: Float32Array;
  aligned: ImageData;       // 112×112 aligned crop, used for the key-face thumb
  gender?: "Male" | "Female";
  age?: number;
};

const collected: CollectedFace[] = [];
// Width of the small crop used only to measure focus/sharpness. The displayed
// key face is rendered from the full-res photo on the main thread, so nothing
// here is baked for display.
const SHARP_CROP_W = 160;

// ── Anchors / decode / NMS (verbatim from the eval) ─────────────────────────
function generateAnchors(h: number, w: number): number[][] {
  const out: number[][] = [];
  for (let lvl = 0; lvl < STEPS.length; lvl++) {
    const step = STEPS[lvl];
    const sizes = MIN_SIZES[lvl];
    const fh = Math.ceil(h / step);
    const fw = Math.ceil(w / step);
    for (let i = 0; i < fh; i++) {
      for (let j = 0; j < fw; j++) {
        for (const minSize of sizes) {
          out.push([((j + 0.5) * step) / w, ((i + 0.5) * step) / h, minSize / w, minSize / h]);
        }
      }
    }
  }
  return out;
}

function decodeBoxes(loc: Float32Array | number[], anc: number[][]): number[][] {
  const out = new Array(anc.length);
  const [v0, v1] = VARIANCES;
  for (let i = 0; i < anc.length; i++) {
    const a = anc[i];
    const cx = a[0] + loc[i * 4] * v0 * a[2];
    const cy = a[1] + loc[i * 4 + 1] * v0 * a[3];
    const w = a[2] * Math.exp(loc[i * 4 + 2] * v1);
    const h = a[3] * Math.exp(loc[i * 4 + 3] * v1);
    out[i] = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  }
  return out;
}

function decodeLandmarks(landm: Float32Array | number[], anc: number[][]): Array<[number, number]>[] {
  const out = new Array(anc.length);
  const v0 = VARIANCES[0];
  for (let i = 0; i < anc.length; i++) {
    const a = anc[i];
    const pts: Array<[number, number]> = new Array(5) as Array<[number, number]>;
    for (let k = 0; k < 5; k++) {
      pts[k] = [a[0] + landm[i * 10 + k * 2] * v0 * a[2], a[1] + landm[i * 10 + k * 2 + 1] * v0 * a[3]];
    }
    out[i] = pts;
  }
  return out;
}

function iou(a: number[], b: number[]): number {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]);
  const y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const aA = (a[2] - a[0]) * (a[3] - a[1]);
  const aB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (aA + aB - inter + 1e-12);
}

function nms(boxes: number[][], scores: number[], threshold: number): number[] {
  const order = scores.map((_, i) => i).sort((a, b) => scores[b] - scores[a]);
  const suppressed = new Uint8Array(boxes.length);
  const keep: number[] = [];
  for (let p = 0; p < order.length; p++) {
    const i = order[p];
    if (suppressed[i]) continue;
    keep.push(i);
    for (let q = p + 1; q < order.length; q++) {
      const j = order[q];
      if (!suppressed[j] && iou(boxes[i], boxes[j]) >= threshold) suppressed[j] = 1;
    }
  }
  return keep;
}

// ── Canvas helpers ──────────────────────────────────────────────────────────
function makeCanvas(w: number, h: number): OffscreenCanvas {
  return new OffscreenCanvas(w, h);
}

// Letterbox to 608×640, BGR, mean-subtracted, NHWC.
function preprocessDetect(bitmap: ImageBitmap): { tensor: any; scale: number } {
  const scale = Math.min(INPUT_W / bitmap.width, INPUT_H / bitmap.height);
  const newW = Math.round(bitmap.width * scale);
  const newH = Math.round(bitmap.height * scale);
  const canvas = makeCanvas(INPUT_W, INPUT_H);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, INPUT_W, INPUT_H);
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  const data = ctx.getImageData(0, 0, INPUT_W, INPUT_H).data;
  const arr = new Float32Array(INPUT_H * INPUT_W * 3);
  for (let i = 0, n = INPUT_H * INPUT_W; i < n; i++) {
    arr[i * 3] = data[i * 4 + 2] - 104; // B
    arr[i * 3 + 1] = data[i * 4 + 1] - 117; // G
    arr[i * 3 + 2] = data[i * 4] - 123; // R
  }
  return { tensor: new ort.Tensor("float32", arr, [1, INPUT_H, INPUT_W, 3]), scale };
}

async function detectFaces(bitmap: ImageBitmap): Promise<DetectedFace[]> {
  const { tensor, scale } = preprocessDetect(bitmap);
  const out = await detectSession.run({ [detectSession.inputNames[0]]: tensor });
  const N = anchors!.length;
  const arrays = detectSession.outputNames.map((n: string) => out[n].data as Float32Array);
  const loc = arrays.find((a: Float32Array) => a.length === N * 4);
  const conf = arrays.find((a: Float32Array) => a.length === N * 2);
  const landm = arrays.find((a: Float32Array) => a.length === N * 10);
  if (!loc || !conf) throw new Error("Unexpected RetinaFace output shapes");

  const boxes = decodeBoxes(loc, anchors!);
  const landmarks = landm ? decodeLandmarks(landm, anchors!) : null;

  const keptScores: number[] = [];
  const keptBoxes: number[][] = [];
  const keptLandm: Array<[number, number]>[] = [];
  for (let i = 0; i < N; i++) {
    const s = conf[i * 2 + 1]; // index 1 = face class
    if (s > CONF_THRESH) {
      keptScores.push(s);
      keptBoxes.push(boxes[i]);
      if (landmarks) keptLandm.push(landmarks[i]);
    }
  }
  const finalIdx = nms(keptBoxes, keptScores, NMS_THRESH);
  const sx = INPUT_W / scale;
  const sy = INPUT_H / scale;
  return finalIdx.map((i) => {
    const [x1, y1, x2, y2] = keptBoxes[i];
    const lm = keptLandm[i] ? keptLandm[i].map(([lx, ly]) => [lx * sx, ly * sy] as [number, number]) : null;
    return {
      x1: Math.max(0, x1 * sx),
      y1: Math.max(0, y1 * sy),
      x2: Math.min(bitmap.width, x2 * sx),
      y2: Math.min(bitmap.height, y2 * sy),
      score: keptScores[i],
      landmarks: lm,
    };
  });
}

// ── Alignment + ArcFace ──────────────────────────────────────────────────────
function similarityTransform(src: Array<[number, number]>, dst: Array<[number, number]>) {
  const n = src.length;
  let sxm = 0, sym = 0, dxm = 0, dym = 0;
  for (let i = 0; i < n; i++) {
    sxm += src[i][0]; sym += src[i][1];
    dxm += dst[i][0]; dym += dst[i][1];
  }
  sxm /= n; sym /= n; dxm /= n; dym /= n;
  let na = 0, nb = 0, denom = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i][0] - sxm;
    const sy = src[i][1] - sym;
    const dx = dst[i][0] - dxm;
    const dy = dst[i][1] - dym;
    na += sx * dx + sy * dy;
    nb += sx * dy - sy * dx;
    denom += sx * sx + sy * sy;
  }
  const a = na / denom;
  const b = nb / denom;
  const tx = dxm - (a * sxm - b * sym);
  const ty = dym - (b * sxm + a * sym);
  return { a, b, tx, ty };
}

// Returns a 112×112 OffscreenCanvas with the aligned face.
function alignFace(bitmap: ImageBitmap, landmarks: Array<[number, number]>): OffscreenCanvas {
  const { a, b, tx, ty } = similarityTransform(landmarks, ARCFACE_TEMPLATE);
  const canvas = makeCanvas(ARCFACE_SIZE, ARCFACE_SIZE);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, ARCFACE_SIZE, ARCFACE_SIZE);
  ctx.setTransform(a, b, -b, a, tx, ty);
  ctx.drawImage(bitmap, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

function preprocessArcFace(canvas112: OffscreenCanvas): any {
  const ctx = canvas112.getContext("2d", { willReadFrequently: true })!;
  const data = ctx.getImageData(0, 0, ARCFACE_SIZE, ARCFACE_SIZE).data;
  const n = ARCFACE_SIZE * ARCFACE_SIZE;
  const arr = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    arr[0 * n + i] = (data[i * 4] - 127.5) / 127.5; // R
    arr[1 * n + i] = (data[i * 4 + 1] - 127.5) / 127.5; // G
    arr[2 * n + i] = (data[i * 4 + 2] - 127.5) / 127.5; // B
  }
  return new ort.Tensor("float32", arr, [1, 3, ARCFACE_SIZE, ARCFACE_SIZE]);
}

// Variance of the Laplacian — a standard focus/blur metric. Higher = sharper.
function computeSharpness(img: ImageData): number {
  const { width: w, height: h, data } = img;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  let sum = 0, sum2 = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const lap =
        -gray[(y - 1) * w + (x - 1)] - gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        - gray[y * w + (x - 1)] + 8 * gray[y * w + x] - gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] - gray[(y + 1) * w + x] - gray[(y + 1) * w + (x + 1)];
      sum += lap; sum2 += lap * lap; cnt++;
    }
  }
  const mean = sum / cnt;
  return sum2 / cnt - mean * mean;
}

function l2normalize(v: Float32Array): Float32Array {
  let n = 0;
  for (let i = 0; i < v.length; i++) n += v[i] * v[i];
  n = Math.sqrt(n) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
  return out;
}

async function embedFace(aligned112: OffscreenCanvas): Promise<Float32Array> {
  const tensor = preprocessArcFace(aligned112);
  const out = await arcSession.run({ [arcSession.inputNames[0]]: tensor });
  return l2normalize(out[arcSession.outputNames[0]].data as Float32Array);
}

// ── InsightFace genderage ────────────────────────────────────────────────────
// Input: NCHW 1×3×96×96, RGB, raw 0-255 (mean 0, std 1). Output [1,3]:
// [femaleLogit, maleLogit, age]; gender = argmax(first two), age = round(v*100).
async function classifyGenderAge(
  aligned112: OffscreenCanvas
): Promise<{ gender: "Male" | "Female"; age: number } | null> {
  if (!genderSession) return null;
  try {
    const canvas = makeCanvas(GENDERAGE_SIZE, GENDERAGE_SIZE);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(aligned112, 0, 0, GENDERAGE_SIZE, GENDERAGE_SIZE);
    const data = ctx.getImageData(0, 0, GENDERAGE_SIZE, GENDERAGE_SIZE).data;
    const n = GENDERAGE_SIZE * GENDERAGE_SIZE;
    const arr = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      arr[0 * n + i] = data[i * 4];     // R
      arr[1 * n + i] = data[i * 4 + 1]; // G
      arr[2 * n + i] = data[i * 4 + 2]; // B
    }
    const tensor = new ort.Tensor("float32", arr, [1, 3, GENDERAGE_SIZE, GENDERAGE_SIZE]);
    const out = await genderSession.run({ [genderSession.inputNames[0]]: tensor });
    const pred = out[genderSession.outputNames[0]].data as Float32Array;
    const gender = pred[1] > pred[0] ? "Male" : "Female";
    const age = Math.round(pred[2] * 100);
    return { gender, age };
  } catch (e) {
    console.warn("genderage failed:", e);
    return null;
  }
}

function categoryFor(gender: "Male" | "Female" | undefined, age: number | undefined): SubjectCategory | undefined {
  if (age != null && age <= 14) return "Child";
  if (age != null && age >= 60) return "Elderly";
  if (gender === "Male") return "Masculine";
  if (gender === "Female") return "Feminine";
  return undefined;
}

// ── Clustering ────────────────────────────────────────────────────────────────
function cosSim(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function clusterFaces(faces: CollectedFace[]): number[][] {
  const clusters: Array<{ centroid: Float32Array; members: number[] }> = [];
  for (let i = 0; i < faces.length; i++) {
    const emb = faces[i].embedding;
    let bestC = -1, bestSim = -Infinity;
    for (let c = 0; c < clusters.length; c++) {
      const sim = cosSim(emb, clusters[c].centroid);
      if (sim > bestSim) { bestSim = sim; bestC = c; }
    }
    if (bestC >= 0 && bestSim >= CLUSTER_SIM) {
      const cl = clusters[bestC];
      cl.members.push(i);
      const k = cl.members.length;
      for (let d = 0; d < emb.length; d++) cl.centroid[d] = ((k - 1) * cl.centroid[d] + emb[d]) / k;
      cl.centroid = l2normalize(cl.centroid);
    } else {
      clusters.push({ centroid: new Float32Array(emb), members: [i] });
    }
  }
  clusters.sort((a, b) => b.members.length - a.members.length);
  return clusters.map((c) => c.members);
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

async function imageDataToBlob(imgData: ImageData): Promise<Blob> {
  const canvas = makeCanvas(imgData.width, imgData.height);
  canvas.getContext("2d")!.putImageData(imgData, 0, 0);
  return canvas.convertToBlob({ type: "image/webp", quality: 0.9 });
}

// Framing for the display crop: headroom above the hair, down to roughly the
// chest, with generous padding on every side. The panel cover-fits this rect
// into the (tall) key-face cells, so the margins guarantee the whole face
// survives whatever the cell's aspect ratio turns out to be.
const HEADROOM = 0.6;   // extra space above the box top, in face-heights
const CHEST = 1.4;      // extra space below the box bottom, in face-heights
const SIDE_PAD = 0.7;   // extra space left/right of the box, in face-widths

interface PixelRect { sx: number; sy: number; sw: number; sh: number; }

// Pixel crop rect for a detection, clamped to the image bounds.
function cropRect(bitmap: ImageBitmap, det: DetectedFace): PixelRect {
  const faceW = det.x2 - det.x1;
  const faceH = det.y2 - det.y1;
  const left = det.x1 - faceW * SIDE_PAD;
  const right = det.x2 + faceW * SIDE_PAD;
  const top = det.y1 - faceH * HEADROOM;
  const bottom = det.y2 + faceH * CHEST;
  const sx = Math.max(0, left);
  const sy = Math.max(0, top);
  const sw = Math.min(bitmap.width, right) - sx;
  const sh = Math.min(bitmap.height, bottom) - sy;
  return { sx, sy, sw, sh };
}

// Small crop used solely to measure focus — never displayed.
function sharpnessCrop(bitmap: ImageBitmap, r: PixelRect): ImageData {
  const w = SHARP_CROP_W;
  const h = Math.max(1, Math.round((w * r.sh) / r.sw));
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, r.sx, r.sy, r.sw, r.sh, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}


// Eye-openness proxy: luminance contrast (stddev / mean) of a small patch around
// each eye landmark. An open eye has dark iris/pupil against sclera + skin; a
// closed or blurred eye is a smooth lid. Returns the larger of the two eyes so
// a single winking/occluded eye doesn't read as closed. Heuristic, not a model.
function eyeContrast(bitmap: ImageBitmap, det: DetectedFace): number {
  if (!det.landmarks) return 0;
  const side = Math.max(8, (det.x2 - det.x1) * 0.22);
  const N = 24;
  let best = 0;
  for (const [ex, ey] of det.landmarks.slice(0, 2)) {
    const c = makeCanvas(N, N);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, ex - side, ey - side * 0.7, side * 2, side * 1.4, 0, 0, N, N);
    const d = ctx.getImageData(0, 0, N, N).data;
    let sum = 0, sum2 = 0;
    for (let i = 0; i < N * N; i++) {
      const g = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      sum += g; sum2 += g * g;
    }
    const mean = sum / (N * N);
    const sd = Math.sqrt(Math.max(0, sum2 / (N * N) - mean * mean));
    best = Math.max(best, mean > 1 ? sd / mean : 0);
  }
  return best;
}

// ── Per-image processing ──────────────────────────────────────────────────────
async function processImage(index: number, bitmap: ImageBitmap) {
  const dets = await detectFaces(bitmap);
  const rects: FaceRect[] = [];
  let blurred = 0;
  for (const det of dets) {
    if (det.score < VIS_THRESH || !det.landmarks) continue;
    const r = cropRect(bitmap, det);

    // One sharpness measure on a small focus crop. Blurry faces are still
    // reported (so the UI can flag them) but excluded from clustering below.
    const sharp = computeSharpness(sharpnessCrop(bitmap, r));
    const isBlurred = sharp < SHARPNESS_MIN;
    if (isBlurred) blurred++;
    // Fractions of the image so the panel can crop the full-res photo itself.
    // x/y/w/h = padded head+chest crop; fx/fy/fw/fh = the tight face box.
    rects.push({
      x: r.sx / bitmap.width,
      y: r.sy / bitmap.height,
      w: r.sw / bitmap.width,
      h: r.sh / bitmap.height,
      fx: det.x1 / bitmap.width,
      fy: det.y1 / bitmap.height,
      fw: (det.x2 - det.x1) / bitmap.width,
      fh: (det.y2 - det.y1) / bitmap.height,
      ar: bitmap.width / bitmap.height,
      sharp,
      eyeContrast: eyeContrast(bitmap, det),
    });

    if (isBlurred) continue;
    if (det.score < MIN_EMBED_SCORE) continue;
    const aligned = alignFace(bitmap, det.landmarks);
    let embedding: Float32Array;
    try {
      embedding = await embedFace(aligned);
    } catch (e) {
      console.warn(`embed failed on image ${index}:`, e);
      continue;
    }
    const ga = await classifyGenderAge(aligned);
    const ctx = aligned.getContext("2d")!;
    collected.push({
      imageIndex: index,
      score: det.score,
      embedding,
      aligned: ctx.getImageData(0, 0, ARCFACE_SIZE, ARCFACE_SIZE),
      gender: ga?.gender,
      age: ga?.age,
    });
  }

  // Stream this image's key faces immediately so KeyFacesPanel populates
  // without waiting for the rest of the album.
  if (rects.length) {
    post({ type: "imageFaces", index, rects });
  }
  log(`image ${index}: ${dets.length} detections → ${rects.length} kept, ${blurred} blurred (sharp<${SHARPNESS_MIN})`);
  bitmap.close();
}

// ── Finalize: cluster + build subjects ────────────────────────────────────────
async function finalize() {
  const clusters = clusterFaces(collected);
  log(`finalize: ${collected.length} embedded faces → ${clusters.length} people`);
  const subjects: WorkerSubject[] = [];
  const imageMap = new Map<number, number[]>();

  for (let id = 0; id < clusters.length; id++) {
    const members = clusters[id];
    const faces = members.map((m) => collected[m]);

    // Key face = sharpest/highest-confidence member.
    const key = faces.reduce((best, f) => (f.score > best.score ? f : best), faces[0]);
    const keyFaceBlob = await imageDataToBlob(key.aligned);

    // Aggregate demographics across the cluster.
    const genders = faces.map((f) => f.gender).filter(Boolean) as Array<"Male" | "Female">;
    const males = genders.filter((g) => g === "Male").length;
    const gender = genders.length ? (males * 2 >= genders.length ? "Male" : "Female") : undefined;
    const ages = faces.map((f) => f.age).filter((a): a is number => a != null);
    const age = ages.length ? median(ages) : undefined;

    const appearances = faces.map((f) => ({ imageIndex: f.imageIndex, score: f.score }));
    const uniqueImages = new Set(faces.map((f) => f.imageIndex));

    subjects.push({
      id,
      keyFaceBlob,
      photoCount: uniqueImages.size,
      appearances,
      gender,
      age,
      category: categoryFor(gender, age),
    });

    for (const imgIdx of uniqueImages) {
      const arr = imageMap.get(imgIdx) ?? [];
      arr.push(id);
      imageMap.set(imgIdx, arr);
    }
  }

  post({ type: "result", subjects, imageMap: Array.from(imageMap.entries()) });
}

// ── Message loop ──────────────────────────────────────────────────────────────
let totalToProcess = 0;
let doneProcessing = 0;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "load": {
        if (detectSession) { log("models already loaded"); post({ type: "loaded" }); return; }
        post({ type: "status", message: "Starting ONNX runtime…" });
        log("loading ONNX runtime /ort/ort.min.js …");
        await ensureOrt();
        log("ONNX runtime ready · v", ort?.env?.versions?.common ?? "?");
        const opts = { executionProviders: ["wasm"], graphOptimizationLevel: "all" as const };
        post({ type: "status", message: "Loading detection model…" });
        log("loading RetinaFace /models/retinaface.onnx …");
        detectSession = await ort.InferenceSession.create("/models/retinaface.onnx", opts);
        anchors = generateAnchors(INPUT_H, INPUT_W);
        log(`RetinaFace ready · ${anchors.length} anchors · in:[${detectSession.inputNames}] out:[${detectSession.outputNames}]`);
        post({ type: "status", message: "Loading recognition model…" });
        log("loading ArcFace /models/arcface.onnx …");
        arcSession = await ort.InferenceSession.create("/models/arcface.onnx", opts);
        log(`ArcFace ready · in:[${arcSession.inputNames}] out:[${arcSession.outputNames}]`);
        post({ type: "status", message: "Loading gender/age model…" });
        try {
          genderSession = await ort.InferenceSession.create("/models/genderage.onnx", opts);
          log(`genderage ready · in:[${genderSession.inputNames}] out:[${genderSession.outputNames}]`);
        } catch (e) {
          console.warn("[face:worker] genderage unavailable — categories disabled:", e);
          genderSession = null;
        }
        log("all models loaded");
        post({ type: "loaded" });
        break;
      }
      case "detect": {
        totalToProcess = Math.max(totalToProcess, msg.index + 1);
        await processImage(msg.index, msg.bitmap);
        doneProcessing++;
        post({ type: "progress", done: doneProcessing, total: totalToProcess });
        break;
      }
      case "finalize": {
        await finalize();
        break;
      }
      case "reset": {
        collected.length = 0;
        totalToProcess = 0;
        doneProcessing = 0;
        break;
      }
    }
  } catch (err) {
    console.error("[face:worker] error handling", msg.type, err);
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};

log("worker booted; awaiting load");
