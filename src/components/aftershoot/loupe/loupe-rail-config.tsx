import type { ComponentType } from "react";
import type { AppTab } from "../rail-config";

// Icon component accepting a className (phosphor icons + custom mask icons).
export type RailIcon = ComponentType<{ className?: string }>;

// Matches the Figma "Toolbar" component (node 93:5730). Order, dividers, and
// icon metaphors come straight from the design.
export type LoupeRailKey =
  | "oneClick" //     One Click workflow — opens a modal, not a panel
  | "ai" //            AI Culling         — Scissors
  | "edit" //          Editing Sliders   — Options icon
  | "crop" //          Crop
  | "mask" //          Masking            — Square slash
  | "retouch" //       Retouch            — User
  | "background" //    Background         — Image / landscape
  | "patch" //         Patch              — Eraser
  | "info" //          Info
  | "history" //       History
  | "camera" //       Camera / snapshot
  | "cloud" //         Cloud
  | "spray" //         Spray Can — a mode toggle, not a panel
  | "keyboard" //      Keyboard
  | "settings"; //     Settings

export type RailItem =
  | { kind: "icon"; key: LoupeRailKey; icon: RailIcon; label: string; shortcut?: string }
  | { kind: "divider" };

// Loupe rail (Figma node 22:26252): AI · Manual Editing / Crop / Masking ·
// Retouching / Background / Object Removal on top; Camera · History ·
// Keyboard Shortcuts pinned to the bottom.
// AI Culling scissors (Figma "Scissors", node 30:26836). Inlined and split into
// two halves pivoting on the screw at (17,16) so the blades can snip on hover
// (see styles.css). Top half = upper ring + long blade; bottom half = lower
// ring + short blade pieces.
export const ScissorsIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <g className="scissors-half scissors-top">
      <circle cx="7.5" cy="9.5" r="3.5" />
      <path d="M29 24.21 10.3888 11.4762" />
    </g>
    <g className="scissors-half scissors-bottom">
      <circle cx="7.5" cy="22.5" r="3.5" />
      <path d="M17 16 10.3888 20.5238" />
      <path d="M29 7.79 20.5413 13.5763" />
    </g>
  </svg>
);
// Crop & Rotate (Figma "Crop", node 19:25344): the crop mark plus two rotate
// arrows, inlined as separate groups so the arrows can spin 180deg while the
// crop mark does a little scale "adjust" on hover (see styles.css). Arrows are
// the Figma ArrowsCounterClockwise glyphs (10x10, stroke 1.5), each rotated
// 56.17deg about its own centre.
const CropIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <g className="crop-frame">
      <path d="M9 5V23H27" />
      <path d="M5 9H9" />
      <path d="M13 9H23V19" />
      <path d="M23 23V27" />
    </g>
    <g className="crop-arrows" strokeWidth={1.5}>
      <g transform="translate(1.627 19.933) rotate(56.17 5 5)">
        <path d="M6.5625 6.25H8.4375V8.125" />
        <path d="M8.43741 6.25038L7.33272 7.35506C6.69297 7.99479 5.82681 8.35652 4.92209 8.36178C4.01738 8.36705 3.14707 8.01543 2.49991 7.38319" />
      </g>
      <g transform="translate(19.633 1.937) rotate(56.17 5 5)">
        <path d="M3.4377 3.74974H1.5627V1.87474" />
        <path d="M1.56245 3.74974L2.66714 2.64506C3.30689 2.00533 4.17305 1.64361 5.07777 1.63834C5.98248 1.63308 6.85279 1.98469 7.49995 2.61693" />
      </g>
    </g>
  </svg>
);
// Retouching (Figma "Smiley", node 19:25858; a 20-unit grid, unlike the others):
// face ring, two eyes, smile and the sparkle star, inlined so the star can glint,
// the eyes blink and the smile widen on hover (see styles.css).
export const RetouchIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 20 20"
    overflow="visible"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path
      d="M10 1.875C10.7106 1.875 11.3998 1.96634 12.0566 2.1377C11.6052 2.46172 11.3666 2.84845 11.2598 3.24219C10.8513 3.16651 10.4304 3.125 10 3.125C6.20304 3.125 3.125 6.20304 3.125 10C3.125 13.797 6.20304 16.875 10 16.875C13.797 16.875 16.875 13.797 16.875 10C16.875 9.37523 16.789 8.77065 16.6328 8.19531C17.0314 8.04257 17.4136 7.76213 17.6982 7.40332C17.9733 8.21894 18.125 9.09161 18.125 10C18.125 14.4873 14.4873 18.125 10 18.125C5.51269 18.125 1.875 14.4873 1.875 10C1.875 5.51269 5.51269 1.875 10 1.875Z"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="retouch-eye"
      cx="7.1875"
      cy="8.4375"
      r="0.9375"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="retouch-eye"
      cx="12.8125"
      cy="8.4375"
      r="0.9375"
      fill="currentColor"
      stroke="none"
    />
    <path
      className="retouch-smile"
      d="M13.125 11.875C12.4766 12.9961 11.3883 13.75 10 13.75C8.61172 13.75 7.52344 12.9961 6.875 11.875"
    />
    <path
      className="retouch-star"
      fill="currentColor"
      d="M16.4795 4.91701L15.8258 6.71472C15.8106 6.75583 15.7831 6.79129 15.7471 6.81633C15.7111 6.84137 15.6683 6.8548 15.6244 6.8548C15.5806 6.8548 15.5378 6.84137 15.5018 6.81633C15.4658 6.79129 15.4383 6.75583 15.423 6.71472L14.7704 4.91701L12.9727 4.26335C12.9316 4.24809 12.8961 4.22061 12.8711 4.1846C12.8461 4.1486 12.8326 4.10579 12.8326 4.06193C12.8326 4.01807 12.8461 3.97527 12.8711 3.93926C12.8961 3.90326 12.9316 3.87578 12.9727 3.86052L14.7704 3.20793L15.4241 1.41022C15.4394 1.36911 15.4668 1.33365 15.5028 1.3086C15.5388 1.28356 15.5816 1.27014 15.6255 1.27014C15.6694 1.27014 15.7122 1.28356 15.7482 1.3086C15.7842 1.33365 15.8117 1.36911 15.8269 1.41022L16.4806 3.20793L18.2783 3.86159C18.3194 3.87685 18.3549 3.90433 18.3799 3.94034C18.4049 3.97634 18.4184 4.01915 18.4184 4.06301C18.4184 4.10686 18.4049 4.14967 18.3799 4.18568C18.3549 4.22168 18.3194 4.24916 18.2783 4.26442L16.4795 4.91701Z"
    />
  </svg>
);
// One Click (Figma "Sparkle", node 30:26848): blue star + two sparks; turns white
// while its long-hover pill is open (blue fill). Inlined so the star spins and
// the sparks pop out on hover (see styles.css).
export const OneClickIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={`${className ?? ""} text-[#2563EB] group-data-[state=delayed-open]:text-white group-data-[state=instant-open]:text-white`}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path
      className="oneclick-star"
      fill="currentColor"
      d="M10.5337 21.4662L3.6475 18.9287C3.45762 18.8587 3.29379 18.7321 3.17807 18.566C3.06235 18.3999 3.00032 18.2024 3.00032 18C3.00032 17.7976 3.06235 17.6001 3.17807 17.434C3.29379 17.2679 3.45762 17.1413 3.6475 17.0713L10.5337 14.5337L13.0713 7.6475C13.1413 7.45762 13.2679 7.29379 13.434 7.17807C13.6001 7.06235 13.7976 7.00032 14 7.00032C14.2024 7.00032 14.3999 7.06235 14.566 7.17807C14.7321 7.29379 14.8587 7.45762 14.9288 7.6475L17.4662 14.5337L24.3525 17.0713C24.5424 17.1413 24.7062 17.2679 24.8219 17.434C24.9376 17.6001 24.9997 17.7976 24.9997 18C24.9997 18.2024 24.9376 18.3999 24.8219 18.566C24.7062 18.7321 24.5424 18.8587 24.3525 18.9287L17.4662 21.4662L14.9288 28.3525C14.8587 28.5424 14.7321 28.7062 14.566 28.8219C14.3999 28.9376 14.2024 28.9997 14 28.9997C13.7976 28.9997 13.6001 28.9376 13.434 28.8219C13.2679 28.7062 13.1413 28.5424 13.0713 28.3525L10.5337 21.4662Z"
    />
    <g className="oneclick-spark oneclick-spark-1">
      <path d="M22 2V8" />
      <path d="M19 5H25" />
    </g>
    <g className="oneclick-spark oneclick-spark-2">
      <path d="M28 9V13" />
      <path d="M26 11H30" />
    </g>
  </svg>
);
// Spray Can (Figma "HandSoap", node 30:26896): inlined in parts so the nozzle
// presses down and the spray lines shoot out / draw back in on hover (see
// styles.css).
// Palette (Figma "Palette", node 30:26862): outline + four paint dots, inlined so
// the outline zooms in and the dots pop into place on hover (see styles.css).
export const PaletteIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path
      className="palette-outline"
      d="M16 24C16 23.2044 16.3161 22.4413 16.8787 21.8787C17.4413 21.3161 18.2044 21 19 21H24.7763C25.4558 21.0001 26.1152 20.7695 26.6465 20.346C27.1779 19.9225 27.5498 19.3312 27.7013 18.6688C27.9077 17.7592 28.008 16.8289 28 15.8962C27.9438 9.29375 22.48 3.93375 15.875 4C12.7141 4.03293 9.69388 5.31173 7.47041 7.55861C5.24694 9.80549 3.99983 12.8389 4 16C4 21.2263 7.34125 25.18 12 26.8263C12.4523 26.9862 12.9364 27.0353 13.4116 26.9695C13.8868 26.9036 14.3393 26.7248 14.7312 26.4479C15.123 26.1711 15.4427 25.8043 15.6635 25.3784C15.8842 24.9524 15.9997 24.4798 16 24Z"
    />
    <circle
      className="palette-dot palette-dot-1"
      cx="16"
      cy="9.5"
      r="1.5"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="palette-dot palette-dot-2"
      cx="10.5"
      cy="12.5"
      r="1.5"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="palette-dot palette-dot-3"
      cx="21.5"
      cy="12.5"
      r="1.5"
      fill="currentColor"
      stroke="none"
    />
    <circle
      className="palette-dot palette-dot-4"
      cx="10.5"
      cy="19.5"
      r="1.5"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
// Manual Editing faders (Figma "FadersHorizontal", node 30:26876): two tracks,
// each broken at its knob. The track pieces are full-width lines trimmed with
// stroke-dasharray (so their round ends survive big length changes). Inlined in parts so the knobs slide (top left, bottom
// right) and back on hover while the track pieces stretch/shrink with them (see styles.css).
export const FadersIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path className="faders-right faders-right-1" d="M27 10H5" />
    <path className="faders-left faders-left-1" d="M5 10H27" />
    <path className="faders-right faders-right-2" d="M27 22H5" />
    <path className="faders-left faders-left-2" d="M5 22H27" />
    <path className="faders-knob faders-knob-1" d="M19 7V13" />
    <path className="faders-knob faders-knob-2" d="M11 19V25" />
  </svg>
);
// Tethering camera (Figma "Camera", node 33:26930): inlined so the lens can
// shrink and spring back like a shutter click on hover (see styles.css).
export const CameraIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M26 26H6C5.46957 26 4.96086 25.7893 4.58579 25.4142C4.21071 25.0391 4 24.5304 4 24V10C4 9.46957 4.21071 8.96086 4.58579 8.58579C4.96086 8.21071 5.46957 8 6 8H10L12 5H20L22 8H26C26.5304 8 27.0391 8.21071 27.4142 8.58579C27.7893 8.96086 28 9.46957 28 10V24C28 24.5304 27.7893 25.0391 27.4142 25.4142C27.0391 25.7893 26.5304 26 26 26Z" />
    <circle className="camera-lens" cx="16" cy="16.5" r="4.5" />
  </svg>
);
// Info (Figma "Info", node 33:26934): inlined so the "i" can wiggle inside its
// circle on hover (see styles.css).
export const InfoIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="16" cy="16" r="12" />
    <g className="info-i">
      <path d="M15 15C15.2652 15 15.5196 15.1054 15.7071 15.2929C15.8946 15.4804 16 15.7348 16 16V21C16 21.2652 16.1054 21.5196 16.2929 21.7071C16.4804 21.8946 16.7348 22 17 22" />
      <circle cx="15.5" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
    </g>
  </svg>
);
// Object Removal eraser (Figma "Eraser", node 33:26947): inlined so the eraser
// can scrub right with a little shake while the baseline gets erased, then
// restores (see styles.css). The baseline (14..27) is its own piece; the body's
// bottom edge (8.34..14) is closed here so the icon is identical at rest.
export const EraserIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    overflow="visible"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path className="eraser-line" d="M27 27H14" />
    <g className="eraser-body">
      <path d="M12 13L20 21" />
      <path d="M14 27L27.4138 13.5863C27.5995 13.4005 27.7469 13.18 27.8474 12.9373C27.948 12.6947 27.9997 12.4346 27.9997 12.1719C27.9997 11.9092 27.948 11.6491 27.8474 11.4064C27.7469 11.1637 27.5995 10.9432 27.4138 10.7575L22.2425 5.58625C22.0568 5.40048 21.8363 5.25312 21.5936 5.15259C21.3509 5.05205 21.0908 5.0003 20.8281 5.0003C20.5654 5.0003 20.3053 5.05205 20.0627 5.15259C19.82 5.25312 19.5995 5.40048 19.4137 5.58625L4.58625 20.4137C4.40048 20.5995 4.25312 20.82 4.15259 21.0627C4.05205 21.3053 4.0003 21.5654 4.0003 21.8281C4.0003 22.0908 4.05205 22.3509 4.15259 22.5936C4.25312 22.8363 4.40048 23.0568 4.58625 23.2425L8.34375 27H14" />
    </g>
  </svg>
);
// Keyboard shortcuts (Figma "Keyboard", node 33:26939): inlined so the key rows
// press down one after another like typing on hover (see styles.css).
export const KeyboardIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 7H28C28.5523 7 29 7.44772 29 8V24C29 24.5523 28.5523 25 28 25H4C3.44772 25 3 24.5523 3 24V8C3 7.44772 3.44772 7 4 7Z" />
    <path className="kb-key kb-row-1" d="M7 12H25" />
    <path className="kb-key kb-row-2" d="M7 16H25" />
    <path className="kb-key kb-bottom" d="M7 20H8" />
    <path className="kb-key kb-space" d="M12 20H20" />
    <path className="kb-key kb-bottom" d="M24 20H25" />
  </svg>
);
// History (Figma "ClockCounterClockwise", node 34:26952): inlined so the circular
// arrow (the Figma "Group") can spin a full turn while the clock hands swing
// -10deg / 8deg and settle (see styles.css).
export const HistoryIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path className="history-hands" d="M16 10V16L21 19" />
    <g className="history-arrow">
      <path d="M9 13H4V8" />
      <path d="M8.45 24C10.0225 25.4838 11.9973 26.4713 14.1278 26.8391C16.2583 27.207 18.4499 26.9388 20.4289 26.0682C22.4078 25.1976 24.0864 23.7631 25.2547 21.944C26.4231 20.1249 27.0295 18.0018 26.9982 15.8401C26.9668 13.6783 26.2991 11.5737 25.0785 9.7892C23.8579 8.00472 22.1385 6.6195 20.1351 5.80662C18.1318 4.99375 15.9333 4.78926 13.8144 5.21871C11.6954 5.64815 9.75004 6.6925 8.22125 8.22124C6.75 9.71124 5.535 11.1162 4 13" />
    </g>
  </svg>
);
export const SprayCanIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <g className="spray-all">
      <path d="M12 9H20C21.0609 9 22.0783 9.57194 22.8284 10.59C23.5786 11.608 24 12.9888 24 14.4286V26.6429C24 27.0028 23.8946 27.348 23.7071 27.6025C23.5196 27.857 23.2652 28 23 28H9C8.73478 28 8.48043 27.857 8.29289 27.6025C8.10536 27.348 8 27.0028 8 26.6429V14.4286C8 12.9888 8.42143 11.608 9.17157 10.59C9.92172 9.57194 10.9391 9 12 9Z" />
      <path
        className="spray-nozzle"
        d="M13.5 9V8V6.5C13.5 5.39543 14.3954 4.5 15.5 4.5H16.5C17.6046 4.5 18.5 5.39543 18.5 6.5V8V9"
      />
      <line x1="23" y1="14" x2="9" y2="14" />
      <line
        className="spray-line"
        pathLength={1}
        x1="22.4142"
        y1="5.53569"
        x2="25.9497"
        y2="9.07122"
      />
      <line className="spray-line" pathLength={1} x1="22.415" y1="5.53553" x2="25.9506" y2="2" />
    </g>
  </svg>
);
// Masking (Figma "SquareHalfBottom", nodes 34:26977 final / 34:26961 before): the
// square plus a diagonal hatch clipped to it (nested <svg> = built-in clip, no
// ids needed). In the "before" state the hatch sits tilted -45deg below the
// square; on hover it sweeps out and slides back in (see styles.css).
const MaskIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="6" y="6" width="20" height="20" rx="1" />
    <svg x="6" y="6" width="20" height="20" viewBox="6 6 20 20" overflow="hidden">
      <g className="mask-hatch">
        <path d="M6 6L26 26" />
        <path d="M10 10.0708L6 14.0708" />
        <path d="M14 13.9995L6 21.9995" />
        <path d="M17.5859 17.9995L9.79297 25.7925" />
        <path d="M22 21.9995L18 25.9995" />
      </g>
    </svg>
  </svg>
);
// Background Changer (Figma "Rectangle", New Design System node 3661:38813; the
// 80-unit design scaled x0.4 onto the 32 grid, stroke 5 -> 2). The hatched
// background lines are dropped. On hover the frame erases itself and redraws
// (a "new background") while the subject pops (see styles.css).
const BackgroundIcon: RailIcon = ({ className }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path
      className="bgswap-frame"
      pathLength={1}
      d="M6.739 27.025H3.8725C3.2636 27.025 2.77 26.5314 2.77 25.9225V6.0775C2.77 5.4686 3.2636 4.975 3.8725 4.975H28.1275C28.7364 4.975 29.23 5.4686 29.23 6.0775V25.9225C29.23 26.5314 28.7364 27.025 28.1275 27.025H25.261"
    />
    <g className="bgswap-subject">
      <path d="M21.733 15.7795C21.733 18.9457 19.1662 21.5125 16 21.5125C12.8338 21.5125 10.267 18.9457 10.267 15.7795C10.267 12.6132 12.8338 10.0465 16 10.0465C19.1662 10.0465 21.733 12.6132 21.733 15.7795Z" />
      <path d="M6.739 27.025C8.6076 23.8621 12.0014 21.733 16 21.733C19.9986 21.733 23.3924 23.8621 25.261 27.025" />
    </g>
  </svg>
);

// Custom Figma icons are single-colour SVGs; render them as a CSS mask so they
// follow the button's text colour (active / hover states).
function MaskSvg({ src, className }: { src: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

const AI: RailItem = { kind: "icon", key: "ai", icon: ScissorsIcon, label: "AI Culling" };

const HISTORY_ITEM: RailItem = {
  kind: "icon",
  key: "history",
  icon: HistoryIcon,
  label: "History",
};

// One Click (cull & edit) lives only on the GRID rail, not in loupe.
export const LOUPE_TOP_RAIL: RailItem[] = [
  { kind: "icon", key: "edit", icon: FadersIcon, label: "Manual Editing", shortcut: "E" },
  { kind: "icon", key: "crop", icon: CropIcon, label: "Crop & Rotate", shortcut: "R" },
  { kind: "icon", key: "mask", icon: MaskIcon, label: "Masking", shortcut: "M" },
  { kind: "divider" },
  { kind: "icon", key: "retouch", icon: RetouchIcon, label: "Retouching", shortcut: "⇧F" },
  {
    kind: "icon",
    key: "background",
    icon: BackgroundIcon,
    label: "Background Changer",
    shortcut: "⇧B",
  },
  { kind: "icon", key: "patch", icon: EraserIcon, label: "Object Removal", shortcut: "⇧J" },
  // History sits right after the editing tools, in its own group.
  { kind: "divider" },
  HISTORY_ITEM,
];

// Tethering is an editing concern — hidden in CULL, which keeps only the
// keyboard shortcuts. Tethering only appears for an album started from the
// import flow's Tethered Shooting card. Image info is a floating card on the
// canvas (ⓘ in the bottom bar), not a rail panel.
export const loupeBottomRail = (tab: AppTab, tethered = false): RailItem[] => [
  ...(tab === "cull"
    ? []
    : ([
        ...(tethered
          ? [
              { kind: "icon", key: "camera", icon: CameraIcon, label: "Tethering" },
              { kind: "divider" },
            ]
          : []),
      ] as RailItem[])),
  { kind: "icon", key: "keyboard", icon: KeyboardIcon, label: "Keyboard shortcuts" },
];

// Loupe rail per app tab: CULL keeps culling only; ENHANCE carries the
// editing + retouching tools, then History.
export const LOUPE_TAB_RAIL: Record<AppTab, RailItem[]> = {
  cull: [AI],
  enhance: LOUPE_TOP_RAIL,
};

export const loupeRailInTab = (key: LoupeRailKey, tab: AppTab, tethered = false) =>
  [...LOUPE_TAB_RAIL[tab], ...loupeBottomRail(tab, tethered)].some(
    (item) => item.kind === "icon" && item.key === key,
  );

// Which tab a loupe tool belongs to (null = shared, e.g. History).
export const tabOfLoupeRail = (key: LoupeRailKey): AppTab | null =>
  loupeRailInTab(key, "cull") && loupeRailInTab(key, "enhance")
    ? null
    : loupeRailInTab(key, "cull")
      ? "cull"
      : "enhance";

// Hover-animation length (ms) per icon. The rails delay the long-hover label by
// this much so it starts once the animation finishes. Keep in sync with
// styles.css. Keyed by icon component (rail keys collide across rails).
export const RAIL_ICON_ANIM_MS = new Map<RailIcon, number>([
  [OneClickIcon, 620], // star 0.55s; sparks 0.12s delay + 0.5s
  [ScissorsIcon, 700], // snip 0.7s
  [SprayCanIcon, 800], // nozzle press + spray lines 0.8s
  [FadersIcon, 800], //   knobs slide 0.8s
  [CameraIcon, 500], //   lens shutter click 0.5s
  [InfoIcon, 600], //     "i" wiggle 0.6s
  [CropIcon, 700], //     arrows spin 180deg 0.7s
  [EraserIcon, 1000], //  scrub + shake + line redraw 1s
  [KeyboardIcon, 500], // typing ripple 0.5s
  [HistoryIcon, 800], //  arrow full turn 0.8s
  [MaskIcon, 800], //     hatch sweeps out + back in 0.8s
  [RetouchIcon, 700], //  glint + blink + grin 0.7s
  [BackgroundIcon, 1000], // frame redraws + subject pop 1s
  [PaletteIcon, 600], //  outline 0.45s; dots up to 0.18s delay + 0.4s
]);
