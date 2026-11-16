import { useCallback, useEffect, useRef, useState } from 'react';

// The single shortcut map behind the Keyboard Shortcuts modal.
//
// Hierarchy: Group (rail header) -> Section (rail item) -> Block (sub-heading)
// -> Row. A row is either EDITABLE (`id` + `key`, one rebindable key) or
// FIXED (`keys`, read-only keycaps).
//
// Key scopes:
//  - global keys work everywhere, so they clash with every other key;
//  - grid / loupe / survey / edit / retouch keys only clash with global keys
//    and their own scope (set per section).
// Speed Edit (slider) keys live under Global but are handled separately: they
// may share a key with any shortcut (single press = slider, double = shortcut).

/** Where a key works. Rows in different scopes (other than global) may share a key. */
export type GroupId = 'global' | 'grid' | 'loupe' | 'survey' | 'edit' | 'retouch';
export type Tone = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'clear';

export interface MapRow {
  label: string;
  /** Editable row: storage id + default key. */
  id?: string;
  key?: string;
  /** Fixed row: keycaps shown as-is. */
  keys?: string[];
  /** Colour-label rows keep their label colour. */
  tone?: Tone;
  /** Star-rating rows show this many stars (as the app's rating pill) instead
   *  of "N Stars" in the name. */
  stars?: number;
  /** Where this key works, when it differs from its section (e.g. a tab switch
   *  listed under Global → Navigation that only works in Edit). */
  scope?: GroupId;
  /** Compact name for the "press twice" chip on a Speed Edit row. */
  short?: string;
  /** Other places a FIXED row's keys also work (protected from clashes there). */
  alsoIn?: GroupId[];
  /** A second, fixed key for the same action (e.g. ↓ beside "."), and where it works. */
  secondKey?: { key: string; scopes: GroupId[] };
}

export interface MapBlock {
  title?: string;
  rows: MapRow[];
}

export interface MapSection {
  id: string;
  title: string;
  /** One line under the title explaining when these keys work. */
  rule: string;
  blocks: MapBlock[];
  /** Where these keys work (defaults to global). */
  scope?: GroupId;
  /** Global → Speed Edit Keys renders the slider keys instead of blocks. */
  speedEdit?: boolean;
}

export interface MapGroup {
  id: string;
  title: string;
  sections: MapSection[];
}

const e = (label: string, id: string, key: string, short?: string, tone?: Tone): MapRow => ({ label, id, key, short, tone });
const f = (label: string, ...keys: string[]): MapRow => ({ label, keys });

const GLOBAL_RULE = "Works everywhere. These keys can't be reused anywhere else.";
const VIEW_RULE = 'Only in this view. Keys may repeat in the other Cull views.';
/** A fixed row whose keys also work elsewhere: protect them there too. */
const worksIn = (row: MapRow, alsoIn: GroupId[]): MapRow => ({ ...row, alsoIn });

// Grouped as in the PRD: 8 sections by what the user is doing. General holds
// only shortcuts that work in every tab; a shortcut that only works in one tab
// or tool lives in that section, and view-only keys say so in their name.
export const SHORTCUT_MAP: MapGroup[] = [
  {
    id: 'general',
    title: 'General',
    sections: [
      {
        id: 'global.imageProperties',
        title: 'Rate & Label',
        rule: GLOBAL_RULE,
        blocks: [
          {
            title: 'Stars',
            rows: [
              { ...e('Assign 1 Star to an image', 'star1', '1'), stars: 1 },
              { ...e('Assign 2 Stars to an image', 'star2', '2'), stars: 2 },
              { ...e('Assign 3 Stars to an image', 'star3', '3'), stars: 3 },
              { ...e('Assign 4 Stars to an image', 'star4', '4'), stars: 4 },
              { ...e('Assign 5 Stars to an image', 'star5', '5'), stars: 5 },
              e('Clear star rating of an image', 'star0', '0'),
            ],
          },
          {
            title: 'Colors',
            rows: [
              e('Assign Red color to an image', 'colorRed', '6', 'Red', 'red'),
              e('Assign Yellow color to an image', 'colorYellow', '7', 'Yellow', 'yellow'),
              e('Assign Green color to an image', 'colorGreen', '8', 'Green', 'green'),
              e('Assign Blue color to an image', 'colorBlue', '9', 'Blue', 'blue'),
              e('Assign Purple color to an image', 'colorPurple', '-', 'Purple', 'purple'),
              e('Clear color label of an image', 'colorClear', '=', 'Clear label', 'clear'),
            ],
          },
          {
            title: 'Image Status',
            rows: [
              e('Mark the image as Selected', 'select', 'A', 'Select'),
              e('Reject image and remove all ratings', 'reject', 'X', 'Reject'),
              e('Flag the Image', 'flag', 'D', 'Flag'),
            ],
          },
        ],
      },
      {
        id: 'global.navigation',
        title: 'Navigate & Select',
        rule: GLOBAL_RULE,
        blocks: [
          {
            title: 'Move',
            rows: [
              f('Move to next image (set in Survey)', '→'),
              f('Move to previous image (set in Survey)', '←'),
              worksIn({ ...f('Move up', '↑'), scope: 'grid' }, ['loupe', 'survey']),
              worksIn({ ...f('Move down', '↓'), scope: 'grid' }, ['loupe', 'survey']),
              { ...f('Page up (Grid)', '⌥', '↑'), scope: 'grid' },
              { ...f('Page down (Grid)', '⌥', '↓'), scope: 'grid' },
            ],
          },
          {
            title: 'Views',
            rows: [
              e('Go to Grid view', 'gridView', 'G', 'Grid view'),
              e('Go to loupe view', 'loupeView', 'L', 'Loupe view'),
              e('Go to survey mode', 'surveyMode', 'N', 'Survey'),
              e('Show/Hide the right drawer', 'drawer', '/', 'Drawer'),
              f('Go back to the previous screen', 'Esc'),
            ],
          },
          {
            title: 'Select',
            rows: [
              worksIn({ ...f('Select next image(s) (add set in Survey)', '⇧', '→'), scope: 'grid' }, ['survey']),
              worksIn({ ...f('Select previous image(s) (add set in Survey)', '⇧', '←'), scope: 'grid' }, ['survey']),
              e('Select none', 'selectNone', '⌘D', 'Select none'),
              f('Select all', '⌘', 'A'),
              f('Add or remove one image', '⌘', 'Click'),
              f('Select a range', '⇧', 'Click'),
            ],
          },
        ],
      },
      {
        id: 'general.canvas',
        title: 'Canvas',
        rule: GLOBAL_RULE,
        blocks: [
          {
            rows: [
              e('Zoom In/Out', 'zoom', 'Space', 'Zoom'),
              e('Open the current image in fullscreen', 'loupe.fullscreen', 'F', 'Full screen'),
              f('Zoom with trackpad', 'Pinch'),
            ],
          },
        ],
      },
      {
        id: 'global.others',
        title: 'Others',
        rule: GLOBAL_RULE,
        blocks: [
          {
            rows: [
              e('Open image info', 'loupe.imageInfo', 'I', 'Image info'),
              e('Rotate Image Left (90° in Crop)', 'rotateLeft', '⌘[', 'Rotate left'),
              e('Rotate Image Right (90° in Crop)', 'rotateRight', '⌘]', 'Rotate right'),
              e('Export', 'export', '⇧⌘E', 'Export'),
              e('Contact Support', 'support', 'F1', 'Support'),
              e('New project', 'newProject', '⌘N', 'New project'),
              e('Preferences', 'preferences', '⌘,', 'Preferences'),
              f('Delete the current image from Aftershoot', '⌫'),
              f('Undo', '⌘', 'Z'),
              f('Redo', '⌘', '⇧', 'Z'),
              f('Minimise window', '⌘', 'M'),
              f('Close window', '⌘', 'W'),
              f('Hide Aftershoot', '⌘', 'H'),
              f('Quit Aftershoot', '⌘', 'Q'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'culling',
    title: 'Culling',
    sections: [
      {
        id: 'cull.duplicates',
        title: 'Duplicates & Faces',
        // Cull-only keys work in Grid, Loupe and Survey alike.
        scope: 'global',
        rule: 'Only while culling.',
        blocks: [
          {
            title: 'Duplicate sets',
            rows: [
              e('Show next duplicate set', 'nextSet', "'", 'Next set'),
              e('Show previous duplicate set', 'prevSet', ';', 'Previous set'),
              e('Show the next image in duplicate set', 'nextInSet', '.', 'Next in set'),
              e('Show the previous image in duplicate set', 'prevInSet', ',', 'Previous in set'),
              e('Swap the image', 'swap', 'S', 'Swap'),
              e('Reject all images from a duplicate set', 'rejectSet', 'Z', 'Reject set'),
              e('Delete whole duplicate set', 'deleteSet', '⇧⌫', 'Delete set'),
              { ...f('Remove image from view (Survey)', '⌘', 'Click'), scope: 'survey' },
            ],
          },
          {
            title: 'Faces',
            rows: [
              e('Show/hide key face scores', 'faceScores', 'Q', 'Face scores'),
              { ...f('Show the next face (Loupe)', '⌥', '→'), scope: 'loupe' },
              { ...f('Show the previous face (Loupe)', '⌥', '←'), scope: 'loupe' },
              e('Toggle Spray Can mode', 'sprayCan', '⌘K', 'Spray Can'),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'editing',
    title: 'Editing',
    sections: [
      {
        id: 'global.speedEdit',
        title: 'Speed Edit Keys',
        // Shown per shortcut mode instead (see KeyBindingsPanel).
        rule: '',
        speedEdit: true,
        blocks: [],
      },
      {
        // Edit and Retouch share these; rows tagged (Edit) or (Retouch) only work there.
        id: 'edit.sliders',
        title: 'Edit & Retouch',
        scope: 'edit',
        rule: 'Only in the Edit and Retouch screens.',
        blocks: [
          {
            title: 'Sliders',
            rows: [
              worksIn(f('Cycle forward through sliders', 'Tab'), ['retouch']),
              worksIn(f('Cycle backward through sliders', '⇧', 'Tab'), ['retouch']),
              worksIn(f('Increment slider value by 1', '↑'), ['retouch']),
              worksIn(f('Decrement slider value by 1', '↓'), ['retouch']),
              worksIn(f('Increment slider value by 5', '⇧', '↑'), ['retouch']),
              worksIn(f('Decrement slider value by 5', '⇧', '↓'), ['retouch']),
              // Esc lets go of a focused slider; with no slider focused it goes back.
              worksIn(f('Let go of the slider', 'Esc'), ['retouch']),
            ],
          },
          {
            title: 'Edits',
            rows: [
              { ...e('Toggle Before-After', 'beforeAfter', '\\', 'Before / After'), scope: 'global' },
              { ...e('Show History', 'history', 'H', 'History'), scope: 'global' },
              { ...e('Reset all sliders', 'resetAll', '⇧⌘R', 'Reset all'), scope: 'global' },
              worksIn(f('Copy edit settings', '⌘', 'C'), ['retouch']),
              worksIn(f('Paste edit settings', '⌘', 'V'), ['retouch']),
              e('Toggle clipping warning (Edit)', 'clipping', 'J', 'Clipping'),
              { ...e('Show edited photo (Edit, Grid)', 'showEdited', '⇧M', 'Show edited'), scope: 'global' },
              f('Save (Edit)', '⌘', 'S'),
            ],
          },
          {
            title: 'Retouch',
            rows: [
              { ...e('Go to subject tab (Retouch)', 'subjectTab', '⇧F', 'Subject tab'), scope: 'retouch' },
              { ...e('Go to background tab (Retouch)', 'backgroundTab', '⇧B', 'Background tab'), scope: 'retouch' },
              { ...e('Go to patch tab (Retouch)', 'patchTab', '⇧J', 'Patch tab'), scope: 'retouch' },
              { ...e('Create preset (Retouch)', 'createPreset', '⇧⌘N', 'Create preset'), scope: 'retouch' },
              { ...e('Sync preset (Retouch)', 'syncPreset', '⇧⌘S', 'Sync preset'), scope: 'retouch' },
            ],
          },
        ],
      },
      {
        // Open / close work in the Edit loupe; the other keys while the tool is open.
        id: 'edit.cropMasking',
        title: 'Crop & Masking',
        scope: 'edit',
        rule: 'Only while Crop or Masking is open.',
        blocks: [
          {
            title: 'Crop',
            rows: [
              e('Navigate to crop tab', 'crop', 'R', 'Crop'),
              e('Reverse aspect ratio', 'reverseAspect', '⇧X', 'Reverse aspect'),
              f('Apply crop', 'Enter'),
            ],
          },
          {
            title: 'Masking',
            rows: [
              e('Navigate to masking tab', 'masking', 'M', 'Masking'),
              e('Show/Hide Overlay', 'overlay', 'O', 'Overlay'),
              e('Enable/Disable Brush', 'brush', 'K', 'Brush'),
              e('Add Brush Mask', 'brushMask', 'B', 'Brush mask'),
              e('Decrease brush size (also Retouch)', 'brushSmaller', '[', 'Brush size −'),
              e('Increase brush size (also Retouch)', 'brushLarger', ']', 'Brush size +'),
              e('Decrease brush softness', 'softnessLess', '⇧[', 'Softness −'),
              e('Increase brush softness', 'softnessMore', '⇧]', 'Softness +'),
              f('Switch between brush and eraser', '⌥'),
              f('Pan the image (also Retouch)', '⇧'),
            ],
          },
        ],
      },
    ],
  },
];

// ---- Derived lookups ------------------------------------------------------

export type Located = { row: MapRow; group: GroupId; section: MapSection };

export const ALL_ROWS: Located[] = SHORTCUT_MAP.flatMap((g) =>
  g.sections.flatMap((s) => s.blocks.flatMap((b) => b.rows.map((row) => ({ row, group: row.scope ?? s.scope ?? 'global', section: s })))),
);

// Each shortcut is listed once (tags say where else it works). Should an id
// ever appear twice, the first row owns the setting.
export const EDITABLE_ROWS = ALL_ROWS.filter(
  (l, i) => l.row.id && ALL_ROWS.findIndex((o) => o.row.id === l.row.id) === i,
);
export const ROW_BY_ID: Record<string, Located> = Object.fromEntries(EDITABLE_ROWS.map((l) => [l.row.id!, l]));
export const DEFAULT_KEYS: MapKeys = Object.fromEntries(EDITABLE_ROWS.map((l) => [l.row.id!, l.row.key!]));

/** Global keys clash with everything; a view's keys only with global + itself. */
export const scopesOverlap = (a: GroupId, b: GroupId) => a === 'global' || b === 'global' || a === b;

// ---- Key combos -----------------------------------------------------------
// A key is stored as one string: modifiers in Mac order, then the key
// ("⇧⌘E", "⌘[", "F1", "Space", "A").

const MOD_ORDER = ['⌃', '⌥', '⇧', '⌘'];

/** Fixed rows list keycaps separately ('⌘', '⇧', 'Z'); join them the same way. */
export const comboOf = (keys: string[]) =>
  [...keys.filter((k) => MOD_ORDER.includes(k)).sort((a, b) => MOD_ORDER.indexOf(a) - MOD_ORDER.indexOf(b)),
   ...keys.filter((k) => !MOD_ORDER.includes(k))].join('');

const CODE_KEYS: Record<string, string> = {
  Space: 'Space', Backspace: '⌫', Delete: '⌫', Tab: 'Tab', Enter: 'Enter', NumpadEnter: 'Enter',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.',
  Slash: '/', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`',
};

/** The combo a key press records, by physical key (so ⌥+letter is the letter). */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const c = e.code;
  const key = /^Key[A-Z]$/.test(c) ? c.slice(3)
    : /^Digit[0-9]$/.test(c) ? c.slice(5)
    : /^F([1-9]|1[0-2])$/.test(c) ? c
    : CODE_KEYS[c];
  if (!key) return null;
  const mods = [e.ctrlKey && '⌃', e.altKey && '⌥', e.shiftKey && '⇧', e.metaKey && '⌘'].filter(Boolean) as string[];
  return mods.join('') + key;
}

/** Keys the OS keeps for itself. */
export const SYSTEM_COMBOS = new Set(['⌘Space', '⌃Space', '⌘Tab', '⇧⌘3', '⇧⌘4', '⇧⌘5']);
/** Keys a press shortcut can never use. */
export const UNASSIGNABLE_KEYS = new Set(['Tab', 'Enter']);

/** Fixed keys (e.g. Undo's ⌘Z, the arrows), which an editable row can never take. */
export const FIXED_KEYS: Array<{ key: string; label: string; group: GroupId; section: string }> = [
  ...ALL_ROWS.filter(
    (l) => l.row.keys && !l.row.keys.some((k) => k === 'Click' || k === 'Pinch') && !l.row.keys.every((k) => MOD_ORDER.includes(k)),
  ).flatMap((l) =>
    [l.group, ...(l.row.alsoIn ?? [])].map((group) => ({
      key: comboOf(l.row.keys!).toLowerCase(),
      label: l.row.label,
      group,
      section: l.section.title,
    })),
  ),
  // A row's second key (e.g. ↓ for next in set) is fixed wherever it works.
  ...ALL_ROWS.filter((l) => l.row.secondKey).flatMap((l) =>
    l.row.secondKey!.scopes.map((group) => ({
      key: l.row.secondKey!.key.toLowerCase(),
      label: l.row.label,
      group,
      section: l.section.title,
    })),
  ),
];

export type MapKeyOutcome =
  | { kind: 'assign' }
  | { kind: 'error'; label: string }
  | { kind: 'notice'; message: string; ownerId?: string };

/**
 * What happens when an editable row records `raw` (same in the modal and the
 * update dialog):
 *  - a fixed shortcut in an overlapping scope holds it -> blocked;
 *  - another editable shortcut there holds it          -> reassigned here;
 *  - a Speed Edit key holds it                         -> shared (tap / hold).
 */
export function resolveMapKey(
  keys: MapKeys,
  id: string,
  raw: string,
  sliderKeys: Record<string, string> = {},
  sliderLabel: (sliderId: string) => string = (s) => s,
): MapKeyOutcome {
  const k = raw.toLowerCase();
  const K = raw.length === 1 ? raw.toUpperCase() : raw;
  if (keys[id]?.toLowerCase() === k) return { kind: 'assign' };
  const self = ROW_BY_ID[id];
  const fixed = FIXED_KEYS.find((x) => x.key === k && scopesOverlap(self.group, x.group));
  if (fixed) return { kind: 'error', label: `${fixed.label} (${fixed.section})` };
  const ownerId = Object.entries(keys).find(
    ([other, v]) => other !== id && v.toLowerCase() === k && scopesOverlap(self.group, ROW_BY_ID[other].group),
  )?.[0];
  if (ownerId) {
    const owner = ROW_BY_ID[ownerId];
    return {
      kind: 'notice',
      message: `${K} is used by ${owner.row.label} (${owner.section.title}) and will be reassigned.`,
      ownerId,
    };
  }
  if (SPEED_EDIT_SCOPE.includes(self.group)) {
    const sliderId = Object.entries(sliderKeys).find(([, b]) => b?.toLowerCase() === k)?.[0];
    if (sliderId) {
      const slider = sliderLabel(sliderId);
      return { kind: 'notice', message: `${K} is also the Speed Edit Key for ${slider}. Tap runs ${self.row.label}, hold adjusts ${slider}.` };
    }
  }
  return { kind: 'assign' };
}

/** Speed Edit keys are global, so they can overlap any shortcut (double press). */
export const SPEED_EDIT_SCOPE: GroupId[] = ['global', 'grid', 'loupe', 'survey', 'edit', 'retouch'];

export const sectionById = (id: string) =>
  SHORTCUT_MAP.flatMap((g) => g.sections).find((s) => s.id === id) ?? SHORTCUT_MAP[0].sections[0];

export const editableIdsIn = (section: MapSection) =>
  section.blocks.flatMap((b) => b.rows.filter((r) => r.id).map((r) => r.id!));

// ---- Persisted keys -------------------------------------------------------

export type MapKeys = Record<string, string>;
const STORAGE_KEY = 'imageAdjusterStudio.shortcutMapKeys';

function readKeys(): MapKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYS };
    const saved = JSON.parse(raw) as Record<string, string | null>;
    const keys = { ...DEFAULT_KEYS };
    for (const id of Object.keys(keys)) if (id in saved) keys[id] = saved[id] ?? '';
    return keys;
  } catch {
    return { ...DEFAULT_KEYS };
  }
}
const KEYS_CHANGED_EVENT = 'shortcutMapKeys:changed';

/** Save, and tell every other mounted `useShortcutMapKeys` (the modal, the
 *  update dialog) so they show the same keys. */
function writeKeys(keys: MapKeys, source?: symbol) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keys)); } catch { /* ignore */ }
  // After the current render: listeners set their own state.
  queueMicrotask(() => window.dispatchEvent(new CustomEvent(KEYS_CHANGED_EVENT, { detail: { keys, source } })));
}

/** Replace every saved key (e.g. with a migrated set) before the editor mounts. */
export const writeShortcutMapKeys = (keys: MapKeys) => writeKeys(keys);
/** Back to defaults: a fresh user. */
export function clearShortcutMapKeys() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

// The modal opens on whatever section was last asked for (e.g. the update
// dialog's "Review shortcuts" jumps to the first affected section).
let requestedSection: string | null = null;
export const requestShortcutSection = (id: string) => { requestedSection = id; };
export const takeRequestedSection = () => {
  const id = requestedSection;
  requestedSection = null;
  return id;
};

/** Persisted, rebindable shortcut keys. The first read is the snapshot Discard
 *  Changes rolls back to; keys set elsewhere (e.g. the update dialog) move that
 *  snapshot too, so Discard only undoes this instance's own changes. */
export function useShortcutMapKeys() {
  const [keys, setKeys] = useState<MapKeys>(readKeys);
  const openedWith = useRef(keys);
  const self = useRef(Symbol('shortcutMapKeys')).current;

  useEffect(() => {
    const onChanged = (e: Event) => {
      const { keys: next, source } = (e as CustomEvent<{ keys: MapKeys; source?: symbol }>).detail;
      if (source === self) return;
      openedWith.current = next;
      setKeys(next);
    };
    window.addEventListener(KEYS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(KEYS_CHANGED_EVENT, onChanged);
  }, [self]);

  /** Assign `key` to `id`; another editable row in an overlapping scope that
   *  holds it is cleared (it "will be reassigned"). */
  const setKey = useCallback((id: string, key: string | null) => {
    setKeys((prev) => {
      const next = { ...prev };
      const k = key ? (key.length === 1 ? key.toUpperCase() : key) : '';
      if (k) {
        const self = ROW_BY_ID[id];
        for (const [otherId, v] of Object.entries(next)) {
          const other = ROW_BY_ID[otherId];
          if (otherId !== id && v.toLowerCase() === k.toLowerCase() && scopesOverlap(self.group, other.group)) {
            next[otherId] = '';
          }
        }
      }
      next[id] = k;
      writeKeys(next, self);
      return next;
    });
  }, [self]);

  /** Restore defaults for just these ids (the section on screen). */
  const resetIds = useCallback((ids: string[]) => {
    setKeys((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = DEFAULT_KEYS[id];
      writeKeys(next, self);
      return next;
    });
  }, [self]);

  /** Put back a whole set of keys at once (e.g. the modal's Discard Changes). */
  const replaceAll = useCallback(
    (next: MapKeys) => {
      setKeys({ ...next });
      writeKeys({ ...next }, self);
    },
    [self],
  );

  const discardChanges = useCallback(() => {
    setKeys(openedWith.current);
    writeKeys(openedWith.current, self);
  }, [self]);

  const changed = JSON.stringify(keys) !== JSON.stringify(openedWith.current);

  return { keys, setKey, resetIds, replaceAll, discardChanges, changed };
}
