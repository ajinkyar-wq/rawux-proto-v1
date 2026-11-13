import { Settings as SettingsIcon } from "lucide-react";
import type { ActionStatuses } from "../action-status";
import { ImageHistoryPanel } from "../history/ImageHistoryPanel";
import { SliderHistoryContext, type Tool } from "../history/album-history";

const HISTORY_TOOLS: Tool[] = ["edit", "crop", "mask", "retouch", "background", "patch"];
import type { AIAction } from "../panels/ImagePanel";
import { KeyFacesGrid } from "../panels/KeyFacesGrid";
import { InfoPanel } from "../panels/InfoPanel";
import { BackgroundPanel } from "./BackgroundPanel";
import { CropPanel } from "./CropPanel";
import { EditPanel } from "./EditPanel";
import { MaskingPanel } from "./MaskingPanel";
import { PatchPanel } from "./PatchPanel";
import { RetouchPanel } from "./RetouchPanel";
import type { LoupeRailKey } from "./loupe-rail-config";
import { IconTooltip } from "../IconTooltip";

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
}: {
  activeRail: LoupeRailKey;
  // Drives the Key Faces grid / AI Actions panel inside this slot.
  selectedIndex?: number;
  // AI Actions panel state, lifted from the screen so grid and loupe share it.
  ai: LoupeAIState;
}) {
  // The AI Actions panel manages its own inner scroll (the results tabs stay
  // pinned while the Key Faces / Duplicates list scrolls below them), so its
  // container must NOT scroll — otherwise the tabs' flex-1 height collapses and
  // the list disappears. Editing rails keep the simple scroll-the-whole-panel
  // behavior.
  const isAI = activeRail === "ai";
  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-l border-white/5 bg-[#1a1a1a]">
      <div className={`flex min-h-0 flex-1 flex-col ${isAI ? "gap-3 p-4" : "overflow-y-auto p-3"}`}>
        {/* Sliders inside read/write the current image's values in the album
            history store and record a step per drag. */}
        <SliderHistoryContext.Provider
          value={
            HISTORY_TOOLS.includes(activeRail as Tool)
              ? { image: selectedIndex, tool: activeRail as Tool }
              : null
          }
        >
          <LoupeRailPanelBody activeRail={activeRail} selectedIndex={selectedIndex} ai={ai} />
        </SliderHistoryContext.Provider>
      </div>
      {/* Footer is OUTSIDE the scroll area, so Sync/Reset stay pinned to the
          bottom of the panel regardless of how long the content scrolls. */}
      {EDITING_RAILS.includes(activeRail) && <EditingPanelFooter />}
    </div>
  );
}

function LoupeRailPanelBody({
  activeRail,
  selectedIndex,
  ai,
}: {
  activeRail: LoupeRailKey;
  selectedIndex: number;
  ai: LoupeAIState;
}) {
  switch (activeRail) {
    case "ai":
      // Loupe culling panel: only Key Faces. Duplicates show in the strip
      // above the album filmstrip; AI actions/filters live in grid view.
      return (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <KeyFacesGrid selectedGridTile={selectedIndex} cols={4} />
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

/* ---------------- Shared footer ([Sync ⚙] · Reset) ---------------- */

function EditingPanelFooter() {
  return (
    <div className="flex items-center gap-2 border-t border-white/5 px-3 py-2">
      <SyncSplitButton />
      <FooterPillButton>Reset</FooterPillButton>
    </div>
  );
}

/**
 * The Sync action is always a split button: the "Sync" pill on one side and
 * the settings cog attached to it on the other side, sharing a border.
 */
function SyncSplitButton() {
  return (
    <div className="flex h-7 flex-1 overflow-hidden rounded border border-white/10 bg-[#222]">
      <button
        type="button"
        className="flex flex-1 items-center justify-center text-[11px] text-white hover:bg-white/[0.04]"
      >
        Sync
      </button>
      <span className="my-1 w-px bg-white/10" aria-hidden />
      <IconTooltip label="Sync settings">
        <button
          type="button"
          className="flex w-7 items-center justify-center text-neutral-300 hover:bg-white/[0.04] hover:text-white"
        >
          <SettingsIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </IconTooltip>
    </div>
  );
}

function FooterPillButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-7 flex-1 items-center justify-center rounded border border-white/10 bg-[#222] text-[11px] text-white hover:bg-[#262626]"
    >
      {children}
    </button>
  );
}
