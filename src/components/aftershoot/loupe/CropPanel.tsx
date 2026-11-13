import { useState } from "react";
import {
  ChevronDown,
  Eye,
  FlipHorizontal,
  FlipVertical,
  Lock,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { IconTooltip } from "../IconTooltip";
import { RangeSlider } from "../primitives";

export function CropPanel() {
  const [aspect, setAspect] = useState("Free");
  const [overlay, setOverlay] = useState("Thirds");
  const [straightening, setStraightening] = useState(45); // 0-100; midpoint = 0 deg

  // Map slider 0-100 to -45..+45 degrees for the readout.
  const degrees = ((straightening - 50) / 50) * 45;

  return (
    <div className="flex flex-col gap-3">
      <Section title="Crop">
        <Row label="Aspect Ratio">
          <div className="flex items-center gap-1.5">
            <InlineDropdown value={aspect} onSelect={setAspect} options={["Free", "1:1", "3:2", "4:3", "16:9"]} />
            <IconButton title="Lock orientation">
              <Lock className="h-3 w-3" strokeWidth={1.5} />
            </IconButton>
          </div>
        </Row>

        <Row label="Straightening">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1">
              <RangeSlider value={straightening} onChange={setStraightening} />
            </div>
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-neutral-300">
              {degrees > 0 ? "+" : ""}
              {degrees.toFixed(1)}
            </span>
          </div>
        </Row>

        <Row label="Crop Overlay">
          <InlineDropdown
            value={overlay}
            onSelect={setOverlay}
            options={["Thirds", "Golden Ratio", "Grid", "Diagonal", "None"]}
          />
        </Row>
      </Section>

      <div className="h-px bg-white/5" />

      <Section title="Rotate & Flop">
        <div className="flex items-center gap-1">
          <RotateButton title="Rotate left">
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
          </RotateButton>
          <RotateButton title="Rotate right">
            <RotateCw className="h-4 w-4" strokeWidth={1.5} />
          </RotateButton>
          <RotateButton title="Flip horizontal">
            <FlipHorizontal className="h-4 w-4" strokeWidth={1.5} />
          </RotateButton>
          <RotateButton title="Flip vertical">
            <FlipVertical className="h-4 w-4" strokeWidth={1.5} />
          </RotateButton>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[12px] font-semibold text-white"
        >
          <ChevronDown
            className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
            strokeWidth={1.75}
          />
          {title}
        </button>
        <div className="flex items-center gap-1">
          <IconButton title="Toggle visibility">
            <Eye className="h-3 w-3" strokeWidth={1.5} />
          </IconButton>
          <IconButton title="Reset section">
            <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
      {open && <div className="flex flex-col gap-2">{children}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[88px] shrink-0 text-[11px] text-neutral-400">{label}</span>
      <div className="flex flex-1 items-center justify-end">{children}</div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded text-neutral-500 hover:bg-white/5 hover:text-neutral-200"
    >
      {children}
    </button>
  );
  return title ? <IconTooltip label={title}>{btn}</IconTooltip> : btn;
}

function RotateButton({ children, title }: { children: React.ReactNode; title?: string }) {
  const btn = (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded border border-white/10 text-neutral-300 hover:bg-white/[0.04] hover:text-white"
    >
      {children}
    </button>
  );
  return title ? <IconTooltip label={title}>{btn}</IconTooltip> : btn;
}

function InlineDropdown({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-white hover:bg-white/[0.04]"
      >
        {value}
        <ChevronDown className="h-3 w-3 text-neutral-400" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 overflow-hidden rounded border border-white/10 bg-[#1c1c1c] shadow-xl">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
              className={`flex h-7 w-full min-w-[120px] items-center px-2.5 text-left text-[11px] text-white hover:bg-white/[0.06] ${
                opt === value ? "bg-white/[0.06]" : ""
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
