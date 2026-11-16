import { useEffect, useRef, useState } from 'react';
import { X, ChevronDown, ChevronRight, Info, CircleAlert, Search } from 'lucide-react';
import type { SliderDef } from './sliderRegistry';
import { colorKeys, gradingKeys } from './sliderRegistry';
import { DEFAULT_BINDINGS, type KeyBindings } from './useKeyBindings';
import { shortcutForKey } from './shortcutRegistry';
import { ShortcutMapSection, UnboundDot } from './ShortcutMapSection';
import { clearUnbound, isSliderMark, markUnbound, sliderMark, useUnboundKeys, type FlashTarget } from './unboundKeys';
import { dismissResetBanner, fixedFlagKey, useResetFlags } from './shortcutResetFlags';
import {
  SHORTCUT_MAP,
  SPEED_EDIT_SCOPE,
  ROW_BY_ID,
  FIXED_KEYS,
  comboFromEvent,
  SYSTEM_COMBOS,
  UNASSIGNABLE_KEYS,
  editableIdsIn,
  sectionById,
  useShortcutMapKeys,
  takeRequestedSection,
  comboOf,
  scopesOverlap,
  DEFAULT_KEYS,
  type MapKeys,
  type MapRow,
  type MapSection,
} from './shortcutMap';
import {
  MODIFIER_LABELS,
  useShortcutModifier,
  writeShortcutModifier,
  type ShortcutMode,
  type ShortcutModifier,
} from './useShortcutMode';

/** How the chooser names each mode (shown in the modal header). */
const MODE_LABELS: Record<ShortcutMode, string> = {
  hold: 'Delayed Hold',
  speedToggle: 'Double-Press',
  modifier: 'Hold Modifier',
};
const MODIFIER_SHORT: Record<ShortcutModifier, string> = { alt: '⌥', ctrl: 'Ctrl', shift: '⇧', meta: '⌘' };


/** One step of the speed edit gesture, shown in the Speed Edit Keys header. */
const HOW_TAG = 'rounded-[6px] border border-[#3b5b9e] bg-[#1e2740] px-2 py-[3px] text-[#e2e2e2]';

/** Read-only keycap for the shortcut sheets. */
export function KeyBadge({ k }: { k: React.ReactNode }) {
  // Gestures aren't keys: show an icon instead of the word.
  const pinch = k === 'Pinch';
  return (
    <span
      title={pinch ? 'Pinch' : undefined}
      className="inline-flex items-center justify-center min-w-[32px] h-[26px] px-2 text-[12px] font-medium rounded-[5px] bg-[#333333] text-[#e2e2e2]"
    >
      {pinch ? <PinchIcon /> : k}
    </span>
  );
}

/** Two fingertips moving apart along a diagonal: pinch to zoom. */
function PinchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="14.5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M7 17 3.5 20.5M3.5 16.5v4h4" />
      <path d="M17 7l3.5-3.5M16.5 3.5h4v4" />
    </svg>
  );
}

interface Section {
  id: string;
  title: string;
  rows: { id: string; label: string }[];
}

function buildSections(sliderDefs: Record<string, SliderDef>): Section[] {
  const get = (id: string, fallback?: string) => ({
    id,
    label: sliderDefs[id]?.label ?? fallback ?? id,
  });

  const sections: Section[] = [
    {
      id: 'whiteBalance',
      title: 'White Balance',
      rows: [get('temperature'), get('tint')],
    },
    {
      id: 'light',
      title: 'Light',
      rows: ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'].map((k) =>
        get(k),
      ),
    },
    {
      id: 'presence',
      title: 'Presence',
      rows: ['texture', 'clarity', 'dehaze', 'vibrance', 'saturation'].map((k) => get(k)),
    },
    {
      id: 'colorMixer',
      title: 'Color Mixer',
      rows: colorKeys.flatMap((color) => {
        const colorLabel = color.charAt(0).toUpperCase() + color.slice(1);
        return (['hue', 'saturation', 'luminance'] as const).map((prop) => ({
          id: `colorMixer.${color}.${prop}`,
          label: `${colorLabel} ${prop.charAt(0).toUpperCase() + prop.slice(1)}`,
        }));
      }),
    },
    {
      id: 'colorGrading',
      title: 'Color Grading',
      rows: [
        ...gradingKeys.flatMap((tone) => {
          const toneLabel = tone.charAt(0).toUpperCase() + tone.slice(1);
          return (['hue', 'saturation', 'luminance'] as const).map((prop) => ({
            id: `colorGrading.${tone}.${prop}`,
            label: `${toneLabel} ${prop.charAt(0).toUpperCase() + prop.slice(1)}`,
          }));
        }),
        get('blending'),
        get('balance'),
      ],
    },
    {
      id: 'detail',
      title: 'Detail',
      rows: [
        { id: 'sharpeningAmount', label: 'Sharpening Amount' },
        { id: 'sharpeningRadius', label: 'Sharpening Radius' },
        { id: 'sharpeningDetail', label: 'Sharpening Detail' },
        { id: 'sharpeningMasking', label: 'Sharpening Masking' },
        { id: 'noiseLuminance', label: 'Noise Luminance' },
        { id: 'noiseColor', label: 'Noise Color' },
      ],
    },
    {
      id: 'calibration',
      title: 'Calibration',
      rows: [
        { id: 'shadowsTint', label: 'Shadows Tint' },
        { id: 'redPrimaryHue', label: 'Red Primary Hue' },
        { id: 'redPrimarySaturation', label: 'Red Primary Saturation' },
        { id: 'greenPrimaryHue', label: 'Green Primary Hue' },
        { id: 'greenPrimarySaturation', label: 'Green Primary Saturation' },
        { id: 'bluePrimaryHue', label: 'Blue Primary Hue' },
        { id: 'bluePrimarySaturation', label: 'Blue Primary Saturation' },
      ],
    },
  ];

  // Speed edit is limited to the three most-used sections. The remaining
  // section definitions above are kept so re-enabling one is a one-line change.
  const SPEED_EDIT_SECTIONS = new Set(['whiteBalance', 'light', 'presence']);

  return sections.filter((s) => SPEED_EDIT_SECTIONS.has(s.id) && s.rows.length > 0);
}

export interface KeyCellProps {
  sliderId: string;
  bindings: KeyBindings;
  onSet: (sliderId: string, key: string | null) => void;
  /**
   * Decide what happens when the captured key is already taken.
   *  - 'crop' | 'masking'  -> a rebindable app shortcut holds it: the panel
   *      starts the resolver (jump + force reassign). KeyCell aborts.
   *  - a string label      -> a NON-rebindable shortcut holds it (rating, B&W,
   *      fullscreen...): KeyCell shows that as an inline error, no assignment.
   *  - null                -> free, or held only by another slider: assign it
   *      (setBinding moves it off the other slider).
   */
  onResolve: (sliderId: string, key: string) =>
    | { kind: 'resolver' }
    | { kind: 'error'; label: string }
    | { kind: 'notice' }
    | { kind: 'assign' };
  /** Open capture automatically (when a conflict routes the user here). */
  autoCapture?: boolean;
  /** Called on Escape while capturing (used to return to the origin cell). */
  onEscape?: () => void;
  /** Raise a panel-level error banner for a key that can't be bound. */
  onInvalid?: (message: string) => void;
  /** True while the panel is showing an inline error for this row. */
  hasError?: boolean;
  /** A key was assigned — the panel advances capture to the next slider so
   *  several keys can be set in a row without re-clicking each badge. */
  onAssigned?: (sliderId: string) => void;
  /** Override the idle (assigned) look, e.g. a colour-label key's colour. */
  idleClassName?: string;
  /** Keys this cell accepts (default: letters and numbers). */
  keyPattern?: RegExp;
  /** Press shortcuts: record any key, alone or with modifiers ("⇧⌘E"). */
  combos?: boolean;
}

/** Single characters show upper-case; combos and named keys as stored. */
const displayKey = (key: string) => (key.length === 1 ? key.toUpperCase() : key);

export function KeyCell({ sliderId, bindings, onSet, onResolve, autoCapture = false, onEscape, onInvalid, hasError = false, onAssigned, idleClassName, keyPattern = /^[a-z0-9]$/i, combos = false }: KeyCellProps) {
  const [capturing, setCapturing] = useState(false);
  const [ownError, setOwnError] = useState<string | null>(null);
  // The panel shows the message inline; the cell just needs the red state.
  const error = ownError;
  const setError = setOwnError;
  const showErrorState = !!ownError || hasError;
  // An FYI about a key that WAS assigned (e.g. it also drives a shortcut, or it
  // was taken from another slider). Informational, not a rejection.
  const [notice, setNotice] = useState<string | null>(null);
  const current = bindings[sliderId];

  // When the resolver routes the user to this cell, jump into capture.
  useEffect(() => {
    if (autoCapture) { setCapturing(true); setError(null); setNotice(null); }
  }, [autoCapture]);

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 2800);
    return () => window.clearTimeout(id);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3600);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturing(false);
        onEscape?.();
        return;
      }
      const hasMods = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;
      if ((e.key === 'Backspace' || e.key === 'Delete') && !(combos && hasMods)) {
        onSet(sliderId, null);
        setCapturing(false);
        return;
      }
      if (combos) {
        // Wait for the actual key while only modifiers are down.
        if (['Shift', 'Meta', 'Control', 'Alt'].includes(e.key)) return;
        const combo = comboFromEvent(e);
        const fail = (message: string) => { onInvalid?.(message); setCapturing(false); };
        if (!combo) return fail('This key can’t be assigned.');
        if (UNASSIGNABLE_KEYS.has(combo)) return fail(`${combo} can’t be assigned.`);
        if (SYSTEM_COMBOS.has(combo)) return fail(`${combo} is used by your system and can’t be assigned.`);
        assign(combo);
        return;
      }
      if (hasMods) {
        onInvalid?.("Speed Edit Keys can't use modifiers. Pick one letter or number.");
        setCapturing(false);
        return;
      }
      if (!keyPattern.test(e.key)) {
        onInvalid?.(keyPattern.test('a') && !keyPattern.test(';')
          ? 'Only Number and Letter keys can be assigned!'
          : 'This key can’t be assigned.');
        setCapturing(false);
        return;
      }
      if (e.key.length === 1) assign(e.key);
    };
    const assign = (key: string) => {
      const outcome = onResolve(sliderId, key);
      if (outcome.kind === 'resolver') {
        // Panel took over: it switched to Shortcuts tab to reassign the
        // app shortcut, which then auto-assigns this key to us.
        setCapturing(false);
        return;
      }
      if (outcome.kind === 'error') {
        setError(`${displayKey(key)} is used by ${outcome.label}, which is fixed. Pick another key.`);
        setCapturing(false);
        return;
      }
      // 'notice': overlaps are allowed here, so the key IS assigned (the panel
      // raises a banner explaining it). 'assign': free, or held only by
      // another row, which gets moved off.
      onSet(sliderId, key);
      setCapturing(false);
      onAssigned?.(sliderId);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, onSet, onResolve, sliderId, onEscape, onInvalid, onAssigned, keyPattern, combos]);

  // Clicking anywhere outside the field stops capture and keeps the old key.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!capturing) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setCapturing(false);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [capturing]);

  return (
    <div ref={rootRef} className="relative">
    <button
      onClick={() => { setError(null); setNotice(null); setCapturing(true); }}
      title={error ?? notice ?? undefined}
      className={`inline-flex items-center justify-center min-w-[50px] h-[27px] px-2 text-[12px] font-medium rounded-[6px] border outline-none focus:outline-none focus-visible:outline-none ${
        showErrorState
          ? 'border-[#d4564f] bg-[#2a1717] text-[#e08a85]'
          : capturing
          ? 'border-[#e2a04a] bg-[#2a2117] text-[#e2a04a]'
          : current
          ? idleClassName ?? 'border-[#474747] bg-[#141414] text-[#e2e2e2] hover:border-[#6f6f6f]'
          : 'border-dashed border-[#6f6f6f] bg-[#141414] text-[#ababab] hover:text-[#e2e2e2] hover:border-[#9a9a9a]'
      }`}
    >
      {/* Keep the current key visible while listening so the user sees what
          they're about to overwrite. */}
      {current ? displayKey(current) : '—'}

    </button>
    {error && (
      <div className="absolute right-0 top-[28px] z-10 w-[180px] rounded-[4px] border border-[#d4564f]/50 bg-[#2a1717] px-2 py-1.5 text-[10px] leading-[14px] text-[#e08a85] shadow-lg">
        {error}
      </div>
    )}
    {!error && notice && (
      <div className="absolute right-0 top-[28px] z-10 w-[190px] rounded-[4px] border border-[#e2a04a]/50 bg-[#2a2117] px-2 py-1.5 text-[10px] leading-[14px] text-[#e2a04a] shadow-lg">
        {notice}
      </div>
    )}
    </div>
  );
}

interface KeyBindingsPanelProps {
  open: boolean;
  onClose: () => void;
  sliderDefs: Record<string, SliderDef>;
  bindings: KeyBindings;
  onSetBinding: (sliderId: string, key: string | null, force?: boolean) => void;
  onResetDefaults: () => void;
  /** Put back every speed edit key at once (⌘Z undo / ⇧⌘Z redo). */
  onReplaceBindings?: (bindings: KeyBindings) => void;
  shortcutMode?: ShortcutMode;
  onChangeShortcutMode?: () => void;
  /** Opened from the Cull tab: start on Global → Image Properties instead of Speed Edit Keys. */
  cull?: boolean;
}


export function KeyBindingsPanel({
  open,
  onClose,
  sliderDefs,
  bindings,
  onSetBinding,
  onResetDefaults,
  onReplaceBindings,
  shortcutMode = 'hold',
  onChangeShortcutMode,
  cull = false,
}: KeyBindingsPanelProps) {
  const modifier = useShortcutModifier();
  // The rail section on screen (see shortcutMap.ts for the hierarchy).
  const [sectionId, setSectionId] = useState(cull ? 'global.imageProperties' : 'edit.sliders');
  // Opened from somewhere that asked for a section (e.g. the update dialog).
  useEffect(() => {
    if (!open) return;
    const requested = takeRequestedSection();
    if (requested) setSectionId(requested);
  }, [open]);
  const section = sectionById(sectionId);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    whiteBalance: true,
    light: true,
    presence: true,
    colorMixer: false,
    colorGrading: false,
    detail: false,
    calibration: false,
  });

  // Persisted, rebindable keys for every editable row in the shortcut map.
  const mapKeys = useShortcutMapKeys();
  // After a full reset: which rows had the user's own key (marked in the rail).
  const resetFlags = useResetFlags();
  // Rows that lost their key while editing (dot on the row and its section).
  const unbound = useUnboundKeys();
  const sectionUnbound = (secId: string) => {
    const sec = sectionById(secId);
    // A slider with no key isn't in `bindings`, so check the marks themselves.
    if (sec.speedEdit) return [...unbound].some(isSliderMark);
    return editableIdsIn(sec).some((id) => unbound.has(id));
  };

  const sectionFlagged = (secId: string) =>
    sectionById(secId).blocks.some((b) =>
      b.rows.some((r) => (r.id ? r.id : fixedFlagKey(r.label)) in resetFlags.previous),
    );

  /** The EDITABLE press shortcut holding this key. It shares the key with a
   *  slider: tap runs the shortcut, hold adjusts the slider. */
  const editableOwnerFor = (key: string): string | null =>
    Object.entries(mapKeys.keys).find(
      ([rid, v]) => v.toLowerCase() === key && SPEED_EDIT_SCOPE.includes(ROW_BY_ID[rid].group),
    )?.[0] ?? null;

  // Key changes made since the panel opened, newest last. Each entry drives a
  // banner above the footer; several at once collapse into a summary so the
  // list can't push the sections off screen.
  type KeyChange = {
    sliderId: string;
    sliderLabel: string;
    key: string;
    previousKey: string | null;
    /** Label of the shortcut sharing this key, when there is one. */
    conflictLabel?: string;
    /** 'remappable' = that shortcut's key can be changed; 'fixed' = it can't,
     *  so the shortcut moves to a double press. */
    conflictKind?: 'slider' | 'remappable' | 'fixed';
  };
  const [changedKeys, setChangedKeys] = useState<KeyChange[]>([]);
  // ⌘Z / ⇧⌘Z: every key change since the modal opened, as snapshots of all keys.
  type Snapshot = { map: MapKeys; sliders: KeyBindings };
  const history = useRef<{ past: Snapshot[]; future: Snapshot[]; last: Snapshot | null; restoring: boolean }>({
    past: [],
    future: [],
    last: null,
    restoring: false,
  });
  // Footer status: the last change was saved, or what ⌘Z / ⇧⌘Z just put back.
  // Fades after a few seconds; `at` restarts the timer for a repeated message.
  const [statusState, setStatusState] = useState<{ text: string; at: number } | null>(null);
  const setStatus = (text: string | null) => setStatusState(text ? { text, at: Date.now() } : null);
  const status = statusState?.text ?? null;
  useEffect(() => {
    if (!statusState) return;
    const t = window.setTimeout(() => setStatusState(null), 3000);
    return () => window.clearTimeout(t);
  }, [statusState]);
  // Search box at the top of the section list; results span every section.
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (open) {
      setChangedKeys([]);
      setStatus(null);
      // Lost-key markers stay across close / reopen until the row has a key again.
      setQuery('');
      // Undo history starts fresh with the keys as they are now.
      history.current = { past: [], future: [], last: { map: { ...mapKeys.keys }, sliders: { ...bindings } }, restoring: false };
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Record each change (shortcuts and speed edit keys) as one undo step.
  useEffect(() => {
    if (!open) return;
    const h = history.current;
    const cur: Snapshot = { map: { ...mapKeys.keys }, sliders: { ...bindings } };
    const sameAs = (a: Snapshot, b: Snapshot) =>
      JSON.stringify(a.map) === JSON.stringify(b.map) && JSON.stringify(a.sliders) === JSON.stringify(b.sliders);
    if (h.last && sameAs(cur, h.last)) return;
    if (h.restoring) h.restoring = false; // this change was an undo / redo itself
    else if (h.last) {
      h.past.push(h.last);
      h.future = [];
      setStatus('Key change saved');
    }
    h.last = cur;
  }, [open, mapKeys.keys, bindings]);


  const noteKeyChange = (change: KeyChange) => {
    setChangedKeys((prev) => [...prev.filter((c) => c.sliderId !== change.sliderId), change]);
  };

  /**
   * The FIXED shortcut sharing this slider's key, if any. Drives the persistent
   * marker on the row: a conflict is ongoing state, not a one-off event, so it
   * stays visible instead of being announced once in a banner.
   */
  /** Compact label for the badge: "Enter Crop Mode" -> "Crop". */
  const SHORT_SHORTCUT_LABELS: Record<string, string> = {
    'Enter Crop Mode': 'Crop',
    'Enter Masking': 'Masking',
    'View Before / After': 'Before / After',
    'Full Screen Preview': 'Full Screen',
    'Hide / Show Toolbar': 'Toolbar',
    'Soft Proofing Preview': 'Soft Proofing',
    'Cycle Lights Out': 'Lights Out',
    'Show / Hide Mask Overlay': 'Mask Overlay',
    'Convert to Black & White': 'B&W',
    Export: 'Export',
  };
  const shortShortcutLabel = (label: string) => SHORT_SHORTCUT_LABELS[label] ?? label;

  /** The press shortcut (editable or fixed) holding this key, if any. It
   *  shares the key with a slider: double press, or modifier + key. */
  const fixedOwnerFor = (key: string): string | null => {
    const editable = editableOwnerFor(key);
    if (editable) return ROW_BY_ID[editable].row.short ?? ROW_BY_ID[editable].row.label;
    const mapFixed = FIXED_KEYS.find((x) => x.key === key && SPEED_EDIT_SCOPE.includes(x.group));
    if (mapFixed) return mapFixed.label;
    return shortcutForKey(key)?.label ?? null;
  };

  const fixedConflictFor = (sliderId: string): string | null => {
    const key = bindings[sliderId]?.toLowerCase();
    if (!key) return null;
    return fixedOwnerFor(key);
  };

  /**
   * Sliders that lost their key to another slider during this session, mapped to
   * the slider that took it. Flagged on the row so the steal isn't silent.
   */
  // Transient confirmation for a plain reassignment (case 2). It's a
  // moment-of-action message, not state, so it fades on its own and never
  // stacks — the persistent signal is the chip on the affected row.
  const [flash, setFlash] = useState<{ message: string; target?: FlashTarget } | null>(null);
  // The "Set a key for …" button only when that shortcut isn't on screen: it's
  // in another section (or, while searching, not among the results).
  const flashMessage = (message: string, target?: FlashTarget) => {
    const onScreen =
      !!target &&
      (searching
        ? matchedSections.some((sec) => sec.blocks[0].rows.some((r) => r.id === target.id)) ||
          (!!target.slider && matchedSliders.some((r) => r.id === target.id))
        : target.sectionId === sectionId);
    setFlash({ message, target: onScreen ? undefined : target });
  };
  // The banner's button: jump to the row that lost its key (its amber dot marks
  // it). Recording only starts when the user clicks the field.
  const goToTarget = (t: FlashTarget) => {
    setQuery('');
    setSectionId(t.sectionId);
    setFlash(null);
    window.setTimeout(() => {
      document.querySelector(`[data-key-row="${CSS.escape(t.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
  };
  // A key that can't be bound at all (modifier combo, punctuation, F-key).
  const [keyError, setKeyError] = useState<{ sliderId: string; message: string } | null>(null);
  useEffect(() => {
    if (!keyError) return;
    const t = window.setTimeout(() => setKeyError(null), 4000);
    return () => window.clearTimeout(t);
  }, [keyError]);
  useEffect(() => {
    if (!flash) return;
    // A banner with a button stays up long enough to use it.
    const t = window.setTimeout(() => setFlash(null), flash.target ? 8000 : 3200);
    return () => window.clearTimeout(t);
  }, [flash]);

  /** "Masking was reverted to M": the row an undo / redo step put back. When the
   *  step touched several rows (a key that moved), name the one that got its key back. */
  const restoredStatus = (before: Snapshot, after: Snapshot, dir: 'undo' | 'redo') => {
    const changed = [
      ...Object.keys(after.map)
        .filter((id) => (before.map[id] ?? '') !== (after.map[id] ?? ''))
        .map((id) => ({ label: ROW_BY_ID[id]?.row.short ?? ROW_BY_ID[id]?.row.label ?? id, was: before.map[id] ?? '', now: after.map[id] ?? '' })),
      ...[...new Set([...Object.keys(before.sliders), ...Object.keys(after.sliders)])]
        .filter((id) => (before.sliders[id] ?? '') !== (after.sliders[id] ?? ''))
        .map((id) => ({ label: sliderDefs[id]?.label ?? id, was: before.sliders[id] ?? '', now: after.sliders[id] ?? '' })),
    ];
    const c = changed.find((x) => x.now && !x.was) ?? changed.find((x) => x.now) ?? changed[0];
    if (!c) return null;
    return `${c.label} was ${dir === 'undo' ? 'reverted' : 'set'} to ${c.now ? displayKey(c.now) : 'Unset'}`;
  };

  /** Step through the undo history: ⌘Z goes back one change, ⇧⌘Z forward. */
  const stepHistory = (dir: 'undo' | 'redo') => {
    const h = history.current;
    const from = dir === 'undo' ? h.past : h.future;
    const to = dir === 'undo' ? h.future : h.past;
    const snap = from.pop();
    if (!snap || !h.last) return;
    to.push(h.last);
    setStatus(restoredStatus(h.last, snap, dir));
    h.last = snap;
    h.restoring = true;
    mapKeys.replaceAll(snap.map);
    if (onReplaceBindings) onReplaceBindings(snap.sliders);
    else for (const [id, k] of Object.entries(snap.sliders)) onSetBinding(id, k);
    // Rows that have a key again lose their "lost its key" dot.
    for (const [id, k] of Object.entries(snap.map)) if (k) clearUnbound(id);
    for (const id of Object.keys(snap.sliders)) clearUnbound(sliderMark(id));
    setFlash(null);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.code !== 'KeyZ') return;
      // In a text field (search), ⌘Z undoes the typing instead.
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      stepHistory(e.shiftKey ? 'redo' : 'undo');
    };
    // Bubble phase: a key field that's recording stops the event first, so
    // ⌘Z there is recorded as a key rather than undoing.
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  /**
   * Revert to default for the section on screen only. If one of its defaults is
   * held by a shortcut in another section (where both work), the default wins:
   * that shortcut is left without a key, marked, and the banner points to it.
   */
  const revertSection = () => {
    if (section.speedEdit) {
      // Speed edit keys only clash with each other, all of which are on this tab.
      onResetDefaults();
      Object.keys(sliderDefs).forEach((id) => clearUnbound(sliderMark(id)));
    }
    if (!editableIds.length) return;
    const next = { ...mapKeys.keys };
    const lost: string[] = [];
    for (const id of editableIds) {
      const d = (DEFAULT_KEYS[id] ?? '').toLowerCase();
      next[id] = DEFAULT_KEYS[id] ?? '';
      if (!d) continue;
      for (const [other, k] of Object.entries(next)) {
        if (editableIds.includes(other) || !k || k.toLowerCase() !== d) continue;
        if (!scopesOverlap(ROW_BY_ID[id].group, ROW_BY_ID[other].group)) continue;
        next[other] = '';
        lost.push(other);
      }
    }
    mapKeys.replaceAll(next);
    editableIds.forEach(clearUnbound);
    if (lost.length) {
      markUnbound(lost);
      const first = ROW_BY_ID[lost[0]];
      const name = (l: string) => ROW_BY_ID[l].row.label;
      flashMessage(
        lost.length === 1
          ? `${name(lost[0])} (${first.section.title}) lost its key to a default here.`
          : `${lost.length} shortcuts in other sections lost their keys to defaults here.`,
        { sectionId: first.section.id, id: lost[0], label: first.row.short ?? first.row.label },
      );
    }
  };

  /** A shortcut took a slider's key: that slider is unbound (Discard restores it). */
  const unbindSliderForMap = (sliderId: string) => {
    noteKeyChange({
      sliderId,
      sliderLabel: sliderDefs[sliderId]?.label ?? sliderId,
      key: '',
      previousKey: bindings[sliderId] ?? null,
    });
    onSetBinding(sliderId, null);
  };


  /**
   * Decide the outcome when a slider key-cell captures a key (every mode):
   *   another slider     -> reassigned
   *   editable shortcut  -> reassigned (the shortcut is unbound)
   *   fixed shortcut     -> shared; the mode decides how each action is reached
   */
  const handleSliderResolve = (
    sliderId: string,
    rawKey: string,
  ): { kind: 'error'; label: string } | { kind: 'notice' } | { kind: 'assign' } => {
    const key = rawKey.toLowerCase();
    const K = rawKey.toUpperCase();
    const sliderLabel = sliderDefs[sliderId]?.label ?? sliderId;

    // Already mine? no-op assign (keeps it).
    if (bindings[sliderId]?.toLowerCase() === key) return { kind: 'assign' };

    const base = { sliderId, sliderLabel, key: K, previousKey: bindings[sliderId] ?? null };

    // Another SLIDER holds it: that one loses the key.
    const otherSlider = Object.entries(bindings).find(
      ([id, bound]) => id !== sliderId && bound.toLowerCase() === key,
    )?.[0];
    if (otherSlider) {
      const label = sliderDefs[otherSlider]?.label ?? otherSlider;
      flashMessage(`${K} is used by ${label} and will be reassigned.`, {
        sectionId: 'global.speedEdit',
        id: otherSlider,
        label,
        slider: true,
      });
      noteKeyChange({ ...base, conflictLabel: label, conflictKind: 'slider' });
      markUnbound([sliderMark(otherSlider)]);
      return { kind: 'notice' };
    }

    // A press shortcut (editable or fixed) holds it: both keep it; the row
    // shows how to reach each.
    const fixedOwner = fixedOwnerFor(key);
    if (fixedOwner) {
      flashMessage(
        shortcutMode === 'modifier'
          ? `${K} now quick-edits ${sliderLabel}. Press ${MODIFIER_SHORT[modifier]} ${K} for ${fixedOwner}.`
          : shortcutMode === 'hold'
          ? `${K} also runs ${fixedOwner}. Tap it for ${fixedOwner}, hold it to quick-edit ${sliderLabel}.`
          : `${K} also runs ${fixedOwner}. Press it twice for ${fixedOwner}.`,
      );
      noteKeyChange({ ...base, conflictLabel: fixedOwner, conflictKind: 'fixed' });
      return { kind: 'notice' };
    }

    noteKeyChange(base);
    return { kind: 'assign' };
  };

  if (!open) return null;
  const sections = buildSections(sliderDefs);

  const editableIds = editableIdsIn(section);
  const hasEditable = section.speedEdit || editableIds.length > 0;
  // Footer: Revert to default is the one (outlined) action; ⌘Z covers undo.
  const tertiaryBtn =
    'h-[38px] rounded-[6px] border border-[#474747] px-4 text-[13px] font-medium text-[#e2e2e2] enabled:hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:border-[#333333] disabled:text-[#555]';

  // Two key sets are the same if every key matches (an unset key is '').
  const sameKeys = (a: Record<string, string>, b: Record<string, string>) =>
    [...new Set([...Object.keys(a), ...Object.keys(b)])].every(
      (id) => (a[id] ?? '').toLowerCase() === (b[id] ?? '').toLowerCase(),
    );
  // Revert to default: nothing to do when this section is already at its defaults.
  const sectionAtDefault = section.speedEdit
    ? sameKeys(bindings, DEFAULT_BINDINGS)
    : editableIds.every((id) => (mapKeys.keys[id] ?? '').toLowerCase() === (DEFAULT_KEYS[id] ?? '').toLowerCase());


  const flagDot = <CircleAlert className="h-3.5 w-3.5 shrink-0 text-[#e2a04a]" />;

  // ---- Search ------------------------------------------------------------
  // Matches a shortcut's exact key ("J" finds Clipping) or, for anything
  // longer than one character, its name.
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const nameMatches = (label: string) => q.length > 1 && label.toLowerCase().includes(q);
  const keyOf = (r: MapRow) => (r.id ? mapKeys.keys[r.id] ?? '' : comboOf(r.keys!));
  const rowMatches = (r: MapRow) => nameMatches(r.label) || keyOf(r).toLowerCase() === q;
  const matchedSections: MapSection[] = searching
    ? SHORTCUT_MAP.flatMap((g) => g.sections)
        .filter((sec) => !sec.speedEdit)
        .map((sec) => ({ ...sec, blocks: [{ rows: sec.blocks.flatMap((b) => b.rows).filter(rowMatches) }] }))
        .filter((sec) => sec.blocks[0].rows.length > 0)
    : [];
  const matchedSliders = searching
    ? sections.flatMap((sec) => sec.rows).filter((r) => nameMatches(r.label) || (bindings[r.id] ?? '').toLowerCase() === q)
    : [];
  const resultHeading = 'mb-2 text-[12px] font-semibold uppercase tracking-[0.4px] text-[#e2e2e2]';
  const searchResults = (
    <div className="flex flex-col gap-6">
      <div className="text-[14px] font-semibold text-[#e2e2e2]">Results for “{query.trim()}”</div>
      {!matchedSections.length && !matchedSliders.length && (
        <div className="text-[13px] text-[#8a8a8a]">No shortcuts match.</div>
      )}
      {matchedSliders.length > 0 && (
        <div>
          <div className={resultHeading}>Speed Edit Keys</div>
          <div className="grid grid-cols-2 gap-x-10">
            {matchedSliders.map((r) => (
              <div key={r.id} data-key-row={r.id} className="flex items-center justify-between gap-4 py-[6px]">
                <span className="text-[13px] text-[#e2e2e2]">{r.label}</span>
                <span className="flex items-center gap-2">
                  {unbound.has(sliderMark(r.id)) && <UnboundDot />}
                  <KeyCell
                    sliderId={r.id}
                    bindings={bindings}
                    onSet={(id, key) => {
                      onSetBinding(id, key);
                      if (key) clearUnbound(sliderMark(id));
                    }}
                    onResolve={handleSliderResolve}
                    onInvalid={(message) => setKeyError({ sliderId: r.id, message })}
                    hasError={keyError?.sliderId === r.id}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {matchedSections.map((sec) => (
        <div key={sec.id}>
          <div className={resultHeading}>{sec.title}</div>
          <ShortcutMapSection
            section={sec}
            keys={mapKeys.keys}
            onSetKey={mapKeys.setKey}
            onFlash={flashMessage}
            sliderBindings={bindings}
            sliderDefs={sliderDefs}
            onUnbindSlider={unbindSliderForMap}
          />
        </div>
      ))}
    </div>
  );

  const body = (
    <>
      {/* Header */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        {/* Close sits top-right (Esc closes too). */}
        <div className="flex items-center justify-between gap-4">
            <div className="text-[15px] font-semibold text-[#e2e2e2]">Keyboard Shortcuts</div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[#8a8a8a] hover:bg-[#2a2a2a] hover:text-[#e2e2e2]"
            >
              <X className="h-4 w-4" />
            </button>
        </div>
        {resetFlags.active && (
          <div className="mt-3 flex items-start gap-2.5 rounded-[8px] border border-[#6b5a2a] bg-[#2b2617] px-4 py-3">
            <CircleAlert className="mt-[1px] h-4 w-4 shrink-0 text-[#e2a04a]" />
            {/* Same message as the dialog shown on entry, so the two read as one. */}
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-[#e2e2e2]">
                {resetFlags.kind === 'reset' ? 'Your keyboard shortcuts were reset' : "We've updated keyboard shortcuts"}
              </span>
              <span className="mt-0.5 block text-[12px] leading-[17px] text-[#ababab]">
                {resetFlags.kind === 'reset'
                  ? "Many of your custom keys clashed with new shortcuts in this update, so we've restored the defaults. Sections marked with ! show which keys changed."
                  : 'A few of your custom keys had to change. Sections marked with ! show which ones.'}
              </span>
            </span>
            <button onClick={dismissResetBanner} aria-label="Dismiss" className="shrink-0 text-[#8a8a8a] hover:text-[#e2e2e2]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Vertical tabs: group headers with their sections. */}
          <nav className="w-[200px] shrink-0 overflow-y-auto pl-5 pr-3 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#303030]">
            <div className="sticky top-0 z-10 bg-[#1c1c1c] pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6f6f6f]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Esc clears the search first, instead of closing the modal.
                    if (e.key === 'Escape' && query) {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuery('');
                    }
                  }}
                  placeholder="Search shortcuts"
                  className="h-[32px] w-full rounded-[6px] border border-[#303030] bg-[#141414] pl-8 pr-7 text-[13px] text-[#e2e2e2] outline-none placeholder:text-[#6f6f6f] focus:border-[#6f6f6f]"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8a8a8a] hover:text-[#e2e2e2]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            {SHORTCUT_MAP.map((group) => (
              <div key={group.id} className="mb-3">
                <div className="px-1 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#ababab]">
                  {group.title}
                </div>
                {group.sections.map((sec) => {
                  const active = sec.id === sectionId;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setQuery('');
                        setSectionId(sec.id);
                      }}
                      data-tour={
                        sec.id === 'global.speedEdit'
                          ? 'kb-tab-speededit'
                          : sec.id === 'global.imageProperties'
                          ? 'kb-tab-shortcuts'
                          : undefined
                      }
                      className={`flex w-full items-center justify-between border-l-2 rounded-r-[6px] px-3 py-[7px] text-left text-[13px] transition-colors ${
                        active
                          ? 'border-[#e2e2e2] bg-[#2a2a2a] text-[#e2e2e2]'
                          : 'border-transparent text-[#8a8a8a] hover:text-[#cfcfcf]'
                      }`}
                    >
                      {sec.title}
                      <span className="flex items-center gap-1.5">
                        {(sectionFlagged(sec.id) || sectionUnbound(sec.id)) && flagDot}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

        {/* Section content */}
        <div
          data-tour="kb-body"
          className={`flex-1 min-w-0 overflow-y-auto border-l border-[#2a2a2a] px-7 pb-5 flex flex-col gap-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#303030]`}
        >
          {searching ? (
            searchResults
          ) : (
          <>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="text-[14px] font-semibold text-[#e2e2e2]">{section.title}</div>
              {/* How a speed edit works: hold the key, then arrows or the mouse. */}
              {section.speedEdit && shortcutMode === 'hold' && (
                <span className="flex items-center gap-1.5 text-[11px] text-[#8a8a8a]">
                  <span className={HOW_TAG}>Hold a key</span>
                  +
                  <span className={HOW_TAG}>← → ↑ ↓</span>
                  or
                  <span className={HOW_TAG}>Scroll / drag</span>
                  <span className={`${HOW_TAG} ml-1`}>⇧ for 5× steps</span>
                </span>
              )}
            </div>
          </div>

          {section.speedEdit && shortcutMode === 'modifier' && (
            <div className="flex items-center gap-3 rounded-[6px] border border-[#303030] bg-[#222] px-3 py-2.5">
              <span className="text-[12px] text-[#ababab]">
                When a slider shares a fixed shortcut's key, hold
              </span>
              <div className="flex items-center gap-1">
                {(Object.keys(MODIFIER_LABELS) as ShortcutModifier[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => writeShortcutModifier(m)}
                    className={`h-[24px] rounded-[5px] px-2 text-[11px] font-medium ${
                      modifier === m ? 'bg-[#e2e2e2] text-[#1c1c1c]' : 'bg-[#333] text-[#e2e2e2] hover:bg-[#3d3d3d]'
                    }`}
                  >
                    {MODIFIER_LABELS[m]}
                  </button>
                ))}
              </div>
              <span className="text-[12px] text-[#ababab]">to run the shortcut.</span>
            </div>
          )}

          {section.speedEdit && (
            <div>
          <div className="grid grid-cols-2 gap-x-12 items-start">
          {(() => {
            const total = sections.reduce((n, sec) => n + sec.rows.length, 0);
            const columns: (typeof sections)[] = [[], []];
            let used = 0;
            for (const sec of sections) {
              // Fill the left column until it holds about half the rows.
              columns[used < total / 2 ? 0 : 1].push(sec);
              used += sec.rows.length;
            }
            return columns.map((col, colIndex) => (
              <div key={colIndex}>
          {col.map((section) => {
            // Sections are always expanded — there's no collapse control.
            const isOpen = true;

            return (
              <div key={section.id} className="mb-5">
                <div
                  className="text-[12px] font-semibold uppercase text-[#e2e2e2] mb-1"
                  style={{ letterSpacing: '0.4px' }}
                >
                  {section.title}
                </div>
                {isOpen && (
                  <div className="pt-2 flex flex-col gap-1">
                    {section.rows.map((row) => {
                      return (
                        <div key={row.id} data-key-row={row.id}>
                        <div className="flex items-center justify-between gap-4 py-[5px] pr-1">
                          <span className="shrink-0 text-[13px] text-[#e2e2e2]">{row.label}</span>
                          <span className="flex min-w-0 items-center gap-2">
                          {/* Delayed Hold explains "hold" once, in the rail and header, instead. */}
                          {shortcutMode !== 'hold' && fixedConflictFor(row.id) && (
                            <span
                              title={
                                shortcutMode === 'modifier'
                                  ? `${bindings[row.id]?.toUpperCase()} quick-edits this slider; ${MODIFIER_SHORT[modifier]} ${bindings[row.id]?.toUpperCase()} runs ${fixedConflictFor(row.id)}.`
                                  : `Press once to quick-edit this slider, twice for ${fixedConflictFor(row.id)}.`
                              }
                              className="inline-flex min-w-0 max-w-[200px] items-center gap-[5px] rounded-[6px] border border-[#3b5b9e] bg-[#1e2740] px-2 py-[3px] text-[11px] text-[#e2e2e2]"
                            >
                              {shortcutMode === 'modifier' ? (
                                <>
                                  <span className="truncate">For {shortShortcutLabel(fixedConflictFor(row.id)!)}, Press</span>
                                  <span className="inline-flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-[3px] bg-white px-[3px] text-[9px] font-bold text-[#1c1c1c]">
                                    {MODIFIER_SHORT[modifier]}
                                  </span>
                                  <span className="inline-flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-[3px] bg-white px-[3px] text-[9px] font-bold text-[#1c1c1c]">
                                    {bindings[row.id]?.toUpperCase()}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="truncate">For {shortShortcutLabel(fixedConflictFor(row.id)!)}, Press</span>
                                  <span className="inline-flex h-[15px] min-w-[15px] shrink-0 items-center justify-center rounded-[3px] bg-white px-[3px] text-[9px] font-bold text-[#1c1c1c]">
                                    {bindings[row.id]?.toUpperCase()}
                                  </span>
                                  <span className="shrink-0">twice</span>
                                </>
                              )}
                            </span>
                          )}
                          {unbound.has(sliderMark(row.id)) && <UnboundDot />}
                          <KeyCell
                            sliderId={row.id}
                            bindings={bindings}
                            onSet={(id, key) => {
                              onSetBinding(id, key);
                              if (key) clearUnbound(sliderMark(id));
                            }}
                            onResolve={handleSliderResolve}
                            onInvalid={(message) => setKeyError({ sliderId: row.id, message })}
                            hasError={keyError?.sliderId === row.id}
                          />
                          </span>
                        </div>
                        {keyError?.sliderId === row.id && (
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
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
              </div>
            ));
          })()}
          </div>
            </div>
          )}

          <ShortcutMapSection
            section={section}
            keys={mapKeys.keys}
            onSetKey={mapKeys.setKey}
            onFlash={flashMessage}
            sliderBindings={bindings}
            sliderDefs={sliderDefs}
            onUnbindSlider={unbindSliderForMap}
          />
          </>
          )}
        </div>
      </div>

      {flash && (
        <div className={`mx-6 mt-2 flex items-center gap-3 rounded-[8px] border border-[#6b5a2a] bg-[#2b2617] px-4 py-3 text-[13px] leading-[18px] text-[#e2e2e2] shrink-0`}>
          <span className="min-w-0 flex-1">{flash.message}</span>
          {flash.target && (
            <>
              <button
                onClick={() => goToTarget(flash.target!)}
                className="h-[28px] shrink-0 whitespace-nowrap rounded-[6px] border border-[#8a7434] px-3 text-[12px] font-medium text-[#e2e2e2] hover:bg-[#3a321c]"
              >
                Set a key for {flash.target.label}
              </button>
              <button onClick={() => setFlash(null)} aria-label="Dismiss" className="shrink-0 text-[#8a8a8a] hover:text-[#e2e2e2]">
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer: section actions together on the right (close is the ✕ up top). */}
      {hasEditable && (
        <div className={`flex items-center justify-between gap-3 border-t border-[#2a2a2a] px-6 py-4 shrink-0`}>
          {/* Empty span keeps Revert to default on the right when there's no status. */}
          <span className="text-[12px] text-[#ababab]">{status}</span>
          <button
            onClick={revertSection}
            // Also off while searching: results span sections, so it'd reset one you can't see.
            disabled={sectionAtDefault || searching}
            className={tertiaryBtn}
          >
            Revert to default
          </button>
        </div>
      )}
    </>
  );

  return (
    <div
      // Room above the modal only when the mode pill sits there; otherwise centred.
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 ${onChangeShortcutMode ? 'pt-12' : ''}`}
      onClick={onClose}
    >
      <div
        className={`relative w-[960px] h-[680px] ${onChangeShortcutMode ? 'max-h-[calc(100vh-5rem)]' : 'max-h-[88vh]'} max-w-[94vw] bg-[#1c1c1c] border border-[#303030] rounded-[8px] flex flex-col text-[#e2e2e2] shadow-2xl`}
        style={{ fontFamily: 'Geist, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prototype control, not part of the product modal: sits just above its
            top-right corner, outside the box. Hidden when the prototype is
            locked to one mode (no Change). */}
        {onChangeShortcutMode && (
          <div
            className="absolute bottom-full right-0 mb-2 flex items-center gap-2 rounded-full border border-[#303030] bg-[#1c1c1c] px-3 py-1.5 text-[12px] text-[#8a8a8a] shadow-lg"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            <span>
              Mode: <span className="text-[#e2e2e2]">{MODE_LABELS[shortcutMode]}</span>
            </span>
            <button
              onClick={onChangeShortcutMode}
              className="rounded-[4px] px-1.5 py-0.5 text-[#9ab6ff] hover:bg-[#2a2a2a]"
            >
              Change
            </button>
          </div>
        )}
        {body}
      </div>
    </div>
  );
}
