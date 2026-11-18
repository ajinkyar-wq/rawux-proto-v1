import { useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";

// Floating, draggable image info card over the loupe canvas, opened from the
// ⓘ next to the filename in the bottom bar. Starts top-left; drag it anywhere
// inside the canvas and it reopens where you left it. Metadata is mocked per image
// (stable for the same image).

const CAMERAS = [
  { body: "NIKON D6", lens: "VR 70-200mm f/2.8G", focal: [70, 135, 200] },
  { body: "SONY ILCE-1", lens: "FE 24-70mm F2.8 GM II", focal: [24, 35, 50, 70] },
  { body: "Canon EOS R5", lens: "RF 85mm F1.2 L USM", focal: [85] },
];
const SHUTTERS = ["1/3200", "1/1000", "1/500", "1/250", "1/125", "1/60"];
const APERTURES = ["f/1.2", "f/2", "f/2.8", "f/4", "f/5.6", "f/8"];
const ISOS = [100, 200, 400, 640, 800, 1600];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function metaFor(image: number) {
  const r = (n: number, salt: number) => (image * 2654435761 + salt * 40503) % n;
  const cam = CAMERAS[r(CAMERAS.length, 1)];
  const pad = (v: number) => String(v).padStart(2, "0");
  return {
    shutter: SHUTTERS[r(SHUTTERS.length, 2)],
    aperture: APERTURES[r(APERTURES.length, 3)],
    iso: ISOS[r(ISOS.length, 4)],
    focal: cam.focal[r(cam.focal.length, 5)],
    body: cam.body,
    lens: cam.lens,
    time: `${pad(9 + r(9, 6))}:${pad(r(60, 7))}:${pad(r(60, 8))}`,
    date: `${MONTHS[r(12, 9)]} ${1 + r(28, 10)}, 2024`,
    size: "2560x1707",
    bytes: `${(400 + r(600, 11) + r(100, 12) / 100).toFixed(2)} KB`,
  };
}

const MARGIN = 12;
// Last position (px from the canvas's top-left), kept for this session.
let savedPos = { x: MARGIN, y: MARGIN };

export function ImageInfoCard({
  image,
  name,
  onClose,
}: {
  image: number;
  name: string;
  onClose: () => void;
}) {
  const m = metaFor(image);
  const dot = <span className="text-neutral-500">•</span>;
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPosState] = useState(savedPos);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const setPos = (p: { x: number; y: number }) => {
    savedPos = p;
    setPosState(p);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // don't pan / crop the image underneath
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const card = cardRef.current;
    const box = card?.parentElement;
    if (!d || !card || !box) return;
    // Keep the whole card inside the canvas.
    const maxX = box.clientWidth - card.offsetWidth - MARGIN;
    const maxY = box.clientHeight - card.offsetHeight - MARGIN;
    setPos({
      x: Math.min(Math.max(MARGIN, e.clientX - d.dx), Math.max(MARGIN, maxX)),
      y: Math.min(Math.max(MARGIN, e.clientY - d.dy), Math.max(MARGIN, maxY)),
    });
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Image info"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{ left: pos.x, top: pos.y }}
      className={`absolute z-30 w-max max-w-[calc(100%-24px)] touch-none select-none rounded-lg bg-[#141414]/75 px-3.5 py-3 text-neutral-200 ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-white hover:text-neutral-200"
          title="Show in folder"
        >
          <span className="truncate underline underline-offset-[3px]">{name}</span>
          <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Close image info"
          onClick={onClose}
          className="rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 whitespace-nowrap text-[12.5px] text-white">
        <span>{m.shutter}</span>
        {dot}
        <span>{m.aperture}</span>
        {dot}
        <span>ISO {m.iso}</span>
        {dot}
        <span>{m.focal} mm</span>
      </div>

      <div className="my-2.5 h-px bg-white/10" />
      <div className="flex flex-col gap-1 text-[11.5px] text-neutral-300">
        <span>{m.body}</span>
        <span>{m.lens}</span>
      </div>

      <div className="my-2.5 h-px bg-white/10" />
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-neutral-300">
        <span>{m.time}</span>
        {dot}
        <span>{m.date}</span>
        {dot}
        <span>{m.size}</span>
        {dot}
        <span>{m.bytes}</span>
      </div>
    </div>
  );
}
