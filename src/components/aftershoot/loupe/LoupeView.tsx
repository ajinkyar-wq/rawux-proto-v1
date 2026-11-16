import { useEffect, useState } from "react";
import { BottomBar } from "../BottomBar";
import { CULL_IMAGES } from "../cull-data";
import { DuplicatesStrip } from "../DuplicatesStrip";
import { AlbumFilmstrip } from "./AlbumFilmstrip";
import { CropOverlay } from "./CropOverlay";
import { LoupeImage } from "./LoupeImage";
import { LoupeRail } from "./LoupeRail";
import { LoupeRailPanel, type LoupeAIState } from "./LoupeRailPanel";
import { loupeRailInTab, type LoupeRailKey } from "./loupe-rail-config";
import type { Ratings } from "../use-ratings";
import type { AIAction } from "../panels/ImagePanel";
import type { AppTab, RailKey as GridRailKey } from "../rail-config";

export function LoupeView({
  viewBar,
  tab,
  selectedIndex,
  onSelectIndex,
  cullFiltersVisible,
  ai,
  entryRail,
  ratings,
  railRequest,
  lastRail,
  onRailChange,
  onOpenShortcuts,
}: {
  // Filter row (ViewBar) — sits above the image area only.
  viewBar?: React.ReactNode;
  // CULL / ENHANCE app tab — decides which tools the loupe rail offers.
  tab: AppTab;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
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
}) {
  // Which rail loupe opens on is contextual to how you arrived. See initialRail.
  // Returning to loupe restores the tool the user last had open here.
  const [activeRail, setActiveRail] = useState<LoupeRailKey>(() => {
    const preferred = lastRail ?? initialRail(ai.actionStatuses, entryRail);
    if (loupeRailInTab(preferred, tab)) return preferred;
    return tab === "cull" ? "ai" : "edit";
  });
  useEffect(() => {
    onRailChange?.(activeRail);
  }, [activeRail, onRailChange]);
  // Image zoom (0 = fit) — loupe-only, so it never changes the grid's columns.
  const [imageZoom, setImageZoom] = useState(0);
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

  function handleRailSelect(key: LoupeRailKey) {
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {viewBar}
        <LoupeImage
          image={selectedIndex}
          zoom={imageZoom}
          overlay={activeRail === "crop" ? <CropOverlay /> : null}
        />

        {/* Duplicates strip: contextual to culling — appears only while the AI
            Actions panel is open after a cull has run. Its own collapse tab is
            independent of the album filmstrip. */}
        {showDuplicatesStrip && (
          <DuplicatesStrip
            expanded={showDuplicates}
            onToggle={() => setShowDuplicates((v) => !v)}
            selectedGridTile={selectedIndex}
            size="compact"
          />
        )}

        <AlbumFilmstrip
          selectedIndex={selectedIndex}
          onSelect={onSelectIndex}
          cullComplete={ai.actionStatuses.cull === "complete"}
        />
        <BottomBar
          zoom={imageZoom}
          onZoomChange={setImageZoom}
          showSprayCan={false}
          rating={ratings.ratingOf(selectedIndex)}
          onRate={(v) => ratings.setRating(selectedIndex, v)}
          index={selectedIndex}
          imageName={CULL_IMAGES[selectedIndex % CULL_IMAGES.length]?.name}
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

// Re-exported for callers that build the AI state object.
export type { AIAction };
