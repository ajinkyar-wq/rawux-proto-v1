import { SliderScopeContext } from "../history/album-history";
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CaretDown, Eye } from "@phosphor-icons/react";
import { GradientSlider, SliderRow, type Gradient } from "./slider-primitives";

const PRESETS = [
  "Cinematic C1",
  "Soft Skin",
  "Moody",
  "Bright & Airy",
  "Vintage Film",
  "B&W Classic",
];
const AI_PROFILES = ["True to Life", "Lemon Zest", "Bold Punch", "Cinematic"];
const COLOR_PROFILES = ["Adobe Portrait", "Adobe Standard", "Adobe Vivid", "Camera Standard"];
const WB_PROFILES = ["As Shot", "Auto", "Daylight", "Cloudy", "Shade", "Tungsten"];

export function EditPanel() {
  const [preset, setPreset] = useState("Cinematic C1");
  const [aiProfile, setAiProfile] = useState("True to Life");
  const [colorProfile, setColorProfile] = useState("Adobe Portrait");

  return (
    <div className="flex flex-col gap-3">
      {/* EDIT: Color Profile dropdown, then the applied AI Profile and
          Preset as underlined links (click to change). */}
      <section className="flex flex-col gap-3 pb-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
          Edit
        </h2>
        <InlineSelectRow
          label="Color Profile"
          value={colorProfile}
          options={COLOR_PROFILES}
          onChange={setColorProfile}
        />
        <InlineSelectRow
          label="AI Profiles"
          value={aiProfile}
          options={AI_PROFILES}
          onChange={setAiProfile}
          variant="link"
        />
        <InlineSelectRow
          label="Presets"
          value={preset}
          options={PRESETS}
          onChange={setPreset}
          variant="link"
        />
      </section>

      <Section title="White Balance">
        <WBProfileRow />
        <SliderRow label="Temperature" gradient="temperature" initial={50} max={10000} />
        <SliderRow label="Tint" gradient="tint" initial={55} />
      </Section>

      <Section title="Light">
        <SliderRow label="Exposure" />
        <SliderRow label="Contrast" />
        <SliderRow label="Highlights" />
        <SliderRow label="Shadows" initial={75} />
        <SliderRow label="Whites" initial={75} />
        <SliderRow label="Blacks" initial={75} />
      </Section>

      <Section title="Presence">
        <SliderRow label="Texture" initial={60} />
        <SliderRow label="Clarity" initial={55} />
        <SliderRow label="Dehaze" initial={35} />
        <SliderRow label="Vibrance" gradient="rainbow" initial={75} />
        <SliderRow label="Saturation" gradient="rainbow" initial={0} />
      </Section>

      <Section title="Curves" comingSoon>
        <CurvesEditor />
      </Section>

      <Section title="Color Mixer">
        <ColorMixer />
      </Section>

      <Section title="Color Grading">
        <ColorGrading />
      </Section>

      <Section title="Detail">
        <Subsection title="SHARPENING">
          <SliderRow label="Amount" />
          <SliderRow label="Radius" />
          <SliderRow label="Detail" />
          <SliderRow label="Masking" />
        </Subsection>
        <Subsection title="MANUAL NOISE REDUCTION">
          <SliderRow label="Luminance" />
          <SliderRow label="Detail" disabled />
          <SliderRow label="Contrast" disabled />
          <SliderRow label="Color" />
          <SliderRow label="Detail" disabled />
          <SliderRow label="Smoothness" disabled />
        </Subsection>
      </Section>

      <Section title="Calibration">
        <Subsection title="SHADOWS">
          <SliderRow label="Tint" gradient="shadowTint" />
        </Subsection>
        <Subsection title="RED PRIMARY">
          <SliderRow label="Hue" gradient="redPrimaryHue" />
          <SliderRow label="Saturation" gradient="redPrimarySat" />
        </Subsection>
        <Subsection title="GREEN PRIMARY">
          <SliderRow label="Hue" gradient="greenPrimaryHue" />
          <SliderRow label="Saturation" gradient="greenPrimarySat" />
        </Subsection>
        <Subsection title="BLUE PRIMARY">
          <SliderRow label="Hue" gradient="bluePrimaryHue" />
          <SliderRow label="Saturation" gradient="bluePrimarySat" />
        </Subsection>
      </Section>
    </div>
  );
}

// A row with a muted label on the left and a borderless dropdown (bold white
// value + chevron) right-aligned. Matches the PRESET / Color Profile rows in
// the reference — the value opens a real options menu on click.
function InlineSelectRow({
  label,
  value,
  options,
  onChange,
  labelUppercase = false,
  variant = "select",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  labelUppercase?: boolean;
  // "link": underlined value, no chevron (applied AI Profile / Preset).
  variant?: "select" | "link";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={`text-[12px] text-neutral-400 ${
          labelUppercase ? "font-semibold uppercase tracking-wider" : ""
        }`}
      >
        {label}
      </span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            variant === "link"
              ? "text-[12px] text-neutral-200 underline decoration-neutral-400 underline-offset-[3px] hover:text-white"
              : "flex items-center gap-1 text-[12px] text-neutral-200 hover:text-white"
          }
        >
          {value}
          {variant === "select" && (
            <CaretDown
              size={12}
              weight="light"
              className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>
        {open && (
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded border border-white/10 bg-[#1c1c1c] shadow-xl">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex h-8 w-full items-center px-2.5 text-left text-[12px] text-white hover:bg-white/[0.06] ${
                  opt === value ? "bg-white/[0.06]" : ""
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WBProfileRow() {
  const [wb, setWb] = useState("As Shot");
  return <InlineSelectRow label="WB Profile" value={wb} options={WB_PROFILES} onChange={setWb} />;
}

/* ----------------- Section / Subsection ----------------- */

export function Section({
  title,
  children,
  comingSoon = false,
  first = false,
}: {
  title: string;
  children: React.ReactNode;
  comingSoon?: boolean;
  first?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`flex flex-col gap-3 ${first ? "" : "border-t border-white/5 pt-3"}`}>
      <div className="flex h-6 items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-neutral-200"
        >
          <CaretDown
            size={12}
            weight="fill"
            className={`text-neutral-400 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          {title}
        </button>
        {comingSoon ? (
          <span className="rounded-md bg-[#222] px-2 py-1 text-[12px] font-medium text-neutral-200">
            Coming Soon
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="Toggle visibility"
              className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
            >
              <Eye size={16} weight="light" />
            </button>
            <button
              type="button"
              title="Reset section"
              className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
            >
              <ArrowCounterClockwise size={16} weight="light" />
            </button>
          </div>
        )}
      </div>
      {open && !comingSoon && (
        <SliderScopeContext.Provider value={title}>
          <div className="flex flex-col gap-3">{children}</div>
        </SliderScopeContext.Provider>
      )}
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-[10px] font-semibold tracking-wider text-neutral-500">{title}</span>
      <SliderScopeContext.Provider value={title.charAt(0) + title.slice(1).toLowerCase()}>
        <div className="flex flex-col gap-3">{children}</div>
      </SliderScopeContext.Provider>
    </div>
  );
}

/* ----------------- Curves editor ----------------- */

type CurveChannel = "master" | "red" | "green" | "blue";
const CHANNEL_COLOR: Record<CurveChannel, string> = {
  master: "#ffffff",
  red: "#ff5151",
  green: "#3acf5b",
  blue: "#3b8bff",
};

function CurvesEditor() {
  const [channel, setChannel] = useState<CurveChannel>("master");
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {(["master", "red", "green", "blue"] as CurveChannel[]).map((c) => {
          const active = c === channel;
          const color = CHANNEL_COLOR[c];
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full"
              style={
                c === "master"
                  ? {
                      background: active ? "white" : "transparent",
                      border: active ? "none" : "1px solid white",
                    }
                  : {
                      borderColor: color,
                      borderWidth: 1,
                      background: active ? color : "transparent",
                    }
              }
              title={c}
            >
              {c === "master" && active && <span className="block h-1 w-1 rounded-full bg-black" />}
            </button>
          );
        })}
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded border border-white/5 bg-[#141414]">
        {/* 4x4 grid lines */}
        {[1, 2, 3].map((i) => (
          <div
            key={`v${i}`}
            className="absolute top-0 bottom-0 w-px bg-white/[0.06]"
            style={{ left: `${(i * 100) / 4}%` }}
          />
        ))}
        {[1, 2, 3].map((i) => (
          <div
            key={`h${i}`}
            className="absolute left-0 right-0 h-px bg-white/[0.06]"
            style={{ top: `${(i * 100) / 4}%` }}
          />
        ))}
        {/* Histogram (placeholder mountainous shape) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <path
            d="M0,100 L4,86 L9,72 L13,62 L16,68 L20,58 L24,46 L28,40 L33,55 L38,46 L43,40 L48,50 L52,46 L58,52 L62,46 L66,52 L70,46 L74,52 L78,60 L82,70 L86,84 L90,90 L94,94 L100,100 Z"
            fill="rgba(255,255,255,0.18)"
          />
        </svg>
        {/* Diagonal curve line */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <line
            x1="0"
            y1="100"
            x2="100"
            y2="0"
            stroke="white"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Endpoint readouts */}
        <div className="absolute right-1 bottom-1 flex gap-1 text-[10px] tabular-nums text-neutral-400">
          <span>16.5</span>
          <span>32.0</span>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Color Mixer ----------------- */

type MixerTab = "HUE" | "SATURATION" | "LUMINANCE" | "ALL";

const MIXER_COLORS: { label: string; gradient: Gradient }[] = [
  { label: "Red", gradient: "red" },
  { label: "Orange", gradient: "orange" },
  { label: "Yellow", gradient: "yellow" },
  { label: "Green", gradient: "green" },
  { label: "Aqua", gradient: "aqua" },
  { label: "Blue", gradient: "blue" },
  { label: "Purple", gradient: "purple" },
  { label: "Magenta", gradient: "magenta" },
];

function ColorMixer() {
  const [tab, setTab] = useState<MixerTab>("HUE");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-[10px] font-semibold tracking-wider">
        {(["HUE", "SATURATION", "LUMINANCE", "ALL"] as MixerTab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b px-0.5 pb-1 transition-colors ${
                active
                  ? "border-white text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        {MIXER_COLORS.map((c) => (
          <MixerRow key={c.label} label={c.label} gradient={c.gradient} />
        ))}
      </div>
    </div>
  );
}

function MixerRow({ label, gradient }: { label: string; gradient: Gradient }) {
  const [value, setValue] = useState(50);
  const display = Math.round(((value - 50) / 50) * 100);
  return (
    <div className="flex items-center">
      <span className="w-[106px] shrink-0 truncate text-[12px] text-[#777]">{label}</span>
      <div className="flex-1">
        <GradientSlider value={value} onChange={setValue} gradient={gradient} />
      </div>
      <span className="w-9 shrink-0 text-right text-[12px] font-medium tabular-nums text-[#777]">
        {display > 0 ? `+${display}` : display}
      </span>
    </div>
  );
}

/* ----------------- Color Grading ----------------- */

type GradingRange = "global" | "shadows" | "midtones" | "highlights" | "all";

const GRADING_RANGES: { key: GradingRange; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "shadows", label: "Shadows" },
  { key: "midtones", label: "Midtones" },
  { key: "highlights", label: "Highlights" },
  { key: "all", label: "All" },
];

function ColorGrading() {
  const [range, setRange] = useState<GradingRange>("midtones");
  const [showWheel, setShowWheel] = useState(true);

  return (
    <div className="flex flex-col gap-3">
      <RangePicker active={range} onChange={setRange} />

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wider text-neutral-500">
          {GRADING_RANGES.find((r) => r.key === range)?.label.toUpperCase()}
        </span>
        <button
          type="button"
          title="Toggle visibility"
          className="rounded p-0.5 text-neutral-500 hover:bg-white/5 hover:text-white"
        >
          <Eye size={12} weight="light" />
        </button>
      </div>

      <SliderRow label="Hue" gradient="rainbow" />
      <SliderRow label="Saturation" gradient="red" />
      <SliderRow label="Luminance" />

      <button
        type="button"
        onClick={() => setShowWheel((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-white"
      >
        <CaretDown
          size={12}
          weight="light"
          className={`transition-transform ${showWheel ? "" : "-rotate-90"}`}
        />
        <span className="h-3 w-3 rounded-sm bg-neutral-500" />
      </button>

      {showWheel && <ColorWheel />}

      <SliderRow label="Blending" initial={100} />
      <SliderRow label="Balance" />
    </div>
  );
}

function RangePicker({
  active,
  onChange,
}: {
  active: GradingRange;
  onChange: (v: GradingRange) => void;
}) {
  // 5 small circles representing tonal ranges. The first 4 are filled/hollow
  // discs; the 5th ("all") is a tri-dot cluster.
  return (
    <div className="flex items-center gap-2">
      {GRADING_RANGES.slice(0, 4).map((r) => (
        <RangeDot
          key={r.key}
          active={r.key === active}
          variant={r.key}
          onClick={() => onChange(r.key)}
          title={r.label}
        />
      ))}
      <span className="mx-0.5 h-3 w-px bg-white/10" />
      <button
        type="button"
        onClick={() => onChange("all")}
        title="All"
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          active === "all" ? "" : "opacity-60 hover:opacity-100"
        }`}
      >
        <span className="grid grid-cols-2 gap-px">
          <span className="block h-1 w-1 rounded-full bg-neutral-400" />
          <span className="block h-1 w-1 rounded-full bg-neutral-400" />
          <span className="col-span-2 mx-auto block h-1 w-1 rounded-full bg-neutral-400" />
        </span>
      </button>
    </div>
  );
}

function RangeDot({
  variant,
  active,
  onClick,
  title,
}: {
  variant: GradingRange;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  // Each circle hints at its tonal range:
  //   global    — empty / hollow (no fill)
  //   shadows   — solid dark
  //   midtones  — solid light
  //   highlights — half-fill
  const inner = (() => {
    switch (variant) {
      case "global":
        return <span className="block h-3 w-3 rounded-full border border-neutral-500" />;
      case "shadows":
        return (
          <span className="block h-3 w-3 rounded-full border border-neutral-500 bg-neutral-700" />
        );
      case "midtones":
        return (
          <span className="block h-3 w-3 rounded-full border border-neutral-500 bg-neutral-100" />
        );
      case "highlights":
        return (
          <span
            className="block h-3 w-3 rounded-full border border-neutral-500"
            style={{
              background: "linear-gradient(90deg, #2a2a2a 50%, #f5f5f5 50%)",
            }}
          />
        );
      default:
        return null;
    }
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-4 w-4 items-center justify-center rounded-full ${
        active
          ? "ring-1 ring-white ring-offset-1 ring-offset-[#1a1a1a]"
          : "opacity-70 hover:opacity-100"
      }`}
    >
      {inner}
    </button>
  );
}

function ColorWheel() {
  const SIZE = 200; // px
  const HANDLE = 10; // px
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // normalized 0..1 from top-left
  const wheelRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientXY = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) {
      // Clamp to the circle's edge.
      const k = radius / dist;
      dx *= k;
      dy *= k;
    }
    setPos({
      x: (dx + radius) / rect.width,
      y: (dy + radius) / rect.width,
    });
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (draggingRef.current) updateFromClientXY(e.clientX, e.clientY);
    };
    const handleUp = () => {
      draggingRef.current = false;
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return (
    <div className="flex justify-center py-1">
      <div
        ref={wheelRef}
        onMouseDown={(e) => {
          draggingRef.current = true;
          updateFromClientXY(e.clientX, e.clientY);
        }}
        className="relative cursor-pointer select-none rounded-full"
        style={{
          width: SIZE,
          height: SIZE,
          background:
            // Hue ring (conic) + radial fade from saturated edge to neutral centre.
            "radial-gradient(circle at center, rgba(180,180,180,1) 0%, rgba(180,180,180,0) 65%), conic-gradient(from 90deg, #ff3a3a, #f5a524, #e0c81f, #3acf5b, #3acfcf, #4a8bff, #8b3aff, #c14ad6, #ff3a3a)",
        }}
      >
        {/* Handle */}
        <div
          className="absolute rounded-full border-2 border-white bg-transparent shadow"
          style={{
            width: HANDLE,
            height: HANDLE,
            left: `calc(${pos.x * 100}% - ${HANDLE / 2}px)`,
            top: `calc(${pos.y * 100}% - ${HANDLE / 2}px)`,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
          }}
        />
      </div>
    </div>
  );
}
