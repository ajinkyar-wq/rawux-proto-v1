import { sliderKey, type AlbumHistory } from "../history/album-history";

// Shared crop definitions: the Crop panel's Aspect Ratio options and how to
// read an image's current crop out of the album history (used by the
// filmstrip to draw each thumbnail at its cropped shape).

export const CROP_ASPECTS = ["Original", "Free", "1:1", "3:2", "4:3", "16:9"] as const;

// Every placeholder photo is 3:2 (see photoUrl in cull-data).
export const PHOTO_ASPECT = 3 / 2;

/** Crop rectangle in % of the photo: x / y from the top-left, w / h size. */
export type CropRect = { x: number; y: number; w: number; h: number };

const FULL: CropRect = { x: 0, y: 0, w: 100, h: 100 };

/** A centred rect of the given width:height ratio inside a 3:2 photo. */
function centred(ratio: number): CropRect {
  if (ratio >= PHOTO_ASPECT) {
    const h = (PHOTO_ASPECT / ratio) * 100;
    return { x: 0, y: (100 - h) / 2, w: 100, h };
  }
  const w = (ratio / PHOTO_ASPECT) * 100;
  return { x: (100 - w) / 2, y: 0, w, h: 100 };
}

/**
 * The image's crop: the crop box if it was dragged, otherwise a centred crop
 * for a picked Aspect Ratio, otherwise the photo's own shape (shotCrop).
 */
export function cropOf(history: AlbumHistory | null, image: number): CropRect {
  if (!history) return FULL;
  const box = (f: keyof CropRect) =>
    history.getValue(image, sliderKey("crop", "Crop", `Crop Box.${f}`));
  const x = box("x");
  const y = box("y");
  const w = box("w");
  const h = box("h");
  if (x !== undefined && y !== undefined && w !== undefined && h !== undefined)
    return { x, y, w, h };

  // The Aspect Ratio dropdown's hook sits outside the panel's "Crop" section,
  // so its value is stored with an empty scope.
  const idx = history.getValue(image, sliderKey("crop", "", "Aspect Ratio"));
  const choice = idx === undefined ? undefined : CROP_ASPECTS[idx];
  if (choice === "Free") return FULL;
  if (choice && choice !== "Original") {
    const [a, b] = choice.split(":").map(Number);
    return centred(a / b);
  }
  return shotCrop(image);
}

// Each photo's own shape as shot / already cropped: a fixed, random-looking
// mix of landscape, portrait, square and wide frames, so the filmstrip varies
// like a real shoot. Same image → same shape every time.
const SHOT_SHAPES = [3 / 2, 3 / 2, 2 / 3, 4 / 5, 1, 16 / 9, 3 / 2, 5 / 4, 2 / 3, 3 / 2];
export function shotCrop(image: number): CropRect {
  let h = image * 2654435761;
  h = (h ^ (h >>> 13)) >>> 0;
  const ratio = SHOT_SHAPES[h % SHOT_SHAPES.length];
  return ratio === PHOTO_ASPECT ? FULL : centred(ratio);
}

/** Width:height of a crop of a 3:2 photo. */
export const cropAspect = (c: CropRect) => (c.w / c.h) * PHOTO_ASPECT;
