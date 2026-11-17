import { useState } from "react";
import {
  Ban,
  ChevronDown,
  Contrast,
  CornerUpLeft,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { Dropdown } from "../primitives";
import { IconTooltip } from "../IconTooltip";
import { SliderRow } from "./slider-primitives";
import { useHistoryChoice } from "../history/album-history";

const BG_FILLS = ["Center Fill", "Stretch", "Tile", "Fit"];
const BLEND_MODES = ["Normal", "Multiply", "Screen", "Overlay", "Soft Light"];

type Preset = {
  id: string;
  label: string;
  // CSS background to render the swatch.
  swatch: string;
};

const PRESETS: Preset[] = [
  {
    id: "transparent",
    label: "Transparent",
    swatch: "repeating-conic-gradient(#cfcfcf 0% 25%, #ffffff 0% 50%) 50% / 12px 12px",
  },
  { id: "white", label: "White 01", swatch: "#ffffff" },
  { id: "black", label: "Black 01", swatch: "#0a0a0a" },
  { id: "red", label: "Red 01", swatch: "#4a1212" },
  { id: "blue", label: "Blue 01", swatch: "#2a6dde" },
  { id: "fabric", label: "Fabric 01", swatch: "#3a3a3a" },
  { id: "brown", label: "Brown 01", swatch: "#3a1d0a" },
  {
    id: "explore",
    label: "Explore M...",
    // 2x2 preview montage feel
    swatch:
      "linear-gradient(135deg, #777 50%, transparent 50%), linear-gradient(45deg, #3a6 50%, transparent 50%), #222",
  },
];

const PRESET_LABELS = PRESETS.map((p) => p.label);
const SHADOW_MODES = ["None", "Drop Shadow"];

export function BackgroundPanel() {
  const [fill, setFill] = useHistoryChoice("Fill", BG_FILLS, "Center Fill");
  // Stored by label so history reads "Background : Blue 01".
  const [presetLabel, setPresetLabel] = useHistoryChoice("Background", PRESET_LABELS, "Blue 01");
  const selectedPreset = PRESETS.find((p) => p.label === presetLabel)?.id ?? "blue";
  const setSelectedPreset = (id: string) =>
    setPresetLabel(PRESETS.find((p) => p.id === id)?.label ?? "Blue 01");
  const [shadowLabel, setShadowLabel] = useHistoryChoice("Shadow", SHADOW_MODES, "None");
  const shadowMode = shadowLabel === "None" ? "none" : "drop";
  const setShadowMode = (m: "none" | "drop") =>
    setShadowLabel(m === "none" ? "None" : "Drop Shadow");
  const [opacity, setOpacity] = useState(0);
  const [shadowBlur, setShadowBlur] = useState(0);
  const [blurRange, setBlurRange] = useState(0);
  const [gradient, setGradient] = useState(0);
  const [blendMode, setBlendMode] = useHistoryChoice("Blend Mode", BLEND_MODES, "Normal");

  return (
    <div className="flex flex-col gap-3">
      <ChangeBackground fill={fill} onFillChange={setFill} />
      <Presets selected={selectedPreset} onSelect={setSelectedPreset} />

      <div className="h-px bg-white/5" />

      <Shadows
        mode={shadowMode}
        onModeChange={setShadowMode}
        opacity={opacity}
        onOpacityChange={setOpacity}
        shadowBlur={shadowBlur}
        onShadowBlurChange={setShadowBlur}
        blurRange={blurRange}
        onBlurRangeChange={setBlurRange}
        gradient={gradient}
        onGradientChange={setGradient}
        blendMode={blendMode}
        onBlendModeChange={setBlendMode}
      />
    </div>
  );
}

/* --------------- Change Background section --------------- */

function ChangeBackground({
  fill,
  onFillChange,
}: {
  fill: string;
  onFillChange: (v: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel label="CHANGE BACKGROUND" trailing={<ResetIconButton />} />

      <Dropdown value={fill} options={BG_FILLS} onChange={onFillChange} size="sm" />

      <div className="grid grid-cols-3 gap-2">
        <MetricChip icon={<Maximize2 className="h-3 w-3" strokeWidth={1.75} />} value="100" />
        <MetricChip icon={<CornerUpLeft className="h-3 w-3" strokeWidth={1.75} />} value="0" />
        <MetricChip icon={<Contrast className="h-3 w-3" strokeWidth={1.75} />} value="100%" />
      </div>

      <div className="flex items-center gap-2">
        <MetricChip icon={<RotateCw className="h-3 w-3" strokeWidth={1.75} />} value="0°" />
        <TinyIconButton title="Flip horizontal">
          <FlipHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
        </TinyIconButton>
        <TinyIconButton title="Flip vertical">
          <FlipVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
        </TinyIconButton>
        <TinyIconButton title="Reset transform">
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
        </TinyIconButton>
      </div>

      <BackgroundPreview />
    </section>
  );
}

function BackgroundPreview() {
  // Position adjustment area — the one element in the section that needs
  // breathing room. Keep it tall while the surrounding chips stay compact.
  return (
    <div className="relative aspect-[2/1] rounded border border-white/10 bg-[#1f1f1f]">
      {/* Crosshairs */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
    </div>
  );
}

/* --------------- Aftershoot Backgrounds (with inline upload tile) --------------- */

function Presets({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel label="AFTERSHOOT BACKGROUNDS" />
      <div className="grid grid-cols-5 gap-2">
        {/* Upload tile sits inline as the first cell — no separate section. */}
        <IconTooltip label="Upload background">
          <button type="button" className="flex flex-col items-center gap-1">
            <span className="flex aspect-[4/3] w-full items-center justify-center rounded border border-dashed border-white/15 text-neutral-400 hover:border-white/25 hover:bg-white/[0.04] hover:text-white">
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="truncate text-[10px] text-neutral-400">Upload</span>
          </button>
        </IconTooltip>

        {PRESETS.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`aspect-[4/3] w-full rounded border ${
                  active ? "border-white" : "border-white/10"
                }`}
                style={{
                  background: p.swatch,
                  backgroundSize: p.id === "transparent" ? "10px 10px" : undefined,
                }}
              />
              <span
                className={`truncate text-[10px] ${active ? "text-white" : "text-neutral-400"}`}
              >
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* --------------- Shadows --------------- */

function Shadows({
  mode,
  onModeChange,
  opacity,
  onOpacityChange,
  shadowBlur,
  onShadowBlurChange,
  blurRange,
  onBlurRangeChange,
  gradient,
  onGradientChange,
  blendMode,
  onBlendModeChange,
}: {
  mode: "none" | "drop";
  onModeChange: (m: "none" | "drop") => void;
  opacity: number;
  onOpacityChange: (v: number) => void;
  shadowBlur: number;
  onShadowBlurChange: (v: number) => void;
  blurRange: number;
  onBlurRangeChange: (v: number) => void;
  gradient: number;
  onGradientChange: (v: number) => void;
  blendMode: string;
  onBlendModeChange: (v: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel
        label="SHADOWS"
        trailing={
          <button className="rounded p-0.5 text-neutral-500 hover:text-white">
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-2">
        <ShadowMode
          active={mode === "none"}
          onClick={() => onModeChange("none")}
          label="None"
          swatchClassName="flex items-center justify-center bg-[#1f1f1f]"
        >
          <Ban className="h-3.5 w-3.5 text-neutral-400" strokeWidth={1.5} />
        </ShadowMode>
        <ShadowMode
          active={mode === "drop"}
          onClick={() => onModeChange("drop")}
          label="Drop Sha..."
          swatchClassName="bg-[#2a2a2a]"
        >
          {/* Tiny drop-shadow preview: a darker blob */}
          <span className="block h-full w-full rounded-[inherit] [background:radial-gradient(circle_at_70%_60%,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.15)_55%,transparent_70%)]" />
        </ShadowMode>
      </div>

      <ShadowRow label="Opacity" value={opacity} onChange={onOpacityChange} />
      <ShadowRow label="Shadow Blur" value={shadowBlur} onChange={onShadowBlurChange} />
      <ShadowRow label="Blur Range" value={blurRange} onChange={onBlurRangeChange} />
      <ShadowRow label="Gradient" value={gradient} onChange={onGradientChange} />

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[12px] text-[#777]">Blend Mode</span>
        <div className="w-[140px]">
          <Dropdown
            value={blendMode}
            options={BLEND_MODES}
            onChange={onBlendModeChange}
            size="sm"
          />
        </div>
      </div>
    </section>
  );
}

function ShadowMode({
  active,
  onClick,
  label,
  swatchClassName,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  swatchClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span
        className={`aspect-[4/3] w-full overflow-hidden rounded border ${
          active ? "border-white" : "border-white/10"
        } ${swatchClassName ?? ""}`}
      >
        {children}
      </span>
      <span className={`truncate text-[10px] ${active ? "text-white" : "text-neutral-400"}`}>
        {label}
      </span>
    </button>
  );
}

// Same slider row as Edit / Retouch (0–100, starts at 0).
function ShadowRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return <SliderRow label={label} initial={value} signed={false} onChange={onChange} />;
}

/* --------------- Shared bits --------------- */

function SectionLabel({ label, trailing }: { label: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold tracking-wider text-neutral-400">{label}</span>
      {trailing}
    </div>
  );
}

function ResetIconButton() {
  return (
    <IconTooltip label="Reset">
      <button className="rounded p-0.5 text-neutral-500 hover:text-white">
        <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
      </button>
    </IconTooltip>
  );
}

function MetricChip({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex h-6 items-center gap-1 rounded border border-white/10 bg-[#222] px-1.5 text-[10.5px] text-white">
      <span className="text-neutral-400">{icon}</span>
      {value}
    </div>
  );
}

function TinyIconButton({ children, title }: { children: React.ReactNode; title?: string }) {
  const btn = (
    <button
      type="button"
      className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-neutral-300 hover:bg-white/[0.04] hover:text-white"
    >
      {children}
    </button>
  );
  return title ? <IconTooltip label={title}>{btn}</IconTooltip> : btn;
}
