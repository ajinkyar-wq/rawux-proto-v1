import { useEffect, useState } from "react";
import { CircleAlert, Info, X } from "lucide-react";
import { KeyBadge, KeyCell } from "./KeyBindingsPanel";
import type { KeyBindings } from "./useKeyBindings";
import { clearResetFlag, fixedFlagKey, useResetFlags } from "./shortcutResetFlags";
import { clearUnbound, markUnbound, useUnboundKeys, type FlashTarget } from "./unboundKeys";
import type { SliderDef } from "./sliderRegistry";
import {
  ROW_BY_ID,
  resolveMapKey,
  scopesOverlap,
  type MapKeys,
  type MapRow,
  type MapSection,
  type Tone,
} from "./shortcutMap";

// Renders one rail section of the shortcut map: sub-headed blocks of rows in
// two columns. Editable rows use Speed Edit's own KeyCell, fixed rows the
// read-only KeyBadge.
//
// Conflicts (same in every shortcut mode):
//  1. another editable shortcut in an overlapping scope, or a Speed Edit
//     slider, holds the key -> it's reassigned here ("will be reassigned");
//  2. a fixed shortcut in an overlapping scope holds it -> blocked.
// Only fixed keys ever share a key with a slider (see KeyBindingsPanel).

/** The rating as five solid stars: white up to the rating, dark grey after. */
function StarPill({ rating }: { rating: number }) {
  return (
    <span className="mr-[10px] inline-flex items-center gap-[3px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          // Same-colour stroke with round joins softens the points.
          className={`h-3.5 w-3.5 ${i < rating ? "fill-[#ffffff] text-[#ffffff]" : "fill-[#4a4a4a] text-[#4a4a4a]"}`}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
        >
          <path d="M12 2.5l2.8 6.05 6.6.8-4.9 4.55 1.3 6.55L12 17.2l-5.8 3.25 1.3-6.55-4.9-4.55 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

/** Marks a shortcut that lost its key to another one while editing (same ! as a flagged section). */
export function UnboundDot() {
  return (
    <span title="This shortcut lost its key" className="inline-flex shrink-0">
      <CircleAlert className="h-3.5 w-3.5 text-[#e2a04a]" />
    </span>
  );
}

/** Colour dot shown before a colour-label row's text. */
const TONE_DOTS: Record<Tone, string> = {
  red: "bg-[#F26B6B]",
  yellow: "bg-[#E0B22A]",
  green: "bg-[#4CAF64]",
  blue: "bg-[#4A9BFF]",
  purple: "bg-[#A970FF]",
  clear: "bg-[#8a8a8a]",
};

export function ShortcutMapSection({
  section,
  keys,
  onSetKey,
  onFlash,
  sliderBindings,
  sliderDefs,
  onUnbindSlider,
}: {
  section: MapSection;
  keys: MapKeys;
  onSetKey: (id: string, key: string | null) => void;
  /** Raise the panel's banner above the footer. */
  onFlash: (message: string, target?: FlashTarget) => void;
  sliderBindings: KeyBindings;
  sliderDefs: Record<string, SliderDef>;
  /** A shortcut took this slider's key: unbind the slider. */
  onUnbindSlider: (sliderId: string) => void;
}) {
  const [keyError, setKeyError] = useState<{ id: string; message: string } | null>(null);
  useEffect(() => {
    if (!keyError) return;
    const t = window.setTimeout(() => setKeyError(null), 4000);
    return () => window.clearTimeout(t);
  }, [keyError]);

  const resolve = (id: string, raw: string) => {
    const outcome = resolveMapKey(keys, id, raw, sliderBindings, (s) => sliderDefs[s]?.label ?? s);
    if (outcome.kind === "notice") {
      const owner = outcome.ownerId ? ROW_BY_ID[outcome.ownerId] : null;
      onFlash(
        outcome.message,
        owner
          ? {
              sectionId: owner.section.id,
              id: outcome.ownerId!,
              label: owner.row.short ?? owner.row.label,
            }
          : undefined,
      );
    }
    return outcome;
  };

  /** Colour rows get their dot inline, right before the colour word; star rows
   *  show the rating as stars instead of "N Stars". */
  const renderLabel = (row: MapRow) => {
    if (row.stars !== undefined) {
      // "3 Stars" becomes three stars; Clear's "star" becomes five grey ones.
      const m = row.label.match(row.stars ? /\d+ Stars?/ : /\bstar\b/);
      if (!m || m.index === undefined) return row.label;
      return (
        // Even 10px on both sides of the stars, on one centred line.
        <span className="inline-flex items-center whitespace-nowrap">
          <span className="mr-[10px]">{row.label.slice(0, m.index).trim()}</span>
          <StarPill rating={row.stars} />
          {row.label.slice(m.index + m[0].length)}
        </span>
      );
    }
    if (!row.tone) return row.label;
    const m = row.label.match(/\b(Red|Yellow|Green|Blue|Purple|color)\b/);
    if (!m || m.index === undefined) return row.label;
    // Even 6px on both sides of the dot.
    return (
      <span className="inline-flex items-center whitespace-nowrap">
        <span className="mr-[6px]">{row.label.slice(0, m.index).trim()}</span>
        <span
          className={`mr-[6px] inline-block h-[9px] w-[9px] shrink-0 rounded-full ${TONE_DOTS[row.tone]}`}
        />
        {row.label.slice(m.index)}
      </span>
    );
  };

  // Setting any key on a row that was flagged by a reset clears its flag.
  const resetFlags = useResetFlags();
  const unbound = useUnboundKeys();
  const setKey = (id: string, key: string | null) => {
    if (key) {
      // Any other shortcut holding this key (where both work) loses it: mark it.
      const k = key.toLowerCase();
      const self = ROW_BY_ID[id];
      markUnbound(
        Object.entries(keys)
          .filter(
            ([other, v]) =>
              other !== id &&
              v &&
              v.toLowerCase() === k &&
              scopesOverlap(self.group, ROW_BY_ID[other].group),
          )
          .map(([other]) => other),
      );
    }
    onSetKey(id, key);
    if (key) {
      clearResetFlag(id);
      clearUnbound(id);
    }
  };

  /** The key the user had before the update changed it: a label, not an action. */
  const hadKey = (old: string | undefined) =>
    old && (
      <span className="inline-flex items-center whitespace-nowrap rounded-[6px] border border-[#6b5a2a] bg-[#2b2617] px-2 py-[3px] text-[11px] text-[#e2e2e2]">
        Changed from {old}
      </span>
    );

  const renderKeys = (row: MapRow) => {
    if (!row.id)
      return (
        <>
          {hadKey(resetFlags.previous[fixedFlagKey(row.label)])}
          {row.keys!.map((k, i) => (
            <KeyBadge key={i} k={k} />
          ))}
        </>
      );
    return (
      <>
        {hadKey(resetFlags.previous[row.id])}
        {unbound.has(row.id) && <UnboundDot />}
        <KeyCell
          sliderId={row.id}
          bindings={keys}
          onSet={setKey}
          onResolve={resolve}
          onInvalid={(message) => setKeyError({ id: row.id!, message })}
          hasError={keyError?.id === row.id}
          combos
        />
        {/* A second, fixed key for the same action (e.g. ↓ beside "."). */}
        {row.secondKey && <KeyBadge k={row.secondKey.key} />}
      </>
    );
  };

  return (
    <div className="flex flex-col">
      {section.blocks.map((block, bi) => {
        // Rows are in reading order (L, R, L, R …); split so each column keeps its rhythm.
        const cols: [MapRow[], MapRow[]] = [[], []];
        block.rows.forEach((r, i) => cols[i % 2].push(r));
        return (
          <div key={block.title ?? bi}>
            {/* Divider between blocks (Stars / Colors / …), split at the centre: one
                line per column, the gap matching the column gap. */}
            {bi > 0 && (
              <div className="my-5 grid grid-cols-2 gap-x-10">
                <div className="border-t border-[#2a2a2a]" />
                <div className="border-t border-[#2a2a2a]" />
              </div>
            )}
            {block.title && (
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-[#e2e2e2]">
                {block.title}
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-10">
              {cols.map((col, ci) => (
                <div key={ci} className="flex flex-col">
                  {col.map((row, ri) => (
                    <div key={`${ci}-${ri}`} data-key-row={row.id}>
                      <div className="flex items-center justify-between gap-4 py-[6px]">
                        <span className="text-[13px] text-[#e2e2e2]">{renderLabel(row)}</span>
                        <div className="flex shrink-0 items-center gap-1.5">{renderKeys(row)}</div>
                      </div>
                      {row.id && keyError?.id === row.id && (
                        <div className="mt-1 mb-1 flex items-start gap-2.5 rounded-[6px] border border-[#7f3a37] bg-[#2a1717] px-3 py-2.5">
                          <Info className="mt-[1px] h-4 w-4 shrink-0 text-[#e0655e]" />
                          <span className="min-w-0 flex-1 text-[12px] leading-[17px] text-[#e2e2e2]">
                            {keyError.message}
                          </span>
                          <button
                            onClick={() => setKeyError(null)}
                            aria-label="Dismiss"
                            className="shrink-0 text-[#8a8a8a] hover:text-[#e2e2e2]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
