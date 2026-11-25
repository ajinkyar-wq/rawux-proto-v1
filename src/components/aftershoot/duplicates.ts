// Duplicate sets (placeholder data). Every album image has a set of N photos;
// since these are sample images, each duplicate is the SAME picture repeated.
// Loupe's duplicates strip, the Duplicates panel and Survey Mode all read from
// here so they agree on how many duplicates an image has.
//
// A duplicate needs its own identity (its own rating, its own tile in Survey).
// The first photo of a set (k = 0) is the album image itself; the others get a
// "virtual id" above VIRTUAL_BASE that decodes back to (image, k).

// Stack sizes are pseudo-random per image (stable across renders): mostly
// small stacks with the occasional big one.
const STACK_SIZES = [2, 2, 3, 3, 3, 4, 4, 5, 6, 7, 9, 12, 16];
function stackHash(image: number) {
  let h = Math.imul(image + 1, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  return (h ^ (h >>> 13)) >>> 0;
}

/** Number of photos in an image's duplicate set (the image itself included). */
export const duplicateCount = (image: number) => STACK_SIZES[stackHash(image) % STACK_SIZES.length];

const VIRTUAL_BASE = 1_000_000;
const SLOTS = 1000; // max duplicates per image

/** Id of the k-th photo of an image's set (k = 0 is the image itself). */
export const dupId = (image: number, k: number) =>
  k === 0 ? image : VIRTUAL_BASE + image * SLOTS + k;

/** The album image a photo id belongs to. */
export const imageOf = (id: number) =>
  id >= VIRTUAL_BASE ? Math.floor((id - VIRTUAL_BASE) / SLOTS) : id;

/** Position of a photo id within its image's duplicate set. */
export const dupOf = (id: number) => (id >= VIRTUAL_BASE ? (id - VIRTUAL_BASE) % SLOTS : 0);

/** All photo ids in an image's duplicate set, in order. */
export const duplicateIds = (image: number) =>
  Array.from({ length: duplicateCount(image) }, (_, k) => dupId(image, k));

/** File name of a photo: duplicates get a numeric suffix. */
export const photoName = (id: number) => {
  const base = `DSC0${3000 + imageOf(id)}`;
  const k = dupOf(id);
  return k === 0 ? `${base}.JPG` : `${base}-${k + 1}.JPG`;
};
