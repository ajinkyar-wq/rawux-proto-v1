import { useCallback, useEffect, useRef, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { CaretDown } from "@phosphor-icons/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useCullStore } from "@/features/import/store/useCullStore";
import type { ActionStatuses } from "../action-status";
import { ImageHistoryPanel } from "../history/ImageHistoryPanel";
import {
  imageName,
  SliderHistoryContext,
  TOOL_LABEL,
  useAlbumHistoryContext,
  type Effect,
  type Tool,
} from "../history/album-history";
import { resetEffects, syncEffects } from "../history/edit-state";

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
import { Histogram } from "./Histogram";
import {
  allSettingsSelected,
  setSyncSettings,
  SyncSettingsModal,
  syncMatcher,
  useSyncSettings,
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
  selection,
}: {
  activeRail: LoupeRailKey;
  // Drives the Key Faces grid / AI Actions panel inside this slot.
  selectedIndex?: number;
  /** Filmstrip multi-selection: Sync copies to it, Reset clears all of it. */
  selection?: Set<number>;
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
                {/* Histogram heads every editing panel, pinned to the top. */}
                {/* Histogram heads the editing tools only (Edit, Crop, Masking) —
                    not the retouching ones. */}
                {EDITING_RAILS.includes(activeRail) && !RETOUCH_RAILS.includes(activeRail) && (
                  <Histogram image={selectedIndex ?? 0} />
                )}
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
            {EDITING_RAILS.includes(activeRail) && (
              <EditingPanelFooter
                tool={activeRail as Tool}
                image={selectedIndex}
                selection={selection ?? new Set([selectedIndex])}
              />
            )}
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
 * [Sync | ⚙] [Reset | ⌄]. Sync is a full-pill label button joined (1px gap) to
 * a 32px round gear that opens Sync and Copy Settings; Reset is joined the same
 * way to a chevron with the narrower "Reset <this tab>" option.
 *
 * Both act on the image's whole edit state (every editing + retouching value):
 *   Sync  — copies the current image's settings (filtered by Sync and Copy
 *           Settings) to the other selected filmstrip photos. Asks with the
 *           settings modal first unless "Always use these settings" is on.
 *   Reset — puts every edit and retouch on the selected photos back to default.
 * Each is ONE Undo step, listed in every affected photo's History. */

const RETOUCH_RAILS: LoupeRailKey[] = ["retouch", "background", "patch"];

function EditingPanelFooter({
  tool,
  image,
  selection,
}: {
  tool: Tool;
  image: number;
  selection: Set<number>;
}) {
  const history = useAlbumHistoryContext();
  const settings = useSyncSettings();
  const showToast = useCullStore((st) => st.showToast);
  const [modal, setModal] = useState<"settings" | "sync" | null>(null);
  const closeModal = useCallback(() => setModal(null), []);

  // Photos acted on: the filmstrip selection (always incl. the current one).
  const images = selection.has(image) && selection.size > 1 ? [...selection] : [image];
  const targets = images.filter((i) => i !== image);
  const photos = (n: number) => (n === 1 ? "1 photo" : `${n} photos`);

  const runSync = (s: SyncSettings) => {
    if (!history || targets.length === 0) return;
    const effects = syncEffects(history, image, targets, syncMatcher(s));
    if (effects.length === 0) {
      showToast(`Settings already match on ${photos(targets.length)}`);
      return;
    }
    history.record({
      kind: "change",
      op: "Sync",
      value: `${allSettingsSelected(s) ? "All settings" : "Selected settings"} from ${imageName(image)}`,
      view: "loupe",
      tool,
      images: targets,
      effects,
    });
    showToast(`Synced to ${photos(targets.length)}`);
  };

  const resetAll = history ? resetEffects(history, images) : [];
  const resetTab = history ? resetEffects(history, images, [tool]) : [];
  const runReset = (effects: Effect[], what: string) => {
    if (!history || effects.length === 0) return;
    history.record({
      kind: "change",
      op: "Reset",
      value: what,
      view: "loupe",
      tool,
      images,
      effects,
    });
    if (images.length > 1) showToast(`Reset ${photos(images.length)}`);
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex min-w-px flex-1 items-center gap-px">
        <button
          type="button"
          disabled={targets.length === 0}
          onClick={() => (settings.alwaysUse ? runSync(settings) : setModal("sync"))}
          className={`${PILL} rounded-l-full`}
        >
          Sync
        </button>
        <IconTooltip label="Sync settings">
          <button
            type="button"
            aria-label="Sync settings"
            onClick={() => setModal("settings")}
            className={`${SIDE} rounded-r-full`}
          >
            <SettingsIcon className="size-4" strokeWidth={1.5} />
          </button>
        </IconTooltip>
      </div>
      <div className="flex min-w-px flex-1 items-center gap-px">
        <button
          type="button"
          disabled={resetAll.length === 0}
          onClick={() => runReset(resetAll, "All edits")}
          className={`${PILL} rounded-l-full`}
        >
          Reset
        </button>
        <DropdownMenu.Root>
          <IconTooltip label="Reset options">
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Reset options"
                className={`${SIDE} rounded-r-full data-[state=open]:bg-[#3a3a3a]`}
              >
                <CaretDown size={16} weight="light" />
              </button>
            </DropdownMenu.Trigger>
          </IconTooltip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="top"
              align="end"
              sideOffset={6}
              collisionPadding={8}
              className={MENU_PANEL}
            >
              <DropdownMenu.Item
                disabled={resetAll.length === 0}
                onSelect={() => runReset(resetAll, "All edits")}
                className={MENU_CELL}
              >
                Reset All
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={resetTab.length === 0}
                onSelect={() => runReset(resetTab, TOOL_LABEL[tool])}
                className={MENU_CELL}
              >
                Reset {TOOL_LABEL[tool]}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      {modal && (
        <SyncSettingsModal
          initial={settings}
          onClose={closeModal}
          sync={modal === "sync" ? { from: imageName(image), count: targets.length } : undefined}
          onSave={(s) => {
            setSyncSettings(s);
            if (modal === "sync") runSync(s);
          }}
        />
      )}
    </div>
  );
}

// Figma dropdown spec (same cells as the photo context menu).
const MENU_PANEL =
  "z-[200] flex min-w-[160px] flex-col gap-0.5 rounded-lg border border-[#474747] bg-[#242424] p-1 shadow-2xl";
const MENU_CELL =
  "flex cursor-default select-none items-center rounded px-2 py-2 text-[12px] font-medium leading-4 text-[#ababab] outline-none data-[highlighted]:bg-[rgba(226,226,226,0.1)] data-[highlighted]:text-[#e2e2e2] data-[disabled]:pointer-events-none data-[disabled]:text-[#5a5a5a]";

// The 32px round add-on joined to a pill (gear / chevron).
const SIDE =
  "flex size-8 shrink-0 items-center justify-center bg-[#303030] p-2 text-[#e2e2e2] hover:bg-[#3a3a3a]";

const PILL =
  "flex h-8 min-w-[52px] flex-1 items-center justify-center bg-[#303030] px-3 text-[12px] font-medium leading-4 text-[#e2e2e2] enabled:hover:bg-[#3a3a3a] disabled:cursor-not-allowed disabled:text-[#5a5a5a]";

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
