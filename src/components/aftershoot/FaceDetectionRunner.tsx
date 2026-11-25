import { useEffect, useMemo } from "react";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { SAMPLE_COUNT, sampleUrl } from "./cull-data";
import { setDetectedFaces } from "./faces";

// Runs the real face pipeline over the sample album's distinct photos and
// publishes the detected face rects to faces.ts. Mount it only once AI Cull has
// completed, so the ~16 MB of models load only when key faces are needed.
export function FaceDetectionRunner() {
  const images = useMemo(
    () => Array.from({ length: SAMPLE_COUNT }, (_, i) => ({ src: sampleUrl(i) })),
    [],
  );
  const { modelImageFaces } = useFaceDetection(images);
  useEffect(() => {
    setDetectedFaces(modelImageFaces);
  }, [modelImageFaces]);
  return null;
}
