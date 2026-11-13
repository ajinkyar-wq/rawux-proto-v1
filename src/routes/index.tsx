import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BottomBar } from "@/components/aftershoot/BottomBar";
import { CanvasGrid, zoomToCols } from "@/components/aftershoot/CanvasGrid";
import { Rail } from "@/components/aftershoot/Rail";
import { AppBar, ViewBar, type ViewMode } from "@/components/aftershoot/Toolbar";
import {
  ACTION_RUN_DURATION_MS,
  INITIAL_ACTION_STATUSES,
  type ActionStatuses,
} from "@/components/aftershoot/action-status";
import { LoupeView } from "@/components/aftershoot/loupe/LoupeView";
import { SurveyView } from "@/components/aftershoot/survey/SurveyView";
import { CullSettingsModal } from "@/components/aftershoot/modals/CullSettingsModal";
import { EditSettingsModal } from "@/components/aftershoot/modals/EditSettingsModal";
import { RetouchSettingsModal } from "@/components/aftershoot/modals/RetouchSettingsModal";
import { RailPanel } from "@/components/aftershoot/panels/RailPanel";
import type { AIAction } from "@/components/aftershoot/panels/ImagePanel";
import {
  TAB_DEFAULT_RAIL,
  railForAction,
  type AppTab,
  type Layout,
  type RailKey,
} from "@/components/aftershoot/rail-config";
import { useRatings, type Ratings } from "@/components/aftershoot/use-ratings";
import {
  AlbumHistoryContext,
  TOOL_LABEL,
  VIEW_LABEL,
  imageName,
  useAlbumHistory,
  RATING_KEY,
  SEED_END,
  ratingLabel,
  type AlbumEntry,
  type UxMode,
} from "@/components/aftershoot/history/album-history";
import { UxSelector } from "@/components/aftershoot/history/UxSelector";
import { UndoToast, type UndoFeedbackItem } from "@/components/aftershoot/history/UndoFeedback";
import { tabOfLoupeRail, type LoupeRailKey } from "@/components/aftershoot/loupe/loupe-rail-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aftershoot" },
      { name: "description", content: "AI Cull, Edit & Retouch for photographers." },
    ],
  }),
  component: AftershootScreen,
});

// Undo/Redo behaviour is fixed to "Undo takes you there": Undo/Redo
// navigates to the image, view and tool where the change was made. (The
// "stay in place + toast" variant, ux2, is still supported below.)
const UNDO_MODE: UxMode = "ux1";

// Entry: the UI - 1 / UI - 2 layout selector, then the album. Each pick starts
// a fresh session (album Undo/Redo is session-only, per the History spec).
function AftershootScreen() {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [session, setSession] = useState(0);
  if (!layout) {
    return (
      <UxSelector
        onSelect={(m) => {
          setLayout(m);
          setSession((n) => n + 1);
        }}
      />
    );
  }
  return (
    <Workspace key={session} layout={layout} uxMode={UNDO_MODE} onHome={() => setLayout(null)} />
  );
}

function Workspace({
  layout,
  uxMode,
  onHome,
}: {
  layout: Layout;
  uxMode: UxMode;
  onHome: () => void;
}) {
  // The seeded album history leaves the user in Grid on SEED_END.image.
  const [viewMode, setViewMode] = useState<ViewMode>(SEED_END.view);
  // CULL / ENHANCE app tab (toolbar). The seeded history ends in Loupe on an
  // editing tool, so the album opens on ENHANCE.
  const [appTab, setAppTab] = useState<AppTab>("enhance");
  const [activeRail, setActiveRail] = useState<RailKey>(TAB_DEFAULT_RAIL[layout].enhance);
  // Grid side panel collapses when the active rail icon is clicked again
  // (same behaviour as loupe); clicking it again or another icon reopens it.
  const [gridPanelOpen, setGridPanelOpen] = useState(true);
  const selectGridRail = (key: RailKey) => {
    if (key === activeRail) {
      setGridPanelOpen((v) => !v);
    } else {
      setActiveRail(key);
      setGridPanelOpen(true);
    }
  };
  const [selectedGridTile, setSelectedGridTile] = useState(SEED_END.image);
  const [activeModal, setActiveModal] = useState<AIAction | null>(null);
  // The history demo starts with an Automated AI cull already done, so cull
  // ratings, filters, key faces, duplicates and Survey are all available.
  const [actionStatuses, setActionStatuses] = useState<ActionStatuses>({
    ...INITIAL_ACTION_STATUSES,
    cull: "complete",
  });
  const [activeResultsTab, setActiveResultsTab] = useState<AIAction | null>(null);
  // Which cull mode the user ran. Assisted = AI only groups duplicates / key
  // faces and the user selects (no AI ratings → no cull filters). Automated =
  // AI rates & selects (cull filters available). null until a cull is run.
  const [cullMode, setCullMode] = useState<"assisted" | "automated" | null>("automated");
  // Bottom-bar zoom 0-100 driving the canvas grid column count.
  const [zoom, setZoom] = useState(55);
  // Active rating filter (1..5). Empty = show all. Driven by BOTH the
  // FilterBar's star buttons and its color swatches (color ↔ rating), and used
  // to filter which tiles the CanvasGrid shows.
  const [ratingFilter, setRatingFilter] = useState<Set<number>>(new Set());
  const toggleRatingFilter = (rating: number) =>
    setRatingFilter((prev) => {
      const next = new Set(prev);
      if (next.has(rating)) next.delete(rating);
      else next.add(rating);
      return next;
    });

  // Shared rating state: grid tiles and the loupe bottom-bar chip read/write
  // the same overrides, so a rating set in one view shows in the other. Images
  // are unrated until AI cull completes, then carry their cull rating.

  const baseRatings = useRatings(actionStatuses.cull === "complete");

  // ---- Album-level Undo/Redo (act-out prototype) ----
  const history = useAlbumHistory();
  // Loupe's open tool survives switching to Grid/Survey and back.
  const [lastLoupeRail, setLastLoupeRail] = useState<LoupeRailKey | null>(null);
  const [railRequest, setRailRequest] = useState<{ key: LoupeRailKey; n: number } | null>(null);
  const [toast, setToast] = useState<UndoFeedbackItem | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // Switch CULL ↔ ENHANCE: the rails swap to that tab's tools. Survey is a
  // culling view, so leaving CULL from Survey drops back to Grid.
  const changeTab = (tab: AppTab) => {
    if (tab === appTab) return;
    setAppTab(tab);
    setActiveRail(TAB_DEFAULT_RAIL[layout][tab]);
    setGridPanelOpen(true);
    setRailRequest(null);
    if (tab !== "cull" && viewMode === "survey") setViewMode("grid");
  };

  // Grid multi-selection (⌘-click toggles, ⇧-click selects a range).
  // Undo/Redo landing in Grid scrolls the affected images into view.
  const [gridScrollTarget, setGridScrollTarget] = useState<{ id: number; n: number } | null>(null);
  const [gridSelection, setGridSelection] = useState<Set<number>>(() => new Set([SEED_END.image]));
  const selectInGrid = (i: number, mode: "single" | "toggle" | "range") => {
    if (mode === "single") {
      setGridSelection(new Set([i]));
    } else if (mode === "toggle") {
      setGridSelection((prev) => {
        const next = new Set(prev);
        if (next.has(i) && next.size > 1) next.delete(i);
        else next.add(i);
        return next;
      });
    } else {
      const [lo, hi] = [Math.min(selectedGridTile, i), Math.max(selectedGridTile, i)];
      setGridSelection(new Set(Array.from({ length: hi - lo + 1 }, (_, k) => lo + k)));
      return; // keep the range anchor as the primary image
    }
    setSelectedGridTile(i);
  };

  // Ratings live in the album history store (fall back to AI cull rating).
  const ratingOf = useCallback(
    (id: number) => history.getValue(id, RATING_KEY) ?? baseRatings.ratingOf(id),
    [history, baseRatings],
  );
  // Rate one or many images → ONE history step (a batch when several).
  const rateImages = (ids: number[], stars: number) => {
    const targets = ids.filter((i) => ratingOf(i) !== stars);
    if (targets.length === 0) return;
    history.record({
      kind: "change",
      op: "Star Rating",
      value: ratingLabel(stars),
      view: viewMode,
      tool: "ai",
      images: targets,
      effects: targets.map((i) => ({
        image: i,
        key: RATING_KEY,
        prev: history.getValue(i, RATING_KEY),
        next: stars,
      })),
    });
  };
  const ratings: Ratings = {
    ratingOf,
    setRating: (id: number, value: number) => rateImages([id], value),
  };

  // View switches are recorded as album navigation.
  const changeView = (mode: ViewMode) => {
    if (mode === viewMode) return;
    history.record({
      kind: "nav",
      op: "View",
      value: VIEW_LABEL[mode],
      from: { view: viewMode, image: selectedGridTile },
      to: { view: mode, image: selectedGridTile },
    });
    if (mode === "grid") setGridSelection(new Set([selectedGridTile]));
    setRailRequest(null);
    setViewMode(mode);
  };
  // Switching images in Loupe / Survey is recorded as album navigation.
  const changeImage = (i: number) => {
    if (i === selectedGridTile) return;
    history.record({
      kind: "nav",
      op: "Image",
      value: imageName(i),
      from: { view: viewMode, image: selectedGridTile },
      to: { view: viewMode, image: i },
    });
    setSelectedGridTile(i);
  };

  // Undo/Redo has already reverted/re-applied the values in the store. Here we
  // only decide what the user SEES: UX-1 navigates to where the action
  // happened; UX-2 stays put and confirms with a toast.
  const actOut = (entry: AlbumEntry, direction: "undo" | "redo") => {
    // Move to an image in a view (both UX modes — PRD §6.1: navigation steps
    // move the user, and the view change counts as a step of its own).
    const goTo = (view: ViewMode, images: number[]) => {
      // A pending tool request must not replay when loupe remounts later.
      if (view !== "loupe") setRailRequest(null);
      if (view === "survey" && appTab !== "cull") changeTab("cull");
      setViewMode(view);
      setSelectedGridTile(images[0]);
      if (view === "grid") {
        setGridSelection(new Set(images));
        setGridScrollTarget({ id: Math.min(...images), n: Date.now() });
      }
    };

    if (entry.kind === "nav") {
      const target = direction === "undo" ? entry.from : entry.to;
      goTo(target.view, [target.image]);
      return;
    }

    // An image change. Make sure we're on its image/view (the stack's own
    // navigation steps normally already put us there).
    goTo(entry.view, entry.images);

    // PRD §6.2 (open point) — changes made across tools on the same image:
    //   UX-1: switch to the tool the change was made in.
    //   UX-2: stay in the current tool; only show that the undo happened.
    if (uxMode === "ux1") {
      if (entry.view === "loupe") {
        const tab = tabOfLoupeRail(entry.tool);
        if (tab && tab !== appTab) changeTab(tab);
        setRailRequest({ key: entry.tool, n: Date.now() });
      }
      return;
    }
    setToast({
      key: Date.now(),
      direction,
      title: `${entry.op} : ${entry.value}`,
      context: `${
        entry.images.length > 1 ? `${entry.images.length} images` : imageName(entry.images[0])
      } · ${TOOL_LABEL[entry.tool]}`,
    });
  };

  // Keyboard: ⌘Z / ⇧⌘Z (Ctrl on Windows) and 0–5 to rate. In Grid the rating
  // applies to the whole multi-selection; in Loupe / Survey to the current
  // image. Ref keeps the single listener on the latest state.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (activeModal) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const dir = e.shiftKey ? "redo" : "undo";
      const entry = dir === "undo" ? history.undo() : history.redo();
      if (entry) actOut(entry, dir);
      return;
    }
    if (!e.metaKey && !e.ctrlKey && !e.altKey && /^[0-5]$/.test(e.key)) {
      const ids =
        viewMode === "grid" ? [...gridSelection].sort((x, y) => x - y) : [selectedGridTile];
      rateImages(ids, Number(e.key));
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const startAction = (action: AIAction) => {
    setActiveModal(null);
    setActionStatuses((s) => ({ ...s, [action]: "running" }));
    window.setTimeout(() => {
      setActionStatuses((s) => ({ ...s, [action]: "complete" }));
      setActiveResultsTab(action);
      // Jump to the matching tab + AI Culling/Editing/Retouching panel.
      setAppTab(action === "cull" ? "cull" : "enhance");
      setActiveRail(railForAction(layout, action));
      setGridPanelOpen(true);
    }, ACTION_RUN_DURATION_MS);
  };

  const openInLoupe = (i: number) => {
    if (viewMode !== "loupe")
      history.record({
        kind: "nav",
        op: "View",
        value: VIEW_LABEL.loupe,
        from: { view: viewMode, image: i },
        to: { view: "loupe", image: i },
      });
    setSelectedGridTile(i);
    setViewMode("loupe");
  };

  // Filter row, rendered inside each view above the image area.
  const viewBar = (
    <ViewBar
      tab={appTab}
      viewMode={viewMode}
      onChangeViewMode={changeView}
      cullComplete={actionStatuses.cull === "complete"}
      ratingFilter={ratingFilter}
      onToggleRating={toggleRatingFilter}
    />
  );

  return (
    <AlbumHistoryContext.Provider value={history}>
      <div className="flex h-screen flex-col bg-[#1a1a1a] text-neutral-300 font-sans select-none text-[13px]">
        <AppBar tab={appTab} onChangeTab={changeTab} onHome={onHome} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {viewMode === "grid" && (
            <GridView
              viewBar={viewBar}
              layout={layout}
              tab={appTab}
              activeRail={activeRail}
              onSelectRail={selectGridRail}
              panelOpen={gridPanelOpen}
              selectedGridTile={selectedGridTile}
              gridSelection={gridSelection}
              onSelectInGrid={selectInGrid}
              gridScrollTarget={gridScrollTarget}
              actionStatuses={actionStatuses}
              zoom={zoom}
              setZoom={setZoom}
              onAction={setActiveModal}
              onOpenInLoupe={openInLoupe}
              ratingFilter={ratingFilter}
              onToggleRating={toggleRatingFilter}
              ratings={ratings}
              cullMode={cullMode}
            />
          )}
          {viewMode === "loupe" && (
            <LoupeView
              viewBar={viewBar}
              key={appTab}
              tab={appTab}
              selectedIndex={selectedGridTile}
              onSelectIndex={changeImage}
              railRequest={railRequest}
              lastRail={lastLoupeRail}
              onRailChange={setLastLoupeRail}
              cullFiltersVisible={actionStatuses.cull === "complete" && cullMode === "automated"}
              ai={{
                actionStatuses,
                activeResultsTab,
                onSelectResultsTab: setActiveResultsTab,
                onAction: setActiveModal,
                ratingFilter,
                onToggleRating: toggleRatingFilter,
                cullFiltersVisible: actionStatuses.cull === "complete" && cullMode === "automated",
              }}
              entryRail={activeRail}
              ratings={ratings}
            />
          )}
          {viewMode === "survey" && (
            <SurveyView
              viewBar={viewBar}
              selectedIndex={selectedGridTile}
              onSelectIndex={changeImage}
              onOpenInLoupe={openInLoupe}
              zoom={zoom}
              onZoomChange={setZoom}
              cullComplete={actionStatuses.cull === "complete"}
              cullFiltersVisible={actionStatuses.cull === "complete" && cullMode === "automated"}
            />
          )}
        </div>

        {activeModal === "cull" && (
          <CullSettingsModal
            onClose={() => setActiveModal(null)}
            onStart={(mode) => {
              setCullMode(mode);
              startAction("cull");
            }}
          />
        )}
        {activeModal === "edit" && (
          <EditSettingsModal
            onClose={() => setActiveModal(null)}
            onStart={() => startAction("edit")}
          />
        )}
        {activeModal === "retouch" && (
          <RetouchSettingsModal
            onClose={() => setActiveModal(null)}
            onStart={() => startAction("retouch")}
          />
        )}

        <UndoToast item={toast} onDone={clearToast} />
      </div>
    </AlbumHistoryContext.Provider>
  );
}

function GridView({
  viewBar,
  layout,
  tab,
  activeRail,
  onSelectRail,
  panelOpen,
  selectedGridTile,
  gridSelection,
  onSelectInGrid,
  gridScrollTarget,
  actionStatuses,
  zoom,
  setZoom,
  onAction,
  onOpenInLoupe,
  ratingFilter,
  onToggleRating,
  ratings,
  cullMode,
}: {
  viewBar: React.ReactNode;
  layout: Layout;
  tab: AppTab;
  activeRail: RailKey;
  onSelectRail: (key: RailKey) => void;
  panelOpen: boolean;
  selectedGridTile: number;
  gridSelection: Set<number>;
  onSelectInGrid: (i: number, mode: "single" | "toggle" | "range") => void;
  gridScrollTarget: { id: number; n: number } | null;
  actionStatuses: ActionStatuses;
  zoom: number;
  setZoom: (v: number) => void;
  onAction: (a: AIAction) => void;
  onOpenInLoupe: (i: number) => void;
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
  ratings: Ratings;
  cullMode: "assisted" | "automated" | null;
}) {
  // Cull filters only exist for an Automated cull (AI made the ratings). An
  // Assisted cull groups duplicates / key faces but adds no AI ratings.
  const cullFiltersVisible = actionStatuses.cull === "complete" && cullMode === "automated";
  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {viewBar}
        <CanvasGrid
          selected={selectedGridTile}
          selection={gridSelection}
          onSelect={onSelectInGrid}
          scrollTarget={gridScrollTarget}
          onOpenInLoupe={onOpenInLoupe}
          cols={zoomToCols(zoom)}
          ratingFilter={ratingFilter}
          ratings={ratings}
        />
        <BottomBar
          zoom={zoom}
          onZoomChange={setZoom}
          index={selectedGridTile}
          countSuffix={
            gridSelection.size > 1 ? `Images · ${gridSelection.size} selected` : "Images"
          }
          showSprayCan={false}
          showCompare={false}
        />
      </div>

      {panelOpen && (
        <RailPanel
          railKey={activeRail}
          onAction={onAction}
          actionStatuses={actionStatuses}
          selectedGridTile={selectedGridTile}
          ratingFilter={ratingFilter}
          onToggleRating={onToggleRating}
          cullFiltersVisible={cullFiltersVisible}
        />
      )}
      <Rail
        layout={layout}
        tab={tab}
        activeRail={panelOpen ? activeRail : null}
        onSelect={onSelectRail}
      />
    </>
  );
}
