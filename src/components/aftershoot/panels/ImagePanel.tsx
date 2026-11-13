import { Check, Palette, Scissors, Wand2, Zap } from "lucide-react";
import { ActionCard } from "../primitives";
import type { ActionStatuses } from "../action-status";
import { ResultsTabs } from "./ResultsTabs";

export type AIAction = "cull" | "edit" | "retouch";

export function ImagePanel({
  onAction,
  actionStatuses,
  activeResultsTab,
  onSelectResultsTab,
  selectedGridTile,
  ratingFilter,
  onToggleRating,
  cullFiltersVisible,
  showDuplicates = true,
}: {
  onAction: (action: AIAction) => void;
  actionStatuses: ActionStatuses;
  activeResultsTab: AIAction | null;
  onSelectResultsTab: (tab: AIAction) => void;
  selectedGridTile: number;
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
  cullFiltersVisible: boolean;
  // In loupe the in-panel Duplicates list is hidden (filmstrip shows them).
  showDuplicates?: boolean;
}) {
  const allComplete =
    actionStatuses.cull === "complete" &&
    actionStatuses.edit === "complete" &&
    actionStatuses.retouch === "complete";

  return (
    <>
      <div className="grid shrink-0 grid-cols-3 gap-2">
        <ActionCard
          icon={<Scissors className="h-4 w-4" strokeWidth={1.5} />}
          label="AI Cull"
          completedLabel="Restart Cull"
          status={actionStatuses.cull}
          onClick={() => onAction("cull")}
        />
        <ActionCard
          icon={<Palette className="h-4 w-4" strokeWidth={1.5} />}
          label="AI Edit"
          completedLabel="Restart Edit"
          status={actionStatuses.edit}
          onClick={() => onAction("edit")}
        />
        <ActionCard
          icon={<Wand2 className="h-4 w-4" strokeWidth={1.5} />}
          label="AI Retouch"
          completedLabel="Restart Retouch"
          status={actionStatuses.retouch}
          onClick={() => onAction("retouch")}
        />
      </div>

      <button className="relative flex shrink-0 items-center gap-2 rounded-md border border-white/10 bg-[#222] px-3 py-2.5 text-left hover:bg-[#262626]">
        <Zap className="h-3.5 w-3.5 fill-[#f5a524] text-[#f5a524]" strokeWidth={1.5} />
        <span className="text-[12px] font-medium text-[#f5a524]">
          One-Click Cull, Edit &amp; Retouch
        </span>
        {allComplete && (
          <span className="absolute right-2 top-1/2 flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center rounded-full bg-[#1f7a3a]">
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
        )}
      </button>

      {/* Results tabs: the CULL/EDIT/RETOUCH switcher stays pinned at the top.
          Cull Filters live INSIDE the CULL tab (they belong to culling). */}
      <ResultsTabs
        actionStatuses={actionStatuses}
        activeTab={activeResultsTab}
        onSelectTab={onSelectResultsTab}
        selectedGridTile={selectedGridTile}
        ratingFilter={ratingFilter}
        onToggleRating={onToggleRating}
        cullFiltersVisible={cullFiltersVisible}
        showDuplicates={showDuplicates}
      />
    </>
  );
}
