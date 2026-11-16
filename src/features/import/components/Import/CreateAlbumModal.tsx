import { useEffect, useRef, useState } from "react";
import {
  BabyCarriage,
  Baseball,
  Button,
  CalendarDots,
  Checkbox,
  // Chevron, (used by the commented-out Advanced settings section)
  Couch,
  Heart,
  IconButton,
  Modal,
  SelectField,
  Shuffle,
  SketchLogo,
  Student,
  User,
  UsersThree,
  X,
  colors,
  hoverTransition,
  modalWidth,
  oneClickColor,
  radius,
  spacing,
  stroke,
  textStyle,
} from "../../ui-kit";
import type { Icon } from "../../ui-kit";
import { useCullStore } from "../../store/useCullStore";
import { useImportStore } from "../../store/useImportStore";
import type { AlbumMode } from "../../types";
import { GENRES } from "../../data/genres";

const GENRE_ICONS: Record<string, Icon> = {
  Weddings: Heart,
  Engagements: SketchLogo,
  "Portraits & Headshots": User,
  "Family Portraits": UsersThree,
  "School Portrait": Student,
  "Newborn Photography": BabyCarriage,
  "Sports Photography": Baseball,
  "School Events": CalendarDots,
  "Boudoir Photography": Couch,
  Other: Shuffle,
};

/** Halfway between the resting and the selected fill, so hovering reads as a step towards selecting without looking selected. */
/** The card at rest: a faint wash over the dialog. */
const REST_BACKGROUND = colors.surface.overlayFaint;
const HOVER_BACKGROUND = `color-mix(in srgb, ${REST_BACKGROUND} 50%, ${colors.surface.control})`;
const ICON_SIZE = 32;

/** Each mode has either an icon from the set or its own artwork from the design. */
const MODE_OPTIONS: Array<{
  mode: AlbumMode;
  icon?: Icon;
  artwork?: string;
  description: string;
}> = [
  {
    mode: "Cull",
    artwork: "/import/cull.svg",
    description: "Pick the keepers",
  },
  {
    mode: "Edit",
    artwork: "/import/edit.svg",
    description: "Apply your AI Profile",
  },
  {
    mode: "Retouch",
    artwork: "/import/retouch.svg",
    description: "Skin, eyes and blemishes",
  },
  {
    mode: "One Click",
    artwork: "/import/one-click.svg",
    description: "Cull, edit and retouch",
  },
];

/** When a card is hovered its icon swells once and its rays flick out: one pass, not a loop. */
const ANIMATION_DURATION = 800;
/** Each ray starts a little after the one before, so they fan out rather than fire together. */
const SPARK_STAGGER = 70;
const ICON_SWELL: Keyframe[] = [
  { transform: "scale(1)", opacity: 1, offset: 0, easing: "ease-in-out" },
  {
    transform: "scale(1.08)",
    opacity: 0.88,
    offset: 0.5,
    easing: "ease-in-out",
  },
  { transform: "scale(1)", opacity: 1, offset: 1 },
];

/** A few tiny rays that flick outwards from the icon's upper right with each swell: the spark. Angles are clockwise from straight up. */
const SPARK_ANGLES = [10, 50, 90];
const SPARK_START = 17;
const SPARK_END = 22;

/** The rays match the icon. The grey icons are the design's #777 (the disabled text colour); One Click's rays run through its bolt's gradient, which has no token. */
const SPARK_COLORS: Record<AlbumMode, string[]> = {
  Cull: Array(SPARK_ANGLES.length).fill(colors.type.disabled),
  Edit: Array(SPARK_ANGLES.length).fill(colors.type.disabled),
  Retouch: Array(SPARK_ANGLES.length).fill(colors.type.disabled),
  "One Click": ["#FF796E", "#FF975F", "#FFB650"],
};

/** One Click's label takes the bolt's orange at all times; the others brighten only on hover and when chosen. */
const LABEL_COLOR_OVERRIDE: Partial<Record<AlbumMode, string>> = {
  "One Click": oneClickColor,
};

/** One ray's flick: it fades in, drifts out and fades away. */
function sparkKeyframes(angle: number): Keyframe[] {
  const at = (distance: number, scaleY: number) =>
    `rotate(${angle}deg) translateY(-${distance}px) scaleY(${scaleY})`;
  return [
    {
      transform: at(SPARK_START, 0.4),
      opacity: 0,
      offset: 0,
      easing: "ease-out",
    },
    {
      transform: at(SPARK_START + 2, 1),
      opacity: 0.9,
      offset: 0.3,
      easing: "ease-in",
    },
    { transform: at(SPARK_END, 0.6), opacity: 0, offset: 1 },
  ];
}

function ModeOption({
  icon: IconComponent,
  artwork,
  mode,
  description,
  isSelected,
  onSelect,
}: {
  icon?: Icon;
  artwork?: string;
  mode: AlbumMode;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const iconRef = useRef<HTMLSpanElement>(null);
  const sparksRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const icon = iconRef.current;
    // Skipped for people who ask their system for less motion.
    if (
      !isHovered ||
      !icon ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    // Plays once each time the card is hovered or focused.
    const timing: KeyframeAnimationOptions = { duration: ANIMATION_DURATION };
    const animations = [icon.animate(ICON_SWELL, timing)];
    sparksRef.current?.querySelectorAll("span").forEach((spark, index) => {
      animations.push(
        spark.animate(sparkKeyframes(SPARK_ANGLES[index]), {
          ...timing,
          delay: SPARK_STAGGER * index,
          fill: "backwards",
        }),
      );
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [isHovered]);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={`${mode}: ${description}`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[12],
        padding: `${spacing[16]} ${spacing[12]}`,
        // Selected is a lighter fill and an accent icon, never a different border, so the cards stay the same size.
        background: isSelected
          ? colors.surface.control
          : isHovered
            ? HOVER_BACKGROUND
            : REST_BACKGROUND,
        border: "none",
        // An inset ring marks the chosen card. A shadow rather than a border, so choosing never changes the card's size.
        boxShadow: isSelected
          ? `inset 0 0 0 ${stroke[2]} ${colors.edge.emphasis}`
          : "none",
        borderRadius: radius.lg,
        cursor: "pointer",
        transition: hoverTransition,
      }}
    >
      <span style={{ position: "relative", display: "inline-flex" }}>
        <span ref={iconRef} style={{ display: "inline-flex" }}>
          {artwork || !IconComponent ? (
            <img src={artwork} alt="" width={ICON_SIZE} height={ICON_SIZE} />
          ) : (
            // Filled and the same light grey as the artwork beside it, whether or not the card is selected.
            <IconComponent
              size={24}
              weight="fill"
              color={colors.type.secondary}
            />
          )}
        </span>
        <span
          ref={sparksRef}
          aria-hidden
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {SPARK_ANGLES.map((angle, index) => (
            // Each ray starts at the icon's centre, invisible; the animation rotates it out and pushes it past the edge.
            <span
              key={angle}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 2,
                height: 4,
                marginLeft: -1,
                marginTop: -2,
                borderRadius: radius.full,
                background: SPARK_COLORS[mode][index],
                opacity: 0,
              }}
            />
          ))}
        </span>
      </span>
      <b
        style={{
          ...textStyle("label-13"),
          color:
            LABEL_COLOR_OVERRIDE[mode] ??
            (isSelected || isHovered ? colors.type.primary : colors.type.muted),
          transition: hoverTransition,
        }}
      >
        {mode}
      </b>
    </button>
  );
}

/** Whether the Advanced settings section has been shown open already. Per page load, so a reload shows it open again. */
// let hasSeenFlagOptions = false;

/** Asked once, just before an album exists: what kind of shoot it is and which step to start in. */
export function CreateAlbumModal() {
  const request = useImportStore((s) => s.createAlbum);
  // A fresh dialog (and so a fresh genre and mode) each time it opens.
  return request ? <CreateAlbumDialog photoCount={request.photoCount} /> : null;
}

function CreateAlbumDialog({ photoCount }: { photoCount: number }) {
  const close = useImportStore((s) => s.closeCreateAlbum);
  const confirm = useImportStore((s) => s.confirmCreateAlbum);
  const [genre, setGenre] = useState<string | null>(null);
  const [mode, setMode] = useState<AlbumMode | null>(null);
  // Previous Advanced settings section: open the first time the dialog appears, closed on every later open.
  // const [isFlagOptionsOpen, setFlagOptionsOpen] = useState(!hasSeenFlagOptions);
  // useEffect(() => {
  //   hasSeenFlagOptions = true;
  // }, []);
  const [isFlaggingRated, setFlaggingRated] = useState(false);
  const [isFlaggingLocked, setFlaggingLocked] = useState(true);
  const isOption3 = useCullStore((s) => s.designOption === 3);

  return (
    <Modal isOpen onClose={close} width={modalWidth.compact}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: spacing[8],
          width: "100%",
        }}
      >
        <h3
          style={{
            margin: 0,
            ...textStyle(isOption3 ? "heading-20" : "heading-16"),
            color: colors.type.secondary,
          }}
        >
          Create Album
        </h3>
        {photoCount > 0 && (
          <span
            style={{
              flex: 1,
              ...textStyle("body-13"),
              color: colors.type.muted,
            }}
          >
            {photoCount} photo{photoCount === 1 ? "" : "s"}
          </span>
        )}
        <IconButton icon={X} label="Close" hasTooltip={false} onClick={close} />
      </div>

      {/* {isOption3 ? <span style={{ ...textStyle('body-14'), color: colors.type.muted }}>Select Genre</span> : null} */}
      {/* Elsewhere the placeholder says what the field is for, so it needs no heading of its own. */}
      <SelectField
        label="Genre"
        value={genre}
        placeholder="Select a genre"
        options={GENRES}
        optionIcons={GENRE_ICONS}
        onChange={setGenre}
      />

      <div
        role="separator"
        style={{ height: stroke[1], background: colors.edge.transparent1 }}
      />

      {isOption3 ? (
        <span style={{ ...textStyle("body-14"), color: colors.type.muted }}>
          What do you want to do first?
        </span>
      ) : (
        <div
          role="separator"
          style={{ height: stroke[1], background: colors.edge.transparent1 }}
        />
      )}

      <div
        role="radiogroup"
        aria-label="What do you want to do?"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: spacing[8],
        }}
      >
        {MODE_OPTIONS.map((option) => (
          <ModeOption
            key={option.mode}
            {...option}
            isSelected={mode === option.mode}
            onSelect={() => setMode(option.mode)}
          />
        ))}
      </div>

      <div
        role="separator"
        style={{ height: stroke[1], background: colors.edge.transparent1 }}
      />

      {/* Previous implementation: collapsible "Advanced settings" section.
      <button
        type="button"
        aria-expanded={isFlagOptionsOpen}
        onClick={() => setFlagOptionsOpen((open) => !open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing[8],
          alignSelf: "flex-start",
          padding: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          ...textStyle("body-14"),
          color: colors.type.muted,
        }}
      >
        <Chevron open={isFlagOptionsOpen} />
        Advanced settings
      </button>
      {isFlagOptionsOpen && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: spacing[16],
          }}
        >
          <Checkbox
            label="Flag camera rated photos"
            checked={isFlaggingRated}
            onChange={setFlaggingRated}
          />
          <Checkbox
            label="Flag camera locked images"
            checked={isFlaggingLocked}
            onChange={setFlaggingLocked}
          />
        </div>
      )}
      */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: spacing[16],
        }}
      >
        <span style={{ ...textStyle("body-14"), color: colors.type.disabled }}>
          Auto Flag photos that are:
        </span>
        <Checkbox
          label="Locked"
          checked={isFlaggingLocked}
          onChange={setFlaggingLocked}
        />
        <Checkbox
          label="Rated"
          checked={isFlaggingRated}
          onChange={setFlaggingRated}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <div></div>
        {/* {isOption3 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: spacing[8],
            }}
          >
            <Checkbox
              label="Flag camera rated photos"
              checked={isFlaggingRated}
              onChange={setFlaggingRated}
            />
            <Checkbox
              label="Flag camera locked images"
              checked={isFlaggingLocked}
              onChange={setFlaggingLocked}
            />
            <span style={{ ...textStyle("body-12"), color: colors.type.muted }}>
              Locked images are added to My Selections.
            </span>
          </div>
        )} */}
        <Button
          variant="primary"
          disabled={!genre || !mode}
          onClick={() => genre && mode && confirm({ genre, mode })}
        >
          Create Album
        </Button>
      </div>
    </Modal>
  );
}
