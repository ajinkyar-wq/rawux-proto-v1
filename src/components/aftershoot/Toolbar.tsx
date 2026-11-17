import {
  ArrowUpDown,
  Columns2,
  Home,
  ImagePlus,
  LayoutGrid,
  MessageCircle,
  Monitor,
  Pencil,
  Settings,
  Share,
} from "lucide-react";
import { FilterControls } from "./FilterBar";
import { FlagsMenu } from "./FlagsMenu";
import { IconTooltip } from "./IconTooltip";
import { Divider, ToolbarBtn } from "./primitives";
import type { AppTab } from "./rail-config";

export type ViewMode = "grid" | "loupe" | "survey";

const TABS: { key: AppTab; label: string }[] = [
  { key: "cull", label: "CULL" },
  { key: "enhance", label: "Edit & Retouch" },
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
  onOpenSettings,
}: {
  tab: AppTab;
  onChangeTab: (tab: AppTab) => void;
  // Home returns to the Home screen.
  onHome?: () => void;
  albumName?: string;
  // Add opens the import flow to bring more photos into this album.
  onAdd?: () => void;
  // App Settings (gear). Its Shortcuts link opens the Keyboard Shortcuts modal.
  onOpenSettings?: () => void;
}) {
  return (
    <div className="relative flex h-10 shrink-0 items-center justify-between bg-[#1c1c1c] py-1.5 pl-2 pr-3">
      {/* Left controls */}
      <div className="flex w-[400px] shrink-0 items-center gap-2">
        <IconTooltip label="Home" side="bottom">
          <button
            onClick={onHome}
            className="flex size-6 shrink-0 items-center justify-center rounded text-[#ababab] hover:bg-white/5 hover:text-white"
          >
            <Home className="size-4" strokeWidth={1.5} />
          </button>
        </IconTooltip>
        <span className="h-4 w-px shrink-0 bg-white/10" />
        <button className="group flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-[#e2e2e2]">
          <span className="max-w-[220px] truncate">{albumName}</span>
          <Pencil className="size-4 text-[#777] group-hover:text-[#ababab]" strokeWidth={1.5} />
        </button>
        <span className="h-4 w-px shrink-0 bg-white/10" />
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded text-[12px] font-medium text-[#ababab] hover:text-white"
        >
          <ImagePlus className="size-4" strokeWidth={1.5} />
          Add
        </button>
      </div>

      {/* CULL / EDIT & RETOUCH feature switcher */}
      <div className="flex items-center rounded bg-[#111] p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onChangeTab(t.key)}
            className={`flex min-w-20 items-center justify-center whitespace-nowrap rounded px-3 py-1.5 text-[11px] font-semibold uppercase leading-3 tracking-[0.5px] ${
              tab === t.key ? "bg-[#303030] text-[#e2e2e2]" : "text-[#777] hover:text-[#ababab]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex w-[400px] shrink-0 items-center justify-end gap-2">
        <button className="flex h-7 items-center justify-center gap-1 rounded bg-[#303030] pl-2 pr-3 text-[12px] font-medium text-[#e2e2e2] hover:bg-[#383838]">
          <Share className="size-4" strokeWidth={1.5} />
          Export
        </button>
        <span className="h-4 w-px shrink-0 bg-white/10" />
        <button className="relative flex size-6 shrink-0 items-center justify-center rounded text-[#ababab] hover:bg-white/5 hover:text-white">
          <MessageCircle className="size-4" strokeWidth={1.5} />
          <span className="absolute right-0 top-[3px] size-2 rounded-full bg-[#2ecc71]" />
        </button>
        {/* <IconTooltip label="Settings" side="bottom">
          <button
            onClick={onOpenSettings}
            className="flex size-6 shrink-0 items-center justify-center rounded text-[#ababab] hover:bg-white/5 hover:text-white"
          >
            <Settings className="size-4" strokeWidth={1.5} />
          </button>
        </IconTooltip> */}
        <FlagsMenu />
      </div>
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
