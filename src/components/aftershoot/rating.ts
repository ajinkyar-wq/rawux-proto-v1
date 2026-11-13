// Single source of truth for the rating ↔ color mapping shared by the
// FilterBar (star + color filters), the CanvasGrid tiles, and the side-panel
// Cull Filters. Rating is 1..5; 0 means unrated.
//
//   5 = green, 4 = blue, 3 = yellow, 2 = red, 1 = purple.

export type ColorName = "green" | "blue" | "yellow" | "red" | "purple";

export const RATING_TO_COLOR_NAME: Record<number, ColorName> = {
  5: "green",
  4: "blue",
  3: "yellow",
  2: "red",
  1: "purple",
};

export const COLOR_NAME_TO_RATING: Record<ColorName, number> = {
  green: 5,
  blue: 4,
  yellow: 3,
  red: 2,
  purple: 1,
};

// Hex values used to render swatches/chips for each rating color.
export const COLOR_HEX: Record<ColorName, string> = {
  green: "#1f7a3a",
  blue: "#2f6dd0",
  yellow: "#b8862b",
  red: "#c2392f",
  purple: "#7b3fd6",
};

export function ratingColorHex(rating: number): string {
  const name = RATING_TO_COLOR_NAME[rating];
  return name ? COLOR_HEX[name] : "#3a3a3a";
}
