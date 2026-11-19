// Mocked per-image EXIF / file metadata: stable for the same image. Shared by
// the floating image info card and the histogram's EXIF row.

const CAMERAS = [
  { body: "NIKON D6", lens: "VR 70-200mm f/2.8G", focal: [70, 135, 200] },
  { body: "SONY ILCE-1", lens: "FE 24-70mm F2.8 GM II", focal: [24, 35, 50, 70] },
  { body: "Canon EOS R5", lens: "RF 85mm F1.2 L USM", focal: [85] },
];
const SHUTTERS = ["1/3200", "1/1000", "1/500", "1/250", "1/125", "1/60"];
const APERTURES = ["f/1.2", "f/2", "f/2.8", "f/4", "f/5.6", "f/8"];
const ISOS = [100, 200, 400, 640, 800, 1600];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function metaFor(image: number) {
  const r = (n: number, salt: number) => (image * 2654435761 + salt * 40503) % n;
  const cam = CAMERAS[r(CAMERAS.length, 1)];
  const pad = (v: number) => String(v).padStart(2, "0");
  return {
    shutter: SHUTTERS[r(SHUTTERS.length, 2)],
    aperture: APERTURES[r(APERTURES.length, 3)],
    iso: ISOS[r(ISOS.length, 4)],
    focal: cam.focal[r(cam.focal.length, 5)],
    body: cam.body,
    lens: cam.lens,
    time: `${pad(9 + r(9, 6))}:${pad(r(60, 7))}:${pad(r(60, 8))}`,
    date: `${MONTHS[r(12, 9)]} ${1 + r(28, 10)}, 2024`,
    size: "2560x1707",
    bytes: `${(400 + r(600, 11) + r(100, 12) / 100).toFixed(2)} KB`,
  };
}
