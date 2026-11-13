import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Flag, Star } from "lucide-react";
import { Divider } from "./primitives";
import { COLOR_NAME_TO_RATING, type ColorName } from "./rating";

// Filled star with the rating digit knocked out of its center via a mask,
// so the number reads as the background color showing through the star.
function NumberedStar({ value, active }: { value: number; active: boolean }) {
  const maskId = useId();
  const fill = active ? "#e5e5e5" : "#9a9a9a";
  return (
    <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" aria-hidden>
      <mask id={maskId}>
        <rect width="16" height="16" fill="white" />
        <text
          x="8"
          y="8.4"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="6.5"
          fontWeight="700"
          fill="black"
          fontFamily="inherit"
        >
          {value}
        </text>
      </mask>
      <path
        mask={`url(#${maskId})`}
        fill={fill}
        d="M8 1.2l1.95 3.95 4.36.63-3.15 3.07.74 4.34L8 11.16l-3.9 2.05.74-4.34L1.69 5.8l4.36-.63z"
      />
    </svg>
  );
}

// The five rating colors as swatches (green=5 … purple=1). Each toggles its
// corresponding rating filter, so swatches and stars stay in sync.
const COLOR_SWATCHES: { name: ColorName; value: string }[] = [
  { name: "green", value: "#3acf5b" },
  { name: "blue", value: "#3b8bff" },
  { name: "yellow", value: "#f5a524" },
  { name: "red", value: "#ff5151" },
  { name: "purple", value: "#8b3aff" },
];

type Align = "left" | "right";

// --- Capture Info: grouped sections, single value selectable -------------

type Group = { heading: string; options: string[] };

const CAPTURE_GROUPS: Group[] = [
  { heading: "CAMERA NAME", options: ["SONY", "Others"] },
  { heading: "CAMERA MODEL", options: ["ILCE-6100", "Others"] },
  { heading: "CAMERA SERIAL NO.", options: ["Others"] },
  { heading: "LENS MODEL", options: ["E PZ 16-50mm F3.5-5.6 OSS II", "Others"] },
  { heading: "LENS SERIAL NO.", options: ["Others"] },
  { heading: "PHOTOGRAPHER", options: ["Others"] },
];

const FILE_GROUPS: Group[] = [
  { heading: "FILE TYPE", options: ["All", "RAW", "JPEG"] },
  { heading: "ORIENTATION", options: ["All", "Landscape", "Portrait"] },
];

const OTHER_GROUPS: Group[] = [
  { heading: "WARNINGS", options: ["All", "With Warnings", "Without Warnings"] },
  { heading: "DUPLICATES", options: ["All", "With Duplicates", "Without Duplicates"] },
  { heading: "FACE", options: ["All", "With Faces", "Without Faces"] },
];

function GroupedMenu({ groups, showChecks }: { groups: Group[]; showChecks: boolean }) {
  // Track the selected option per group; default to "All" where present.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      groups.filter((g) => g.options.includes("All")).map((g) => [g.heading, "All"]),
    ),
  );

  return (
    <div className="py-1">
      {groups.map((group, gi) => (
        <div key={group.heading}>
          {gi > 0 && <div className="mx-2.5 my-1 border-t border-white/[0.06]" />}
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold tracking-wider text-neutral-500">
            {group.heading}
          </div>
          {group.options.map((opt) => {
            const isSelected = selected[group.heading] === opt;
            return (
              <button
                key={opt}
                onClick={() => setSelected((prev) => ({ ...prev, [group.heading]: opt }))}
                className="flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-[13px] text-neutral-200 hover:bg-white/[0.04]"
              >
                <span>{opt}</span>
                {showChecks && isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-neutral-200" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --- Dropdown shell: label button + popover with open/close handling -----

function Dropdown({
  label,
  align,
  width,
  children,
}: {
  label: React.ReactNode;
  align: Align;
  width: string;
  children: React.ReactNode;
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-7 items-center justify-center gap-1.5 rounded px-1.5 text-[12px] ${
          open ? "bg-white/10 text-neutral-100" : "text-neutral-300 hover:bg-white/5"
        }`}
      >
        <span className="flex items-center gap-1.5 whitespace-nowrap">{label}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 max-h-[70vh] overflow-y-auto rounded-md border border-white/10 bg-[#1c1c1c] shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

const EDIT_STATUS_GROUPS: Group[] = [
  { heading: "EDIT", options: ["All", "Edited", "Not Edited"] },
  { heading: "RETOUCH", options: ["All", "Retouched", "Not Retouched"] },
];

const SWATCH_LABEL: Record<ColorName, string> = {
  green: "Green",
  blue: "Blue",
  yellow: "Yellow",
  red: "Red",
  purple: "Purple",
};

const PEOPLE = [
  { id: "p1", name: "Person 1", count: 562, tint: "#8a6b5c" },
  { id: "p2", name: "Person 2", count: 560, tint: "#6f5a4e" },
  { id: "p3", name: "Person 3", count: 200, tint: "#9b7d68" },
  { id: "p4", name: "Person 4", count: 200, tint: "#7d6658" },
];

function Avatar({ tint, size = 18 }: { tint: string; size?: number }) {
  return (
    <span
      className="block shrink-0 rounded-full ring-1 ring-[#1a1a1a]"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 38%, #e2c2a8 0 26%, ${tint} 27%)`,
      }}
    />
  );
}

function CheckRow({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-[13px] text-neutral-200 hover:bg-white/[0.04]"
    >
      {children}
      {on && <Check className="ml-auto h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
    </button>
  );
}

type FlagState = "none" | "flagged" | "rejected";

// Filter cluster for the merged top bar: Pick / Reject flags · Ratings · Tags
// (color labels) · People · Edit Status · More (file type, orientation,
// capture info, other). Ratings and Tags both drive the shared rating filter
// (color ↔ rating), so they stay in sync with the grid and Cull Filters.
export function FilterControls({
  ratingFilter,
  onToggleRating,
}: {
  ratingFilter?: Set<number>;
  onToggleRating?: (rating: number) => void;
}) {
  const [flag, setFlag] = useState<FlagState>("none");
  const [people, setPeople] = useState<Set<string>>(new Set());
  // Local fallback when used uncontrolled.
  const [localRatings, setLocalRatings] = useState<Set<number>>(new Set());
  const ratings = ratingFilter ?? localRatings;
  const toggleRating =
    onToggleRating ??
    ((r: number) =>
      setLocalRatings((prev) => {
        const next = new Set(prev);
        if (next.has(r)) next.delete(r);
        else next.add(r);
        return next;
      }));

  const activeStars = [0, 1, 2, 3, 4, 5].filter((n) => ratings.has(n)).length;

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setFlag((f) => (f === "flagged" ? "none" : "flagged"))}
        aria-label="Picked"
        className={`flex h-7 w-7 items-center justify-center rounded ${
          flag === "flagged" ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <Flag className="h-[15px] w-[15px] fill-current text-neutral-200" strokeWidth={1.5} />
      </button>
      <button
        onClick={() => setFlag((f) => (f === "rejected" ? "none" : "rejected"))}
        aria-label="Rejected"
        className={`flex h-7 w-7 items-center justify-center rounded ${
          flag === "rejected" ? "bg-white/10" : "hover:bg-white/5"
        }`}
      >
        <Flag className="h-[15px] w-[15px] text-neutral-300" strokeWidth={1.5} />
      </button>

      <Divider />

      <Dropdown
        label={
          <>
            <Star className="h-3.5 w-3.5 fill-current text-neutral-400" strokeWidth={0} />
            Ratings
            {activeStars > 0 && <span className="text-neutral-500">{activeStars}</span>}
          </>
        }
        align="right"
        width="180px"
      >
        <div className="py-1">
          {[5, 4, 3, 2, 1, 0].map((n) => (
            <CheckRow key={n} on={ratings.has(n)} onClick={() => toggleRating(n)}>
              <NumberedStar value={n} active={ratings.has(n)} />
              {n === 0 ? "Unrated" : `${n} Star${n === 1 ? "" : "s"}`}
            </CheckRow>
          ))}
        </div>
      </Dropdown>

      <Divider />

      <Dropdown
        label={
          <>
            Tags
            <span className="flex">
              {COLOR_SWATCHES.slice(0, 3).map((c, i) => (
                <span
                  key={c.name}
                  className="h-3 w-3 rounded-full ring-1 ring-[#1a1a1a]"
                  style={{ backgroundColor: c.value, marginLeft: i ? -4 : 0 }}
                />
              ))}
            </span>
          </>
        }
        align="right"
        width="170px"
      >
        <div className="py-1">
          {COLOR_SWATCHES.map((c) => {
            const r = COLOR_NAME_TO_RATING[c.name];
            return (
              <CheckRow key={c.name} on={ratings.has(r)} onClick={() => toggleRating(r)}>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.value }} />
                {SWATCH_LABEL[c.name]}
              </CheckRow>
            );
          })}
        </div>
      </Dropdown>

      <Divider />

      <Dropdown
        label={
          <>
            People
            <span className="flex">
              {PEOPLE.slice(0, 3).map((p, i) => (
                <span key={p.id} style={{ marginLeft: i ? -6 : 0 }}>
                  <Avatar tint={p.tint} />
                </span>
              ))}
            </span>
          </>
        }
        align="right"
        width="200px"
      >
        <div className="py-1">
          {PEOPLE.map((p) => (
            <CheckRow
              key={p.id}
              on={people.has(p.id)}
              onClick={() =>
                setPeople((prev) => {
                  const next = new Set(prev);
                  if (next.has(p.id)) next.delete(p.id);
                  else next.add(p.id);
                  return next;
                })
              }
            >
              <Avatar tint={p.tint} size={22} />
              {p.name}
              <span className="text-neutral-500">{p.count}</span>
            </CheckRow>
          ))}
        </div>
      </Dropdown>

      <Divider />

      <Dropdown label="Edit Status" align="right" width="200px">
        <GroupedMenu groups={EDIT_STATUS_GROUPS} showChecks />
      </Dropdown>

      <Divider />

      <Dropdown label="More" align="right" width="280px">
        <GroupedMenu groups={[...FILE_GROUPS, ...CAPTURE_GROUPS, ...OTHER_GROUPS]} showChecks />
      </Dropdown>
    </div>
  );
}
