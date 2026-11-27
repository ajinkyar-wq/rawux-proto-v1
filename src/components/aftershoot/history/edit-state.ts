import type { AlbumHistory, Effect, Tool } from "./album-history";

// An image's edit state = every value it stores for the editing and retouching
// tools (keys `tool:scope/label`). Anything not stored is at its default, so
// Reset removes keys and Sync copies keys (or their absence) across images.
// Ratings and flags are culling, not edits, and are never touched here.

export const EDIT_TOOLS: Tool[] = ["edit", "crop", "mask", "retouch", "background", "patch"];

// Seeded "earlier edits" store a few summary values under bare keys.
const LEGACY_KEYS: Record<string, Tool> = { preset: "edit", crop: "crop", mask: "mask" };

/** The editing / retouching tool a stored key belongs to (null = not an edit). */
export function toolOfKey(key: string): Tool | null {
  const i = key.indexOf(":");
  if (i < 0) return LEGACY_KEYS[key] ?? null;
  const tool = key.slice(0, i) as Tool;
  return EDIT_TOOLS.includes(tool) ? tool : null;
}

/** Effects that put every edit key of `tools` on `images` back to default. */
export function resetEffects(
  history: AlbumHistory,
  images: number[],
  tools: Tool[] = EDIT_TOOLS,
  match: (key: string) => boolean = () => true,
): Effect[] {
  return images.flatMap((image) =>
    history
      .imageKeys(image)
      .filter((key) => {
        const t = toolOfKey(key);
        return !!t && tools.includes(t) && match(key);
      })
      .map((key) => ({ image, key, prev: history.getValue(image, key), next: undefined })),
  );
}

/**
 * Effects that make each target's matching edit keys equal the source's — a
 * key the source doesn't store is reset to default on the target.
 */
export function syncEffects(
  history: AlbumHistory,
  source: number,
  targets: number[],
  match: (key: string) => boolean,
): Effect[] {
  const isEdit = (key: string) => toolOfKey(key) !== null && match(key);
  const sourceKeys = history.imageKeys(source).filter(isEdit);
  return targets
    .filter((t) => t !== source)
    .flatMap((image) => {
      const keys = new Set([...sourceKeys, ...history.imageKeys(image).filter(isEdit)]);
      return [...keys]
        .map((key) => ({
          image,
          key,
          prev: history.getValue(image, key),
          next: history.getValue(source, key),
        }))
        .filter((e) => e.prev !== e.next);
    });
}
