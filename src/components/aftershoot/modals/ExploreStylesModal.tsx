import { useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  Columns2,
  Crown,
  Download,
  SlidersHorizontal,
  X,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

type Style = {
  id: string;
  name: string;
  author: string;
  format: "RAW" | "JPEG";
  premium?: boolean;
  adjusted?: boolean;
  // Tailwind gradient classes used for the faux preview swatch.
  preview: string;
};

const RECOMMENDED: Style[] = [
  {
    id: "true-to-life",
    name: "True to Life",
    author: "By Aftershoot",
    format: "RAW",
    preview: "from-emerald-700 to-neutral-900",
  },
  {
    id: "brownies",
    name: "Brownies",
    author: "By Aftershoot",
    format: "RAW",
    preview: "from-amber-800 to-neutral-900",
  },
  {
    id: "graicard",
    name: "Graicard",
    author: "By Aftershoot",
    format: "RAW",
    preview: "from-sky-800 to-neutral-900",
  },
  {
    id: "editorial",
    name: "The Editorial",
    author: "By Ratta-Studio",
    format: "RAW",
    premium: true,
    preview: "from-rose-900 to-neutral-900",
  },
  {
    id: "jpeg-graicard",
    name: "JPEG Graicard",
    author: "By Aftershoot",
    format: "JPEG",
    adjusted: true,
    preview: "from-lime-800 to-neutral-900",
  },
  {
    id: "butter-pecan",
    name: "Butter Pecan",
    author: "By Aftershoot",
    format: "JPEG",
    preview: "from-orange-800 to-neutral-900",
  },
];

const CREATORS: Style[] = [
  {
    id: "cherie",
    name: "Chérie by ME...",
    author: "By Roots-Presets",
    format: "RAW",
    premium: true,
    preview: "from-fuchsia-900 to-neutral-900",
  },
  {
    id: "leo",
    name: "Leo",
    author: "By Esteban-Gil",
    format: "RAW",
    premium: true,
    preview: "from-indigo-900 to-neutral-900",
  },
  {
    id: "aurora",
    name: "Aurora",
    author: "By Mint-Studio",
    format: "RAW",
    preview: "from-teal-800 to-neutral-900",
  },
  {
    id: "noir",
    name: "Noir",
    author: "By Frame-Co",
    format: "RAW",
    premium: true,
    preview: "from-slate-700 to-neutral-900",
  },
];

const FILMSTRIP = Array.from({ length: 10 });

const MAX_COMPARE = 3;

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export function ExploreStylesModal({
  onClose,
  onBack,
  onPick,
}: {
  onClose: () => void;
  onBack: () => void;
  // Called with the chosen style's name when its Download / Select & Customize
  // button is pressed — advances to the Edit Settings form.
  onPick: (profile: string) => void;
}) {
  // Styles chosen for comparison, in click order. Capped at MAX_COMPARE.
  const [compare, setCompare] = useState<Style[]>([]);

  const toggleStyle = (style: Style) =>
    setCompare((prev) => {
      const exists = prev.some((s) => s.id === style.id);
      if (exists) return prev.filter((s) => s.id !== style.id);
      if (prev.length >= MAX_COMPARE) return prev; // ignore beyond the cap
      return [...prev, style];
    });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0e0e0e] text-neutral-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 px-5 py-3">
        <button
          onClick={onBack}
          className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <h2 className="text-[17px] font-semibold text-white">Explore Pre-built AI Styles</h2>
        <button
          onClick={onClose}
          className="ml-auto rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        {/* Left: preview + compare grid */}
        <div className="flex min-w-0 flex-1 flex-col px-4 pb-3">
          {compare.length === 0 ? (
            // Empty state: two equal panes at the TOP (capped height, not
            // stretched), a flexible spacer, then the filmstrip pinned at the
            // bottom — matching the app's layout.
            <>
              <div className="flex h-[420px] max-h-[55vh] shrink-0 gap-4 pt-1">
                <OriginalPane fill />
                <ComparePlaceholder />
              </div>
              <div className="min-h-0 flex-1" />
            </>
          ) : (
            // Selected state: original + each style as equal cards wrapping
            // into a 2-column grid, each with its own action button.
            <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-4 overflow-y-auto">
              <OriginalPane />
              {compare.map((s) => (
                <ComparePane
                  key={s.id}
                  style={s}
                  onRemove={() => toggleStyle(s)}
                  onApply={() => onPick(s.name)}
                />
              ))}
            </div>
          )}

          <Filmstrip />
        </div>

        {/* Right: styles panel */}
        <StylesPanel compare={compare} onToggle={toggleStyle} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preview panes                                                              */
/* -------------------------------------------------------------------------- */

function OriginalPane({ fill = false }: { fill?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={`flex items-center justify-center overflow-hidden rounded-lg bg-black ${
          fill ? "min-h-0 flex-1" : "aspect-[16/10]"
        }`}
      >
        <div className="h-full w-1/2 bg-gradient-to-br from-neutral-600 to-neutral-800" />
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="text-[13px] font-semibold text-white">Original image</span>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
          JPEG
        </span>
      </div>
      <span className="text-[11px] text-neutral-500">Album image</span>
    </div>
  );
}

function ComparePane({
  style,
  onRemove,
  onApply,
}: {
  style: Style;
  onRemove: () => void;
  onApply: () => void;
}) {
  return (
    <div className="group flex flex-col">
      <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-lg bg-black">
        <div className={`h-full w-1/2 bg-gradient-to-br ${style.preview}`} />
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-white">{style.name}</span>
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
              {style.format}
            </span>
          </div>
          <span className="block truncate text-[11px] text-neutral-500">{style.author}</span>
        </div>
        <button
          onClick={onApply}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-white/[0.08] px-3 text-[12px] font-medium text-white hover:bg-white/[0.14]"
        >
          {style.adjusted ? (
            <>
              Select &amp; Customize
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </>
          ) : (
            <>
              Download
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ComparePlaceholder() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg bg-[#1f1f1f] px-6 text-center">
      <Columns2 className="mb-3 h-6 w-6 text-neutral-300" strokeWidth={1.5} />
      <div className="text-[15px] font-semibold text-white">Compare AI Styles</div>
      <p className="mt-2 max-w-[260px] text-[12px] leading-relaxed text-neutral-400">
        Choose up to 3 AI Styles from the panel on the right, to compare against your original
        photo.
      </p>
    </div>
  );
}

function Filmstrip() {
  const [active, setActive] = useState(0);
  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto pt-3">
      {FILMSTRIP.map((_, i) => (
        <button
          key={i}
          onClick={() => setActive(i)}
          className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${
            active === i ? "border-white" : "border-transparent"
          }`}
        >
          <div className="h-full w-full bg-gradient-to-br from-neutral-600 to-neutral-800" />
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Right styles panel                                                         */
/* -------------------------------------------------------------------------- */

function StylesPanel({ compare, onToggle }: { compare: Style[]; onToggle: (s: Style) => void }) {
  const full = compare.length >= MAX_COMPARE;
  return (
    <div className="flex w-[360px] shrink-0 flex-col border-l border-white/5 bg-[#141414]">
      <div className="shrink-0 px-4 pt-3">
        <h3 className="text-[15px] font-semibold text-white">Compare up to 3 Styles</h3>
        <p className="mt-0.5 text-[11px] text-neutral-500">{compare.length} of 3 selected</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <StyleSection
          label="RECOMMENDED"
          styles={RECOMMENDED}
          compare={compare}
          full={full}
          onToggle={onToggle}
        />
        <StyleSection
          label="CREATORS"
          styles={CREATORS}
          compare={compare}
          full={full}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

function StyleSection({
  label,
  styles,
  compare,
  full,
  onToggle,
}: {
  label: string;
  styles: Style[];
  compare: Style[];
  full: boolean;
  onToggle: (s: Style) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold tracking-wider text-neutral-400"
      >
        <ChevronLeft
          className={`h-3.5 w-3.5 transition-transform ${open ? "-rotate-90" : "rotate-0"}`}
          strokeWidth={2}
        />
        {label}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3">
          {styles.map((s) => (
            <StyleCard
              key={s.id}
              style={s}
              selected={compare.some((c) => c.id === s.id)}
              disabled={full && !compare.some((c) => c.id === s.id)}
              onClick={() => onToggle(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StyleCard({
  style,
  selected,
  disabled,
  onClick,
}: {
  style: Style;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col overflow-hidden rounded-lg text-left transition-opacity ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      }`}
    >
      <div
        className={`relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gradient-to-br ${style.preview} ${
          selected ? "ring-2 ring-[#3b5bff]" : "ring-1 ring-white/10"
        }`}
      >
        {style.premium && (
          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50">
            <Crown className="h-3 w-3 text-amber-300" strokeWidth={2} />
          </span>
        )}
        {style.adjusted && (
          <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-white">
            <SlidersHorizontal className="h-3 w-3" strokeWidth={2} />
            Adjusted
          </span>
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3b5bff] px-1.5 text-[11px] font-semibold text-white">
            ✓
          </span>
        )}
      </div>
      <div className="px-0.5 pt-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate text-[13px] font-medium text-white">{style.name}</span>
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
            {style.format}
          </span>
        </div>
        <span className="block truncate text-[11px] text-neutral-500">{style.author}</span>
      </div>
    </button>
  );
}
