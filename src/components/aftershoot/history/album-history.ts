import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CULL_IMAGES } from "../cull-data";
import type { ViewMode } from "../Toolbar";
import type { LoupeRailKey } from "../loupe/loupe-rail-config";

// Prototype of the two history stacks from the History spec.
//
// Album-level Undo/Redo — one ordered stack of everything done in the album:
// image changes (single image or a multi-select batch from the grid) and
// navigation (switching images / views). Hidden; drives ⌘Z / ⇧⌘Z.
//
// Image-level History — the change entries that touched ONE image, shown in
// the loupe History panel (newest first, "Operation : Value").
//
// Changes are stored as value "effects" (image + key + prev/next) in a small
// per-image value store (star rating, slider positions, …). Undo applies the
// prev values, Redo the next ones, so ratings and sliders visibly revert.

export type UxMode = "ux1" | "ux2";

export type Tool = Extract<
  LoupeRailKey,
  "ai" | "edit" | "crop" | "mask" | "retouch" | "background" | "patch"
>;

export const TOOL_LABEL: Record<Tool, string> = {
  ai: "Culling",
  edit: "Editing",
  crop: "Crop",
  mask: "Masking",
  retouch: "Retouching",
  background: "Background",
  patch: "Object Removal",
};

export const VIEW_LABEL: Record<ViewMode, string> = {
  grid: "Grid",
  loupe: "Loupe",
  survey: "Survey",
};

export const imageName = (i: number) => CULL_IMAGES[i % CULL_IMAGES.length].name;

type Place = { view: ViewMode; image: number };

// A value change on one image. `undefined` = back to the default.
export type Effect = { image: number; key: string; prev?: number; next?: number };

export type AlbumEntry =
  | {
      id: string;
      kind: "change";
      op: string;
      value: string;
      // Where it happened — UX-1 Undo/Redo navigates back here.
      view: ViewMode;
      tool: Tool;
      // One image, or several for a grid multi-select batch / sync.
      images: number[];
      effects: Effect[];
    }
  | {
      id: string;
      kind: "nav";
      op: "View" | "Image";
      value: string;
      from: Place;
      to: Place;
    };

export type NewEntry = AlbumEntry extends infer T
  ? T extends AlbumEntry
    ? Omit<T, "id">
    : never
  : never;

let uid = 0;
const nextId = () => `h${++uid}`;

const vkey = (image: number, key: string) => `${image}|${key}`;

// ---- Slider keys & readouts (shared with the loupe slider rows) ----

export const sliderKey = (tool: Tool, scope: string, label: string) => `${tool}:${scope}/${label}`;

// The op name shown in history. Basic edit sections use the bare label
// ("Exposure"); everything else is prefixed with its section ("Teeth · Whiten").
const BARE_SCOPES = new Set(["White Balance", "Light", "Presence", ""]);
export const sliderOp = (scope: string, label: string) =>
  BARE_SCOPES.has(scope) ? label : `${scope} · ${label}`;

// Slider position (0-100) → the readout the panel shows.
export function sliderDisplay(pos: number, max = 100, signed = true) {
  if (!signed || max !== 100) return String(Math.round((pos / 100) * max));
  const d = Math.round(((pos - 50) / 50) * 100);
  return d > 0 ? `+${d}` : String(d);
}

export const RATING_KEY = "rating";
export const ratingLabel = (v: number) => (v ? `${v}★` : "Unrated");

// ---- Seeded session: covers every kind of history step ----
// Images 0-26. Ends back in Grid with DSC03014 selected (SEED_END).
// Where the seeded session leaves the user.
export const SEED_END = { view: "grid" as ViewMode, image: 14 };

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, k) => from + k);

// Every image in the album (matches the filmstrip / bottom bar "1 / 232").
const ALBUM_IMAGE_COUNT = 232;

// Earlier edits on every image, so each one has steps in its History panel.
// Deterministic per image (same steps every load): 4-7 changes drawn from the
// editing, crop, mask and retouch tools.
type PastOp =
  | {
      kind: "slide";
      tool: Tool;
      scope: string;
      label: string;
      max?: number;
      lo: number;
      hi: number;
    }
  | { kind: "set"; tool: Tool; op: string; key: string; values: string[] };
const PAST_OPS: PastOp[] = [
  { kind: "slide", tool: "edit", scope: "Light", label: "Exposure", lo: 42, hi: 64 },
  { kind: "slide", tool: "edit", scope: "Light", label: "Contrast", lo: 44, hi: 62 },
  { kind: "slide", tool: "edit", scope: "Light", label: "Highlights", lo: 24, hi: 48 },
  { kind: "slide", tool: "edit", scope: "Light", label: "Shadows", lo: 70, hi: 95 },
  { kind: "slide", tool: "edit", scope: "Light", label: "Whites", lo: 70, hi: 88 },
  { kind: "slide", tool: "edit", scope: "Light", label: "Blacks", lo: 62, hi: 80 },
  {
    kind: "slide",
    tool: "edit",
    scope: "White Balance",
    label: "Temperature",
    max: 10000,
    lo: 44,
    hi: 60,
  },
  { kind: "slide", tool: "edit", scope: "White Balance", label: "Tint", lo: 46, hi: 60 },
  { kind: "slide", tool: "edit", scope: "Presence", label: "Clarity", lo: 52, hi: 68 },
  { kind: "slide", tool: "edit", scope: "Presence", label: "Vibrance", lo: 66, hi: 85 },
  { kind: "slide", tool: "edit", scope: "Presence", label: "Dehaze", lo: 30, hi: 48 },
  {
    kind: "set",
    tool: "edit",
    op: "Preset",
    key: "preset",
    values: ["True to Life", "Soft Film", "Cinematic C1", "Warm Matte"],
  },
  {
    kind: "set",
    tool: "crop",
    op: "Crop",
    key: "crop",
    values: [
      "4 : 5 · Straighten 0.6°",
      "3 : 2 · Straighten -1.1°",
      "1 : 1",
      "16 : 9 · Straighten 0.3°",
    ],
  },
  {
    kind: "set",
    tool: "mask",
    op: "Mask",
    key: "mask",
    values: ["Subject · +0.3 Exposure", "Sky · -0.4 Highlights", "Background · -12 Clarity"],
  },
  { kind: "slide", tool: "retouch", scope: "Face Skin", label: "Smoothen", lo: 55, hi: 72 },
  { kind: "slide", tool: "retouch", scope: "Teeth", label: "Whiten", lo: 54, hi: 66 },
  { kind: "slide", tool: "retouch", scope: "Eyes", label: "Brighten", lo: 54, hi: 64 },
];

// Small seeded PRNG so each image's past edits are stable across reloads.
function rng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Album history to start with.
 * - `story`: the scripted demo session (ratings, Survey, Sync, Undo targets…).
 *   Off for a just-imported album, which has no culling yet.
 * - Past edits on every image are always included so History is never empty.
 */
function buildSeed(story = true) {
  const values: Record<string, number> = {};
  const entries: AlbumEntry[] = [];
  const fx = (image: number, key: string, next?: number): Effect => {
    const e: Effect = { image, key, prev: values[vkey(image, key)], next };
    if (next === undefined) delete values[vkey(image, key)];
    else values[vkey(image, key)] = next;
    return e;
  };
  const change = (
    images: number[],
    view: ViewMode,
    tool: Tool,
    op: string,
    value: string,
    effects: Effect[],
  ) => entries.push({ id: nextId(), kind: "change", op, value, view, tool, images, effects });
  const rate = (images: number[], view: ViewMode, stars: number) =>
    change(
      images,
      view,
      "ai",
      "Star Rating",
      ratingLabel(stars),
      images.map((i) => fx(i, RATING_KEY, stars)),
    );
  const slide = (image: number, tool: Tool, scope: string, label: string, pos: number, max = 100) =>
    change([image], "loupe", tool, sliderOp(scope, label), sliderDisplay(pos, max), [
      fx(image, sliderKey(tool, scope, label), pos),
    ]);
  const view = (image: number, from: ViewMode, to: ViewMode) =>
    entries.push({
      id: nextId(),
      kind: "nav",
      op: "View",
      value: VIEW_LABEL[to],
      from: { view: from, image },
      to: { view: to, image },
    });
  const goto = (v: ViewMode, from: number, to: number) =>
    entries.push({
      id: nextId(),
      kind: "nav",
      op: "Image",
      value: imageName(to),
      from: { view: v, image: from },
      to: { view: v, image: to },
    });
  const light = (l: string) => sliderKey("edit", "Light", l);

  // 0. Earlier editing on every image (oldest steps on the stack).
  for (let img = 0; img < ALBUM_IMAGE_COUNT; img++) {
    const r = rng(img + 1);
    const count = 4 + Math.floor(r() * 4);
    const pool = [...PAST_OPS];
    for (let n = 0; n < count && pool.length; n++) {
      const op = pool.splice(Math.floor(r() * pool.length), 1)[0];
      if (op.kind === "slide") {
        slide(img, op.tool, op.scope, op.label, Math.round(op.lo + r() * (op.hi - op.lo)), op.max);
      } else {
        const v = Math.floor(r() * op.values.length);
        change([img], "loupe", op.tool, op.op, op.values[v], [fx(img, op.key, v + 1)]);
      }
    }
  }
  if (!story) return { entries, values };

  // 1. Grid: multi-select 3 images, press "1".
  rate([2, 3, 4], "grid", 1);
  // 2. Grid: one image rated 5★, another flagged.
  rate([0], "grid", 5);
  change([5], "grid", "ai", "Flag", "Pick", [fx(5, "flag", 1)]);
  // 2b. Grid: more multi-select batches with different ratings.
  rate([18, 19, 20, 21], "grid", 4);
  rate([22, 23], "grid", 2);
  rate([24, 25, 26], "grid", 5);
  rate([20], "grid", 3); // changed their mind on one of the 4★ batch
  // 2c. Loupe culling pass: step image by image, rating each one.
  const CULL_PASS: [number, number][] = [
    [6, 5],
    [7, 2],
    [8, 4],
    [9, 1],
    [10, 3],
    [11, 5],
    [12, 4],
    [13, 2],
    [14, 5],
    [15, 3],
    [16, 1],
    [17, 4],
  ];
  view(6, "grid", "loupe");
  CULL_PASS.forEach(([img, stars], k) => {
    if (k > 0) goto("loupe", CULL_PASS[k - 1][0], img);
    rate([img], "loupe", stars);
  });
  // Went back to re-rate one image.
  goto("loupe", 17, 13);
  rate([13], "loupe", 3);
  // 3. Jump to image 0 in Loupe and edit across tools.
  goto("loupe", 13, 0);
  slide(0, "edit", "Light", "Exposure", 59);
  slide(0, "edit", "Light", "Contrast", 56);
  slide(0, "edit", "Light", "Highlights", 38);
  change([0], "loupe", "crop", "Crop", "4 : 5 · Straighten 1.2°", [fx(0, "crop", 1)]);
  slide(0, "retouch", "Face Skin", "Smoothen", 65);
  slide(0, "retouch", "Teeth", "Whiten", 60);
  change([0], "loupe", "edit", "Preset", "True to Life", [fx(0, "preset", 1)]);
  // 4. Next image in Loupe: white balance, then rate it with a number key.
  goto("loupe", 0, 1);
  slide(1, "edit", "White Balance", "Temperature", 56, 10000);
  slide(1, "edit", "White Balance", "Tint", 47);
  rate([1], "loupe", 4);
  // 5. Back to Grid: sync image 0's Light edits to 1 & 2, then batch re-rate.
  view(1, "loupe", "grid");
  change(
    [1, 2],
    "grid",
    "edit",
    "Sync",
    `Light from ${imageName(0)}`,
    [1, 2].flatMap((i) =>
      ["Exposure", "Contrast", "Highlights"].map((l) => fx(i, light(l), values[vkey(0, light(l))])),
    ),
  );
  rate([1, 2], "grid", 3);
  // 6. Survey: compare, move to image 3, rate it.
  view(1, "grid", "survey");
  goto("survey", 1, 3);
  rate([3], "survey", 2);
  // 7. Loupe on image 3: edit, Reset, edit again.
  view(3, "survey", "loupe");
  slide(3, "edit", "Light", "Whites", 85);
  change([3], "loupe", "edit", "Reset", "All edits", [fx(3, light("Whites"), undefined)]);
  slide(3, "edit", "Light", "Exposure", 54);
  // 8. Back to image 0, re-adjust Highlights.
  goto("loupe", 3, 0);
  slide(0, "edit", "Light", "Highlights", 32);
  // 9. Loupe on DSC03014: a long editing session across every
  //    tool — each change is its own step on the stack.
  const E = SEED_END.image;
  goto("loupe", 0, E);
  rate([E], "loupe", 3);
  slide(E, "edit", "Light", "Exposure", 58);
  slide(E, "edit", "Light", "Contrast", 55);
  slide(E, "edit", "Light", "Highlights", 35);
  slide(E, "edit", "Light", "Shadows", 95);
  slide(E, "edit", "White Balance", "Temperature", 54, 10000);
  slide(E, "edit", "White Balance", "Tint", 52);
  change([E], "loupe", "crop", "Crop", "3 : 2 · Straighten -0.8°", [fx(E, "crop", 2)]);
  change([E], "loupe", "mask", "Mask", "Subject · +0.4 Exposure", [fx(E, "mask", 1)]);
  slide(E, "retouch", "Face Skin", "Smoothen", 62);
  slide(E, "retouch", "Eyes", "Brighten", 59);
  change([E], "loupe", "ai", "Flag", "Pick", [fx(E, "flag", 1)]);
  change([E], "loupe", "edit", "Preset", "Soft Film", [fx(E, "preset", 2)]);
  slide(E, "edit", "Presence", "Clarity", 61);
  // 10. "This isn't working out": jump to Grid, multi-select 16 images
  //     (DSC03006–21, all with DIFFERENT ratings), press "1" → all 1★ in ONE
  //     step. Grid actions are album-level only (not in the History panel).
  view(E, "loupe", "grid");
  rate(range(6, 21), "grid", 1);
  // 11. Back to Loupe on DSC03014 and keep editing.
  entries.push({
    id: nextId(),
    kind: "nav",
    op: "View",
    value: VIEW_LABEL.loupe,
    from: { view: "grid", image: 21 },
    to: { view: "loupe", image: E },
  });
  rate([E], "loupe", 4);
  slide(E, "edit", "Light", "Exposure", 61);
  slide(E, "edit", "Light", "Whites", 82);
  slide(E, "retouch", "Teeth", "Whiten", 58);
  slide(E, "edit", "Light", "Highlights", 30);
  // 12. Back to Grid — the album opens here (SEED_END).
  view(E, "loupe", "grid");

  return { entries, values };
}

// `seeded: false` is for an album that was only just created: no scripted demo
// session (no ratings or culling yet), but every image still has its past edits.
export function useAlbumHistory(seeded = true) {
  const [seed] = useState(() => buildSeed(seeded));
  const [entries, setEntries] = useState<AlbumEntry[]>(seed.entries);
  // Entries at index >= cursor are undone (redo-able).
  const [cursor, setCursor] = useState(seed.entries.length);
  const [values, setValues] = useState<Record<string, number>>(seed.values);
  // Image-level History browse position per image (entry id / "original").
  const [imageStep, setImageStep] = useState<Record<number, string>>({});

  const getValue = useCallback(
    (image: number, key: string): number | undefined => values[vkey(image, key)],
    [values],
  );

  const applyEffects = useCallback((effects: Effect[], which: "prev" | "next") => {
    setValues((prev) => {
      const next = { ...prev };
      for (const e of effects) {
        const v = e[which];
        if (v === undefined) delete next[vkey(e.image, e.key)];
        else next[vkey(e.image, e.key)] = v;
      }
      return next;
    });
  }, []);

  // Live value while dragging a slider — not a history step on its own.
  const setLive = useCallback(
    (image: number, key: string, v: number) =>
      setValues((prev) => ({ ...prev, [vkey(image, key)]: v })),
    [],
  );

  // Record a new step (drops any redo tail) and apply its values.
  const record = useCallback(
    (entry: NewEntry) => {
      const withId = { ...entry, id: nextId() } as AlbumEntry;
      setEntries((prev) => [...prev.slice(0, cursor), withId]);
      setCursor(cursor + 1);
      if (withId.kind === "change") {
        applyEffects(withId.effects, "next");
        // A new change on an image puts its History back to "latest".
        setImageStep((prev) => {
          const next = { ...prev };
          withId.images.forEach((i) => delete next[i]);
          return next;
        });
      }
    },
    [cursor, applyEffects],
  );

  const undo = useCallback((): AlbumEntry | null => {
    if (cursor === 0) return null;
    const e = entries[cursor - 1];
    setCursor(cursor - 1);
    if (e.kind === "change") applyEffects(e.effects, "prev");
    return e;
  }, [cursor, entries, applyEffects]);

  const redo = useCallback((): AlbumEntry | null => {
    if (cursor >= entries.length) return null;
    const e = entries[cursor];
    setCursor(cursor + 1);
    if (e.kind === "change") applyEffects(e.effects, "next");
    return e;
  }, [cursor, entries, applyEffects]);

  const selectImageStep = useCallback((image: number, step: string | undefined) => {
    setImageStep((prev) => {
      const next = { ...prev };
      if (step === undefined) delete next[image];
      else next[image] = step;
      return next;
    });
  }, []);

  return useMemo(
    () => ({
      entries,
      cursor,
      imageStep,
      getValue,
      setLive,
      record,
      undo,
      redo,
      selectImageStep,
      applyEffects,
    }),
    [
      entries,
      cursor,
      imageStep,
      getValue,
      setLive,
      record,
      undo,
      redo,
      selectImageStep,
      applyEffects,
    ],
  );
}

export type AlbumHistory = ReturnType<typeof useAlbumHistory>;

export const AlbumHistoryContext = createContext<AlbumHistory | null>(null);

export function useAlbumHistoryContext() {
  return useContext(AlbumHistoryContext);
}

// ---- Slider wiring for loupe panels ----
//
// LoupeRailPanel provides the current image + tool; each slider row reads its
// value from the album store (so it differs per image and reverts on Undo) and
// records ONE history step when a drag ends.

export const SliderHistoryContext = createContext<{ image: number; tool: Tool } | null>(null);
// Section a slider sits in (disambiguates e.g. Light/Contrast vs Noise/Contrast).
export const SliderScopeContext = createContext<string>("");

export function useHistorySlider(label: string, initial: number, readout: (pos: number) => string) {
  const history = useAlbumHistoryContext();
  const where = useContext(SliderHistoryContext);
  const scope = useContext(SliderScopeContext);
  const [local, setLocal] = useState(initial);
  // Stored value when the drag started (undefined = slider was at default).
  const dragStart = useRef<{ stored: number | undefined; pos: number } | null>(null);

  const live = !!history && !!where;
  const key = where ? sliderKey(where.tool, scope, label) : "";
  const stored = live ? history.getValue(where.image, key) : undefined;
  const value = live ? (stored ?? initial) : local;
  const latest = useRef(value);
  latest.current = value;

  const onChange = (v: number) => {
    latest.current = v;
    if (!live) return setLocal(v);
    if (!dragStart.current) dragStart.current = { stored, pos: value };
    history.setLive(where.image, key, v);
  };

  // Called on mouse-up / after a keyboard nudge: one history step per drag.
  const onCommit = () => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!live || !start) return;
    const end = latest.current;
    if (Math.round(start.pos) === Math.round(end)) return;
    history.record({
      kind: "change",
      op: sliderOp(scope, label),
      value: readout(end),
      view: "loupe",
      tool: where.tool,
      images: [where.image],
      effects: [{ image: where.image, key, prev: start.stored, next: end }],
    });
  };

  return { value, onChange, onCommit };
}
