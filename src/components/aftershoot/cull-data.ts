import { imageOf } from "./duplicates";

// Shared cull dataset — the single source of truth that BOTH the FilterBar
// (star + color filters) and the side-panel Cull Filters filter against, and
// that the CanvasGrid renders. Each image has a rating; rating maps to a color
// and a cull category (see ./rating).
//
// The label counts shown in the Cull Filters panel are the "real" numbers
// (Selected 90, Highlights 60, …). The grid renders a lighter PROPORTIONAL
// sample (÷10) so we don't draw hundreds of tiles, while the filter math still
// lines up category-by-category.

export type CullCategory = "selected" | "highlights" | "blurred" | "closed-eyes" | "unrated";

// Real counts (shown as labels in the Cull Filters panel).
export const CATEGORY_COUNT: Record<CullCategory, number> = {
  selected: 90,
  highlights: 60,
  blurred: 70,
  "closed-eyes": 45,
  unrated: 5,
};

// rating each category maps to (0 = unrated). 5=green,4=blue,2=red,1=purple.
export const CATEGORY_RATING: Record<CullCategory, number> = {
  selected: 5,
  highlights: 4,
  blurred: 2,
  "closed-eyes": 1,
  unrated: 0,
};

// Proportional sample size per category for the grid (÷10, min 1).
const SAMPLE_DIVISOR = 10;
function sampleCount(c: CullCategory) {
  return Math.max(1, Math.round(CATEGORY_COUNT[c] / SAMPLE_DIVISOR));
}

export type CullImage = {
  id: number;
  name: string;
  category: CullCategory;
  rating: number; // 0..5
};

// Build the proportional sample, interleaving categories so the grid looks
// mixed rather than grouped.
export const CULL_IMAGES: CullImage[] = (() => {
  const order: CullCategory[] = ["selected", "highlights", "blurred", "closed-eyes", "unrated"];
  // Per-category queues of the right length.
  const queues = order.map((c) => Array.from({ length: sampleCount(c) }, () => c));
  const interleaved: CullCategory[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        interleaved.push(next);
        added = true;
      }
    }
  }
  return interleaved.map((category, id) => ({
    id,
    name: `DSC0${3000 + id}.JPG`,
    category,
    rating: CATEGORY_RATING[category],
  }));
})();

// The sample album's photos (src/assets/samples), sorted by filename. Every
// image in the prototype is one of these; ids wrap around when there are more
// tiles than photos. All are 3:2.
const SAMPLE_URLS = Object.entries(
  import.meta.glob("../../assets/samples/*.webp", { eager: true, query: "?url", import: "default" }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url as string);

// Samples that are shot in portrait (4:6) — by sorted index; the rest are 3:2 landscape.
const PORTRAIT_SAMPLES = new Set([5, 10, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 25, 27, 31]);
const sampleIndex = (id: number) => ((id % SAMPLE_URLS.length) + SAMPLE_URLS.length) % SAMPLE_URLS.length;

/** Native width:height of an image's photo (3:2 landscape or 2:3 portrait). */
export const photoAspect = (id: number) => (PORTRAIT_SAMPLES.has(sampleIndex(imageOf(id))) ? 2 / 3 : 3 / 2);

/** Number of distinct sample photos. */
export const SAMPLE_COUNT = SAMPLE_URLS.length;

export const sampleUrl = (n: number) => SAMPLE_URLS[((n % SAMPLE_URLS.length) + SAMPLE_URLS.length) % SAMPLE_URLS.length];

// Photo for an image: the same picture every time for the same id. `width` is
// kept for call-site compatibility; the sample files are used at full size.
export const photoUrl = (id: number, _width = 1200) => sampleUrl(imageOf(id));
