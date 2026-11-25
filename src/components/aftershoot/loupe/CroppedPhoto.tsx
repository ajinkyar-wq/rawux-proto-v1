import { cropAspect, type CropRect } from "./crop-config";

// Shows only the cropped part of a 3:2 photo, filling its box. The box must
// already have the crop's shape (filmstrip / duplicates strip tiles), or use
// FittedCroppedPhoto to fit the crop inside a box of another shape (grid).
export function CroppedPhoto({
  src,
  crop,
  className = "",
  style,
}: {
  src: string;
  crop: CropRect;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <img
        src={src}
        alt=""
        draggable={false}
        loading="lazy"
        className="absolute max-w-none"
        style={{
          width: `${(100 / crop.w) * 100}%`,
          height: `${(100 / crop.h) * 100}%`,
          left: `${(-crop.x / crop.w) * 100}%`,
          top: `${(-crop.y / crop.h) * 100}%`,
        }}
      />
    </div>
  );
}

// The cropped photo fitted (contain) and centred inside a 3:2 box: a portrait
// crop shows as a narrow frame with space either side, a wide crop with space
// above and below. The box itself never changes size.
export function FittedCroppedPhoto({
  src,
  crop,
  className = "",
  frameClassName = "",
  image,
}: {
  src: string;
  crop: CropRect;
  /** The outer 3:2 box. */
  className?: string;
  /** The fitted photo frame (rounding etc.). */
  frameClassName?: string;
  /** Album image id, for the photo's native aspect. */
  image: number;
}) {
  const a = cropAspect(crop, image);
  const BOX = 3 / 2;
  const size =
    a >= BOX
      ? { width: "100%", height: `${(BOX / a) * 100}%` }
      : { width: `${(a / BOX) * 100}%`, height: "100%" };
  return (
    <div className={`flex aspect-[3/2] w-full items-center justify-center ${className}`}>
      <CroppedPhoto src={src} crop={crop} className={frameClassName} style={size} />
    </div>
  );
}
