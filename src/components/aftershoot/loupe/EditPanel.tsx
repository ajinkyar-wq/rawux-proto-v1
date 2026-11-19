import { SliderScopeContext, useHistoryChoice, useHistorySlider } from "../history/album-history";
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CaretDown, Eye, Eyedropper } from "@phosphor-icons/react";
import { IconTooltip } from "../IconTooltip";
import { useWbPickerActive, wbPicker } from "./wb-picker";
import { GradientSlider, ResetLabel, SliderRow, type Gradient } from "./slider-primitives";
import { ToneCurve } from "./ToneCurve";
import { FlyoutPanel, useFlyout } from "./Flyout";
import { useFlag } from "../feature-flags";
import {
  AIProfilesBrowser,
  AI_PROFILE_NAMES,
  createPreset,
  NOTHING_APPLIED,
  PRESETS_BROWSER_ID,
  PresetsBrowser,
  PRESET_NAMES,
} from "./BrowsePanels";

const COLOR_PROFILES = ["Adobe Portrait", "Adobe Standard", "Adobe Vivid", "Camera Standard"];
// "Custom" (last, so stored indices don't shift) is set by the eyedropper.
const WB_PROFILES = ["As Shot", "Auto", "Daylight", "Cloudy", "Shade", "Tungsten", "Custom"];

export function EditPanel() {
  const [preset, setPreset] = useHistoryChoice("Preset", PRESET_NAMES, "Cinematic C1");
  const [aiProfile, setAiProfile] = useHistoryChoice(
    "AI Profile",
    AI_PROFILE_NAMES,
    "True to Life",
  );
  const [colorProfile, setColorProfile] = useHistoryChoice(
    "Color Profile",
    COLOR_PROFILES,
    "Adobe Portrait",
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Color Profile dropdown, then the applied AI Profile and Preset as
          underlined links (click to change). No header: the Histogram sits
          right above these rows. */}
      <section className="flex flex-col gap-3 pb-1">
        <InlineSelectRow
          label="Color Profile"
          value={colorProfile}
          defaultValue="Adobe Portrait"
          options={COLOR_PROFILES}
          onChange={setColorProfile}
        />
        <InlineSelectRow
          label="AI Profiles"
          value={aiProfile}
          options={AI_PROFILE_NAMES}
          onChange={setAiProfile}
          variant="link"
          browse={{
            id: "aiProfiles",
            title: "AI Profiles",
            emptyLabel: "Select AI Profile",
            render: (v, pick) => <AIProfilesBrowser value={v} onPick={pick} />,
          }}
        />
        <InlineSelectRow
          label="Presets"
          value={preset}
          options={PRESET_NAMES}
          onChange={setPreset}
          variant="link"
          browse={{
            id: PRESETS_BROWSER_ID,
            title: "Presets",
            onCreate: createPreset,
            createLabel: "Create preset",
            emptyLabel: "Select Preset",
            render: (v, pick) => <PresetsBrowser value={v} onPick={pick} />,
          }}
        />
      </section>

      <Section title="White Balance">
        <WBProfileRow />
        {/* As Shot: 5000K / +10 — what Reset / double-click go back to. */}
        <SliderRow
          label="Temperature"
          gradient="temperature"
          initial={50}
          asShot={50}
          max={10000}
        />
        <SliderRow label="Tint" gradient="tint" initial={55} asShot={55} />
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

      <Section title="Curves">
        <ToneCurve />
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
type BrowseSpec = {
  id: string;
  title: string;
  render: (value: string, onPick: (v: string) => void) => React.ReactNode;
  /** Shown instead of the value when nothing is applied, e.g. "Select Preset". */
  emptyLabel?: string;
  /** The stored value that means "nothing applied" (default "None"). */
  emptyValue?: string;
  /** Header "+": creates a preset and returns its name (applied right away). */
  onCreate?: () => string | null;
  createLabel?: string;
};

export function InlineSelectRow({
  label,
  value,
  options,
  onChange,
  labelUppercase = false,
  variant = "select",
  browse,
  defaultValue,
}: {
  label: string;
  value: string;
  /** Off this value, hovering the label offers "Reset" back to it. */
  defaultValue?: string;
  options: string[];
  onChange: (v: string) => void;
  labelUppercase?: boolean;
  // "link": underlined value, no chevron (applied AI Profile / Preset).
  variant?: "select" | "link";
  // Instead of a dropdown, open a browse panel left of the side panel.
  browse?: BrowseSpec;
}) {
  const [open, setOpen] = useState(false);
  const flyout = useFlyout(browse?.id ?? "");
  const browseOn = useFlag("browsePanels");
  const useBrowse = !!browse && flyout.available && browseOn;
  // A browse row with the flag off does nothing on click.
  const inert = !!browse && !useBrowse;
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
      <ResetLabel
        label={label}
        canReset={defaultValue !== undefined && value !== defaultValue}
        onReset={() => defaultValue !== undefined && onChange(defaultValue)}
        textClassName={`text-neutral-400 ${
          labelUppercase ? "font-semibold uppercase tracking-wider" : ""
        }`}
      />
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => {
            if (inert) return;
            if (useBrowse) flyout.toggle();
            else setOpen((v) => !v);
          }}
          aria-expanded={useBrowse ? flyout.open : open}
          className={
            variant === "link"
              ? `text-[12px] underline underline-offset-[3px] hover:text-white ${
                  useBrowse && flyout.open
                    ? "text-white decoration-white"
                    : "text-neutral-200 decoration-neutral-400"
                }`
              : "flex items-center gap-1 text-[12px] text-neutral-200 hover:text-white"
          }
        >
          {/* Nothing applied: a muted prompt ("Select Preset") instead of the value. */}
          {value === (browse?.emptyValue ?? NOTHING_APPLIED) ? (
            <span className="text-neutral-500">{browse?.emptyLabel ?? "Select"}</span>
          ) : (
            value
          )}
          {variant === "select" && (
            <CaretDown
              size={12}
              weight="light"
              className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>
        {useBrowse && flyout.open && browse && (
          <FlyoutPanel
            slot={flyout.slot}
            title={browse.title}
            onClose={flyout.close}
            addLabel={browse.createLabel}
            onAdd={
              browse.onCreate
                ? () => {
                    const name = browse.onCreate?.();
                    if (name) onChange(name);
                  }
                : undefined
            }
          >
            {browse.render(value, onChange)}
          </FlyoutPanel>
        )}
        {open && !useBrowse && !inert && (
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
  const [wb, setWb] = useHistoryChoice("WB Profile", WB_PROFILES, "As Shot");
  const picking = useWbPickerActive();
  // Leaving the panel (tool / image switch) ends picking.
  useEffect(() => () => wbPicker.stop(), []);
  useEffect(() => {
    if (!picking) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && wbPicker.stop();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking]);
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <InlineSelectRow
          label="WB Profile"
          value={wb}
          options={WB_PROFILES}
          onChange={setWb}
          defaultValue="As Shot"
        />
      </div>
      <IconTooltip label={picking ? "Cancel white balance picker" : "White balance picker"}>
        <button
          type="button"
          aria-label="White balance picker"
          aria-pressed={picking}
          onClick={() => (picking ? wbPicker.stop() : wbPicker.start(() => setWb("Custom")))}
          className={`rounded p-0.5 ${
            picking
              ? "bg-white/10 text-white"
              : "text-neutral-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Eyedropper size={16} weight="light" />
        </button>
      </IconTooltip>
    </div>
  );
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
      <SliderScopeContext.Provider
        value={`Color Mixer · ${tab.charAt(0)}${tab.slice(1).toLowerCase()}`}
      >
        <div className="flex flex-col gap-3">
          {MIXER_COLORS.map((c) => (
            <MixerRow key={c.label} label={c.label} gradient={c.gradient} />
          ))}
        </div>
      </SliderScopeContext.Provider>
    </div>
  );
}

// Same history key and readout as before, now via SliderRow so it gets the
// shared slider interactions (hover focus, Reset label, double-click, ↑/↓).
function MixerRow({ label, gradient }: { label: string; gradient: Gradient }) {
  return <SliderRow label={label} gradient={gradient} />;
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
