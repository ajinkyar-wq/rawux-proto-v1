import { Star } from "lucide-react";
import { ratingColorHex } from "./rating";

// A rounded rating pill that ALWAYS shows 5 stars; `rating` of them are filled.
// The pill color is derived from the rating. Clicking a star sets the rating
// (clicking the current top star again clears back to 0 → no rating).
//
// Shared by the grid tiles (CanvasGrid) and the loupe bottom bar so a given
// image shows the same rating everywhere and edits stay in sync.
export function RatingChip({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (value: number) => void;
}) {
  const color = ratingColorHex(rating);
  return (
    <span
      className="flex items-center gap-0.5 rounded-full px-2 py-1"
      style={{ backgroundColor: color }}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const value = i + 1;
        const filled = value <= rating;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
            onClick={(e) => {
              e.stopPropagation(); // don't trigger tile select
              onRate(value === rating ? 0 : value);
            }}
            className="leading-none"
          >
            <Star
              className={`h-3 w-3 ${filled ? "fill-white text-white" : "fill-white/30 text-white/30"}`}
              strokeWidth={0}
            />
          </button>
        );
      })}
    </span>
  );
}
