import { useCallback, useMemo, useState } from "react";
import { CULL_IMAGES } from "./cull-data";
import { imageOf, stackRating } from "./duplicates";

// Shared rating state for the whole screen so the grid tiles and the loupe
// bottom-bar rating chip stay in sync — rating an image in one place updates
// it everywhere.
//
// Resolution order for a given image: a manual override wins; otherwise the
// image carries its AI cull rating once cull has run; before that it's unrated
// (0 → grey).
export function useRatings(rated: boolean) {
  const [overrides, setOverrides] = useState<Record<number, number>>({});

  const setRating = useCallback((id: number, value: number) => {
    setOverrides((prev) => ({ ...prev, [id]: value }));
  }, []);

  const ratingOf = useCallback(
    (id: number) => {
      const override = overrides[id];
      if (override !== undefined) return override;
      if (!rated) return 0;
      // Duplicate stacks: the filmstrip photo is the 5★ pick, the rest 1–4★.
      const inStack = stackRating(id);
      if (inStack !== undefined) return inStack;
      return CULL_IMAGES[imageOf(id) % CULL_IMAGES.length].rating;
    },
    [overrides, rated],
  );

  return useMemo(() => ({ ratingOf, setRating }), [ratingOf, setRating]);
}

export type Ratings = ReturnType<typeof useRatings>;
