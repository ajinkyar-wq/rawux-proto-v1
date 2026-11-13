import type { ActionStatuses } from "../action-status";
import type { AIAction } from "./ImagePanel";
import { CullFilterSidebar } from "./CullFilterSidebar";
import { DuplicatesPanel } from "./DuplicatesPanel";
import { EditInfoPanel } from "./EditInfoPanel";
import { KeyFacesGrid } from "./KeyFacesGrid";
import { RetouchInfoPanel } from "./RetouchInfoPanel";

const TAB_ORDER: AIAction[] = ["cull", "edit", "retouch"];
const TAB_LABEL: Record<AIAction, string> = {
  cull: "CULL",
  edit: "EDIT",
  retouch: "RETOUCH",
};

export function ResultsTabs({
  actionStatuses,
  activeTab,
  onSelectTab,
  selectedGridTile,
  ratingFilter,
  onToggleRating,
  cullFiltersVisible,
  showDuplicates = true,
}: {
  actionStatuses: ActionStatuses;
  activeTab: AIAction | null;
  onSelectTab: (tab: AIAction) => void;
  selectedGridTile: number;
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
  // False for an Assisted cull — no AI ratings, so no Cull Filter sidebar.
  cullFiltersVisible: boolean;
  // In loupe view duplicates are shown via the filmstrip under the image, so
  // the in-panel Duplicates list is hidden there.
  showDuplicates?: boolean;
}) {
  // Each tab appears only once its AI action has completed.
  const visibleTabs = TAB_ORDER.filter((t) => actionStatuses[t] === "complete");

  // Nothing to show until at least one AI action has completed.
  if (visibleTabs.length === 0) return null;

  const current = activeTab && visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];

  return (
    // Fade-in animation when this section first appears.
    <div className="flex min-h-0 flex-1 animate-[fadeIn_220ms_ease-out] flex-col gap-2 pt-1">
      {/* Pinned tab switcher — stays put while the content below scrolls. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/5">
        {visibleTabs.map((tab) => {
          const active = tab === current;
          return (
            <button
              key={tab}
              onClick={() => onSelectTab(tab)}
              className={`-mb-px border-b px-1 pb-2 text-[11px] font-semibold tracking-wider transition-colors ${
                active
                  ? "border-white text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {TAB_LABEL[tab]}
            </button>
          );
        })}
      </div>

      {current === "cull" ? (
        // CULL tab: Cull Filters (after cull runs) sit fixed at the top of the
        // tab, with the Key Faces grid scrolling below them.
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          {actionStatuses.cull === "complete" && (
            <>
              {cullFiltersVisible && (
                <CullFilterSidebar ratingFilter={ratingFilter} onToggleRating={onToggleRating} />
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">
                <KeyFacesGrid selectedGridTile={selectedGridTile} />
                {showDuplicates && <DuplicatesPanel selectedGridTile={selectedGridTile} />}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {current === "edit" && <EditInfoPanel selectedGridTile={selectedGridTile} />}
          {current === "retouch" && <RetouchInfoPanel selectedGridTile={selectedGridTile} />}
        </div>
      )}
    </div>
  );
}
