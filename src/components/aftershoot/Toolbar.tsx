import {
  ArrowUpDown,
  Columns2,
  Home,
  ImagePlus,
  LayoutGrid,
  Monitor,
  MoreVertical,
  Pencil,
  Share,
} from "lucide-react";
import { FilterControls } from "./FilterBar";
import { IconTooltip } from "./IconTooltip";
import { Divider, ToolbarBtn } from "./primitives";
import type { AppTab } from "./rail-config";

export type ViewMode = "grid" | "loupe" | "survey";

const TABS: { key: AppTab; label: string }[] = [
  { key: "cull", label: "CULL" },
  { key: "enhance", label: "ENHANCE" },
];

// Two rows, like the main app:
//   AppBar  — full width: album, CULL / ENHANCE tabs, Export.
//   ViewBar — view toggles + filters. Spans only the image area; the side
//             panel and rail run up to the AppBar beside it.
export function AppBar({
  tab,
  onChangeTab,
  onHome,
  albumName = "Album Name",
  onAdd,
}: {
  tab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  // Home returns to the Home screen.
  onHome?: () => void;
  albumName?: string;
  // Add opens the import flow to bring more photos into this album.
  onAdd?: () => void;
}) {
  return (
    <div className="relative flex h-11 shrink-0 items-center gap-1 border-b border-white/5 bg-[#1a1a1a] px-3">
      <IconTooltip label="Home" side="bottom">
        <ToolbarBtn onClick={onHome}>
          <Home className="h-[15px] w-[15px]" strokeWidth={1.5} />
        </ToolbarBtn>
      </IconTooltip>
      <Divider />
      {/* Album name (rename via pencil) */}
      <button className="group ml-1 flex items-center gap-1.5 rounded px-1 py-1 text-[12px] text-neutral-200 hover:text-white">
        <span className="max-w-[220px] truncate">{albumName}</span>
        <Pencil
          className="h-3 w-3 text-neutral-500 group-hover:text-neutral-300"
          strokeWidth={1.5}
        />
      </button>
      <Divider />
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] text-neutral-300 hover:text-white"
      >
        <ImagePlus className="h-[14px] w-[14px]" strokeWidth={1.5} />
        Add
      </button>

      {/* CULL / ENHANCE — centered in the window, like the main app. */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center rounded-md bg-[#111] p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChangeTab(t.key)}
            className={`h-6 rounded px-3 text-[11px] font-medium tracking-[0.08em] ${
              tab === t.key
                ? "bg-[#2a2a2a] text-neutral-100"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <button className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-[#222] px-2.5 text-[12px] text-neutral-100 hover:bg-[#2a2a2a]">
        <Share className="h-[13px] w-[13px]" strokeWidth={1.5} />
        Export
      </button>
      <ToolbarBtn>
        <MoreVertical className="h-[15px] w-[15px]" strokeWidth={1.5} />
      </ToolbarBtn>
    </div>
  );
}

export function ViewBar({
  tab,
  viewMode,
  onChangeViewMode,
  cullComplete = false,
  ratingFilter,
  onToggleRating,
}: {
  tab: AppTab;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  // Survey mode is a culling activity, so it only appears once AI culling has
  // run — matching how cull filters, key faces, and duplicates are gated.
  cullComplete?: boolean;
  // Shared rating filter driven by the Ratings / Tags dropdowns.
  ratingFilter?: Set<number>;
  onToggleRating?: (rating: number) => void;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-white/5 bg-[#1a1a1a] px-3">
      <IconTooltip label="Grid view" side="bottom">
        <ToolbarBtn active={viewMode === "grid"} onClick={() => onChangeViewMode("grid")}>
          <LayoutGrid className="h-[15px] w-[15px]" strokeWidth={1.5} />
        </ToolbarBtn>
      </IconTooltip>
      <IconTooltip label="Loupe view" side="bottom">
        <ToolbarBtn active={viewMode === "loupe"} onClick={() => onChangeViewMode("loupe")}>
          <Monitor className="h-[15px] w-[15px]" strokeWidth={1.5} />
        </ToolbarBtn>
      </IconTooltip>
      {/* Survey is a culling activity → CULL tab only. */}
      {cullComplete && tab === "cull" && (
        <IconTooltip label="Survey mode" side="bottom">
          <ToolbarBtn active={viewMode === "survey"} onClick={() => onChangeViewMode("survey")}>
            <Columns2 className="h-[15px] w-[15px]" strokeWidth={1.5} />
          </ToolbarBtn>
        </IconTooltip>
      )}
      <Divider />
      <IconTooltip label="Sort" side="bottom">
        <ToolbarBtn>
          <ArrowUpDown className="h-[15px] w-[15px]" strokeWidth={1.5} />
        </ToolbarBtn>
      </IconTooltip>

      <div className="flex-1" />

      <FilterControls ratingFilter={ratingFilter} onToggleRating={onToggleRating} />
    </div>
  );
}
