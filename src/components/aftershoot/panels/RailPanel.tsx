import { Loader2, Scissors } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActionStatus, ActionStatuses } from "../action-status";
import type { RailKey } from "../rail-config";
import { AIEditingPanel, AIToolsPanel } from "./AIEditingPanel";
import { EditRetouchPanel } from "./EditRetouchPanel";
import { CullFilterSidebar } from "./CullFilterSidebar";
import { DuplicatesPanel } from "./DuplicatesPanel";
import { HistoryPanel } from "./HistoryPanel";
import type { AIAction } from "./ImagePanel";
import { InfoPanel } from "./InfoPanel";
import { KeyFacesGrid } from "./KeyFacesGrid";
import { AIRetouchingPanel } from "./AIRetouchingPanel";

// Grid-view side panel. The old in-panel CULL / EDIT / RETOUCH results tabs
// are now the rail itself: each rail icon (AI Culling, AI Editing, AI
// Retouching) opens its own panel containing that stage's action + results.

type RailPanelProps = {
  railKey: RailKey;
  onAction: (action: AIAction) => void;
  actionStatuses: ActionStatuses;
  selectedGridTile: number;
  ratingFilter: Set<number>;
  onToggleRating: (rating: number) => void;
  // False for an Assisted cull (no AI ratings → no cull filter sidebar).
  cullFiltersVisible: boolean;
};

export function RailPanel(props: RailPanelProps) {
  return (
    <div className="flex min-h-0 w-[280px] shrink-0 flex-col gap-3 border-l border-white/5 bg-[#1a1a1a] p-3">
      <RailPanelBody {...props} />
    </div>
  );
}

function RailPanelBody(props: RailPanelProps) {
  switch (props.railKey) {
    case "cull":
      return <CullTab {...props} />;
    case "edit":
      return <EditTab {...props} />;
    case "retouch":
      return <RetouchTab {...props} />;
    case "editRetouch":
      return (
        <EditRetouchPanel
          editStatus={props.actionStatuses.edit}
          onRunEdit={() => props.onAction("edit")}
        />
      );
    case "aiTools":
      return <AIToolsPanel />;
    case "info":
      return <InfoPanel />;
    case "history":
      return <HistoryPanel />;
    default:
      return <PlaceholderPanel label={props.railKey} />;
  }
}

/* ------------------------------ AI Culling ------------------------------ */

function CullTab({
  onAction,
  actionStatuses,
  selectedGridTile,
  ratingFilter,
  onToggleRating,
  cullFiltersVisible,
}: RailPanelProps) {
  const status = actionStatuses.cull;
  return (
    <>
      <TabHeader title="AI Culling" status={status} onRestart={() => onAction("cull")} />
      {status !== "complete" ? (
        <RunCard
          icon={Scissors}
          title="AI Cull"
          description="Let AI rate, select and group duplicates & key faces across the album."
          cta="Start AI Cull"
          status={status}
          onClick={() => onAction("cull")}
        />
      ) : (
        <div className="flex min-h-0 flex-1 animate-[fadeIn_220ms_ease-out] flex-col gap-2">
          {cullFiltersVisible && (
            <CullFilterSidebar ratingFilter={ratingFilter} onToggleRating={onToggleRating} />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <KeyFacesGrid selectedGridTile={selectedGridTile} />
            <DuplicatesPanel selectedGridTile={selectedGridTile} />
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------ AI Editing ------------------------------ */

function EditTab({ onAction, actionStatuses }: RailPanelProps) {
  return <AIEditingPanel status={actionStatuses.edit} onRunEdit={() => onAction("edit")} />;
}

/* ----------------------------- AI Retouching ---------------------------- */

function RetouchTab({ onAction, actionStatuses }: RailPanelProps) {
  return (
    <AIRetouchingPanel status={actionStatuses.retouch} onRunRetouch={() => onAction("retouch")} />
  );
}

/* ------------------------------- Shared --------------------------------- */

function TabHeader({
  title,
  status,
  onRestart,
}: {
  title: string;
  status: ActionStatus;
  onRestart: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-white/5 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white">{title}</span>
      {status === "complete" && (
        <button
          type="button"
          onClick={onRestart}
          className="text-[11px] text-neutral-400 hover:text-white"
        >
          Restart
        </button>
      )}
    </div>
  );
}

function RunCard({
  icon: Icon,
  title,
  description,
  cta,
  status,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  status: ActionStatus;
  onClick: () => void;
}) {
  const running = status === "running";
  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-md border border-white/10 bg-[#222] p-3">
      <div className="flex items-center gap-2 text-neutral-200">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
        <span className="text-[12px] font-medium">{title}</span>
      </div>
      <p className="text-[11px] leading-snug text-neutral-500">{description}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={running}
        className="mt-1 flex h-8 items-center justify-center gap-2 rounded-md bg-[#3b5bff] text-[12px] font-medium text-white hover:bg-[#4866ff] disabled:cursor-wait disabled:opacity-70"
      >
        {running && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
        {running ? "Running…" : cta}
      </button>
    </div>
  );
}

function PlaceholderPanel({ label }: { label: string }) {
  return <div className="text-[12px] capitalize text-neutral-500">{label}</div>;
}
