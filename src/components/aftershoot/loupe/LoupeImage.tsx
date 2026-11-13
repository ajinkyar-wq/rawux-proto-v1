import { photoUrl } from "../cull-data";

// Loupe canvas. `zoom` (0-100) scales the image from fit (1x) up to 3x.
export function LoupeImage({
  image,
  overlay,
  zoom = 0,
}: {
  image: number;
  overlay?: React.ReactNode;
  zoom?: number;
}) {
  const scale = 1 + (zoom / 100) * 2;
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#1c1c1c] p-4">
      <div
        className="relative h-full w-full overflow-hidden rounded-sm bg-[#252525] transition-transform duration-150"
        style={{ transform: `scale(${scale})` }}
      >
        <img
          src={photoUrl(image, 1600)}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
        {overlay}
      </div>
    </div>
  );
}
