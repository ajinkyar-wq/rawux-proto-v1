import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BottomBar } from "@/components/aftershoot/BottomBar";
import { CanvasGrid, zoomToCols } from "@/components/aftershoot/CanvasGrid";
import { Rail } from "@/components/aftershoot/Rail";
import {
  PhotoMenuContext,
  type MenuTab,
  type PhotoMenuApi,
} from "@/components/aftershoot/PhotoContextMenu";
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
import { dupId, dupOf, imageOf } from "@/components/aftershoot/duplicates";
import { UndoToast, type UndoFeedbackItem } from "@/components/aftershoot/history/UndoFeedback";
import { tabOfLoupeRail, type LoupeRailKey } from "@/components/aftershoot/loupe/loupe-rail-config";
import { HomeScreen } from "@/features/import/components/Home/HomeScreen";
import { CopyScreen } from "@/features/import/components/Import/CopyScreen";
import { CreateAlbumModal } from "@/features/import/components/Import/CreateAlbumModal";
import { FinderDialog } from "@/features/import/components/Import/FinderDialog";
import { IngestDialog } from "@/features/import/components/Import/IngestDialog";
import { NewAlbumModal } from "@/features/import/components/Import/NewAlbumModal";
import { PreviewScreen } from "@/features/import/components/Import/PreviewScreen";
import { OneClickWorkflowModal } from "@/features/import/components/shared/OneClickWorkflowModal";
import { ToastHost } from "@/features/import/components/shared/ToastHost";
import { useCullStore, type AppSection } from "@/features/import/store/useCullStore";
import { useImportStore } from "@/features/import/store/useImportStore";
import { KeyBindingsPanel } from "@/components/aftershoot/shortcuts/KeyBindingsPanel";
import { QuickEditHud } from "@/components/aftershoot/shortcuts/QuickEditHud";
import { buildSliderRegistry } from "@/components/aftershoot/shortcuts/sliderRegistry";
import { useKeyBindings } from "@/components/aftershoot/shortcuts/useKeyBindings";
import { SpeedEditContext, useSpeedEdit } from "@/components/aftershoot/shortcuts/useSpeedEdit";
import { SettingsDialog } from "@/components/aftershoot/shortcuts/SettingsDialog";
import { setOpenFaceHandler, setPendingFace } from "@/components/aftershoot/faces";
import { FaceDetectionRunner } from "@/components/aftershoot/FaceDetectionRunner";
import { requestShortcutSection } from "@/components/aftershoot/shortcuts/shortcutMap";
import { readShortcutMode } from "@/components/aftershoot/shortcuts/useShortcutMode";
import {
  defaultSettings,
  type EditSettings,
} from "@/components/aftershoot/shortcuts/edit-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aftershoot" },
      { name: "description", content: "AI Cull, Edit & Retouch for photographers." },
    ],
  }),
  component: AftershootScreen,
});

// Undo/Redo behaviour is fixed to UX-2: Undo/Redo goes to the image and view
// of the change but stays in the current tool, and a toast says what was
// undone and where. (UX-1, which also switches to the change's tool, is
// still supported below.)
const ALBUM_IMAGE_COUNT = 232;
const UNDO_MODE: UxMode = "ux2";

// Entry: Home (the layout selector is off; UI-2 "Separate tabs" is the only
// layout in use). From Home an album
// opens either directly or at the end of the import flow (New Album → sources
// → ingest → Create Album). Each time an album opens it starts a fresh
// session (album Undo/Redo is session-only, per the History spec).
function AftershootScreen() {
  const layout: Layout = "ui1"; // "UI - 2 · Separate tabs"
  // Clicking a button never moves keyboard focus onto it, so arrow keys /
  // Space keep driving the app (not the last thing clicked) and no focus
  // rings appear while moving around the filmstrip.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("button, [role='button']");
      if (el && !el.closest("input, textarea, select, [contenteditable='true']"))
        e.preventDefault();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  const screen = useCullStore((s) => s.screen);
  const albumSession = useCullStore((s) => s.albumSession);
  const albumName = useCullStore((s) => s.albumName);
  const section = useCullStore((s) => s.activeSection);
  const isAlbumNew = useCullStore((s) => s.isAlbumNew);
  const goHome = useCullStore((s) => s.goHome);
  const openNewAlbum = useImportStore((s) => s.openNewAlbum);
  const inAlbum = screen === "album";
  useImportBodyStyles(!inAlbum);

  return (
    <>
      {inAlbum ? (
        <Workspace
          key={albumSession}
          layout={layout}
          uxMode={UNDO_MODE}
          albumName={albumName}
          section={section}
          isNew={isAlbumNew}
          onHome={goHome}
          onAdd={() => openNewAlbum(albumName)}
        />
      ) : (
        <div className="as-import as-import-screen">
          {screen === "home" && <HomeScreen />}
          {screen === "copy" && <CopyScreen />}
          {screen === "preview" && <PreviewScreen />}
        </div>
      )}
      {/* The import dialogs open over whatever is showing, the album included. */}
      <div className="as-import contents">
        <NewAlbumModal />
        <IngestDialog />
        <FinderDialog />
        <CreateAlbumModal />
        <OneClickWorkflowModal />
        <ToastHost />
      </div>
    </>
  );
}

// The Home and import screens portal their menus and tooltips onto <body>,
// outside the .as-import wrapper, so body carries their font and colours too
// while one of those screens (or an import dialog over the album) is showing.
function useImportBodyStyles(onImportScreen: boolean) {
  const dialogOpen = useImportStore(
    (s) => s.isNewAlbumOpen || s.isIngestOpen || s.finder !== null || s.createAlbum !== null,
  );
  const oneClickOpen = useCullStore((s) => s.oneClick.isOpen);
  const active = onImportScreen || dialogOpen || oneClickOpen;
  useEffect(() => {
    document.body.classList.toggle("as-import-body", active);
    return () => document.body.classList.remove("as-import-body");
  }, [active]);
}

// Where an album opens: Cull on the CULL tab, Edit and Retouch on ENHANCE
// with their own panel (the combined panel in the one-tab layout and UI-2).
const sectionTab = (section: AppSection): AppTab => (section === "cull" ? "cull" : "enhance");
const sectionRail = (layout: Layout, section: AppSection): RailKey =>
  section === "retouch"
    ? railForAction(layout, "retouch")
    : TAB_DEFAULT_RAIL[layout][sectionTab(section)];

function Workspace({
  layout,
  uxMode,
  albumName,
  section,
  isNew,
  onHome,
  onAdd,
}: {
  layout: Layout;
  uxMode: UxMode;
  albumName: string;
  // The section the album opens on (Cull Now / Edit Now on Home, or the mode
  // picked in Create Album).
  section: AppSection;
  // An album created in this session: nothing culled, rated or edited yet.
  // Every other album opens on the seeded demo session.
  isNew: boolean;
  onHome: () => void;
  onAdd: () => void;
}) {
  // The seeded album history leaves the user in Grid on SEED_END.image; a new
  // album starts in Grid on its first image.
  const startImage = isNew ? 0 : SEED_END.image;
  const [viewMode, setViewMode] = useState<ViewMode>(isNew ? "grid" : SEED_END.view);
  // CULL / ENHANCE app tab (toolbar).
  const [appTab, setAppTab] = useState<AppTab>(sectionTab(section));
  const [activeRail, setActiveRail] = useState<RailKey>(sectionRail(layout, section));
  // Grid side panel collapses when the active rail icon is clicked again
  // (same behaviour as loupe); clicking it again or another icon reopens it.
  const [gridPanelOpen, setGridPanelOpen] = useState(true);
  const selectGridRail = (key: RailKey) => {
    // Keyboard opens the Keyboard Shortcuts modal, not a side panel.
    if (key === "keyboard") {
      openShortcuts(appTab === "cull" ? "cull.duplicates" : "edit.sliders");
      return;
    }
    if (key === activeRail) {
      setGridPanelOpen((v) => !v);
    } else {
      setActiveRail(key);
      setGridPanelOpen(true);
    }
  };
  const [selectedGridTile, setSelectedGridTile] = useState(startImage);
  // Which photo of the selected image's duplicate set Loupe / Survey show
  // (0 = the image itself). Tied to the image: moving to another image drops
  // back to its first photo.
  const [dupState, setDupState] = useState({ image: startImage, dup: 0 });
  const dupIndex = dupState.image === selectedGridTile ? dupState.dup : 0;
  const activePhoto = dupId(selectedGridTile, dupIndex);
  const [activeModal, setActiveModal] = useState<AIAction | null>(null);

  // ---- Keyboard Shortcuts modal + App Settings ----
  // The modal opens on the section that matters where it was opened from
  // (requestShortcutSection is read once by the panel when it mounts):
  //   rail Keyboard icon → Cull: Duplicates & Faces; Enhance: Edit sliders,
  //                        or Crop & Masking from loupe Crop / Mask;
  //   Settings → Shortcuts → Global: Image Properties. Settings closes, and
  //                        reopens when the Shortcuts modal closes.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsFromSettings, setShortcutsFromSettings] = useState(false);
  const [shortcutMode] = useState(() => readShortcutMode() ?? "hold");
  // Slider values the speed-edit key list is built from.
  const [editSettings, setEditSettings] = useState<EditSettings>(() => ({ ...defaultSettings }));
  const openShortcuts = (section: string) => {
    requestShortcutSection(section);
    setShortcutsOpen(true);
  };
  const closeShortcuts = () => {
    setShortcutsOpen(false);
    if (shortcutsFromSettings) {
      setShortcutsFromSettings(false);
      setSettingsOpen(true);
    }
  };
  const openShortcutsFromSettings = () => {
    setSettingsOpen(false);
    setShortcutsFromSettings(true);
    openShortcuts("global.imageProperties");
  };
  const openShortcutsFromLoupe = (from: LoupeRailKey) =>
    openShortcuts(
      appTab === "cull"
        ? "cull.duplicates"
        : from === "crop" || from === "mask"
          ? "edit.cropMasking"
          : "edit.sliders",
    );
  // The history demo starts with an Automated AI cull already done, so cull
  // ratings, filters, key faces, duplicates and Survey are all available. A
  // new album has had nothing run on it.
  const [actionStatuses, setActionStatuses] = useState<ActionStatuses>({
    ...INITIAL_ACTION_STATUSES,
    cull: isNew ? "idle" : "complete",
  });
  const [activeResultsTab, setActiveResultsTab] = useState<AIAction | null>(null);
  // Which cull mode the user ran. Assisted = AI only groups duplicates / key
  // faces and the user selects (no AI ratings → no cull filters). Automated =
  // AI rates & selects (cull filters available). null until a cull is run.
  const [cullMode, setCullMode] = useState<"assisted" | "automated" | null>(
    isNew ? null : "automated",
  );
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
  const history = useAlbumHistory(!isNew);
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
    // Photos added to this album later come back to the tab they were added from.
    useCullStore.getState().setActiveSection(tab === "cull" ? "cull" : "edit");
    setActiveRail(TAB_DEFAULT_RAIL[layout][tab]);
    setGridPanelOpen(true);
    setRailRequest(null);
    if (tab !== "cull" && viewMode === "survey") setViewMode("grid");
  };

  // Grid multi-selection (⌘-click toggles, ⇧-click selects a range).
  // Undo/Redo landing in Grid scrolls the affected images into view.
  const [gridScrollTarget, setGridScrollTarget] = useState<{ id: number; n: number } | null>(null);
  const [gridSelection, setGridSelection] = useState<Set<number>>(() => new Set([startImage]));
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

  // ---- Speed edit keys (hold a key to quick-edit its slider) ----
  // One bindings store shared with the Keyboard Shortcuts modal, so a key
  // rebound there works straight away. Active on every screen, off while a
  // modal is open.
  const { bindings, setBinding, resetDefaults, replaceAll, lookupSliderForKey } = useKeyBindings();
  // Import dialogs (Add photos, One Click) open over the album: keys pause.
  const importModalOpen = useImportStore(
    (s) => s.isNewAlbumOpen || s.isIngestOpen || s.finder !== null || s.createAlbum !== null,
  );
  const oneClickOpen = useCullStore((s) => s.oneClick.isOpen);
  const importDialogOpen = importModalOpen || oneClickOpen;
  const speedEdit = useSpeedEdit({
    history,
    image: selectedGridTile,
    view: viewMode,
    // Quick edits (hold-key slider editing) are an editing tool: off in Cull.
    enabled:
      appTab !== "cull" && !activeModal && !shortcutsOpen && !settingsOpen && !importDialogOpen,
    shortcutMode,
    lookupSliderForKey,
  });

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

  // Loupe → Grid is contextual: land on the grid panel matching the loupe tool
  // you were in (Retouch / Background / Object Removal → Retouching; Edit /
  // Crop / Masking → Editing). Other tools (Info, History…) keep the panel.
  const syncGridRailFromLoupe = () => {
    if (appTab !== "enhance" || !lastLoupeRail) return;
    const action = ["retouch", "background", "patch"].includes(lastLoupeRail)
      ? "retouch"
      : ["edit", "crop", "mask"].includes(lastLoupeRail)
        ? "edit"
        : null;
    if (!action) return;
    setActiveRail(railForAction(layout, action));
    setGridPanelOpen(true);
  };

  // View switches are recorded as album navigation.
  const changeView = (mode: ViewMode) => {
    if (mode === viewMode) return;
    if (mode === "grid" && viewMode === "loupe") syncGridRailFromLoupe();
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
    setGridSelection(new Set([i]));
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

  // Filmstrip click in Loupe: ⌘/Ctrl toggles, ⇧ selects a range from the
  // current image, plain click switches image (and resets the selection).
  const selectInFilmstrip = (i: number, e?: React.MouseEvent) => {
    if (e?.metaKey || e?.ctrlKey) {
      // Toggle without moving the canvas: the current image stays put and
      // always remains part of the selection.
      setGridSelection((prev) => {
        const next = new Set(prev);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        next.add(selectedGridTile);
        return next;
      });
    }
    else if (e?.shiftKey) selectInGrid(i, "range");
    else changeImage(i);
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
      // History never takes you to Cull (Survey is a culling view).
      if (view === "survey") view = "grid";
      if (view === "grid" && viewMode === "loupe") syncGridRailFromLoupe();
      setViewMode(view);
      const albumImages = images.map(imageOf);
      setSelectedGridTile(albumImages[0]);
      setDupState({ image: albumImages[0], dup: dupOf(images[0]) });
      if (view === "grid") {
        setGridSelection(new Set(albumImages));
        setGridScrollTarget({ id: Math.min(...albumImages), n: Date.now() });
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
        if (tab && tab !== "cull" && tab !== appTab) changeTab(tab);
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
    if (activeModal || shortcutsOpen || settingsOpen || speedEdit.holding) return;
    // An import dialog is open over the album (Add photos, One Click).
    if (document.body.classList.contains("as-import-body")) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      const dir = e.shiftKey ? "redo" : "undo";
      const entry = dir === "undo" ? history.undo() : history.redo();
      if (entry) actOut(entry, dir);
      return;
    }
    // ← / → step to the previous / next image in Grid and Loupe (Survey has
    // its own handler, which also supports ⇧ to add to the comparison).
    if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.shiftKey &&
      viewMode !== "survey"
    ) {
      const n = Math.min(
        ALBUM_IMAGE_COUNT - 1,
        Math.max(0, selectedGridTile + (e.key === "ArrowRight" ? 1 : -1)),
      );
      if (n !== selectedGridTile) {
        e.preventDefault();
        if (viewMode === "grid") {
          selectInGrid(n, "single");
          setGridScrollTarget({ id: n, n: Date.now() });
        } else changeImage(n);
      }
      return;
    }
    if (!e.metaKey && !e.ctrlKey && !e.altKey && /^[0-5]$/.test(e.key)) {
      const ids = viewMode === "grid" ? [...gridSelection].sort((x, y) => x - y) : [activePhoto];
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
  // Restart: back to "not run yet" — the panel shows its settings again
  // (keeping the previous choices) so they can be changed and re-run.
  const resetAction = (action: AIAction) => setActionStatuses((s) => ({ ...s, [action]: "idle" }));

  // Survey / Loupe: show a specific photo of a duplicate set. Moving to another
  // image is recorded as album navigation, like changeImage.
  const selectPhoto = (id: number) => {
    changeImage(imageOf(id));
    setDupState({ image: imageOf(id), dup: dupOf(id) });
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

  // Key Faces clicked in the grid panel → Loupe on that photo, zoomed to the face.
  const openInLoupeRef = useRef(openInLoupe);
  openInLoupeRef.current = openInLoupe;
  const gridTileRef = useRef(selectedGridTile);
  gridTileRef.current = selectedGridTile;
  useEffect(() => {
    setOpenFaceHandler((k) => {
      setPendingFace(k);
      openInLoupeRef.current(gridTileRef.current);
    });
    return () => setOpenFaceHandler(null);
  }, []);

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

  // ---- Right-click photo menu (same menu in every tab and view) ----
  const showToast = useCullStore((st) => st.showToast);
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set());
  const [copiedEdits, setCopiedEdits] = useState<number | null>(null);
  const retouching =
    activeRail === "retouch" ||
    (lastLoupeRail !== null && ["retouch", "background", "patch"].includes(lastLoupeRail));
  const menuTab: MenuTab = appTab === "cull" ? "Culling" : retouching ? "Retouching" : "Editing";
  const photos = (ids: number[]) => (ids.length === 1 ? "1 photo" : `${ids.length} photos`);
  const photoMenu: PhotoMenuApi = {
    tab: menuTab,
    view: viewMode,
    selection: gridSelection,
    flagged,
    busy: Object.values(actionStatuses).some((st) => st === "running"),
    surveyAvailable: actionStatuses.cull === "complete",
    canPaste: copiedEdits !== null,
    prepare: (id) => {
      if (!gridSelection.has(id)) selectInGrid(id, "single");
    },
    rate: rateImages,
    toggleFlag: (ids) =>
      setFlagged((prev) => {
        const next = new Set(prev);
        const all = ids.every((i) => prev.has(i));
        ids.forEach((i) => (all ? next.delete(i) : next.add(i)));
        return next;
      }),
    openLoupe: (id) => openInLoupe(imageOf(id)),
    openSurvey: (id) => {
      changeView("survey");
      setSelectedGridTile(imageOf(id));
    },
    rotate: (ids, dir) => showToast(`Rotated ${photos(ids)} ${dir}`),
    copyEdits: (id) => {
      setCopiedEdits(id);
      showToast("Edit settings copied");
    },
    pasteEdits: (ids) => showToast(`Edit settings pasted to ${photos(ids)}`),
    exportTo: (ids, target) => showToast(`Exporting ${photos(ids)} to ${target}`),
    reveal: () => showToast("Revealed in Finder"),
    setAlbumCover: () => showToast("Album cover updated"),
    editCaptureTime: () => showToast("Edit Capture Time"),
    reportIssue: () => showToast(`Report AI issues · ${menuTab}`),
    remove: (ids) => showToast(`Delete ${photos(ids)}`),
  };

  return (
    <PhotoMenuContext.Provider value={photoMenu}>
      <AlbumHistoryContext.Provider value={history}>
        <SpeedEditContext.Provider value={speedEdit.target}>
          <div className="flex h-screen flex-col bg-[#1a1a1a] text-neutral-300 font-sans select-none text-[13px]">
            {actionStatuses.cull === "complete" && <FaceDetectionRunner />}
            <AppBar
              tab={appTab}
              onChangeTab={changeTab}
              onHome={onHome}
              albumName={albumName}
              onAdd={onAdd}
              onOpenSettings={() => setSettingsOpen(true)}
            />

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              {/* Speed edit HUD anchor: floats above the bottom bar, any view. */}
              <div
                data-quick-edit-hud-host
                className="pointer-events-none absolute inset-x-0 bottom-13 z-30 h-10"
              />
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
                  onStartAction={startAction}
                  onResetAction={resetAction}
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
                  onSelectFilm={selectInFilmstrip}
                  selection={gridSelection}
                  dupIndex={dupIndex}
                  onSelectDup={(k) => setDupState({ image: selectedGridTile, dup: k })}
                  onSelectPhoto={selectPhoto}
                  railRequest={railRequest}
                  lastRail={lastLoupeRail}
                  onRailChange={setLastLoupeRail}
                  onOpenShortcuts={openShortcutsFromLoupe}
                  onOpenSurvey={() => changeView("survey")}
                  cullFiltersVisible={
                    actionStatuses.cull === "complete" && cullMode === "automated"
                  }
                  ai={{
                    actionStatuses,
                    activeResultsTab,
                    onSelectResultsTab: setActiveResultsTab,
                    onAction: setActiveModal,
                    ratingFilter,
                    onToggleRating: toggleRatingFilter,
                    cullFiltersVisible:
                      actionStatuses.cull === "complete" && cullMode === "automated",
                  }}
                  entryRail={activeRail}
                  ratings={ratings}
                />
              )}
              {viewMode === "survey" && (
                <SurveyView
                  viewBar={viewBar}
                  selectedIndex={selectedGridTile}
                  dupIndex={dupIndex}
                  onSelectPhoto={selectPhoto}
                  onOpenInLoupe={openInLoupe}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  cullComplete={actionStatuses.cull === "complete"}
                  cullFiltersVisible={
                    actionStatuses.cull === "complete" && cullMode === "automated"
                  }
                  ratings={ratings}
                  onOpenShortcuts={openShortcutsFromLoupe}
                  ai={{
                    actionStatuses,
                    activeResultsTab,
                    onSelectResultsTab: setActiveResultsTab,
                    onAction: setActiveModal,
                    ratingFilter,
                    onToggleRating: toggleRatingFilter,
                    cullFiltersVisible:
                      actionStatuses.cull === "complete" && cullMode === "automated",
                  }}
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

            {shortcutsOpen && (
              <KeyBindingsPanel
                open
                onClose={closeShortcuts}
                sliderDefs={buildSliderRegistry(editSettings, setEditSettings, [])}
                bindings={bindings}
                onSetBinding={setBinding}
                onResetDefaults={resetDefaults}
                onReplaceBindings={replaceAll}
                shortcutMode={shortcutMode}
                cull={appTab === "cull"}
              />
            )}
            <QuickEditHud
              visible={!!speedEdit.hud?.visible}
              label={speedEdit.hud?.label ?? ""}
              keyHint={speedEdit.activeId ? bindings[speedEdit.activeId] : undefined}
              value={speedEdit.hud?.value ?? 0}
              min={speedEdit.hud?.min ?? 0}
              max={speedEdit.hud?.max ?? 100}
              defaultValue={speedEdit.hud?.defaultValue ?? 0}
            />
            <SettingsDialog
              open={settingsOpen}
              onClose={() => setSettingsOpen(false)}
              onOpenShortcuts={openShortcutsFromSettings}
            />

            <UndoToast item={toast} onDone={clearToast} />
          </div>
        </SpeedEditContext.Provider>
      </AlbumHistoryContext.Provider>
    </PhotoMenuContext.Provider>
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
  onStartAction,
  onResetAction,
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
  onStartAction: (a: AIAction) => void;
  onResetAction: (a: AIAction) => void;
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
          onStartAction={onStartAction}
          onResetAction={onResetAction}
          actionStatuses={actionStatuses}
          selectedGridTile={selectedGridTile}
          ratingFilter={ratingFilter}
          onToggleRating={onToggleRating}
          cullFiltersVisible={cullFiltersVisible}
          ratings={ratings}
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
