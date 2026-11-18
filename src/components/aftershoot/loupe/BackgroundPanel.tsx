import { useRef, useState, useSyncExternalStore } from "react";
import {
  FlipHorizontal2,
  FlipVertical2,
  Plus,
  RotateCcw,
  RotateCcwSquare,
  RotateCwSquare,
  Scan,
  X as XIcon,
} from "lucide-react";
import { Checkbox, Dropdown } from "../primitives";
import { IconTooltip } from "../IconTooltip";
import { SliderRow } from "./slider-primitives";
import { useHistoryChoice, useHistoryToggle, useHistoryValues } from "../history/album-history";

// Retouching → Background panel: Change Background (uploads + Aftershoot
// backgrounds), Controls (fill, scale / position / opacity, flip & rotate, a
// draggable position pad) and AI Shadows. Every change is an Undo step.

const BG_FILLS = ["Center Fill", "Stretch", "Tile", "Fit"];
const ROTATIONS = ["0°", "90°", "180°", "270°"] as const;

type Swatch = { label: string; css: string };

const BACKGROUNDS: Swatch[] = [
  {
    label: "Transparent",
    css: "repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 50% / 14px 14px",
  },
  { label: "White 01", css: "#ffffff" },
  { label: "Black 01", css: "radial-gradient(circle at 50% 45%, #262626 0%, #0d0d0d 80%)" },
  { label: "Red 01", css: "linear-gradient(135deg, #6e1515 0%, #3e0b0b 100%)" },
  { label: "Blue 01", css: "radial-gradient(circle at 50% 40%, #2f6fd0 0%, #1e4f9e 90%)" },
  {
    label: "Fabric 01",
    css: "repeating-linear-gradient(45deg, #3a3a3a 0 2px, #333 2px 4px), #353535",
  },
  { label: "Brown 01", css: "linear-gradient(135deg, #4d2410 0%, #2f160a 100%)" },
];

// Uploaded backgrounds are stored by name; reserve names so the history store
// (which keeps the option's index) can hold them.
const MAX_UPLOADS = 12;
const uploadName = (n: number) => `Upload ${n}`;
const BG_OPTIONS = [
  ...BACKGROUNDS.map((b) => b.label),
  ...Array.from({ length: MAX_UPLOADS }, (_, i) => uploadName(i + 1)),
];

// Uploads for this session (object URLs), shared by every panel instance.
const uploadListeners = new Set<() => void>();
let uploads: { name: string; url: string }[] = [];
function addUpload(file: File): string | null {
  if (uploads.length >= MAX_UPLOADS) return null;
  const name = uploadName(uploads.length + 1);
  uploads = [...uploads, { name, url: URL.createObjectURL(file) }];
  uploadListeners.forEach((l) => l());
  return name;
}
function useUploads() {
  return useSyncExternalStore(
    (l) => {
      uploadListeners.add(l);
      return () => uploadListeners.delete(l);
    },
    () => uploads,
    () => uploads,
  );
}

export function BackgroundPanel() {
  const [background, setBackground] = useHistoryChoice("Background", BG_OPTIONS, "Blue 01");
  const [fill, setFill] = useHistoryChoice("Fill", BG_FILLS, "Center Fill");
  const [flipH, setFlipH] = useHistoryToggle("Flip Horizontal", false);
  const [flipV, setFlipV] = useHistoryToggle("Flip Vertical", false);
  const [rotation, setRotation] = useHistoryChoice("Rotation", ROTATIONS, "0°");
  const [shadows, setShadows] = useHistoryToggle("AI Shadows", true);
  const position = useHistoryValues("Position", { x: 0, y: 0 }, (p) => `${p.x}, ${p.y}`);

  const rotate = (dir: 1 | -1) => {
    const i = ROTATIONS.indexOf(rotation as (typeof ROTATIONS)[number]);
    setRotation(ROTATIONS[(i + dir + ROTATIONS.length) % ROTATIONS.length]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionTitle>Change Background</SectionTitle>
        <IconTooltip label="Reset background">
          <button
            type="button"
            aria-label="Reset background"
            onClick={() => setBackground("Blue 01")}
            className="rounded p-0.5 text-neutral-400 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </IconTooltip>
      </div>

      <YourUploads selected={background} onSelect={setBackground} />

      <section className="flex flex-col gap-2.5">
        <Label>Aftershoot Backgrounds</Label>
        <div className="grid grid-cols-4 gap-x-2 gap-y-3">
          {BACKGROUNDS.map((b) => (
            <SwatchButton
              key={b.label}
              label={b.label}
              active={b.label === background}
              onClick={() => setBackground(b.label)}
            >
              <span className="block h-full w-full" style={{ background: b.css }} />
            </SwatchButton>
          ))}
          <SwatchButton label="Explore More" active={false} onClick={() => {}}>
            <span className="grid h-full w-full grid-cols-2 grid-rows-2">
              <span className="bg-gradient-to-br from-[#2a2a2a] to-[#0d0d0d]" />
              <span className="bg-gradient-to-br from-[#9a9a9a] to-[#5c5c5c]" />
              <span className="bg-[#2a63c4]" />
              <span className="bg-[#e3e3e3]" />
            </span>
          </SwatchButton>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <Label>Controls</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-2">
            <Dropdown value={fill} options={BG_FILLS} onChange={setFill} size="lg" />
            <div className="grid grid-cols-2 gap-2">
              <ValueChip icon={<Scan className="h-3.5 w-3.5" strokeWidth={1.5} />}>100</ValueChip>
              <ValueChip icon={<XIcon className="h-3.5 w-3.5" strokeWidth={1.5} />}>
                {position.value.x}
              </ValueChip>
              <ValueChip icon={<OpacityIcon />}>100 %</ValueChip>
              <ValueChip icon={<span className="text-[12px]">Y</span>}>
                {position.value.y}
              </ValueChip>
            </div>
            {/* Flip | Rotate in one bar, split by a thin divider. */}
            <div className="flex h-9 items-center justify-around rounded-md bg-[#262626] px-1">
              <ToolButton label="Flip horizontal" active={flipH} onClick={() => setFlipH(!flipH)}>
                <FlipHorizontal2 className="h-4 w-4" strokeWidth={1.5} />
              </ToolButton>
              <ToolButton label="Flip vertical" active={flipV} onClick={() => setFlipV(!flipV)}>
                <FlipVertical2 className="h-4 w-4" strokeWidth={1.5} />
              </ToolButton>
              <span className="h-4 w-px bg-white/15" />
              <ToolButton label="Rotate left" onClick={() => rotate(-1)}>
                <RotateCcwSquare className="h-4 w-4" strokeWidth={1.5} />
              </ToolButton>
              <ToolButton label="Rotate right" onClick={() => rotate(1)}>
                <RotateCwSquare className="h-4 w-4" strokeWidth={1.5} />
              </ToolButton>
            </div>
          </div>
          <PositionPad
            value={position.value}
            onChange={position.onChange}
            onCommit={position.onCommit}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={shadows} onChange={setShadows} />
          <SectionTitle>AI Shadows</SectionTitle>
        </label>
        <div className={shadows ? "" : "pointer-events-none opacity-40"}>
          <SliderRow label="Intensity" initial={50} signed={false} />
        </div>
      </section>
    </div>
  );
}

/* --------------------------- Your Uploads --------------------------- */

function YourUploads({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (name: string) => void;
}) {
  const list = useUploads();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="flex flex-col gap-2.5">
      <Label>Uploads</Label>
      <div className="grid grid-cols-4 gap-2">
        <IconTooltip label="Upload a background">
          <button
            type="button"
            aria-label="Upload a background"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[5/3] w-full items-center justify-center rounded border border-white/15 bg-white/[0.03] text-neutral-300 hover:border-white/30 hover:bg-white/[0.06] hover:text-white"
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </IconTooltip>
        {list.map((u) => (
          <button
            key={u.name}
            type="button"
            aria-label={u.name}
            onClick={() => onSelect(u.name)}
            className={`aspect-[5/3] w-full overflow-hidden rounded ${
              u.name === selected ? "ring-2 ring-white" : "ring-1 ring-white/10"
            }`}
          >
            <img src={u.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const name = addUpload(file);
          if (name) onSelect(name);
        }}
      />
    </section>
  );
}

/* --------------------------- Position pad --------------------------- */

// Drag the handle to move the background (x / y from -100 to 100; centre = 0).
function PositionPad({
  value,
  onChange,
  onCommit,
}: {
  value: { x: number; y: number };
  onChange: (v: { x: number; y: number }) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const toValue = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-100, Math.min(100, Math.round(v)));
    return {
      x: clamp(((e.clientX - r.left) / r.width) * 200 - 100),
      y: clamp(((e.clientY - r.top) / r.height) * 200 - 100),
    };
  };
  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Background position"
      aria-valuetext={`x ${value.x}, y ${value.y}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        onChange(toValue(e));
      }}
      onPointerMove={(e) => dragging && onChange(toValue(e))}
      onPointerUp={() => {
        setDragging(false);
        onCommit();
      }}
      onPointerCancel={() => {
        setDragging(false);
        onCommit();
      }}
      onDoubleClick={() => {
        onChange({ x: 0, y: 0 });
        onCommit();
      }}
      className="relative cursor-crosshair touch-none overflow-hidden rounded-md bg-[#262626]"
    >
      <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
      <span className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
      <span
        className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 bg-[#262626]"
        style={{ left: `${(value.x + 100) / 2}%`, top: `${(value.y + 100) / 2}%` }}
      />
    </div>
  );
}

/* --------------------------- Shared bits --------------------------- */

// Same as the section headers in the other loupe panels (WHITE BALANCE,
// LIGHT, FACE BLEMISH…): 12px semibold uppercase.
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[12px] font-semibold uppercase tracking-wider text-neutral-200">
      {children}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </span>
  );
}

function SwatchButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex min-w-0 flex-col items-start gap-1"
    >
      <span
        className={`block aspect-[5/3] w-full overflow-hidden rounded ${
          active
            ? "ring-[1.5px] ring-white ring-offset-2 ring-offset-[#1a1a1a]"
            : "ring-1 ring-white/10"
        }`}
      >
        {children}
      </span>
      <span
        className={`w-full truncate text-left text-[11px] ${active ? "text-white" : "text-neutral-400"}`}
      >
        {label}
      </span>
    </button>
  );
}

function ValueChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-9 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-[#262626] px-2 text-[13px] text-white">
      <span className="flex w-3.5 justify-center text-neutral-400">{icon}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

function ToolButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <IconTooltip label={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`rounded p-1 hover:text-white ${active ? "text-white" : "text-neutral-300"}`}
      >
        {children}
      </button>
    </IconTooltip>
  );
}

// Half-filled drop, the opacity icon in the design.
function OpacityIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
    >
      <path d="M8 1.8C8 1.8 3.2 7 3.2 10a4.8 4.8 0 0 0 9.6 0C12.8 7 8 1.8 8 1.8Z" />
      <path
        d="M8 1.8V14.8A4.8 4.8 0 0 1 3.2 10C3.2 7 8 1.8 8 1.8Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
