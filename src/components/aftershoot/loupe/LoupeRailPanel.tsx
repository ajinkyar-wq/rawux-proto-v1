import { useCallback, useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import type { ActionStatuses } from "../action-status";
import { ImageHistoryPanel } from "../history/ImageHistoryPanel";
import { SliderHistoryContext, type Tool } from "../history/album-history";

const HISTORY_TOOLS: Tool[] = ["edit", "crop", "mask", "retouch", "background", "patch"];
import type { AIAction } from "../panels/ImagePanel";
import { KeyFacesGrid, type FaceControls } from "../panels/KeyFacesGrid";
import { InfoPanel } from "../panels/InfoPanel";
import { BackgroundPanel } from "./BackgroundPanel";
import { CropPanel } from "./CropPanel";
import { EditPanel } from "./EditPanel";
import { MaskingPanel } from "./MaskingPanel";
import { PatchPanel } from "./PatchPanel";
import { RetouchPanel } from "./RetouchPanel";
import { TetheringPanel } from "./TetheringPanel";
import type { LoupeRailKey } from "./loupe-rail-config";
import { IconTooltip } from "../IconTooltip";
import { FlyoutHost } from "./Flyout";
import {
  DEFAULT_SYNC_SETTINGS,
  SyncSettingsModal,
  type SyncSettings,
} from "../modals/SyncSettingsModal";

// Rails that share the standard editing footer ([Sync ⚙] · Reset).
const EDITING_RAILS: LoupeRailKey[] = ["edit", "crop", "mask", "retouch", "patch", "background"];

// The AI Actions panel (CULL/EDIT/RETOUCH cards + results tabs) is the same
// component as the grid view's rail. Loupe receives the shared AI state so the
// panel — and which results tab is active — stays in sync across views.
export type LoupeAIState = {
  actionStatuses: ActionStatuses;
  activeResultsTab: AIAction | null;
  onSelectResultsTab: (tab: AIAction) => void;
  onAction: (action: AIAction) => void;
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
  cullFiltersVisible: boolean;
};

export function LoupeRailPanel({
  activeRail,
  selectedIndex = 0,
  ai,
  faces,
}: {
  activeRail: LoupeRailKey;
  // Drives the Key Faces grid / AI Actions panel inside this slot.
  selectedIndex?: number;
  // AI Actions panel state, lifted from the screen so grid and loupe share it.
  ai: LoupeAIState;
  // Survey: Key Faces become clickable (zoom every photo to that face).
  faces?: FaceControls;
}) {
  // The AI Actions panel manages its own inner scroll (the results tabs stay
  // pinned while the Key Faces / Duplicates list scrolls below them), so its
  // container must NOT scroll — otherwise the tabs' flex-1 height collapses and
  // the list disappears. Editing rails keep the simple scroll-the-whole-panel
  // behavior.
  const isAI = activeRail === "ai";
  // Tethering has its own full-height 344px panel (Figma 81:33862).
  if (activeRail === "camera") return <TetheringPanel />;
  return (
    <FlyoutHost resetKey={activeRail}>
      {(slotRef) => (
        <div className="flex h-full shrink-0">
          {/* Browse panels (AI Profiles / Presets) open here, left of the panel.
              In the layout flow, so the photo canvas shrinks to make room. */}
          <div ref={slotRef} className="flex h-full shrink-0" />
          <div className="flex h-full w-[344px] shrink-0 flex-col border-l border-white/5 bg-[#1a1a1a]">
            <ScrollFade
              enabled={!isAI}
              className={`flex min-h-0 flex-1 flex-col ${isAI ? "gap-3 p-4" : "overflow-y-auto p-3"}`}
            >
              {/* Sliders inside read/write the current image's values in the album
            history store and record a step per drag. */}
              <SliderHistoryContext.Provider
                value={
                  HISTORY_TOOLS.includes(activeRail as Tool)
                    ? { image: selectedIndex, tool: activeRail as Tool }
                    : null
                }
              >
                <LoupeRailPanelBody
                  activeRail={activeRail}
                  selectedIndex={selectedIndex}
                  ai={ai}
                  faces={faces}
                />
              </SliderHistoryContext.Provider>
            </ScrollFade>
            {/* Footer is OUTSIDE the scroll area, so Sync/Reset stay pinned to the
          bottom of the panel regardless of how long the content scrolls. */}
            {EDITING_RAILS.includes(activeRail) && <EditingPanelFooter />}
          </div>
        </div>
      )}
    </FlyoutHost>
  );
}

function LoupeRailPanelBody({
  activeRail,
  selectedIndex,
  ai,
  faces,
}: {
  activeRail: LoupeRailKey;
  selectedIndex: number;
  ai: LoupeAIState;
  faces?: FaceControls;
}) {
  switch (activeRail) {
    case "ai":
      // Loupe culling panel: only Key Faces. Duplicates show in the strip
      // above the album filmstrip; AI actions/filters live in grid view.
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <KeyFacesGrid selectedGridTile={selectedIndex} controls={faces} />
        </div>
      );
    case "edit":
      return <EditPanel />;
    case "crop":
      return <CropPanel />;
    case "mask":
      return <MaskingPanel />;
    case "retouch":
      return <RetouchPanel />;
    case "background":
      return <BackgroundPanel />;
    case "patch":
      return <PatchPanel />;
    case "info":
      // Reuse the same image info component used in the grid view's rail.
      return (
        <div className="flex flex-col gap-3">
          <InfoPanel />
        </div>
      );
    case "history":
      return <ImageHistoryPanel image={selectedIndex} />;
    default:
      return null;
  }
}

/* ---------------- Shared footer: Bottom CTA (Figma 4011:28100) ----------------
 * [Sync | ⚙] [Reset]. Sync is a full-pill label button joined (1px gap) to a
 * 32px round gear that opens Sync and Copy Settings; Reset has no settings. */

function EditingPanelFooter() {
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(DEFAULT_SYNC_SETTINGS);
  const closeSync = useCallback(() => setSyncOpen(false), []);
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex min-w-px flex-1 items-center gap-px">
        <button type="button" className={`${PILL} rounded-l-full`}>
          Sync
        </button>
        <IconTooltip label="Sync settings">
          <button
            type="button"
            aria-label="Sync settings"
            onClick={() => setSyncOpen(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-r-full bg-[#303030] p-2 text-[#e2e2e2] hover:bg-[#3a3a3a]"
          >
            <SettingsIcon className="size-4" strokeWidth={1.5} />
          </button>
        </IconTooltip>
      </div>
      <button type="button" className={`${PILL} rounded-full`}>
        Reset
      </button>
      {syncOpen && (
        <SyncSettingsModal initial={syncSettings} onClose={closeSync} onSave={setSyncSettings} />
      )}
    </div>
  );
}

const PILL =
  "flex h-8 min-w-[52px] flex-1 items-center justify-center bg-[#303030] px-3 text-[12px] font-medium leading-4 text-[#e2e2e2] hover:bg-[#3a3a3a]";

/**
 * Scroll container with a bottom fade overlay (Figma 4011:28099) that shows
 * only while more content is scrolled out of view below, sitting just above
 * the footer CTA.
 */
function ScrollFade({
  enabled,
  className,
  children,
}: {
  enabled: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [update]);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={ref} onScroll={update} className={className}>
        {children}
      </div>
      {enabled && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#1a1a1a] transition-opacity ${more ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
