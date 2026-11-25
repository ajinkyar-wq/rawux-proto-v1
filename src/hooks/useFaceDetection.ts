import { useEffect, useRef, useState, useCallback, useMemo } from "react";
/** Minimal image shape the hook needs: a fetchable URL. */
type AlbumImage = { src: string };
import type { ModelSubject, FaceRect } from "@/types/detection";
import type { WorkerRequest, WorkerResponse, WorkerSubject } from "@/lib/faceDetection/messages";

export interface FaceDetectionResult {
  modelSubjects: ModelSubject[];
  modelImageMap: Map<number, number[]>;
  modelImageFaces: Map<number, FaceRect[]>; // imageIndex → face crop rects (fractions of the source image)
  isLoadingModel: boolean;
  isDetecting: boolean;
  statusMessage: string;
  detectionProgress: number; // 0–100
  rerun: () => void;
}

const EMPTY_MAP = new Map<number, number[]>();
const EMPTY_FACES = new Map<number, FaceRect[]>();
const log = (...args: unknown[]) => console.log("[face:hook]", ...args);

export function useFaceDetection(images: AlbumImage[]): FaceDetectionResult {
  const [modelSubjects, setModelSubjects] = useState<ModelSubject[]>([]);
  const [modelImageMap, setModelImageMap] = useState<Map<number, number[]>>(EMPTY_MAP);
  const [modelImageFaces, setModelImageFaces] = useState<Map<number, FaceRect[]>>(EMPTY_FACES);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [runSignal, setRunSignal] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const objectUrlsRef = useRef<string[]>([]);
  // Resolves with the next worker message matching `predicate`.
  const waitersRef = useRef<Array<{ match: (m: WorkerResponse) => boolean; resolve: (m: WorkerResponse) => void; reject: (e: Error) => void }>>([]);

  const rerun = useCallback(() => setRunSignal((s) => s + 1), []);

  // Re-run only when the set/order of images changes — NOT on every star or
  // color edit (those replace the array but keep the same sources).
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const imagesKey = useMemo(() => images.map((i) => i.src).join("|"), [images]);

  // Spawn the worker once and route its messages to status + pending waiters.
  useEffect(() => {
    log("spawning worker");
    const worker = new Worker(new URL("../lib/faceDetection/faceWorker.ts", import.meta.url), {
      type: "module",
      name: "face-detection",
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "status") setStatusMessage(msg.message);
      // Streamed per-image faces — populate KeyFacesPanel as each image finishes.
      if (msg.type === "imageFaces") {
        setModelImageFaces((prev) => {
          const next = new Map(prev);
          next.set(msg.index, msg.rects);
          return next;
        });
        return;
      }
      // Deliver to the first matching waiter; errors reject every waiter.
      if (msg.type === "error") {
        console.error("[face:hook] worker reported error:", msg.message);
        const errs = waitersRef.current.splice(0);
        errs.forEach((w) => w.reject(new Error(msg.message)));
        return;
      }
      const idx = waitersRef.current.findIndex((w) => w.match(msg));
      if (idx !== -1) {
        const [w] = waitersRef.current.splice(idx, 1);
        w.resolve(msg);
      }
    };
    worker.onerror = (e) => {
      const errs = waitersRef.current.splice(0);
      errs.forEach((w) => w.reject(new Error(e.message || "worker error")));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      objectUrlsRef.current.forEach(URL.revokeObjectURL);
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    const images = imagesRef.current;
    if (!worker || images.length === 0) return;

    let cancelled = false;
    const waiters = waitersRef.current; // stable: only ever mutated, never reassigned
    const send = (req: WorkerRequest, transfer: Transferable[] = []) => worker.postMessage(req, transfer);
    const waitFor = (match: (m: WorkerResponse) => boolean) =>
      new Promise<WorkerResponse>((resolve, reject) => {
        waiters.push({ match, resolve, reject });
      });

    const run = async () => {
      try {
        log(`run start · ${images.length} images`);
        setModelSubjects([]);
        setModelImageFaces(EMPTY_FACES);
        objectUrlsRef.current.forEach(URL.revokeObjectURL);
        objectUrlsRef.current = [];

        setIsLoadingModel(true);
        send({ type: "reset" });
        send({ type: "load" });
        await waitFor((m) => m.type === "loaded");
        if (cancelled) return;
        setIsLoadingModel(false);

        setIsDetecting(true);
        setDetectionProgress(0);
        const total = images.length;
        for (let i = 0; i < total; i++) {
          if (cancelled) return;
          let bitmap: ImageBitmap;
          try {
            const blob = await (await fetch(images[i].src)).blob();
            bitmap = await createImageBitmap(blob);
          } catch (err) {
            console.warn(`face-detection: failed to load image ${i}`, err);
            continue;
          }
          send({ type: "detect", index: i, bitmap }, [bitmap]);
          await waitFor((m) => m.type === "progress" && (m as Extract<WorkerResponse, { type: "progress" }>).done >= i + 1);
          if (cancelled) return;
          setDetectionProgress(Math.round(((i + 1) / total) * 100));
        }

        send({ type: "finalize" });
        const result = (await waitFor((m) => m.type === "result")) as Extract<WorkerResponse, { type: "result" }>;
        if (cancelled) return;

        const subjects: ModelSubject[] = result.subjects.map((s: WorkerSubject) => {
          const url = URL.createObjectURL(s.keyFaceBlob);
          objectUrlsRef.current.push(url);
          const { keyFaceBlob, ...rest } = s;
          return { ...rest, keyFaceDataUrl: url };
        });
        setModelSubjects(subjects);
        setModelImageMap(new Map(result.imageMap));
        log(`run done · ${subjects.length} people`);
      } catch (err) {
        if (!cancelled) {
          console.error("[face:hook] detection failed:", err);
          setStatusMessage(err instanceof Error ? err.message : "Face detection failed");
        } else {
          log("run cancelled");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingModel(false);
          setIsDetecting(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      // Reject any in-flight waiters so the aborted run() unwinds.
      waiters.splice(0).forEach((w) => w.reject(new Error("cancelled")));
    };
  }, [imagesKey, runSignal]);

  return { modelSubjects, modelImageMap, modelImageFaces, isLoadingModel, isDetecting, statusMessage, detectionProgress, rerun };
}
