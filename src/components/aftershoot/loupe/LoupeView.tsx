import { useCallback, useEffect, useRef, useState } from "react";
import { BottomBar } from "../BottomBar";
import { dupId, duplicateCount, photoName } from "../duplicates";
import { DuplicatesStrip } from "../DuplicatesStrip";
import { AlbumFilmstrip } from "./AlbumFilmstrip";
import { CropOverlay } from "./CropOverlay";
import {
  SliderHistoryContext,
  SliderScopeContext,
  sliderKey,
  useAlbumHistoryContext,
} from "../history/album-history";
import { effectiveCropOf, straightenOf } from "./crop-config";
import { useWbPickerActive, wbPicker } from "./wb-picker";
import { BrushToolbar } from "./BrushToolbar";
import { ImageInfoCard } from "./ImageInfoCard";
import { LoupeImage } from "./LoupeImage";
import { PhotoContextMenu } from "../PhotoContextMenu";
import { useCullStore } from "@/features/import/store/useCullStore";
import { LoupeRail } from "./LoupeRail";
import { LoupeRailPanel, type LoupeAIState } from "./LoupeRailPanel";
import { loupeRailInTab, type LoupeRailKey } from "./loupe-rail-config";
import { useShortcuts } from "../shortcuts/shortcutRegistry";
import type { Ratings } from "../use-ratings";
import type { AIAction } from "../panels/ImagePanel";
import type { AppTab, RailKey as GridRailKey } from "../rail-config";

const ALBUM_LAST = 231; // 232 images in the album

const PANEL_SHORTCUTS: { rail: LoupeRailKey; key: string; shift?: boolean; label: string }[] = [
  { rail: "edit", key: "e", label: "Manual Editing" },
  { rail: "crop", key: "r", label: "Crop & Rotate" },
  { rail: "mask", key: "m", label: "Masking" },
  { rail: "retouch", key: "f", shift: true, label: "Retouching" },
  { rail: "background", key: "b", shift: true, label: "Background Changer" },
  { rail: "patch", key: "j", shift: true, label: "Object Removal" },
];

export function LoupeView({
  viewBar,
  tab,
  selectedIndex,
  onSelectIndex,
  dupIndex,
  onSelectDup,
  onSelectPhoto,
  cullFiltersVisible,
  ai,
  entryRail,
  ratings,
  railRequest,
  lastRail,
  onRailChange,
  onOpenShortcuts,
  onOpenSurvey,
}: {
  // Filter row (ViewBar) — sits above the image area only.
  viewBar?: React.ReactNode;
  // CULL / ENHANCE app tab — decides which tools the loupe rail offers.
  tab: AppTab;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  // Which photo of the image's duplicate set is showing (0 = the image itself).
  // Duplicates are the same sample picture, so this only changes the badge,
  // name and rating; shared with Survey so both show the same photo.
  dupIndex: number;
  onSelectDup: (k: number) => void;
  /** Jump to a specific photo (image + duplicate) in one step. */
  onSelectPhoto: (id: number) => void;
  // Cull filters exist only for an Automated cull, surfaced inside the AI
  // Actions panel's CULL tab.
  cullFiltersVisible: boolean;
  // Shared AI Actions state — the same panel as grid view, lifted to the screen
  // so the active results tab carries across views.
  ai: LoupeAIState;
  // The rail active in grid view when loupe was opened. Used to pick the loupe
  // landing rail when no AI action has run (e.g. grid Crop → loupe Crop).
  entryRail: GridRailKey;
  ratings: Ratings;
  // Undo/Redo (UX-1) asks loupe to jump to the tool an action happened in.
  // `n` changes on every request so repeated requests for the same tool fire.
  railRequest?: { key: LoupeRailKey; n: number } | null;
  // Last loupe tool, kept by the parent across view switches.
  lastRail?: LoupeRailKey | null;
  onRailChange?: (key: LoupeRailKey) => void;
  // The rail's Keyboard icon opens the Keyboard Shortcuts modal instead of a
  // side panel. Gets the tool that was open so the modal can start on the
  // shortcuts that matter there (e.g. Crop / Mask → Crop & Masking).
  onOpenShortcuts?: (from: LoupeRailKey) => void;
  // Cull tab only, and only once a cull has produced duplicate stacks: pinching
  // out past fit opens Survey Mode to compare the stack.
  onOpenSurvey?: () => void;
}) {
  // Which rail loupe opens on is contextual to how you arrived. See initialRail.
  // Returning to loupe restores the tool the user last had open here.
  const [activeRail, setActiveRail] = useState<LoupeRailKey>(() => {
    // Coming from a grid Editing / Retouching tab always lands on that tool.
    const preferred =
      gridToolRail(entryRail) ?? lastRail ?? initialRail(ai.actionStatuses, entryRail);
    if (loupeRailInTab(preferred, tab, useCullStore.getState().isAlbumTethered)) return preferred;
    return tab === "cull" ? "ai" : "edit";
  });
  useEffect(() => {
    onRailChange?.(activeRail);
  }, [activeRail, onRailChange]);
  // Image zoom (0 = fit) — loupe-only, so it never changes the grid's columns.
  // `actualZoom` is % of the photo's natural pixels; null = fit to canvas.
  const [actualZoom, setActualZoom] = useState<number | null>(null);
  // Floating image info card (stays open while you move between photos).
  const [infoOpen, setInfoOpen] = useState(false);
  useEffect(() => {
    if (!infoOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setInfoOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [infoOpen]);
  const [fitPercent, setFitPercent] = useState(100);
  // Last zoom level used, so Space can return to it from Fit (default 100%).
  const lastZoomRef = useRef(100);
  useEffect(() => {
    if (actualZoom !== null) lastZoomRef.current = actualZoom;
  }, [actualZoom]);
  const [showAfter, setShowAfter] = useState(true);
  // Crops live in the album history (per image, revert on Undo).
  const history = useAlbumHistoryContext();
  const wbPicking = useWbPickerActive();
  const handleMetrics = useCallback((m: { fitPercent: number }) => setFitPercent(m.fitPercent), []);
  const [showDuplicates, setShowDuplicates] = useState(true);
  // The right side panel collapses when you click the already-active rail icon
  // again; clicking it once more (or a different icon) reopens it.
  const [panelOpen, setPanelOpen] = useState(true);

  // The duplicates filmstrip is contextual to culling: it shows only while the
  // AI Actions panel is open and a cull has run.
  const showDuplicatesStrip =
    panelOpen && activeRail === "ai" && ai.actionStatuses.cull === "complete";

  useEffect(() => {
    if (!railRequest) return;
    setActiveRail(railRequest.key);
    setPanelOpen(true);
  }, [railRequest]);

  // Duplicate traversal (cull only): , and . step through the set and flow into
  // the neighbouring image's set at either end; ' and ;
  // jump to the next / previous image's set.
  const cullDone = tab === "cull" && ai.actionStatuses.cull === "complete";
  const dupTotal = duplicateCount(selectedIndex);
  const photoId = dupId(selectedIndex, dupIndex);
  useShortcuts(
    () =>
      cullDone
        ? [
            {
              id: "loupe.dup.next",
              combo: { key: "." },
              label: "Next in duplicate set",
              section: "Cull",
              run: () =>
                dupIndex + 1 < dupTotal
                  ? onSelectDup(dupIndex + 1)
                  : selectedIndex < ALBUM_LAST && onSelectPhoto(dupId(selectedIndex + 1, 0)),
            },
            {
              id: "loupe.dup.prev",
              combo: { key: "," },
              label: "Previous in duplicate set",
              section: "Cull",
              run: () =>
                dupIndex > 0
                  ? onSelectDup(dupIndex - 1)
                  : selectedIndex > 0 &&
                    onSelectPhoto(dupId(selectedIndex - 1, duplicateCount(selectedIndex - 1) - 1)),
            },
            // Duplicates filmstrip open on a stack: ↑ / ↓ cycle through it
            // (wrapping), staying on this image's stack.
            ...(showDuplicatesStrip && dupTotal > 1
              ? [
                  {
                    id: "loupe.dup.cycleDown",
                    combo: { key: "arrowdown" },
                    label: "Next photo in duplicate stack",
                    section: "Cull",
                    run: () => onSelectDup((dupIndex + 1) % dupTotal),
                  },
                  {
                    id: "loupe.dup.cycleUp",
                    combo: { key: "arrowup" },
                    label: "Previous photo in duplicate stack",
                    section: "Cull",
                    run: () => onSelectDup((dupIndex - 1 + dupTotal) % dupTotal),
                  },
                ]
              : []),
            {
              id: "loupe.set.next",
              combo: { key: "'" },
              label: "Next duplicate set",
              section: "Cull",
              run: () => onSelectIndex(Math.min(selectedIndex + 1, ALBUM_LAST)),
            },
            {
              id: "loupe.set.prev",
              combo: { key: ";" },
              label: "Previous duplicate set",
              section: "Cull",
              run: () => onSelectIndex(Math.max(selectedIndex - 1, 0)),
            },
          ]
        : [],
    [
      cullDone,
      showDuplicatesStrip,
      dupIndex,
      dupTotal,
      selectedIndex,
      onSelectDup,
      onSelectIndex,
      onSelectPhoto,
    ],
  );

  const openOneClick = useCullStore((s) => s.openOneClick);

  function handleRailSelect(key: LoupeRailKey) {
    if (key === "oneClick") {
      openOneClick();
      return;
    }
    if (key === "keyboard") {
      onOpenShortcuts?.(activeRail);
      return;
    }
    if (key === activeRail) {
      // Re-clicking the active icon toggles the panel open/closed.
      setPanelOpen((v) => !v);
    } else {
      setActiveRail(key);
      setPanelOpen(true);
    }
  }

  // Space toggles between Fit and the last zoom level (100% by default).
  useShortcuts(
    () => [
      {
        id: "loupe.zoom.toggle",
        combo: { key: " " },
        label: "Toggle Fit / Zoom",
        section: "View",
        run: () => setActualZoom((z) => (z === null ? lastZoomRef.current : null)),
      },
    ],
    [],
  );

  // Panel shortcuts shown on the rail tooltips (E / R / M / ⇧F / ⇧B / ⇧J).
  // Re-registered each render so the handlers see the latest rail state.
  useShortcuts(
    () =>
      PANEL_SHORTCUTS.filter((s) => loupeRailInTab(s.rail, tab)).map((s) => ({
        id: `loupe.panel.${s.rail}`,
        combo: { key: s.key, shift: s.shift },
        label: s.label,
        section: "Tool",
        run: () => handleRailSelect(s.rail),
      })),
    [tab, activeRail, panelOpen, onOpenShortcuts],
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {viewBar}
        <PhotoContextMenu id={selectedIndex} surface="loupe">
          <div className="flex min-h-0 flex-1 flex-col">
            <LoupeImage
              image={selectedIndex}
              // The applied crop — except while the Crop tool is open (full photo
              // + crop box to adjust) and in the Before view (the original).
              crop={
                activeRail === "crop" || !showAfter
                  ? undefined
                  : effectiveCropOf(history, selectedIndex)
              }
              cropBox={activeRail === "crop" ? effectiveCropOf(history, selectedIndex) : undefined}
              // Straightening (Crop panel; 0–100 slider, centre = 0°, ±45°).
              rotation={showAfter ? straightenOf(history, selectedIndex) : 0}
              actualZoom={actualZoom}
              onMetrics={handleMetrics}
              onActualZoomChange={setActualZoom}
              onPullToSurvey={
                tab === "cull" && ai.actionStatuses.cull === "complete" ? onOpenSurvey : undefined
              }
              badge={
                <>
                  {!showAfter && (
                    <span className="pointer-events-none absolute left-6 top-6 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                      Before
                    </span>
                  )}
                </>
              }
              overlay={
                activeRail === "crop" ? (
                  <SliderHistoryContext.Provider value={{ image: selectedIndex, tool: "crop" }}>
                    <SliderScopeContext.Provider value="Crop">
                      <CropOverlay />
                    </SliderScopeContext.Provider>
                  </SliderHistoryContext.Provider>
                ) : wbPicking ? (
                  // White balance eyedropper: click a neutral spot on the photo.
                  <button
                    type="button"
                    aria-label="Pick white balance from the photo"
                    onClick={() => wbPicker.pick()}
                    className="absolute inset-0 z-10 cursor-crosshair"
                  />
                ) : null
              }
              canvasOverlay={
                <>
                  {/* Brush toolbar for the brush-based tools: Masking and Object Removal. */}
                  {(activeRail === "patch" || activeRail === "mask") && (
                    <BrushToolbar key={activeRail} />
                  )}
                  {/* Image info floats over the canvas (ⓘ in the bottom bar). */}
                  {infoOpen && (
                    <ImageInfoCard
                      image={photoId}
                      name={photoName(photoId)}
                      onClose={() => setInfoOpen(false)}
                    />
                  )}
                </>
              }
            />
          </div>
        </PhotoContextMenu>

        {/* Duplicates strip: contextual to culling — appears only while the AI
            Actions panel is open after a cull has run. Its own collapse tab is
            independent of the album filmstrip. */}
        {showDuplicatesStrip && (
          <DuplicatesStrip
            expanded={showDuplicates}
            onToggle={() => setShowDuplicates((v) => !v)}
            selectedGridTile={selectedIndex}
            activeDup={dupIndex}
            onSelectDup={onSelectDup}
            size="compact"
          />
        )}

        <AlbumFilmstrip
          selectedIndex={selectedIndex}
          onSelect={onSelectIndex}
          cullComplete={ai.actionStatuses.cull === "complete"}
        />
        <BottomBar
          zoom={0}
          onZoomChange={() => {}}
          imageZoom={{
            fit: actualZoom === null,
            percent: actualZoom ?? fitPercent,
            onFit: () => setActualZoom(null),
            onPercent: setActualZoom,
          }}
          showAfter={showAfter}
          onToggleAfter={() => setShowAfter((v) => !v)}
          showSprayCan={false}
          rating={ratings.ratingOf(photoId)}
          onRate={(v) => ratings.setRating(photoId, v)}
          index={selectedIndex}
          imageName={photoName(photoId)}
          infoOpen={infoOpen}
          onToggleInfo={() => setInfoOpen((v) => !v)}
        />
      </div>

      {/* Single 340px panel slot — the AI Actions panel and the editing rail
          panels share it (never shown at once). */}
      {panelOpen && (
        <div className="relative flex min-h-0 shrink-0">
          <LoupeRailPanel activeRail={activeRail} selectedIndex={selectedIndex} ai={ai} />
        </div>
      )}

      <LoupeRail tab={tab} activeRail={panelOpen ? activeRail : null} onSelect={handleRailSelect} />
    </div>
  );
}

// Decide which rail loupe opens on — contextual to how the user arrived.
//
// If an AI action has run, that wins (a single completed action lands you in
// its context; more than one defaults to Edit sliders):
//   cull only    → AI Actions panel (culling results)
//   edit only    → Edit sliders
//   retouch only → Retouch
//   mixed        → Edit
//
// If NO AI action has run, fall back to the grid rail the user came from:
//   grid AI Editing          → loupe Edit
//   grid AI Retouching       → loupe Retouch
//   grid AI Culling / other  → loupe AI Actions
function initialRail(
  statuses: LoupeAIState["actionStatuses"],
  entryRail: GridRailKey,
): LoupeRailKey {
  const done = (["cull", "edit", "retouch"] as AIAction[]).filter(
    (a) => statuses[a] === "complete",
  );
  if (done.length === 1) {
    switch (done[0]) {
      case "cull":
        return "ai"; // AI Actions panel — culling results.
      case "edit":
        return "edit";
      case "retouch":
        return "retouch";
    }
  }
  if (done.length > 1) return "edit";

  // No AI action run yet — mirror the grid context.
  switch (entryRail) {
    case "edit":
    case "editRetouch": // UI-2 Edit & Retouch
    case "editRetouchAll": // one-tab layout Editing & Retouching
      return "edit"; // grid AI Editing → loupe Edit sliders.
    case "aiTools": // UI-2 AI Crop, Masking & Denoise → loupe Crop
      return "crop";
    case "retouch":
      return "retouch";
    default:
      return "ai"; // AI Culling (also the default for Info/History/etc.).
  }
}

// Grid Edit / Retouch tabs are contextual: opening an image from one always
// lands on the matching loupe tool, whatever was open last time.
function gridToolRail(entryRail: GridRailKey): LoupeRailKey | null {
  switch (entryRail) {
    case "edit":
    case "editRetouch":
    case "editRetouchAll":
      return "edit";
    case "retouch":
      return "retouch";
    case "aiTools":
      return "crop";
    default:
      return null;
  }
}

// Re-exported for callers that build the AI state object.
export type { AIAction };
