import { useContext, useState } from "react";
import { ChevronDown, Heart, Search } from "lucide-react";
import { SliderHistoryContext, useHistorySlider } from "../history/album-history";
import { photoUrl } from "../cull-data";
import { GradientSlider } from "./slider-primitives";

// Content of the browse flyouts opened from the underlined values in the
// loupe Edit / Retouch panels. Picking an item calls onPick (a history step);
// the flyout stays open so you can keep comparing.

type Card = { name: string; fav?: boolean };
type Group = { title: string; items: Card[] };

// Cards preview the photo open in the loupe, each with a rough CSS take on
// its look (B&W film stocks go grey, warm looks warm, etc.).
const LOOKS = [
  "saturate(1.25) contrast(1.08)",
  "sepia(0.25) saturate(1.1) brightness(1.03)",
  "contrast(1.15) saturate(0.85)",
  "hue-rotate(-8deg) saturate(1.15) brightness(1.05)",
  "brightness(1.08) contrast(0.92) saturate(0.9)",
  "sepia(0.12) contrast(1.05) brightness(0.97)",
];
const lookFilter = (name: string) => {
  if (/hp5|ilford|b&w|matte/i.test(name)) return "grayscale(1) contrast(1.1)";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LOOKS[h % LOOKS.length];
};

function useLoupePhoto() {
  const where = useContext(SliderHistoryContext);
  return photoUrl(where?.image ?? 0, 400);
}

/* ------------------------------ Data ------------------------------ */

const AI_PROFILE_GROUPS: Group[] = [
  {
    title: "True to Life",
    items: [
      { name: "True to Life", fav: true },
      { name: "Brownies", fav: true },
      { name: "Casablanca" },
      { name: "Kreate Naturell" },
    ],
  },
  {
    title: "Bold and Vibrant",
    items: [
      { name: "Cinematic Summer" },
      { name: "Sondra La Ray", fav: true },
      { name: "Fujifilm Pro 400H", fav: true },
      { name: "Fujifilm Pro 400H Warm" },
      { name: "Ilford HP5" },
      { name: "Ilford HP5 Plus" },
    ],
  },
  {
    title: "Butter Pecan",
    items: [
      { name: "Ektar 100" },
      { name: "Ektar 100 Soft" },
      { name: "Lemon Zest" },
      { name: "Bold Punch" },
    ],
  },
];

const PRESET_GROUPS: Group[] = [
  {
    title: "Yours",
    items: [
      { name: "Enhance Portrait" },
      { name: "Cinematic C1" },
      { name: "Portra 800", fav: true },
      { name: "Portra 400" },
    ],
  },
  {
    title: "Portraits: Edgy",
    items: [
      { name: "Edgy Portrait" },
      { name: "Hard Light" },
      { name: "Grit 800" },
      { name: "Street Contrast" },
    ],
  },
  {
    title: "Seasons : Spring",
    items: [
      { name: "Fuji 400H Spring" },
      { name: "Fuji 400H Soft" },
      { name: "HP5 Plus Spring" },
      { name: "HP5 Matte" },
    ],
  },
];

const RETOUCH_PRESET_ITEMS: Card[] = [
  { name: "Face Pop" },
  { name: "Glare Reduction" },
  { name: "Student Portraits" },
  { name: "Face Clean Up" },
  { name: "Anti Aging" },
  { name: "Wedding Radiance" },
  { name: "Glamour Finish" },
  { name: "Hair Clean Up" },
  { name: "NewBorn Shoots" },
  { name: "Pro Headshots" },
  { name: "Most Used Sliders" },
];

// Option lists for the history store (index = stored value — keep order).
export const AI_PROFILE_NAMES = AI_PROFILE_GROUPS.flatMap((g) => g.items.map((i) => i.name));
export const PRESET_NAMES = PRESET_GROUPS.flatMap((g) => g.items.map((i) => i.name));
export const PRESETS_BROWSER_ID = "presets";
export const RETOUCH_PRESET_NONE = "Retouch Preset";
export const RETOUCH_PRESET_NAMES = [
  RETOUCH_PRESET_NONE,
  ...RETOUCH_PRESET_ITEMS.map((i) => i.name),
];

/* ------------------------------ Shared bits ------------------------------ */

function useFavorites(groups: Group[]) {
  const [favs, setFavs] = useState(
    () => new Set(groups.flatMap((g) => g.items.filter((i) => i.fav).map((i) => i.name))),
  );
  const toggle = (name: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  return { favs, toggle };
}

function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-4 px-4">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`-mb-px border-b pb-1.5 text-[11px] font-semibold uppercase tracking-wider ${
            t === value
              ? "border-white text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function GroupHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-300"
    >
      <span
        className={`inline-block border-x-[4px] border-t-[5px] border-x-transparent border-t-neutral-400 transition-transform ${
          open ? "" : "-rotate-90"
        }`}
      />
      {title}
    </button>
  );
}

function HeartButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={on ? "Remove from favorites" : "Add to favorites"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="shrink-0 text-neutral-300 hover:text-white"
    >
      <Heart
        className={`h-3.5 w-3.5 ${on ? "fill-[#e5484d] text-[#e5484d]" : ""}`}
        strokeWidth={1.75}
      />
    </button>
  );
}

function ThumbCard({
  item,
  selected,
  fav,
  onPick,
  onFav,
}: {
  item: Card;
  selected: boolean;
  fav: boolean;
  onPick: () => void;
  onFav: () => void;
}) {
  const photo = useLoupePhoto();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick()}
      className={`group relative aspect-[11/10] cursor-pointer overflow-hidden rounded ${
        selected ? "ring-2 ring-[#3b5bff]" : "hover:ring-1 hover:ring-white/30"
      }`}
    >
      <img
        src={photo}
        alt=""
        className="h-full w-full object-cover"
        style={{ filter: lookFilter(item.name) }}
        draggable={false}
      />
      <div
        className={`absolute inset-x-0 bottom-0 flex h-6 items-center gap-1 px-2 ${
          selected ? "bg-[#3b5bff]" : "bg-black/55"
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-[11px] text-white">{item.name}</span>
        {!selected && <HeartButton on={fav} onClick={onFav} />}
      </div>
    </div>
  );
}

function CardGroups({
  groups,
  value,
  onPick,
  favs,
  onFav,
  renderAfterSelected,
}: {
  groups: Group[];
  value: string;
  onPick: (name: string) => void;
  favs: Set<string>;
  onFav: (name: string) => void;
  renderAfterSelected?: () => React.ReactNode;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {groups.map((g) => {
        const open = !closed.has(g.title);
        // Pairs of cards per row, so a selected card's extra row (Amount)
        // can sit directly under its pair.
        const rows: Card[][] = [];
        for (let i = 0; i < g.items.length; i += 2) rows.push(g.items.slice(i, i + 2));
        return (
          <section key={g.title} className="flex flex-col gap-2.5">
            <GroupHeader
              title={g.title}
              open={open}
              onToggle={() =>
                setClosed((prev) => {
                  const next = new Set(prev);
                  if (next.has(g.title)) next.delete(g.title);
                  else next.add(g.title);
                  return next;
                })
              }
            />
            {open &&
              rows.map((row, ri) => (
                <div key={ri} className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    {row.map((item) => (
                      <ThumbCard
                        key={item.name}
                        item={item}
                        selected={item.name === value}
                        fav={favs.has(item.name)}
                        onPick={() => onPick(item.name)}
                        onFav={() => onFav(item.name)}
                      />
                    ))}
                  </div>
                  {renderAfterSelected &&
                    row.some((i) => i.name === value) &&
                    renderAfterSelected()}
                </div>
              ))}
          </section>
        );
      })}
    </div>
  );
}

function FilterButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-7 min-w-0 items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-2 text-[11px] text-neutral-300 hover:bg-white/[0.07]"
    >
      {children}
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={1.75} />
    </button>
  );
}

/* ------------------------------ AI Profiles ------------------------------ */

export function AIProfilesBrowser({
  value,
  onPick,
}: {
  value: string;
  onPick: (name: string) => void;
}) {
  const [tab, setTab] = useState<"Marketplace" | "Yours">("Marketplace");
  const { favs, toggle } = useFavorites(AI_PROFILE_GROUPS);
  const groups =
    tab === "Marketplace"
      ? AI_PROFILE_GROUPS
      : [
          {
            title: "Favorites",
            items: AI_PROFILE_GROUPS.flatMap((g) => g.items).filter((i) => favs.has(i.name)),
          },
        ];
  return (
    <>
      <Tabs tabs={["Marketplace", "Yours"] as const} value={tab} onChange={setTab} />
      <div className="flex shrink-0 gap-2 px-4 py-3">
        <FilterButton>
          <span className="truncate">
            <span className="text-neutral-500">Wedding: </span>True to Life
          </span>
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-black">
            2
          </span>
        </FilterButton>
        <FilterButton>Type</FilterButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CardGroups groups={groups} value={value} onPick={onPick} favs={favs} onFav={toggle} />
      </div>
    </>
  );
}

/* ------------------------------ Presets ------------------------------ */

export function PresetsBrowser({
  value,
  onPick,
}: {
  value: string;
  onPick: (name: string) => void;
}) {
  const [tab, setTab] = useState<"Recommended" | "Yours">("Recommended");
  const { favs, toggle } = useFavorites(PRESET_GROUPS);
  const groups =
    tab === "Recommended"
      ? PRESET_GROUPS
      : [
          {
            title: "Favorites",
            items: PRESET_GROUPS.flatMap((g) => g.items).filter((i) => favs.has(i.name)),
          },
        ];
  return (
    <>
      <Tabs tabs={["Recommended", "Yours"] as const} value={tab} onChange={setTab} />
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        <CardGroups
          groups={groups}
          value={value}
          onPick={onPick}
          favs={favs}
          onFav={toggle}
          renderAfterSelected={() => <PresetAmount />}
        />
      </div>
    </>
  );
}

// Amount for the applied preset (0–100), shown under its card row.
function PresetAmount() {
  const amount = useHistorySlider("Preset Amount", 50, (v) => String(Math.round(v)));
  return (
    <div className="flex flex-col gap-1.5 pb-1">
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span>Amount</span>
        <span className="tabular-nums">{Math.round(amount.value)}</span>
      </div>
      <GradientSlider
        value={amount.value}
        onChange={amount.onChange}
        onCommit={amount.onCommit}
        centered={false}
      />
    </div>
  );
}

/* --------------------------- Retouching Presets --------------------------- */

export function RetouchPresetsBrowser({
  value,
  onPick,
}: {
  value: string;
  onPick: (name: string) => void;
}) {
  const [tab, setTab] = useState<"Recommended" | "Yours">("Recommended");
  const [query, setQuery] = useState("");
  const { favs, toggle } = useFavorites([{ title: "", items: RETOUCH_PRESET_ITEMS }]);
  const items = RETOUCH_PRESET_ITEMS.filter(
    (i) =>
      (tab === "Recommended" || favs.has(i.name)) &&
      i.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="shrink-0 px-4 pb-3">
        <label className="flex h-8 items-center gap-2 rounded bg-white/[0.06] px-2.5 text-neutral-500 focus-within:ring-1 focus-within:ring-white/20">
          <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Presets"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-neutral-500"
          />
        </label>
      </div>
      <Tabs tabs={["Recommended", "Yours"] as const} value={tab} onChange={setTab} />
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="px-4 py-6 text-center text-[12px] text-neutral-500">No presets found</p>
        )}
        {items.map((item) => {
          const selected = item.name === value;
          return (
            <div
              key={item.name}
              role="button"
              tabIndex={0}
              onClick={() => onPick(item.name)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(item.name)}
              className={`flex cursor-pointer items-center gap-2 border-b border-white/[0.05] px-4 py-3 ${
                selected ? "bg-[#2b3242]" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                <span className="truncate text-[12.5px] text-neutral-200">{item.name}</span>
                <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10.5px] text-neutral-200">
                  All Subjects
                </span>
              </div>
              <HeartButton on={favs.has(item.name)} onClick={() => toggle(item.name)} />
            </div>
          );
        })}
      </div>
    </>
  );
}
