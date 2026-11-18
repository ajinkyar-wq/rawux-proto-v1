import {
  RATING_KEY,
  TOOL_LABEL,
  ratingLabel,
  useAlbumHistoryContext,
  type AlbumEntry,
} from "./album-history";

type Change = Extract<AlbumEntry, { kind: "change" }>;

// Loupe "History" rail panel — Image-level History for the current image.
// Newest first, "Operation : Value", one line per change. Per the PRD, actions
// taken in Grid (multi-select ratings, Sync, …) are album-level only: they're
// on the ⌘Z stack but not listed here.
//
// Clicking a step restores THIS image to that point: later steps grey out but
// stay clickable to move forward again. Steps undone with album ⌘Z are shown
// greyed and struck through (they come back with ⇧⌘Z).
export function ImageHistoryPanel({ image }: { image: number }) {
  const history = useAlbumHistoryContext();
  if (!history) return null;
  const { entries, cursor, imageStep, selectImageStep, applyEffects } = history;

  // Applied (not album-undone) change steps on this image, newest first.
  const all = entries
    .map((e, i) => ({ e, undone: i >= cursor }))
    .filter(
      (s): s is { e: Change; undone: boolean } =>
        s.e.kind === "change" && s.e.view !== "grid" && s.e.images.includes(image),
    )
    .reverse();
  const undone = all.filter((s) => s.undone);
  const steps = all.filter((s) => !s.undone);

  const selected = imageStep[image];
  // Position in `steps` the image is browsed to (steps.length = Original).
  const current =
    selected === undefined
      ? 0
      : selected === "original"
        ? steps.length
        : Math.max(
            0,
            steps.findIndex((s) => s.e.id === selected),
          );

  const mine = (e: Change) => e.effects.filter((f) => f.image === image);

  // Move this image to step `target`, applying just its own effects.
  const browseTo = (target: number) => {
    if (target === current) return;
    if (target > current) {
      // Going back in time: undo steps current..target-1 (newest first).
      for (let i = current; i < target; i++) applyEffects(mine(steps[i].e), "prev");
    } else {
      // Going forward: redo steps current-1..target (oldest first).
      for (let i = current - 1; i >= target; i--) applyEffects(mine(steps[i].e), "next");
    }
    selectImageStep(
      image,
      target === 0 ? undefined : target === steps.length ? "original" : steps[target].e.id,
    );
  };

  // Multi-image steps show what THIS image got (e.g. AI Cull → "4★").
  const label = (e: Change) => {
    const r = e.images.length > 1 ? mine(e).find((f) => f.key === RATING_KEY) : undefined;
    return r && r.next !== undefined ? `${e.op} : ${ratingLabel(r.next)}` : `${e.op} : ${e.value}`;
  };

  const tag = (e: Change) =>
    e.images.length > 1 ? `${TOOL_LABEL[e.tool]} · ${e.images.length} images` : TOOL_LABEL[e.tool];

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-300">
          History
        </span>
        {current !== 0 && (
          <button
            type="button"
            onClick={() => browseTo(0)}
            className="text-[11px] text-neutral-400 hover:text-white"
          >
            Back to latest
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        {undone.map((s) => (
          <div
            key={s.e.id}
            title="Undone — press ⇧⌘Z to redo"
            className="flex items-center justify-between gap-2 px-3 py-2.5"
          >
            <span className="text-[12px] text-neutral-600 line-through">{label(s.e)}</span>
            <span className="text-[10px] text-neutral-700">{tag(s.e)}</span>
          </div>
        ))}
        {steps.map((s, i) => {
          const active = i === current;
          const greyed = i < current;
          return (
            <button
              key={s.e.id}
              type="button"
              onClick={() => browseTo(i)}
              className={`flex items-center justify-between gap-2 rounded px-3 py-2.5 text-left ${
                active ? "bg-white/10" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className={`text-[12px] ${greyed ? "text-neutral-600" : "text-neutral-100"}`}>
                {label(s.e)}
              </span>
              <span className={`text-[10px] ${greyed ? "text-neutral-700" : "text-neutral-500"}`}>
                {tag(s.e)}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => browseTo(steps.length)}
          className={`flex items-center rounded px-3 py-2.5 text-left text-[12px] ${
            current === steps.length
              ? "bg-white/10 text-neutral-100"
              : "text-neutral-400 hover:bg-white/[0.04]"
          }`}
        >
          Original
        </button>
      </div>

      {all.length === 0 && (
        <p className="px-3 text-[11px] text-neutral-500">No changes on this image yet.</p>
      )}
    </div>
  );
}
