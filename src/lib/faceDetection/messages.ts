// Message protocol shared between useFaceDetection (main thread) and
// faceWorker (web worker). Imported with `import type` only — this file
// contributes no runtime code to the worker bundle.
import type { ModelSubject, FaceRect } from "@/types/detection";

// Main thread → worker
export type WorkerRequest =
  | { type: "load" }
  | { type: "detect"; index: number; bitmap: ImageBitmap }
  | { type: "finalize" }
  | { type: "reset" };

// A subject as produced by the worker. Identical to ModelSubject except the
// key face travels back as a Blob; the hook turns it into an object URL.
export type WorkerSubject = Omit<ModelSubject, "keyFaceDataUrl"> & {
  keyFaceBlob: Blob;
};

// Worker → main thread
export type WorkerResponse =
  | { type: "status"; message: string }
  | { type: "loaded" }
  // Streamed per image as soon as it is processed — populates KeyFacesPanel
  // incrementally rather than waiting for the whole album. Rects are fractions
  // of the source image; the panel crops from the full-res photo itself.
  | { type: "imageFaces"; index: number; rects: FaceRect[] }
  | { type: "progress"; done: number; total: number }
  | {
      type: "result";
      subjects: WorkerSubject[];
      imageMap: Array<[number, number[]]>;
    }
  | { type: "error"; message: string };
